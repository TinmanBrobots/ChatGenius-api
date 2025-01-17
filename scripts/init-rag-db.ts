import { RAGService } from '../src/services/rag.service';
import { supabaseAdmin } from '../src/config/supabase';
import dotenv from 'dotenv';
import { Message } from '../src/types/database';
import { encode, decode } from 'gpt-tokenizer';

dotenv.config();

const BATCH_SIZE = 100; // Number of messages to fetch and process at once
const MAX_TOKENS_PER_CHUNK = 1024; // Leave some buffer for metadata

interface MessageChunk {
  originalMessage: Message;
  content: string;
  chunkIndex: number;
  totalChunks: number;
  chunkStart: number;
  chunkEnd: number;
}

function chunkMessage(message: Message): MessageChunk[] {
  const tokens = encode(message.content);
  
  // If message is small enough, return as single chunk
  if (tokens.length <= MAX_TOKENS_PER_CHUNK) {
    return [{
      originalMessage: message,
      content: message.content,
      chunkIndex: 0,
      totalChunks: 1,
      chunkStart: 0,
      chunkEnd: tokens.length
    }];
  }

  const chunks: MessageChunk[] = [];
  let currentChunk: number[] = [];
  let chunkStart = 0;
  let chunkIndex = 0;

  // First pass: create chunks based on token counts
  for (let i = 0; i < tokens.length; i++) {
    currentChunk.push(tokens[i]);
    
    // Check if we've reached max size or end of message
    const isLastToken = i === tokens.length - 1;
    const chunkIsFull = currentChunk.length >= MAX_TOKENS_PER_CHUNK;

    if (chunkIsFull || isLastToken) {
      chunks.push({
        originalMessage: message,
        content: decode(currentChunk),
        chunkIndex: chunkIndex,
        totalChunks: 0, // Will be updated after all chunks are created
        chunkStart: chunkStart,
        chunkEnd: chunkStart + currentChunk.length
      });

      chunkIndex++;
      chunkStart += currentChunk.length;
      currentChunk = [];
    }
  }

  // Update total chunks count
  return chunks.map(chunk => ({
    ...chunk,
    totalChunks: chunks.length
  }));
}

async function initRAGDatabase() {
  try {
    console.log('🚀 Starting RAG Database Initialization...\n');

    // Initialize RAG service
    const ragService = new RAGService(process.env.SUPABASE_SERVICE_ROLE_KEY!);
    console.log('✨ Initializing RAG service...');
    await ragService.initialize();
    console.log('✅ RAG service initialized\n');

    let processedCount = 0;
    let processedChunks = 0;
    let lastProcessedId: string | null = null;
    let hasMore = true;

    while (hasMore) {
      // Fetch batch of messages with their channel info
      console.log(`📥 Fetching messages batch (after ID: ${lastProcessedId || 'start'})...`);
      
      // Build the query
      let query = supabaseAdmin
        .from('messages')
        .select(`
          *,
          channel:channels!inner(
            id,
            type,
            name
          )
        `)
        .is('deleted_at', null) // Only process non-deleted messages
        .order('id', { ascending: true })
        .limit(BATCH_SIZE);

      // Add ID filter only if we have a last processed ID
      if (lastProcessedId) {
        query = query.gt('id', lastProcessedId);
      }

      // Execute the query
      const { data: messages, error: messagesError } = await query;

      if (messagesError) {
        throw new Error(`Failed to fetch messages: ${messagesError.message}`);
      }

      if (!messages || messages.length === 0) {
        hasMore = false;
        continue;
      }

      // Process each message and create chunks if necessary
      const messageChunks: MessageChunk[] = messages.flatMap(msg => chunkMessage(msg));
      
      // Process chunks in batches
      for (let i = 0; i < messageChunks.length; i += BATCH_SIZE) {
        const chunkBatch = messageChunks.slice(i, i + BATCH_SIZE);
        console.log(`📦 Processing batch of ${chunkBatch.length} chunks...`);
        
        // Convert chunks to messages with updated content and metadata
        const processedMessages = chunkBatch.map(chunk => ({
          ...chunk.originalMessage,
          content: chunk.content,
          _chunkInfo: {
            chunkIndex: chunk.chunkIndex,
            totalChunks: chunk.totalChunks,
            chunkStart: chunk.chunkStart,
            chunkEnd: chunk.chunkEnd
          }
        }));

        await ragService.batchProcessMessages(processedMessages);
        processedChunks += chunkBatch.length;
      }

      // Update progress
      processedCount += messages.length;
      lastProcessedId = messages[messages.length - 1].id;
      console.log(`✅ Processed ${processedCount} messages (${processedChunks} chunks) total\n`);

      // Add a small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Get final metrics
    console.log('📈 Getting final metrics...');
    const metrics = await ragService.getMetrics();
    console.log('📊 Final Metrics:', {
      ...metrics,
      totalMessagesProcessed: processedCount,
      totalChunksProcessed: processedChunks
    }, '\n');

    // Cleanup
    console.log('🧹 Cleaning up...');
    await ragService.cleanup();
    console.log('✅ Cleanup complete\n');

    console.log(`🎉 RAG Database initialization completed successfully!`);
    console.log(`📊 Total messages processed: ${processedCount} (${processedChunks} chunks)`);
    process.exit(0);

  } catch (error) {
    console.error('❌ Initialization failed:', error);
    process.exit(1);
  }
}

// Run the initialization
initRAGDatabase();

