// src/ai/flows/web-search-assisted-chat.ts

//'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { search as ddgSearch, SafeSearchType } from 'duck-duck-scrape';

const WebSearchToolInputSchema = z.object({
  query: z.string().describe('The search query.'),
});

export type WebSearchToolInput = z.infer<typeof WebSearchToolInputSchema>;

export async function webSearchHandler(input: WebSearchToolInput): Promise<string> {
  try {
    const searchResults = await ddgSearch(input.query, {
      safeSearch: SafeSearchType.STRICT,
    });

    if (!searchResults.results || searchResults.results.length === 0) {
      return 'No results found.';
    }

    const snippet = searchResults.results
      .slice(0, 5)
      .map(result => result.description)
      .join('\n');
    return snippet;
  } catch (error) {
    console.error('DuckDuckGo search error:', error);
    return 'An error occurred while performing the web search.';
  }
}

export const webSearch = ai.defineTool(
  {
    name: 'webSearch',
    description: 'Performs a web search using DuckDuckGo to find real-time or very recent information.',
    inputSchema: WebSearchToolInputSchema,
    outputSchema: z.string(),
  },
  webSearchHandler
);