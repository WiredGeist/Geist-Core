
// src/app/api/chat/route.ts

import { NextResponse } from 'next/server';
// We will import and use your existing chat function
import { chat, type ChatInput } from '@/ai/flows/chat';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ChatInput;

    // Call your existing Genkit chat flow with the data from the request
    const result = await chat(body);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API Chat Route Error:', error);
    // Send a more detailed error back to the client
    return NextResponse.json(
      { error: 'An error occurred in the chat flow.', details: error.message },
      { status: 500 }
    );
  }
}