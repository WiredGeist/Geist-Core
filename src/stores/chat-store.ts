// src/stores/chat-store.ts

'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useSettings, GoogleModel, OllamaModel } from '@/hooks/use-settings'; // <-- CORRECT IMPORTS
import { invoke } from '@tauri-apps/api/core';

export interface Message { id: string; role: 'user' | 'assistant'; content: string; }
export interface RagDocument { fileName: string; content: string; }

const CONTEXT_PROMPT = `Please answer the following question based on the provided context. If the information is not in the context, state that you cannot answer.

--- CONTEXT ---
{context}
--- END CONTEXT ---

Question: {question}`;

export interface Conversation {
  id: string;
  name: string;
  messages: Message[];
  ragDocuments: RagDocument[];
  updatedAt: number;
  isNew: boolean;
}

interface ChatState {
  conversations: Record<string, Conversation>;
  activeConversationId: string | null;
  isLoading: boolean;
  error: string | null;
  selectedModel: string;
  activeConversation: Conversation | null;
  setSelectedModel: (model: string) => void;
  addMessage: (content: string, context?: string) => void;
  editMessageAndResubmit: (messageId: string, newContent: string) => void;
  startNewConversation: () => void;
  createNewConversation: () => string;
  setActiveConversation: (id: string) => void;
  renameConversation: (id: string, newName: string) => void;
  deleteConversation: (id: string) => void;
  addRagDocument: (doc: RagDocument) => void;
  removeRagDocument: (fileName: string) => void;
  clearCurrentConversation: () => void;
  clearAllData: () => void;
}

const isGGUFModel = (modelId: string) => modelId === 'gguf-local';
// --- CORRECTED LOGIC TO IDENTIFY GOOGLE MODELS ---
const isGoogleModel = (modelId: string) => modelId.startsWith('models/'); 


export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: {},
      activeConversationId: null,
      isLoading: false,
      error: null,
      selectedModel: 'no-models',
      get activeConversation() {
        const id = get().activeConversationId;
        return id ? get().conversations[id] : null;
      },
      setSelectedModel: (model: string) => set({ selectedModel: model }),
      startNewConversation: () => {
        const newId = crypto.randomUUID();
        const newConversation: Conversation = { id: newId, name: 'New Chat', messages: [], ragDocuments: [], updatedAt: Date.now(), isNew: true };
        set(state => ({
          conversations: { ...state.conversations, [newId]: newConversation },
          activeConversationId: newId
        }));
        invoke('clear_rag_context').catch(console.error);
      },
      createNewConversation: () => {
        const newId = crypto.randomUUID();
        const newConversation: Conversation = { id: newId, name: 'New Chat', messages: [], ragDocuments: [], updatedAt: Date.now(), isNew: true };
        set(state => ({
          conversations: { ...state.conversations, [newId]: newConversation },
          activeConversationId: newId
        }));
        invoke('clear_rag_context').catch(console.error);
        return newId;
      },
      setActiveConversation: (id: string) => set({ activeConversationId: id }),
      renameConversation: (id, newName) => {
        set(state => {
          const convo = state.conversations[id];
          if (convo) return { conversations: { ...state.conversations, [id]: { ...convo, name: newName, isNew: false } } };
          return state;
        });
      },
      deleteConversation: (id) => {
        set(state => {
          const newConvos = { ...state.conversations };
          delete newConvos[id];
          let newActiveId = state.activeConversationId;
          if (newActiveId === id) {
            const remaining = Object.values(newConvos).sort((a, b) => b.updatedAt - a.updatedAt);
            newActiveId = remaining.length > 0 ? remaining[0].id : null;
          }
          return { conversations: newConvos, activeConversationId: newActiveId };
        });
        if (Object.keys(get().conversations).length === 0) get().startNewConversation();
      },
      addRagDocument: (doc) => {
        const activeId = get().activeConversationId;
        if (!activeId) return;
        set(state => {
          const convo = state.conversations[activeId];
          if (!convo || convo.ragDocuments.some(d => d.fileName === doc.fileName)) return state;
          return { conversations: { ...state.conversations, [activeId]: { ...convo, ragDocuments: [...convo.ragDocuments, doc] } } };
        });
      },
      removeRagDocument: (fileName) => {
        const activeId = get().activeConversationId;
        if (!activeId) return;
        set(state => {
          const convo = state.conversations[activeId];
          if (!convo) return state;
          return { conversations: { ...state.conversations, [activeId]: { ...convo, ragDocuments: convo.ragDocuments.filter(d => d.fileName !== fileName) } } };
        });
        invoke('clear_rag_context').catch(console.error);
      },
      clearCurrentConversation: () => {
        const activeId = get().activeConversationId;
        if (!activeId) return;
        set(state => {
          const convo = state.conversations[activeId];
          if (!convo) return state;
          return { conversations: { ...state.conversations, [activeId]: { ...convo, messages: [], ragDocuments: [] } } };
        });
        invoke('clear_rag_context').catch(console.error);
      },
      clearAllData: () => {
        set({ conversations: {}, activeConversationId: null });
        invoke('clear_rag_context').catch(console.error);
        get().startNewConversation();
      },

      // --- COMPLETE REWRITE OF THE addMessage FUNCTION ---
      addMessage: async (content: string, context?: string) => {
        let activeId = get().activeConversationId;
        if (!activeId) {
            activeId = get().createNewConversation();
        }

        if (get().conversations[activeId].isNew) {
          get().renameConversation(activeId, content.substring(0, 40));
        }

        const userMessage: Message = { id: crypto.randomUUID(), role: 'user', content: content };
        const assistantMessage: Message = { id: crypto.randomUUID(), role: 'assistant', content: "" };
        
        set(state => {
          const currentConvo = state.conversations[activeId!];
          return {
            conversations: { ...state.conversations, [activeId!]: { ...currentConvo, messages: [...currentConvo.messages, userMessage, assistantMessage] } },
            isLoading: true,
            error: null
          };
        });
        
        try {
          const { settings } = useSettings.getState();
          const { selectedModel } = get();
          const conversationHistory = get().conversations[activeId].messages.slice(0, -2);
          
          let assistantResponse = '';

          // Construct the full prompt including context if it exists
          let promptContent = content;
          if (context && context.trim() !== '') {
            promptContent = CONTEXT_PROMPT.replace('{context}', context).replace('{question}', content);
          }

          const messagesForApi = [...conversationHistory, { role: 'user', content: promptContent }];

          if (isGoogleModel(selectedModel)) {
            if (!settings.googleKey) throw new Error("Google API Key not set.");
            
            // For Gemini, we create a simple string prompt for now
            const prompt = messagesForApi.map(m => `${m.role}: ${m.content}`).join('\n');
            
            assistantResponse = await invoke('call_gemini_api', {
              apiKey: settings.googleKey,
              model: selectedModel.replace('models/', ''),
              prompt: prompt,
            });

          } else if (isGGUFModel(selectedModel)) {
            const res = await fetch('http://localhost:8080/v1/chat/completions', { 
              method: 'POST', 
              headers: {'Content-Type': 'application/json'}, 
              body: JSON.stringify({ model: selectedModel, messages: messagesForApi, stream: false }) // Use non-streaming for simplicity
            });
            if (!res.ok) {
              const errorText = await res.text();
              throw new Error(`GGUF server error: ${res.status} - ${errorText}`);
            }
            const data = await res.json();
            assistantResponse = data.choices[0]?.message?.content || '';

          } else { // This handles Ollama models
            if (!settings.ollamaServer) throw new Error("Ollama server not configured.");
            
            assistantResponse = await invoke('call_ollama_api', {
              ollamaUrl: settings.ollamaServer,
              model: selectedModel,
              messagesJson: JSON.stringify(messagesForApi),
            });
          }

          // Update the final assistant message content
          set(state => {
              const convo = state.conversations[activeId!];
              const lastMsg = convo.messages[convo.messages.length - 1];
              const updatedMsg = { ...lastMsg, content: assistantResponse };
              return { conversations: { ...state.conversations, [activeId!]: { ...convo, messages: [...convo.messages.slice(0, -1), updatedMsg] } } };
          });

        } catch (e: any) {
            const errorMsg = e.toString();
            set(state => {
                const convo = state.conversations[activeId!];
                const lastMsg = convo.messages[convo.messages.length - 1];
                const errorUpdate = { ...lastMsg, content: `Error: ${errorMsg}` };
                return { conversations: { ...state.conversations, [activeId!]: { ...convo, messages: [...convo.messages.slice(0, -1), errorUpdate] } }, error: errorMsg };
            });
        } finally {
          set({ isLoading: false });
        }
      },

      editMessageAndResubmit: (messageId, newContent) => {
        const activeId = get().activeConversationId;
        if (!activeId) return;
        const conversation = get().conversations[activeId];
        const messageIndex = conversation.messages.findIndex(m => m.id === messageId);
        if (messageIndex === -1 || conversation.messages[messageIndex].role !== 'user') return;
        const newHistory = conversation.messages.slice(0, messageIndex);
        set(state => ({
            conversations: { ...state.conversations, [activeId]: { ...state.conversations[activeId], messages: newHistory } }
        }));
        get().addMessage(newContent, undefined);
      },
    }),
    { name: 'geist-chat-storage', storage: createJSONStorage(() => localStorage) }
  )
);