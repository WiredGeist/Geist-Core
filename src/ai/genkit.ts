// src/ai/genkit.ts

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { ollama } from 'genkitx-ollama';

// This central configuration makes all plugins available to the single 'ai' instance.
export const ai = genkit({
  plugins: [
    googleAI(),
    ollama(),
  ],
});