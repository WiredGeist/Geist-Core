import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-uploaded-documents.ts';
import '@/ai/flows/chat.ts';
import '@/ai/flows/rag-chat.ts';
