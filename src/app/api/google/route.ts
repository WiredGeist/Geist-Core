//src\app\api\google\route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { apiKey } = await request.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'Google API key is required' }, { status: 400 });
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Google AI API error: ${response.status} ${response.statusText}`, errorText);
      try {
        // Try to parse the error as JSON for a better error message
        const errorJson = JSON.parse(errorText);
        return NextResponse.json({ error: errorJson.error.message || `Failed to fetch from Google AI API` }, { status: response.status });
      } catch (e) {
        return NextResponse.json({ error: `Failed to fetch from Google AI API: ${errorText}` }, { status: response.status });
      }
    }

    const data = await response.json();
    
    const filteredModels = data.models.filter((model: any) => 
        model.supportedGenerationMethods.includes('generateContent') &&
        !model.name.includes('embedding') &&
        !model.name.includes('image') &&
        !model.name.includes('video') &&
        !model.name.includes('aqa') && // Filter out Attributed-Question-Answering models
        !model.name.includes('pro-') && // Filter out older pro models that may require paid tier
        model.name.includes('gemini')
    );

    return NextResponse.json({ models: filteredModels });
  } catch (error: any) {
    console.error('Error fetching Google AI models:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
