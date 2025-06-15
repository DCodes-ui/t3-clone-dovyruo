import { NextResponse } from 'next/server';

// OpenRouter endpoint and API key
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Priority → temperature mapping (serves as "thinking strength")
const priorityToTemperature = {
  High: 1.0,
  Medium: 0.7,
  Low: 0.3,
};

export async function POST(request) {
  try {
    const { message, messages = [], model = 'gemini-2.5-flash', priority = 'High' } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (!OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'Missing OPENROUTER_API_KEY env variable' }, { status: 500 });
    }

    // Map frontend IDs to OpenRouter model identifiers
    const modelMapping = {
      'gemini-2.5-flash': 'google/gemini-2.5-flash-preview',
      'gemini-2.5-flash-thinking': 'google/gemini-2.5-flash-preview:thinking',
      'gemini-2.5-pro': 'google/gemini-2.5-pro-preview',
      'gemini-2.5-pro-thinking': 'google/gemini-2.5-pro-preview:thinking',
      'claude-4-sonnet': 'anthropic/claude-sonnet-4',
      'claude-4-sonnet-thinking': 'anthropic/claude-sonnet-4:thinking',
      '4o': 'openai/gpt-4o',
      'o4-mini': 'openai/o4-mini',
      // Additional models will be added progressively
    };

    const actualModel = modelMapping[model];
    if (!actualModel) {
      return NextResponse.json({ error: `Model ${model} is not supported yet` }, { status: 400 });
    }

    // Convert chat history to OpenAI/OpenRouter format
    const chatHistory = messages.map((msg) => ({
      role: msg.role, // 'user' | 'assistant'
      content: msg.content,
    }));

    // Append current user message
    chatHistory.push({ role: 'user', content: message });

    // Determine temperature based on priority (relevant for thinking models)
    const temperature = priorityToTemperature[priority] ?? 0.7;

    // Send request to OpenRouter
    const apiResponse = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        // Optional, hilft beim Ranking auf openrouter.ai
        'HTTP-Referer': process.env.APP_URL || 'http://localhost',
        'X-Title': 't3-clone-dovyruo',
      },
      body: JSON.stringify({
        model: actualModel,
        messages: chatHistory,
        temperature,
      }),
    });

    if (!apiResponse.ok) {
      const err = await apiResponse.json().catch(() => null);
      let rawMsg = (typeof err === 'string' && err) ||
        err?.error?.message || // OpenRouter style {error:{message:"..."}}
        err?.error ||
        err?.message ||
        err;

      if (typeof rawMsg !== 'string') {
        rawMsg = JSON.stringify(rawMsg);
      }

      const message = rawMsg || `OpenRouter request failed with status ${apiResponse.status}`;
      throw new Error(message);
    }

    const data = await apiResponse.json();
    const text = data.choices?.[0]?.message?.content?.trim() || '';

    return NextResponse.json({
      success: true,
      response: text,
      model,
      priority,
    });
  } catch (error) {
    console.error('OpenRouter API Error:', error);

    if (error.message?.includes('API key')) {
      return NextResponse.json({ error: 'API key is invalid or missing' }, { status: 401 });
    }

    return NextResponse.json({ error: error.message || 'Failed to generate response' }, { status: 500 });
  }
} 