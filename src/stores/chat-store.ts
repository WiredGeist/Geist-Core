'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useSettings } from '@/hooks/use-settings';

import { invoke } from '@tauri-apps/api/core';

export interface Message { id: string; role: 'user' | 'assistant'; content: string; }
export interface RagDocument { fileName: string; content: string; }

// This constant needs to be defined in this file because it is used by the local model logic.
const CONTEXT_PROMPT = `Please answer the following question based on the provided context. If the information is not in the context, state that you cannot answer.

--- CONTEXT ---
{context}
--- END CONTEXT ---

Question: {question}`;

// The 'vectorChunks' and 'DocumentChunk' interfaces are no longer needed here.
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
const isCloudModel = (modelId: string) => ['gpt-', 'claude-', 'gemini', 'models/'].some(p => modelId.startsWith(p));
const isOllamaModel = (modelId: string) => !isGGUFModel(modelId) && !isCloudModel(modelId);


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
            conversations: {
              ...state.conversations,
              [activeId!]: { ...currentConvo, messages: [...currentConvo.messages, userMessage, assistantMessage] }
            },
            isLoading: true,
            error: null
          };
        });
        
        try {
          const { settings } = useSettings.getState();
          const { selectedModel } = get();
          const conversationHistory = get().conversations[activeId].messages.slice(0, -2);
          const isCloudRequest = isCloudModel(selectedModel);

          // --- THIS IS THE MODIFIED SECTION ---
          if (isCloudRequest) {
            // Instead of calling chat() directly, we now fetch from our API route.
            const response = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: selectedModel,
                query: content,
                context: context, // Pass the RAG context
                history: conversationHistory.map(m => ({ role: m.role, content: m.content })),
                googleApiKey: settings.googleKey,
                ollamaServer: settings.ollamaServer
              }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.details || 'API request failed');
            }

            const result = await response.json();

            set(state => {
                const convo = state.conversations[activeId!];
                const lastMsg = convo.messages[convo.messages.length - 1];
                const updatedMsg = { ...lastMsg, content: result.answer };
                return { conversations: { ...state.conversations, [activeId!]: { ...convo, messages: [...convo.messages.slice(0, -1), updatedMsg] } } };
            });

          } else {
            // The local model logic (Ollama/GGUF) remains unchanged as it already uses fetch.
            let finalContentForApi = content;
            if (context && context.trim() !== '') {
                finalContentForApi = CONTEXT_PROMPT.replace('{context}', context).replace('{question}', content);
            }

            const messagesForApi = [
                ...conversationHistory.map(m => ({ role: m.role, content: m.content })),
                { role: 'user', content: finalContentForApi }
            ];

            let endpoint = '';
            let body: BodyInit;

            if (isGGUFModel(selectedModel)) {
                endpoint = 'http://localhost:8080/v1/chat/completions';
                body = JSON.stringify({ model: selectedModel, messages: messagesForApi, stream: true });
            } else {
                if (!settings.ollamaServer) throw new Error("Ollama server address is not configured in settings.");
                endpoint = `${settings.ollamaServer}/api/chat`;
                body = JSON.stringify({ model: selectedModel, messages: messagesForApi, stream: true });
            }
            
            const res = await fetch(endpoint, { method: 'POST', headers: {'Content-Type': 'application/json'}, body });
            if (!res.ok || !res.body) {
              const errorText = await res.text();
              throw new Error(`Request failed: ${res.status} - ${errorText}`);
            }
            
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const decodedChunk = decoder.decode(value);
              const lines = decodedChunk.split('\n').filter(line => line.trim() !== '');
              for (const line of lines) {
                let chunkContent = '';
                try {
                  if (isGGUFModel(selectedModel)) {
                      if (line.startsWith('data: ')) {
                        const jsonStr = line.substring(6);
                        if (jsonStr.trim() === '[DONE]') continue;
                        chunkContent = JSON.parse(jsonStr).choices?.[0]?.delta?.content || '';
                      }
                  } else {
                      chunkContent = JSON.parse(line).message?.content || '';
                  }
                } catch (e) { /* Ignore parsing errors */ }
                
                if (chunkContent) {
                  set(state => {
                    const convo = state.conversations[activeId!];
                    const lastMsg = convo.messages[convo.messages.length - 1];
                    const updatedMsg = { ...lastMsg, content: lastMsg.content + chunkContent };
                    return { conversations: { ...state.conversations, [activeId!]: { ...convo, messages: [...convo.messages.slice(0, -1), updatedMsg] } } };
                  });
                }
              }
            }
          }
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