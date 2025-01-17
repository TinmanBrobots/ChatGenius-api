import { SupabaseClient } from '@supabase/supabase-js';
import { Pinecone, type RecordMetadata } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';
import { ChatOpenAI } from '@langchain/openai';
import { Database, Message, Profile } from '../types/database';
import { supabaseAdmin, getClientWithToken } from '../config/supabase';

interface RAGQueryResult {
  response: string;
  relevantMessages: Message[];
  confidence: number;
}

interface RAGConfig {
  nQueries: number;
  nMessages: number;
  maxMessagesPerQuery: number;
  contextWindowSize: number;
  temperature: number;
}

interface MessageMetadata extends RecordMetadata {
  messageId: string;
  channelId: string;
  channelType: string;
  channelName: string;
  senderId: string;
  timestamp: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  isEdited: boolean;
  parentId: string;
  threadContext: 'main' | 'reply';
  // Chunk information
  chunkIndex: number;
  totalChunks: number;
  isChunked: boolean;
  chunkStart: number; // Token position where this chunk starts
  chunkEnd: number;   // Token position where this chunk ends
}

interface MessageVector {
  id: string;
  values: number[];
  metadata: MessageMetadata;
}

interface PineconeMatch {
  id: string;
  score?: number;
  values?: number[];
  metadata?: Record<string, any>;
}

const generateMessageMetadata = (
  message: Message, 
  channel: { type: string, name: string },
  chunkInfo?: {
    chunkIndex: number;
    totalChunks: number;
    chunkStart: number;
    chunkEnd: number;
  }
): MessageMetadata => {
  return {
    messageId: message.id,
    channelId: message.channel_id,
    channelType: channel.type,
    channelName: channel.name,
    senderId: message.sender_id,
    timestamp: new Date(message.created_at).toISOString(),
    content: message.content,
    type: message.type,
    isEdited: message.is_edited,
    parentId: message.parent_id || '',
    threadContext: message.parent_id ? 'reply' : 'main',
    // Chunk information
    chunkIndex: chunkInfo?.chunkIndex ?? 0,
    totalChunks: chunkInfo?.totalChunks ?? 1,
    isChunked: chunkInfo !== undefined,
    chunkStart: chunkInfo?.chunkStart ?? 0,
    chunkEnd: chunkInfo?.chunkEnd ?? message.content.length
  };
};

export class RAGService {
  private client: SupabaseClient<Database>;
  private pinecone!: Pinecone;
  private embeddings!: OpenAIEmbeddings;
  private llm!: ChatOpenAI;
  private config: RAGConfig;
  private indexName: string;
  private namespace: string;

  constructor(token: string) {
    this.client = process.env.NODE_ENV === 'test' ? supabaseAdmin : getClientWithToken(token);
    this.config = {
      nQueries: 5,
      nMessages: 5,
      maxMessagesPerQuery: 10,
      contextWindowSize: 4000,
      temperature: 0.7
    };
    this.indexName = process.env.PINECONE_INDEX_NAME || 'chat-genius-rag';
    this.namespace = process.env.NODE_ENV === 'test' ? 'test' : 'production';
  }

  /**
   * Initialize connections to Pinecone and OpenAI
   * @throws Error if environment variables are missing or initialization fails
   */
  async initialize(): Promise<void> {
    // Validate environment variables
    const requiredEnvVars = {
      PINECONE_API_KEY: process.env.PINECONE_API_KEY,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY
    };

    for (const [key, value] of Object.entries(requiredEnvVars)) {
      if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
      }
    }

    try {
      // Initialize Pinecone
      this.pinecone = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY!
      });

      // Initialize OpenAI embeddings with retry configuration
      this.embeddings = new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY,
        modelName: 'text-embedding-3-small',
        configuration: {
          maxRetries: 3,
          timeout: 30000
        }
      });

      // Initialize ChatGPT model
      this.llm = new ChatOpenAI({
        openAIApiKey: process.env.OPENAI_API_KEY,
        modelName: 'gpt-4o-mini-2024-07-18',
        temperature: this.config.temperature,
        maxTokens: this.config.contextWindowSize,
        configuration: {
          maxRetries: 3,
          timeout: 60000
        }
      });

      // Verify Pinecone index exists
      const indexes = await this.pinecone.listIndexes();
      const indexExists = indexes.indexes?.some(
        (index: { name: string }) => index.name === this.indexName
      );
      
      if (!indexExists) {
        throw new Error(`Pinecone index '${this.indexName}' does not exist`);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to initialize RAG service: ${errorMessage}`);
    }
  }

  /**
   * Process and vectorize a new message for storage
   */
  async processMessage(message: Message): Promise<void> {
    try {
      // Get channel information for metadata
      const { data: channel, error: channelError } = await supabaseAdmin
        .from('channels')
        .select('type, name')
        .eq('id', message.channel_id)
        .single();

      if (channelError) throw channelError;
      if (!channel) throw new Error(`Channel of message ${message.id} not found`);

      // Generate embedding for message content
      const embedding = await this.embeddings.embedQuery(message.content);

      // Create vector with metadata
      const messageVector: MessageVector = {
        id: message.id,
        values: embedding,
        metadata: generateMessageMetadata(message, channel)
      };

      // Get the Pinecone index
      const index = this.pinecone.index(this.indexName);

      // Upsert the vector
      await index.upsert([messageVector]);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to process message: ${errorMessage}`);
    }
  }

  /**
   * Batch process multiple messages (useful for initial data load)
   */
  async batchProcessMessages(messages: Message[]): Promise<void> {
    try {
      // Get unique channel IDs from messages
      const channelIds = [...new Set(messages.map(m => m.channel_id))];

      // Fetch channel information in bulk
      const { data: channels, error: channelError } = await this.client
        .from('channels')
        .select('id, type, name')
        .in('id', channelIds);

      if (channelError) throw channelError;
      if (!channels) throw new Error('Failed to fetch channel information');

      // Create channel lookup map
      const channelMap = new Map(channels.map(c => [c.id, c]));

      // Process in batches of 100 (Pinecone's limit)
      const BATCH_SIZE = 100;
      for (let i = 0; i < messages.length; i += BATCH_SIZE) {
        const batch = messages.slice(i, i + BATCH_SIZE);

        // Generate embeddings in parallel
        const embeddings = await Promise.all(
          batch.map(message => this.embeddings.embedQuery(message.content))
        );

        // Create vectors with metadata
        const vectors: MessageVector[] = batch.map((message, index) => {
          const channel = channelMap.get(message.channel_id);
          if (!channel) throw new Error(`Channel not found for message: ${message.id}`);

          return {
            id: message.id,
            values: embeddings[index],
            metadata: generateMessageMetadata(message, channel)
          };
        });

        // Get the Pinecone index
        const index = this.pinecone.index(this.indexName);

        // Upsert batch
        await index.upsert(vectors);

        // Add a small delay between batches to avoid rate limiting
        if (i + BATCH_SIZE < messages.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to batch process messages: ${errorMessage}`);
    }
  }

  /**
   * Perform RAG Fusion search across message vectors
   */
  private async performRAGFusion(
    query: string,
    channelId: string,
    targetUserId: string
  ): Promise<MessageVector[]> {
    try {
      // Generate multiple search queries using the LLM
      const queryPrompt = `Generate multiple search queries related to: ${query}`;
      const messages = [
        { role: 'system', content: 'You are a helpful assistant that generates multiple search queries based on a single input query.' },
        { role: 'user', content: queryPrompt },
        { role: 'user', content: `OUTPUT (${this.config.nQueries} queries):` }
      ];
      
      const completion = await this.llm.invoke(messages);
      const queries = completion.content.toString().split('\n')
        .filter((q: string) => q.trim())
        .slice(0, this.config.nQueries); // Ensure we only get nQueries queries

      console.log("Queries:", queries)

      // Get the Pinecone index
      const index = this.pinecone.index(this.indexName);

      // Define metadata filter for public channels and specific channel
      const metadataFilter = {
        $and: [
          {
            $or: [
              { channelType: 'public' },
              { channelId: channelId }
            ]
          },
          { senderId: targetUserId }
        ]
      };

      // Perform parallel vector searches for each query
      const searchResults = await Promise.all(
        queries.map(async (query: string) => {
          const embedding = await this.embeddings.embedQuery(query);
          const results = await index.query({
            vector: embedding,
            filter: metadataFilter,
            topK: this.config.maxMessagesPerQuery,
            includeMetadata: true
          });
          return results.matches || [];
        })
      );

      console.log("Search Results:", searchResults)

      // Apply reciprocal rank fusion
      const k = 60; // RRF constant, can be tuned
      const fusedScores: Map<string, { score: number; vector: MessageVector }> = new Map();

      // Calculate fused scores
      searchResults.forEach((queryResults: PineconeMatch[]) => {
        queryResults.forEach((match: PineconeMatch, rank: number) => {
          const messageVector: MessageVector = {
            id: match.id,
            values: match.values || [],
            metadata: match.metadata as MessageMetadata
          };

          const currentScore = fusedScores.get(match.id)?.score || 0;
          const rrf_score = 1 / (rank + k);
          
          fusedScores.set(match.id, {
            score: currentScore + rrf_score,
            vector: messageVector
          });
        });
      });

      console.log("Fused Scores:", fusedScores)

      // Sort by fused scores and return vectors
      const sortedResults = Array.from(fusedScores.values())
        .sort((a, b) => b.score - a.score)
        .filter(result => result.score >= this.config.nQueries / (k + 2 * this.config.nMessages))
        .map(result => result.vector);

      console.log("Sorted, filtered results:", sortedResults)
      return sortedResults;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to perform RAG Fusion search: ${errorMessage}`);
    }
  }

  /**
   * Generate LLM response based on retrieved context
   */
  private async generateResponse(
    query: string,
    context: MessageVector[],
    userStyle: Profile
  ): Promise<string> {
    try {
      // Sort context by relevance score (assuming they're already scored)
      const contentContext = context.slice(0, this.config.nMessages); // Top nMessages most relevant messages for content
      
      // Get additional messages for style analysis
      const index = this.pinecone.index(this.indexName);
      const styleResults = await index.query({
        vector: await this.embeddings.embedQuery("general conversation casual chat"),
        filter: {
          senderId: userStyle.id
        },
        topK: 10,
        includeMetadata: true
      });

      // Extract style examples
      const styleExamples = (styleResults.matches || [])
        .map(match => (match.metadata as MessageMetadata).content)
        .slice(0, this.config.nMessages); // Top 5 messages for style analysis

      // Format the context sections
      const relevantContent = contentContext
        .map(msg => `- ${msg.metadata.content}`)
        .join('\n');

      const writingStyle = styleExamples
        .map(msg => `- ${msg}`)
        .join('\n');

      // Construct the prompt
      const prompt = [
        {
          role: 'system',
          content: `You are an AI assistant that helps respond to questions in the style of a specific user. 
You have access to:
1. The user's relevant previous messages about the topic
2. Examples of their general writing style
3. Their profile information

Guidelines:
- Use the relevant messages to inform the content of your response
- Mimic the user's writing style, tone, and typical message length
- Consider their role and professional context
- Be consistent with their past responses
- Maintain their level of formality and use of emoji/formatting if any

Profile Information:
Name: ${userStyle.full_name || 'Unknown'}
Title: ${userStyle.title || 'Unknown'}
Bio: ${userStyle.bio || 'Not provided'}`
        },
        {
          role: 'user',
          content: `Question: "${query}"

Relevant Previous Messages:
${relevantContent}

Writing Style Examples:
${writingStyle}

Generate a response that sounds like it comes from this user, incorporating relevant information from their previous messages while matching their communication style.`
        }
      ];

      console.log("Prompt:", prompt[1])

      const completion = await this.llm.invoke(prompt);
      return completion.content.toString();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to generate response: ${errorMessage}`);
    }
  }

  /**
   * Handle an @mention query in a channel
   */
  async handleMentionQuery(
    query: string,
    channelId: string,
    mentionedUserId: string
  ): Promise<RAGQueryResult> {
    try {
      // Validate user has access to the channel
      const { data: membership, error: membershipError } = await this.client
        .from('channel_members')
        .select('role')
        .eq('channel_id', channelId)
        .eq('profile_id', mentionedUserId)
        .single();

      if (membershipError || !membership) {
        throw new Error('Mentioned user is not a member of this channel');
      }

      // Get user profile for style matching
      const { data: userProfile, error: profileError } = await this.client
        .from('profiles')
        .select('*')
        .eq('id', mentionedUserId)
        .single();

      if (profileError || !userProfile) {
        throw new Error('User profile not found');
      }

      // Start performance tracking
      const startTime = Date.now();

      // Perform RAG Fusion search
      const relevantVectors = await this.performRAGFusion(
        query,
        channelId,
        mentionedUserId
      );

      // Get the actual messages from the database for the response
      const messageIds = relevantVectors.map(v => v.metadata.messageId);
      const { data: relevantMessages, error: messagesError } = await this.client
        .from('messages')
        .select('*, sender:profiles(*)')
        .in('id', messageIds);

      if (messagesError) {
        throw new Error('Failed to fetch relevant messages');
      }

      // Generate response using context and user style
      const response = await this.generateResponse(
        query,
        relevantVectors,
        userProfile
      );

      // Calculate confidence score based on:
      // 1. Number of relevant messages found
      // 2. Average relevance score of top messages
      // 3. Coverage of query topics
      const avgScore = relevantVectors.slice(0, 3).reduce(
        (sum, vector, _, arr) => {
          const score = (vector as any).score || 0;
          return sum + score / arr.length;
        },
        0
      );

      const messageCountScore = (Math.min(relevantVectors.length, 5) / 5) * 0.4;
      const relevanceScore = avgScore * 0.6;
      const confidence = Math.min(0.95, messageCountScore + relevanceScore); // Cap at 0.95 to account for uncertainty

      // Track metrics
      const endTime = Date.now();
      await this.client.from('rag_metrics').insert({
        query,
        channel_id: channelId,
        target_user_id: mentionedUserId,
        response_time_ms: endTime - startTime,
        message_count: relevantVectors.length,
        confidence_score: confidence,
        timestamp: new Date().toISOString()
      });

      return {
        response,
        relevantMessages: relevantMessages || [],
        confidence
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to handle mention query: ${errorMessage}`);
    }
  }

  /**
   * Update or delete vectors for modified/deleted messages
   */
  async updateMessageVectors(messageId: string, newContent?: string): Promise<void> {
    try {
      const index = this.pinecone.index(this.indexName);

      // If newContent is undefined, this is a deletion
      if (newContent === undefined) {
        await index.deleteOne(messageId);
        return;
      }

      // Get the existing message and channel info
      const { data: message, error: messageError } = await this.client
        .from('messages')
        .select('*, channel:channels!inner(type, name)')
        .eq('id', messageId)
        .single();

      if (messageError || !message) {
        throw new Error(`Failed to fetch message ${messageId}`);
      }

      // Generate new embedding for updated content
      const embedding = await this.embeddings.embedQuery(newContent);

      // Create updated vector with metadata
      const messageVector: MessageVector = {
        id: messageId,
        values: embedding,
        metadata: generateMessageMetadata(
          {
            ...message,
            content: newContent // Use the new content
          },
          {
            type: message.channel.type,
            name: message.channel.name
          }
        )
      };

      // Upsert the updated vector
      await index.upsert([messageVector]);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to update message vectors: ${errorMessage}`);
    }
  }

  /**
   * Get usage metrics and statistics
   */
  async getMetrics(): Promise<{
    totalVectors: number;
    averageLatency: number;
    queryCount: number;
  }> {
    try {
      // Get metrics from the database
      const { data: metrics, error: metricsError } = await this.client
        .from('rag_metrics')
        .select('response_time_ms')
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

      if (metricsError) throw metricsError;

      // Get index stats from Pinecone
      const index = this.pinecone.index(this.indexName);
      const stats = await index.describeIndexStats();

      // Calculate average latency
      const avgLatency = metrics && metrics.length > 0
        ? metrics.reduce((sum, m) => sum + m.response_time_ms, 0) / metrics.length
        : 0;

      return {
        totalVectors: stats.totalRecordCount || 0,
        averageLatency: avgLatency,
        queryCount: metrics?.length || 0
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to get metrics: ${errorMessage}`);
    }
  }

  /**
   * Clean up resources and connections
   */
  async cleanup(): Promise<void> {
    try {
      // Clear any pending operations
      await Promise.all([
        // Wait for any pending Pinecone operations
        this.pinecone.index(this.indexName).describeIndexStats()
      ]);

      // Reset instance variables
      this.pinecone = null as any;
      this.embeddings = null as any;
      this.llm = null as any;

      // Force garbage collection of any large objects
      if (global.gc) {
        global.gc();
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to cleanup RAG service: ${errorMessage}`);
    }
  }
} 