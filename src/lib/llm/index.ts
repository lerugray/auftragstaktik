import type { LLMProvider } from './provider';
import { getLLMConfig } from './provider';
import { ClaudeProvider } from './claude';
import { OpenAICompatibleProvider } from './openai-compat';

let cachedProvider: LLMProvider | null = null;

export function getLLMProvider(): LLMProvider {
  if (cachedProvider) return cachedProvider;

  const config = getLLMConfig();

  if (!config.apiKey) {
    throw new Error('LLM_API_KEY is not set. Add it to .env.local');
  }

  switch (config.provider) {
    case 'claude':
      cachedProvider = new ClaudeProvider(config.apiKey, config.model);
      break;
    case 'openai':
      cachedProvider = new OpenAICompatibleProvider(config.apiKey, config.model);
      break;
    case 'openai-compatible':
      cachedProvider = new OpenAICompatibleProvider(config.apiKey, config.model, config.baseUrl);
      break;
    default:
      throw new Error(`Unknown LLM provider: ${config.provider}`);
  }

  return cachedProvider;
}

export type { LLMProvider } from './provider';
