'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import React, { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, Github, Globe, Coffee } from "lucide-react";
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-shell';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useSettings, type Settings } from "@/hooks/use-settings";
import { useChatStore } from "@/stores/chat-store";

const settingsSchema = z.object({
  localModelPath: z.string().optional(),
  embeddingModelPath: z.string().optional(),
  ollamaServer: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  googleKey: z.string().optional(),
  llamaCppHardware: z.enum(["cpu", "cuda"]).default("cpu"),
  llamaCppGpuId: z.number().int().min(0).default(0),
  llamaCppAutoDetectGpu: z.boolean().default(true),
  llamaCppMmq: z.boolean().default(true),
  llamaCppGpuLayers: z.number().int().min(0).max(128).default(0),
  llamaCppUserContextShift: z.boolean().default(true),
  llamaCppQuietMode: z.boolean().default(true),
  llamaCppMmap: z.boolean().default(true),
  llamaCppFlashAttention: z.boolean().default(false),
  llamaCppContextSize: z.number().int().min(512).max(32768).default(8192),
  llamaCppThreads: z.number().int().min(1).default(8),
  llamaCppBlasThreads: z.number().int().min(1).optional(),
  llamaCppBlasBatchSize: z.number().int().min(1).default(512),
  llamaCppLowVram: z.boolean().default(false),
  llamaCppRowSplit: z.boolean().default(false),
  llamaCppTensorSplit: z.string().optional(),
  llamaCppMainGpu: z.number().int().min(0).default(0),
  chatMemory: z.boolean().default(true),
});

const PasswordInput = ({ field, placeholder }: { field: any, placeholder: string }) => {
  const [showPassword, setShowPassword] = React.useState(false);
  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  return (
    <div className="relative">
      <Input
        type={showPassword ? "text" : "password"}
        placeholder={placeholder}
        {...field}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute inset-y-0 right-0 h-full px-3"
        onClick={togglePasswordVisibility}
      >
        {showPassword ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
};

export function SettingsForm() {
  const { toast } = useToast();
  const { settings, setSettings } = useSettings();
  const [isStartingServer, setIsStartingServer] = useState(false);
  const [isStoppingServer, setIsStoppingServer] = useState(false);
  const clearAllChatData = useChatStore(state => state.clearAllData);

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: settings,
  });

  useEffect(() => {
    form.reset(settings);
  }, [settings, form]);

  const handleClearAllData = () => {
    clearAllChatData();
    toast({
      title: "Application Data Cleared",
      description: "All chat conversations have been permanently deleted.",
    });
  };

  const llamaCppHardware = form.watch("llamaCppHardware");

  function onSubmit(values: z.infer<typeof settingsSchema>) {
    setSettings(values as Settings);
    toast({
      title: "Settings Saved",
      description: "Your new settings have been saved successfully.",
    });
  }

  const handleStartServer = async () => {
    setIsStartingServer(true);
    const values = form.getValues();
    const { ollamaServer, activeOllamaModel } = useSettings.getState().settings;

    if (!values.localModelPath) {
      toast({ variant: "destructive", title: "Error", description: "Please select a local GGUF model path first." });
      setIsStartingServer(false);
      return;
    }

    try {
      if (ollamaServer && activeOllamaModel) {
        await invoke('unload_ollama_model', { ollamaUrl: ollamaServer, modelName: activeOllamaModel });
        setSettings({ ...settings, activeOllamaModel: undefined });
      }
      
      const payload = {
        modelPath: values.localModelPath,
        gpuLayers: values.llamaCppHardware === 'cuda' ? values.llamaCppGpuLayers : 0,
        contextSize: values.llamaCppContextSize,
        threads: values.llamaCppThreads,
        flashAttn: values.llamaCppFlashAttention,
        mainGpu: values.llamaCppMainGpu,
        tensorSplit: values.llamaCppTensorSplit,
      };
      
      await invoke('start_llama_server', { args: payload });
      
      toast({ title: "Server Command Sent", description: "Llama.cpp server is starting via the Tauri backend." });

    } catch (error: any) {
      toast({ variant: "destructive", title: "Operation Failed", description: `Could not start the server. Error: ${error}` });
    } finally {
      setIsStartingServer(false);
    }
  };

  const handleStopServer = async () => {
    setIsStoppingServer(true);
    try {
        await invoke('stop_llama_server');
        toast({
            title: "Server Command Sent",
            description: "The local GGUF server has been shut down.",
        });
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Server Stop Failed",
            description: `Could not stop the local model. Error: ${error}`,
        });
    } finally {
        setIsStoppingServer(false);
    }
  };

  const handleBrowseChatModel = async () => {
    try {
        const result = await invoke('open_file_dialog');
        if (result) {
            form.setValue('localModelPath', result as string);
        }
    } catch (error) {
        console.error("Failed to open file dialog:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not open file dialog. This feature only works in the desktop app.",
        });
    }
  };

  const handleBrowseEmbeddingModel = async () => {
    try {
        const result = await invoke('open_file_dialog');
        if (result) {
            form.setValue('embeddingModelPath', result as string);
        }
    } catch (error) {
        console.error("Failed to open file dialog:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not open file dialog.",
        });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Model Providers</CardTitle>
            <CardDescription>Configure your local and remote model providers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="localModelPath"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Local GGUF Model Path</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                        <Input 
                          placeholder="Click Browse to select your GGUF model file..."
                          {...field}
                          value={field.value ?? ''}
                          readOnly 
                        />
                    </FormControl>
                    <Button type="button" variant="outline" onClick={handleBrowseChatModel}>Browse</Button>
                  </div>
                  <FormDescription>
                    Use the browse button to select your GGUF model file for chat.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="ollamaServer"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ollama Server Address</FormLabel>
                  <FormControl>
                    <Input placeholder="http://localhost:11434" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Separator />
            <div className="space-y-4">
                <h3 className="text-lg font-medium">API Keys</h3>
                 <FormField
                    control={form.control}
                    name="googleKey"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Google AI</FormLabel>
                            <FormControl>
                                <PasswordInput field={field} placeholder="AIzaSy..." />
                            </FormControl>
                        </FormItem>
                    )}
                />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>RAG Settings</CardTitle>
            <CardDescription>
              Configure settings for Retrieval-Augmented Generation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="embeddingModelPath"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Local Embedding Model Path</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input 
                        placeholder="Browse to select your GGUF EMBEDDING model..." 
                        {...field}
                        value={field.value ?? ''}
                        readOnly
                      />
                    </FormControl>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleBrowseEmbeddingModel}
                    >
                      Browse
                    </Button>
                  </div>
                  <FormDescription>
                    Select the GGUF model file to use for creating document embeddings.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Hardware (Llama.cpp)</CardTitle>
            <CardDescription>
              Configure hardware and performance settings for local GGUF model inference.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 border bg-muted/50 rounded-lg">
                <div className="flex flex-col space-y-2">
                    <FormLabel>Llama.cpp Server Control</FormLabel>
                    <FormDescription>
                        Use these buttons to start and stop the background server process using the hardware settings configured below.
                    </FormDescription>
                    <div className="flex items-center pt-2 gap-2">
                        <Button type="button" onClick={handleStartServer} disabled={isStartingServer}>
                            {isStartingServer && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Launch GGUF Server
                        </Button>
                        <Button type="button" variant="destructive" onClick={handleStopServer} disabled={isStoppingServer}>
                          {isStoppingServer && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Stop GGUF Server
                        </Button>
                    </div>
                </div>
            </div>
            <Separator />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="llamaCppHardware"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hardware</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select hardware" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cpu">CPU</SelectItem>
                        <SelectItem value="cuda">CUDA</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="llamaCppThreads"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Threads</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} value={field.value ?? 8} onChange={e => field.onChange(parseInt(e.target.value, 10))} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="llamaCppBlasThreads"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>BLAS Threads</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={e => field.onChange(e.target.value ? parseInt(e.target.value, 10) : undefined)} placeholder="e.g. 4" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="llamaCppBlasBatchSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>BLAS Batch Size: {field.value}</FormLabel>
                    <FormControl>
                      <Slider
                      min={1}
                      max={4096}
                      step={1}
                      value={[field.value ?? 512]}
                      onValueChange={(value) => field.onChange(value[0])}
                    />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {llamaCppHardware === 'cuda' && (
              <>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="llamaCppMainGpu"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Main GPU</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} value={field.value ?? 0} onChange={e => field.onChange(parseInt(e.target.value, 10))} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="llamaCppTensorSplit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tensor Split</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 24,48" {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormDescription>Comma-separated list of layer counts to offload to each GPU.</FormDescription>
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <FormField
                    control={form.control}
                    name="llamaCppLowVram"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel>Low VRAM</FormLabel>
                      </FormItem>
                    )}
                    />
                </div>
                
                <div className="flex items-center space-x-2">
                  <FormField
                    control={form.control}
                    name="llamaCppRowSplit"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel>Row-Split</FormLabel>
                      </FormItem>
                    )}
                    />
                </div>
              
                <div className="flex items-center space-x-2">
                  <FormField
                    control={form.control}
                    name="llamaCppAutoDetectGpu"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel>Auto-detect GPU</FormLabel>
                      </FormItem>
                    )}
                    />
                </div>
                
                <div className="flex items-center space-x-2">
                  <FormField
                    control={form.control}
                    name="llamaCppMmq"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                        <FormLabel>Use Quantized Matrix Multiplication (MMQ)</FormLabel>
                      </FormItem>
                    )}
                    />
                </div>
                
                <Separator />
                
                <FormField
                  control={form.control}
                  name="llamaCppGpuLayers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GPU Layers: {field.value}</FormLabel>
                      <FormControl>
                          <Slider
                          min={0}
                          max={128}
                          step={1}
                          value={[field.value ?? 0]}
                          onValueChange={(value) => field.onChange(value[0])}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </>
            )}

            <FormField
              control={form.control}
              name="llamaCppContextSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Context Size: {field.value}</FormLabel>
                  <FormControl>
                    <Slider
                      min={512}
                      max={32768}
                      step={512}
                      value={[field.value ?? 8192]}
                      onValueChange={(value) => field.onChange(value[0])}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <Separator />
            
            <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="llamaCppUserContextShift"
                render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div>
                        <FormLabel>Context Shift</FormLabel>
                        <FormDescription className="text-xs pt-1">
                        Helps manage long conversations.
                        </FormDescription>
                    </div>
                    <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    </FormItem>
                )}
                />
              <FormField
                control={form.control}
                name="llamaCppQuietMode"
                render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div>
                        <FormLabel>Quiet Mode</FormLabel>
                        <FormDescription className="text-xs pt-1">
                        Disables server console logs.
                        </FormDescription>
                    </div>
                    <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    </FormItem>
                )}
                />
              <FormField
                control={form.control}
                name="llamaCppMmap"
                render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div>
                        <FormLabel>Use MMAP</FormLabel>
                        <FormDescription className="text-xs pt-1">
                        Speeds up model loading time.
                        </FormDescription>
                    </div>
                    <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    </FormItem>
                )}
                />
              <FormField
                control={form.control}
                name="llamaCppFlashAttention"
                render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div>
                        <FormLabel>Flash Attention</FormLabel>
                        <FormDescription className="text-xs pt-1">
                        Optimizes speed on some GPUs.
                        </FormDescription>
                    </div>
                    <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    </FormItem>
                )}
                />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Chat</CardTitle>
            <CardDescription>Configure chat behavior.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="chatMemory"
              render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                  <FormLabel>Chat Memory</FormLabel>
                  <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
              </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>About Geist</CardTitle>
            <CardDescription>
              This application was created by WiredGeist. If you find it useful, please consider showing your support.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              type="button" // --- THIS IS THE FIX ---
              variant="outline" 
              className="w-full justify-start"
              onClick={() => open('https://github.com/WiredGeist')}
            >
              <Github className="h-4 w-4 mr-2" />
              GitHub - WiredGeist
            </Button>
            <Button 
              type="button" // --- THIS IS THE FIX ---
              variant="outline" 
              className="w-full justify-start"
              onClick={() => open('https://www.wiredgeist.com/')}
            >
              <Globe className="h-4 w-4 mr-2" />
              Website - wiredgeist.com
            </Button>
            <Button 
              type="button" // --- THIS IS THE FIX ---
              variant="outline" 
              className="w-full justify-start"
              onClick={() => open('https://ko-fi.com/wiredgeist')}
            >
              <Coffee className="h-4 w-4 mr-2" />
              Support the Project on Ko-fi
            </Button>
          </CardContent>
        </Card>

        <Card className="border-destructive">
            <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>
                    These actions are permanent and cannot be undone.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" type="button">Clear All Chat Data</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete all
                            of your conversations and chat history from this device.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearAllData}>
                            Yes, delete everything
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
        
        <Button type="submit">Save Changes</Button>
      </form>
    </Form>
  );
}