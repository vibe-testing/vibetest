// BAML client configuration for vibetest
// Docs: https://docs.boundaryml.com

generator target {
  output_type "typescript"
  output_dir "../src"
  version "0.218.0"
}

client<llm> Anthropic {
  provider anthropic
  options {
    model claude-sonnet-4-20250514
    api_key env.ANTHROPIC_API_KEY
  }
}

client<llm> OpenAI {
  provider openai
  options {
    model gpt-4o
    api_key env.OPENAI_API_KEY
  }
}
