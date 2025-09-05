//src\components\chat\rag-manager.tsx

'use client';

import React, { useRef, useState } from 'react';
import { useChatStore } from '@/stores/chat-store';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, FileText, Upload, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';

interface RagManagerProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onFileSelect: (file: File) => Promise<void>;
  isEmbedding: boolean;
}

export function RagManager({ isOpen, onOpenChange, onFileSelect, isEmbedding }: RagManagerProps) {
  const { activeConversation, removeRagDocument } = useChatStore(state => ({
    activeConversation: state.activeConversationId ? state.conversations[state.activeConversationId] : null,
    removeRagDocument: state.removeRagDocument,
  }));
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    setError(null);
    const file = files[0];

    if (activeConversation?.ragDocuments.some(doc => doc.fileName === file.name)) {
      setError(`File "${file.name}" is already loaded.`);
      return;
    }

    try {
      await onFileSelect(file);
    } catch (e: any) {
      setError(e.message || "An unknown error occurred during processing.");
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileSelect = () => {
    setError(null);
    fileInputRef.current?.click();
  };

  const documents = activeConversation?.ragDocuments ?? [];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage RAG Documents</DialogTitle>
          <DialogDescription>
            Upload documents to be used as context. The AI will use these files to answer questions.
          </DialogDescription>
        </DialogHeader>

        <div className="my-4">
          {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <p className="text-sm text-muted-foreground">Add a new document to the context.</p>
            <Button onClick={triggerFileSelect} disabled={isEmbedding}>
              {isEmbedding ? <Loader2 className="mr-2 animate-spin" /> : <Upload className="mr-2" />}
              {isEmbedding ? `Processing...` : 'Upload File'}
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".txt,.md,.json,.csv,.html"
            />
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Loaded Documents ({documents.length})</h4>
          <ScrollArea className="h-60 w-full rounded-md border">
            {documents.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                No documents loaded for this chat.
              </div>
            ) : (
              <div className="p-2 space-y-2">
                {documents.map((doc) => (
                  <div key={doc.fileName} className="flex items-center justify-between gap-4 p-2 rounded-md bg-secondary/50">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="h-5 w-5 shrink-0 text-muted-foreground"/>
                      <p className="truncate text-sm font-medium" title={doc.fileName}>{doc.fileName}</p>
                    </div>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 shrink-0" 
                        onClick={() => removeRagDocument(doc.fileName)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="mt-4">
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}