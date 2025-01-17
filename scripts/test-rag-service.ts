import { RAGService } from '../src/services/rag.service';
import { supabaseAdmin } from '../src/config/supabase';
import dotenv from 'dotenv';

dotenv.config();

async function testRAGService() {
  try {
    console.log('🚀 Starting RAG Service Test...\n');

    // Initialize RAG service with admin token
    const ragService = new RAGService(process.env.SUPABASE_SERVICE_ROLE_KEY!);
    console.log('✨ Initializing RAG service...');
    await ragService.initialize();
    console.log('✅ RAG service initialized\n');

    // Test message to process
    const messageId = 'a59da121-733b-445c-bd4f-43551e32a14e';
    
    // Fetch the message and related data
    console.log('📥 Fetching test message...');
    const { data: message, error: messageError } = await supabaseAdmin
      .from('messages')
      .select(`
        *,
        channel:channels!inner(
          id,
          type,
          name
        ),
        sender:profiles!inner(
          id,
          username,
          full_name
        )
      `)
      .eq('id', messageId)
      .single();

    if (messageError || !message) {
      throw new Error(`Failed to fetch message: ${messageError?.message || 'Message not found'}`);
    }
    console.log('✅ Test message fetched:', {
      id: message.id,
      content: message.content,
      channel: message.channel.name,
      sender: message.sender.username
    }, '\n');

    // Test batch processing
    console.log('📦 Testing batch message processing...');
    await ragService.batchProcessMessages([message]);
    console.log('✅ Batch processing complete\n');

    // Test single message processing
    console.log('📝 Testing single message processing...');
    await ragService.processMessage(message);
    console.log('✅ Single message processing complete\n');

    // Test message vector update
    console.log('🔄 Testing message vector update...');
    const updatedContent = "Cats are inhabiting the radioactive ruins of the old world";
    await ragService.updateMessageVectors(message.id, updatedContent);
    console.log('✅ Message vector updated\n');

    // Test RAG query
    console.log('🔍 Testing RAG query...');
    const testQuery = 'Where are the cats?';
    const result = await ragService.handleMentionQuery(
      testQuery,
      message.channel.id,
      message.sender.id
    );
    console.log('📊 Query Results:', {
      query: testQuery,
      response: result.response,
      confidence: result.confidence,
      relevantMessages: result.relevantMessages.length
    }, '\n');

    // Get metrics
    console.log('📈 Getting RAG metrics...');
    const metrics = await ragService.getMetrics();
    console.log('📊 Current Metrics:', metrics, '\n');

    // Cleanup
    console.log('🧹 Cleaning up...');
    await ragService.cleanup();
    console.log('✅ Cleanup complete\n');

    console.log('🎉 All tests completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testRAGService();