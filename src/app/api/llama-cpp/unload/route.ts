// src/app/api/llama-cpp/unload/route.ts

import { NextResponse } from 'next/server';

export async function POST() {
    // This API route is deprecated and should not be used.
    // The logic to stop the llama.cpp server has been moved to the Rust backend
    // and must be called directly from the frontend using Tauri's `invoke('stop_llama_server')`.
    
    const errorMessage = "This API endpoint is deprecated. The frontend must be updated to use invoke('stop_llama_server') to terminate the llama.cpp process via the Tauri backend.";
    
    console.error(`[DEPRECATED] /api/llama-cpp/unload was called. ${errorMessage}`);
    
    return NextResponse.json(
        { 
            error: 'Deprecated Endpoint', 
            details: errorMessage 
        }, 
        { status: 501 } // 501 Not Implemented
    );
}