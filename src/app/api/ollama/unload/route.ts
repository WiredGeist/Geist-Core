// src/app/api/ollama/unload/route.ts

import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { serverAddress } = await request.json();

        if (!serverAddress) {
            return NextResponse.json({ error: 'Ollama server address is required' }, { status: 400 });
        }

        console.log(`Sending unload request to Ollama server at ${serverAddress}`);
        
        // Ollama doesn't have a specific "unload" endpoint.
        // The way to force it to unload is to send a request for a non-existent model
        // while keeping it alive for 1 second. This makes it drop the current model.
        // A cleaner way is to use `POST /api/generate` with `keep_alive: 1`.
        await fetch(`${serverAddress}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: "none", // A dummy model name
                keep_alive: 1, // Keep alive for only 1 second
            }),
        });
        
        return NextResponse.json({ message: 'Ollama unload command sent.' });

    } catch (error: any) {
        console.error('Error sending unload command to Ollama:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}