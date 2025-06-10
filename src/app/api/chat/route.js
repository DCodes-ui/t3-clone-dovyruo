import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
  try {
    const { message, model = 'gemini-2.5-flash', priority = 'High' } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Map frontend model names to actual API model names
    const modelMapping = {
      'gemini-2.5-flash': 'gemini-2.0-flash'
    };

    const actualModel = modelMapping[model];
    if (!actualModel) {
      return NextResponse.json(
        { error: `Model ${model} is not supported` },
        { status: 400 }
      );
    }

    // Get the generative model
    const generativeModel = genAI.getGenerativeModel({ 
      model: actualModel
    });

    // Generate content
    const result = await generativeModel.generateContent(message);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({
      success: true,
      response: text,
      model: model,
      priority: priority
    });

  } catch (error) {
    console.error('Gemini API Error:', error);
    
    // Handle specific error types
    if (error.message?.includes('API key')) {
      return NextResponse.json(
        { error: 'API key is invalid or missing' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
} 