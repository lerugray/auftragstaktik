import type { LLMProvider } from './provider';
import { getLLMConfig } from './provider';
import { ClaudeProvider } from './claude';
import { OpenAICompatibleProvider } from './openai-compat';

let cachedProvider: LLMProvider | null = null;

export function getLLMProvider(): LLMProvider {
  if (cachedProvider) return cachedProvider;

  const config = getLLMConfig();

  switch (config.provider) {
    case 'ollama':
      // Ollama exposes an OpenAI-compatible API — no API key needed
      cachedProvider = new OpenAICompatibleProvider(
        'ollama', // dummy key, Ollama doesn't require auth
        config.model,
        config.baseUrl || 'http://localhost:11434/v1'
      );
      break;
    case 'claude':
      if (!config.apiKey) {
        throw new Error('LLM_API_KEY is not set. Add it to .env.local');
      }
      cachedProvider = new ClaudeProvider(config.apiKey, config.model);
      break;
    case 'openai':
      if (!config.apiKey) {
        throw new Error('LLM_API_KEY is not set. Add it to .env.local');
      }
      cachedProvider = new OpenAICompatibleProvider(config.apiKey, config.model);
      break;
    case 'openai-compatible':
      if (!config.apiKey) {
        throw new Error('LLM_API_KEY is not set. Add it to .env.local');
      }
      cachedProvider = new OpenAICompatibleProvider(config.apiKey, config.model, config.baseUrl);
      break;
    default:
      throw new Error(`Unknown LLM provider: ${config.provider}`);
  }

  return cachedProvider;
}

export async function checkOllamaAvailable(): Promise<boolean> {
  try {
    const config = getLLMConfig();
    const baseUrl = (config.baseUrl || 'http://localhost:11434/v1').replace('/v1', '');
    const res = await fetch(baseUrl, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

export type { LLMProvider } from './provider';
