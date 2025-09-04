// src/hooks/use-settings.ts

'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// --- NEW TYPES FOR MODELS ---
export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
}
export interface GoogleModel {
  name: string;
}

export interface Settings {
    localModelPath?: string;
    embeddingModelPath?: string;
    ollamaServer?: string;
    activeOllamaModel?: string;
    openAIKey?: string;
    anthropicKey?: string;
    googleKey?: string;
    // --- ADDED THESE TWO LINES ---
    ollamaModels?: OllamaModel[];
    googleModels?: GoogleModel[];
    
    port?: number;
    host?: string;
    remoteTunnel?: boolean;
    enableWebsearch?: boolean;
    sslCertPath?: string;
    sslKeyPath?: string;
    password?: string;
    maxRequestSize?: number;
    ttsProvider?: "piper" | "elevenlabs" | "openai";
    elevenLabsKey?: string;
    searchProvider?: "duckduckgo" | "google" | "bing" | "brave" | "serpapi" | "serper";
    googleSearchApiKey?: string;
    googleSearchEngineId?: string;
    bingSearchApiKey?: string;
    braveSearchApiKey?: string;
    serpApiKey?: string;
    serperApiKey?: string;
    llamaCppHardware?: "cpu" | "cuda";
    llamaCppGpuId?: number;
    llamaCppAutoDetectGpu?: boolean;
    llamaCppMmq?: boolean;
    llamaCppGpuLayers?: number;
    llamaCppLaunchBrowser?: boolean;
    llamaCppUserContextShift?: boolean;
    llamaCppQuietMode?: boolean;
    llamaCppMmap?: boolean;
    llamaCppFlashAttention?: boolean;
    llamaCppContextSize?: number;
    llamaCppThreads?: number;
    llamaCppBlasThreads?: number;
    llamaCppBlasBatchSize?: number;

    llamaCppLowVram?: boolean;
    llamaCppRowSplit?: boolean;
    llamaCppTensorSplit?: string;
    llamaCppMainGpu?: number;
    chatMemory?: boolean;
}

interface SettingsState {
  settings: Settings;
  // --- UPDATED setSettings TO ACCEPT PARTIAL UPDATES ---
  setSettings: (newSettings: Partial<Settings>) => void;
}

const defaultSettings: Settings = {
    localModelPath: "",
    embeddingModelPath: "",
    ollamaServer: "http://localhost:11434", // Set a default for convenience
    openAIKey: "",
    anthropicKey: "",
    googleKey: "",
    // --- ADDED DEFAULTS FOR THE NEW ARRAYS ---
    ollamaModels: [],
    googleModels: [],

    port: 9002,
    host: "0.0.0.0",
    remoteTunnel: false,
    enableWebsearch: true,
    sslCertPath: "",
    sslKeyPath: "",
    password: "",
    maxRequestSize: 32,
    ttsProvider: "piper",
    elevenLabsKey: "",
    searchProvider: "duckduckgo",
    googleSearchApiKey: "",
    googleSearchEngineId: "",
    bingSearchApiKey: "",
    braveSearchApiKey: "",
    serpApiKey: "",
    serperApiKey: "",
    llamaCppHardware: "cpu",
    llamaCppGpuId: 0,
    llamaCppAutoDetectGpu: true,
    llamaCppMmq: true,
    llamaCppGpuLayers: 0,
    llamaCppLaunchBrowser: false,
    llamaCppUserContextShift: true,
    llamaCppQuietMode: true,
    llamaCppMmap: true,
    llamaCppFlashAttention: false,
    llamaCppContextSize: 8192,
    llamaCppThreads: 8,
    llamaCppBlasBatchSize: 512,
    llamaCppLowVram: false,
    llamaCppRowSplit: false,
    llamaCppTensorSplit: "",
    llamaCppMainGpu: 0,
    chatMemory: true,
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      // --- THIS IS THE IMPROVED setSettings FUNCTION ---
      // It merges new settings instead of replacing the whole object.
      setSettings: (newSettings: Partial<Settings>) => set((state) => ({ 
        settings: { ...state.settings, ...newSettings }
      })),
    }),
    {
      name: 'geist-settings-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);