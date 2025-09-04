// src/ai/flows/chat.ts

'use server';

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { ollama } from 'genkitx-ollama';
import { z } from 'genkit';
import { webSearch, webSearchHandler, WebSearchToolInput } from './web-search-assisted-chat';
import { MessageData, ToolResponsePart } from '@genkit-ai/ai/model';

// --- CHANGE 1: ADD 'context' TO THE INPUT SCHEMA ---
// This is the most critical fix. It tells TypeScript that the 'chat' function
// is allowed to receive an optional 'context' string.
const ChatInputSchema = z.object({
  model: z.string().describe('The model to use for the chat.'),
  query: z.string().describe('The user query.'),
  context: z.string().optional().describe('RAG context retrieved from documents.'), // <-- THE FIX IS HERE
  history: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() })).describe('The conversation history.'),
  enableWebSearch: z.boolean().optional().describe('Whether to enable web search.'),
  googleApiKey: z.string().optional().describe('Google API Key if required.'),
  ollamaServer: z.string().optional().describe('Ollama Server address if required.'),
});
export type ChatInput = z.infer<typeof ChatInputSchema>;

const ChatOutputSchema = z.object({
  answer: z.string().describe('The answer to the query.'),
});
export type ChatOutput = z.infer<typeof ChatOutputSchema>;

export async function chat({
  model,
  query,
  context, // <-- CHANGE 2: Accept the context variable
  history,
  enableWebSearch,
  googleApiKey,
  ollamaServer,
}: ChatInput): Promise<ChatOutput> {

  const plugins = [];
  if (model.startsWith('gemini-')) {
    if (googleApiKey) {
      plugins.push(googleAI({ apiKey: googleApiKey }));
    } else {
      plugins.push(googleAI());
    }
  } else {
    if (ollamaServer && ollamaServer.trim() !== '') {
      plugins.push(ollama({ serverAddress: ollamaServer }));
    } else {
      plugins.push(ollama({}));
    }
  }

  const ai = genkit({ plugins });

  let modelIdentifier;
  if (model.startsWith('gemini-')) {
    modelIdentifier = googleAI.model(model as any);
  } else {
    modelIdentifier = `ollama/${model}`;
  }
  
  const tools = enableWebSearch ? [webSearch] : [];

  // Convert your simple history to the required Genkit MessageData format
  const messages: MessageData[] = history.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    content: [{ text: msg.content }],
  }));

  // --- CHANGE 3: CONSTRUCT THE FINAL PROMPT WITH RAG CONTEXT ---
  // We create a final query that includes the context if it exists.
  // This is the instruction for the AI model.
  let finalQuery = query;
  if (context && context.trim() !== '') {
    finalQuery = `Please answer the following question based *only* on the context provided below. If the information to answer the question is not in the context, state that you cannot answer based on the provided documents.

## Context:
${context}

## Question:
${query}`;
  }

  // Add the user's final query (which may include the RAG instructions) to the message history
  messages.push({ role: 'user', content: [{ text: finalQuery }] });

  let response = await ai.generate({
    model: modelIdentifier,
    messages: messages,
    tools: tools,
  });

  // This tool-use loop remains unchanged and correct.
  while (response.toolRequests && response.toolRequests.length > 0) {
    const toolResponses: ToolResponsePart[] = await Promise.all(
      response.toolRequests.map(async (toolRequestMessage) => {
        const request = toolRequestMessage.toolRequest;
        let output: any;
        if (request.name === 'webSearch') {
          output = await webSearchHandler(request.input as WebSearchToolInput);
        } else {
          throw new Error(`Model requested an unknown tool: ${request.name}`);
        }
        return { toolResponse: { name: request.name, output: output } };
      })
    );
    if (response.message) {
      messages.push(response.message);
    }
    messages.push({ role: 'tool', content: toolResponses });
    response = await ai.generate({ model: modelIdentifier, messages: messages, tools: tools });
  }

  const answerText = response.text;

  if (!answerText || answerText.trim() === '') {
    throw new Error('The AI returned an empty or null response.');
  }
    
  return { answer: answerText };
}