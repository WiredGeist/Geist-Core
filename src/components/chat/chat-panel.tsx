// src/components/chat/chat-panel.tsx

'use client';

import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useChatStore } from '@/stores/chat-store';
import { useSettings, GoogleModel, OllamaModel } from '@/hooks/use-settings'; // <-- IMPORT NEW TYPES
import { useToast } from '@/hooks/use-toast';
import { waitForLlamaServer } from '@/lib/llama-server-utils';
import { ChatMessages } from '@/components/chat/chat-messages';
import { ChatInput } from '@/components/chat/chat-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { RagManager } from './rag-manager';

// This interface is now defined globally in use-settings.ts, so it's removed from here.

export function ChatPanel() {
  const { settings, setSettings } = useSettings(); // <-- GET setSettings
  const { toast } = useToast();
  // --- REMOVED LOCAL STATE FOR MODELS AND LOADING ---
  const [isRagManagerOpen, setIsRagManagerOpen] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isChangingModel, setIsChangingModel] = useState(false);

  const { addMessage, isLoading, selectedModel, setSelectedModel, createNewConversation } = useChatStore();
  const activeConversation = useChatStore(state => state.activeConversationId ? state.conversations[state.activeConversationId] : null);
  const isGGUFLoaded = useChatStore(state => state.selectedModel === 'gguf-local');
  const isRagActive = useChatStore(state => !!activeConversation?.ragDocuments && activeConversation.ragDocuments.length > 0);

  // --- READ MODELS FROM GLOBAL STATE ---
  const ollamaModels: OllamaModel[] = settings.ollamaModels || [];
  const googleModels: GoogleModel[] = settings.googleModels || [];

  const startLlamaCppServer = async (modelPathToLoad: string, isEmbedding: boolean): Promise<boolean> => {
    if (!modelPathToLoad) {
      toast({ variant: "destructive", title: "Model Not Configured", description: "A GGUF model path is required." });
      return false;
    }
    try {
      await invoke('start_llama_server', {
        args: {
          modelPath: modelPathToLoad,
          gpuLayers: settings.llamaCppGpuLayers,
          contextSize: settings.llamaCppContextSize,
          threads: settings.llamaCppThreads,
          flashAttn: settings.llamaCppFlashAttention,
          mainGpu: settings.llamaCppMainGpu,
          tensorSplit: settings.llamaCppTensorSplit,
          embedding: isEmbedding,
        },
      });
      return true;
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error Starting Server", description: `Could not start server: ${error}` });
      return false;
    }
  };

  const stopGGUFServer = async () => {
    try {
      await invoke('stop_llama_server');
      return true;
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: `Could not stop the local model: ${error}` });
      return false;
    }
  };

  // --- REMOVED THE TWO BROKEN useEffect BLOCKS FOR FETCHING MODELS ---

  const handleModelChange = async (newModelId: string) => {
    const currentModel = selectedModel;
    
    // --- FIX: GOOGLE MODEL NAME HANDLING ---
    // The value from the select item is already the shortened name
    const modelId = newModelId; 
    
    if (modelId === currentModel) return;

    setIsChangingModel(true);
    try {
      if (isGGUFLoaded) await stopGGUFServer();
      
      // Unload previous Ollama model if it was active
      if (settings.ollamaServer && ollamaModels.some(m => m.name === currentModel)) {
        toast({ title: "Unloading previous model..." });
        await invoke('unload_ollama_model', { ollamaUrl: settings.ollamaServer, modelName: currentModel });
      }
      
      setSelectedModel(modelId);
      setSettings({ activeOllamaModel: modelId }); // Store active model
      
      const isNewModelOllama = ollamaModels.some(m => m.name === modelId);
      
      if (settings.ollamaServer && isNewModelOllama) {
        toast({ title: "Loading Ollama Model", description: `Please wait while '${modelId}' is loaded into memory...` });
        await invoke('load_ollama_model', { ollamaUrl: settings.ollamaServer, modelName: modelId });
        toast({ title: "Model Loaded", description: `'${modelId}' is ready to chat.` });
      }
    } catch (error: any) {
      console.error("Failed to change model:", error);
      toast({ variant: "destructive", title: "Model Change Failed", description: error.message || "An unexpected error occurred." });
    } finally {
      setIsChangingModel(false);
    }
  };

  const handleGGUFToggle = async (checked: boolean) => {
    setIsChangingModel(true);
    if (checked) {
      if (!settings.localModelPath) {
        toast({ variant: "destructive", title: "Chat Model Not Set", description: "Please select a Local GGUF Model in Settings." });
        setIsChangingModel(false);
        return;
      }
      const currentModel = selectedModel;
      if (settings.ollamaServer && ollamaModels.some(m => m.name === currentModel)) {
        toast({ title: "Unloading Ollama Model..." });
        await invoke('unload_ollama_model', { ollamaUrl: settings.ollamaServer, modelName: currentModel });
      }
      toast({ title: "Starting GGUF Server", description: "Loading your selected chat model..."});
      const success = await startLlamaCppServer(settings.localModelPath, false);
      if (success) {
        setSelectedModel('gguf-local');
        setSettings({ activeOllamaModel: undefined }); // Clear active ollama model
      }
    } else {
      await stopGGUFServer();
      toast({ title: "Local GGUF model unloaded." });
      const firstOllamaModel = ollamaModels[0]?.name;
      const firstGoogleModel = googleModels[0]?.name;
      // Default to first available model
      await handleModelChange(firstOllamaModel || firstGoogleModel || 'no-models');
    }
    setIsChangingModel(false);
  };

  const handleSendMessage = async (messageText: string) => {
    if (!isRagActive) {
      addMessage(messageText);
      return;
    }
    setIsProcessingFile(true);
    toast({ title: "RAG Active", description: "Retrieving context..." });
    const ggufChatWasActive = selectedModel === 'gguf-local';
    let context: string | undefined = undefined;
    try {
      if (ggufChatWasActive) {
        await stopGGUFServer();
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      if (!settings.embeddingModelPath) throw new Error("Embedding model path is not configured.");
      const startSuccess = await startLlamaCppServer(settings.embeddingModelPath, true);
      if (!startSuccess) throw new Error("Failed to start embedding server.");
      if (!(await waitForLlamaServer(90000))) throw new Error("Embedding server timed out.");
      context = await invoke<string>("retrieve_context", { query: messageText });
      if (context && context.trim() !== '') {
        toast({ title: "Context Found", description: "Sending context to the model." });
      } else {
        toast({ variant: "default", title: "No Relevant Context Found" });
      }
    } catch (error: any) {
      console.error("Error during RAG context retrieval:", error);
      toast({ variant: "destructive", title: "RAG Error", description: error.toString() });
    } finally {
      await stopGGUFServer();
      if (ggufChatWasActive && settings.localModelPath) {
        toast({ title: "Restarting Chat Server..." });
        await startLlamaCppServer(settings.localModelPath, false);
        await waitForLlamaServer(90000);
      }
      setIsProcessingFile(false);
    }
    addMessage(messageText, context);
  };

  const handleFileSelect = async (file: File) => {
    if (!settings.embeddingModelPath) {
      toast({ variant: "destructive", title: "Embedding Model not set in settings." });
      return;
    }
    if (!activeConversation) { createNewConversation(); }
    setIsProcessingFile(true);
    toast({ title: "Processing File...", description: "Starting embedding model..." });
    const ggufChatWasActive = isGGUFLoaded;
    try {
      if (ggufChatWasActive) await stopGGUFServer();
      const startSuccess = await startLlamaCppServer(settings.embeddingModelPath, true);
      if (!startSuccess) throw new Error("Failed to start embedding server.");
      if (!(await waitForLlamaServer(90000))) throw new Error("Embedding server timed out.");
      const content = await file.text();
      await invoke('index_file', { content });
      useChatStore.getState().addRagDocument({ fileName: file.name, content: content });
      toast({ title: "File Indexed", description: `${file.name} is ready for questions.` });
      setIsRagManagerOpen(false);
    } catch (error: any) {
      console.error("Failed to process and embed file:", error);
      toast({ variant: "destructive", title: "File Processing Failed", description: error.toString() });
    } finally {
      await stopGGUFServer();
      setIsProcessingFile(false);
      if (ggufChatWasActive && settings.localModelPath) {
         toast({ title: "Restarting Chat Model..." });
         await startLlamaCppServer(settings.localModelPath, false);
      }
    }
  };

  const getModelDisplayName = (modelId: string) => {
    if (modelId === 'gguf-local') return 'Local GGUF Model';
    // The name from Google already includes 'gemini', so we just clean it up
    const googleModel = googleModels.find(m => m.name === modelId);
    if (googleModel) return modelId.replace('models/', '');
    const ollamaModel = ollamaModels.find(m => m.name === modelId);
    if (ollamaModel) return ollamaModel.name;
    return modelId || "Select Model"; // Fallback
  };

  const hasOllamaModels = ollamaModels.length > 0;
  const hasGoogleModels = googleModels.length > 0;
  const hasGGUFModel = !!settings.localModelPath;
  const hasAnyCloudModel = hasGoogleModels;
  const hasAnyLocalModel = hasOllamaModels;
  const noModelsConfigured = !hasGGUFModel && !hasAnyLocalModel && !hasAnyCloudModel;

  return (
    <>
      <div className="flex flex-col h-screen">
        <header className="flex items-center justify-between p-4 border-b border-border space-x-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-headline whitespace-nowrap">Chat</h1>
            {isChangingModel ? ( <Loader2 className="h-4 w-4 animate-spin" /> ) : ( <span className="text-sm text-muted-foreground truncate">({getModelDisplayName(selectedModel)})</span> )}
          </div>
          <div className="flex items-center gap-4 flex-wrap justify-end">
            {hasGGUFModel && (
                <div className="flex items-center gap-2">
                    <Label htmlFor="gguf-toggle" className="whitespace-nowrap text-sm">Local GGUF</Label>
                    <Switch id="gguf-toggle" checked={isGGUFLoaded} onCheckedChange={handleGGUFToggle} disabled={isChangingModel || isProcessingFile} />
                </div>
            )}
            <Select onValueChange={handleModelChange} value={selectedModel} disabled={isGGUFLoaded || noModelsConfigured || isChangingModel || isProcessingFile}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Select a model" /></SelectTrigger>
              <SelectContent>
                {noModelsConfigured && <SelectItem value="no-models" disabled>No models configured</SelectItem>}
                {(hasAnyLocalModel || hasGGUFModel) && (
                  <SelectGroup>
                    <SelectLabel>Local</SelectLabel>
                    {hasGGUFModel && <SelectItem value="gguf-local">Local GGUF Model</SelectItem>}
                    {hasOllamaModels && ollamaModels.map((model) => ( <SelectItem key={model.name} value={model.name}>{model.name}</SelectItem> ))}
                  </SelectGroup>
                )}
                {hasAnyCloudModel && (
                  <SelectGroup>
                    <SelectLabel>Cloud</SelectLabel>
                    {hasGoogleModels && googleModels.map((model) => ( <SelectItem key={model.name} value={model.name}>{model.name.replace('models/', '')}</SelectItem> ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
            {isRagActive && <Badge variant="secondary">RAG Active</Badge>}
            <Button variant="outline" onClick={() => setIsRagManagerOpen(true)} disabled={isChangingModel || isProcessingFile}>RAG</Button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto">
          <ChatMessages />
        </div>
        <footer className="p-4 border-t border-border">
          <ChatInput onSend={handleSendMessage} onFileSelect={handleFileSelect} isLoading={isLoading || isProcessingFile || isChangingModel} />
        </footer>
      </div>
      <RagManager
        isOpen={isRagManagerOpen}
        onOpenChange={setIsRagManagerOpen}
        onFileSelect={handleFileSelect}
        isEmbedding={isProcessingFile}
      />
    </>
  );
}