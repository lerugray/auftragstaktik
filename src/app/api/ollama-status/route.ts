import { NextResponse } from 'next/server';
import { checkOllamaAvailable } from '@/lib/llm';
import { getLLMConfig } from '@/lib/llm/provider';

export async function GET() {
  const config = getLLMConfig();
  const isOllama = config.provider === 'ollama';

  if (!isOllama) {
    // Using a cloud provider — API key is the requirement
    return NextResponse.json({
      available: !!config.apiKey,
      provider: config.provider,
      model: config.model,
    });
  }

  const available = await checkOllamaAvailable();
  return NextResponse.json({
    available,
    provider: 'ollama',
    model: config.model,
  });
}
