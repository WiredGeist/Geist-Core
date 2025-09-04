// src/app/api/llama-cpp/start/route.ts
import { NextResponse } from 'next/server';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';

let llamaServerProcess: ChildProcess | null = null;

export async function POST(request: Request) {
  try {
    const { 
        modelPath, 
        gpuLayers, 
        contextSize, 
        threads,
        flashAttention,
        useMmap,
        contextShift,
        quietMode 
    } = await request.json();

    if (!modelPath) {
      return NextResponse.json({ error: 'Model path is required' }, { status: 400 });
    }

    if (llamaServerProcess) {
      console.log('Killing existing Llama.cpp server process...');
      llamaServerProcess.kill('SIGKILL'); 
      llamaServerProcess = null;
    }

    const serverPath = path.join(process.cwd(), 'llama-cpp', 'llama-server.exe');

    // --- THIS IS THE KEY CHANGE ---
    // We are adding the flags needed to enable the /embedding endpoint.
    const args = [
      '-m', modelPath,
      '--n-gpu-layers', gpuLayers.toString(),
      '--port', '8080',
      '-c', contextSize.toString(),
      '-t', threads.toString(),

      // Add RAG-specific flags based on the documentation you found
      '--embedding',
      '--pooling', 'cls',
      '-ub', '8192'
    ];
    // --- END OF KEY CHANGE ---

    if (flashAttention) { args.push('--flash-attn'); }
    if (quietMode) { args.push('--log-disable'); }
    if (!useMmap) { args.push('--no-mmap'); }
    if (!contextShift) { args.push('--no-context-shift'); }
    
    console.log(`Starting RAG-enabled Llama.cpp server with command: ${serverPath} ${args.join(' ')}`);
    llamaServerProcess = spawn(serverPath, args);

    llamaServerProcess.stdout?.on('data', (data) => { console.log(`Llama.cpp stdout: ${data}`); });
    llamaServerProcess.stderr?.on('data', (data) => { console.error(`Llama.cpp stderr: ${data}`); });
    llamaServerProcess.on('close', (code) => {
      console.log(`Llama.cpp server process exited with code ${code}.`);
      llamaServerProcess = null;
    });
    llamaServerProcess.on('error', (err) => {
      console.error('SPAWN ERROR:', err);
      llamaServerProcess = null;
    });
    
    return NextResponse.json({ message: 'Llama.cpp server start command issued.' });

  } catch (error: any) {
    console.error('API Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}