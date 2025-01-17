import { RAGService } from '../src/services/rag.service';
import dotenv from 'dotenv';

dotenv.config();
const ragService = new RAGService(process.env.SUPABASE_SERVICE_ROLE_KEY!);

const runTestScript = async () => {
	await ragService.initialize();
	const rsp = await ragService.handleMentionQuery(
		'What stocks should I invest in this year?',
		'6d49f7f8-2a96-4516-a407-8c4eb228d5ca',
		'6e06da96-e5d3-46fe-92ce-9fd859825393'
	);
	
	console.log(rsp.response);
}

runTestScript();
