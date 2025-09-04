'use server';

/**
 * @fileOverview A flow to summarize uploaded documents.
 *
 * - summarizeUploadedDocuments - A function that handles the summarization of uploaded documents.
 * - SummarizeUploadedDocumentsInput - The input type for the summarizeUploadedDocuments function.
 * - SummarizeUploadedDocumentsOutput - The return type for the summarizeUploadedDocuments function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeUploadedDocumentsInputSchema = z.object({
  documentContent: z
    .string()
    .describe('The content of the document to be summarized.'),
  query: z.string().describe('The summarization query from the user.'),
});
export type SummarizeUploadedDocumentsInput = z.infer<
  typeof SummarizeUploadedDocumentsInputSchema
>;

const SummarizeUploadedDocumentsOutputSchema = z.object({
  summary: z.string().describe('The summary of the document.'),
});
export type SummarizeUploadedDocumentsOutput = z.infer<
  typeof SummarizeUploadedDocumentsOutputSchema
>;

export async function summarizeUploadedDocuments(
  input: SummarizeUploadedDocumentsInput
): Promise<SummarizeUploadedDocumentsOutput> {
  return summarizeUploadedDocumentsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeUploadedDocumentsPrompt',
  input: {schema: SummarizeUploadedDocumentsInputSchema},
  output: {schema: SummarizeUploadedDocumentsOutputSchema},
  prompt: `You are an expert summarizer of documents.  Please summarize the following document content, based on the user's query.

User Query: {{{query}}}

Document Content: {{{documentContent}}}`,
});

const summarizeUploadedDocumentsFlow = ai.defineFlow(
  {
    name: 'summarizeUploadedDocumentsFlow',
    inputSchema: SummarizeUploadedDocumentsInputSchema,
    outputSchema: SummarizeUploadedDocumentsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
