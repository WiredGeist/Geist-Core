// RAG with File System flow
//'use server';

/**
 * @fileOverview A flow to allow users to upload documents and then ask questions about those documents.
 *
 * - ragChat - A function that handles the retrieval-augmented generation process.
 * - RagChatInput - The input type for the ragChat function.
 * - RagChatOutput - The return type for the ragChat function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RagChatInputSchema = z.object({
  documentContent: z
    .string()
    .describe('The content of the document to be used for retrieval-augmented generation.'),
  query: z.string().describe('The query from the user.'),
});
export type RagChatInput = z.infer<typeof RagChatInputSchema>;

const RagChatOutputSchema = z.object({
  answer: z.string().describe('The answer to the query, augmented by the document content.'),
});
export type RagChatOutput = z.infer<typeof RagChatOutputSchema>;

export async function ragChat(input: RagChatInput): Promise<RagChatOutput> {
  return ragChatFlow(input);
}

const prompt = ai.definePrompt({
  name: 'ragChatPrompt',
  input: {schema: RagChatInputSchema},
  output: {schema: RagChatOutputSchema},
  prompt: `You are a helpful assistant that answers questions based on the content of a document.
Use the document content to answer the question.

Question: {{{query}}}

Document Content: {{{documentContent}}}`,
});

const ragChatFlow = ai.defineFlow(
  {
    name: 'ragChatFlow',
    inputSchema: RagChatInputSchema,
    outputSchema: RagChatOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
