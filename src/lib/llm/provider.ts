export interface LLMProvider {
  generateText(prompt: string, systemPrompt: string): Promise<string>;
  readonly name: string;
}

export interface LLMConfig {
  provider: 'claude' | 'openai' | 'openai-compatible';
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export function getLLMConfig(): LLMConfig {
  return {
    provider: (process.env.LLM_PROVIDER as LLMConfig['provider']) || 'claude',
    apiKey: process.env.LLM_API_KEY || '',
    model: process.env.LLM_MODEL || 'claude-sonnet-4-20250514',
    baseUrl: process.env.LLM_BASE_URL || undefined,
  };
}
