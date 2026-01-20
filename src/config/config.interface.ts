export interface VibetestConfig {
  llmProvider: "anthropic" | "openai";
  model?: string;
  anthropicApiKey?: string;
  openaiApiKey?: string;
}
