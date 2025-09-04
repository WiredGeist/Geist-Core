//src\app\api\ollama\route.ts

import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { serverAddress } = await request.json();

    if (!serverAddress) {
      return NextResponse.json({ error: 'Ollama server address is required' }, { status: 400 });
    }

    // Ensure the address doesn't end with a slash for proper joining
    const cleanedAddress = serverAddress.endsWith('/') ? serverAddress.slice(0, -1) : serverAddress;

    const response = await fetch(`${cleanedAddress}/api/tags`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Ollama API error: ${response.status} ${response.statusText}`, errorText);
      return NextResponse.json({ error: `Failed to fetch from Ollama server: ${errorText}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching Ollama models:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
