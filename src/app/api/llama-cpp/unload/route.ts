// src/app/api/llama-cpp/unload/route.ts

import { NextResponse } from 'next/server';

export async function POST() {
    const errorMessage = "This API endpoint is deprecated. The frontend must be updated to use invoke('stop_llama_server') to terminate the llama.cpp process via the Tauri backend.";
    
    console.error(`[DEPRECATED] /api/llama-cpp/unload was called. ${errorMessage}`);
    
    return NextResponse.json(
        { 
            error: 'Deprecated Endpoint', 
            details: errorMessage 
        }, 
        { status: 501 }
    );
}