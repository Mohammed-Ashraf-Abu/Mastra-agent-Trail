import "dotenv/config";
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";
import { weatherTool } from "../tools/weather-tool";
import { scorers } from "../scorers/weather-scorer";

export const weatherAgent = new Agent({
  name: "Weather Agent",
  instructions: `
      You are a helpful weather assistant that provides accurate weather information and can help planning activities based on the weather.

      Your primary function is to help users get weather details for specific locations. When responding:
      - Always ask for a location if none is provided
      - If the location name isn't in English, please translate it
      - If giving a location with multiple parts (e.g. "New York, NY"), use the most relevant part (e.g. "New York")
      - Include relevant details like humidity, wind conditions, and precipitation
      - Keep responses concise but informative
      - If the user asks for activities and provides the weather forecast, suggest activities based on the weather forecast.
      - If the user asks for activities, respond in the format they request.

      Use the weatherTool to fetch current weather data.
`,
  // Supported models (set MODEL_NAME in .env):
  // OpenAI: "openai/gpt-4o", "openai/gpt-4o-mini", "openai/gpt-3.5-turbo"
  // Anthropic: "anthropic/claude-3-5-sonnet-20241022", "anthropic/claude-3-opus-20240229", "anthropic/claude-3-haiku-20240307"
  // Google: "google/gemini-1.5-pro", "google/gemini-1.5-pro-latest", "google/gemini-2.0-flash-exp"
  // Mistral: "mistral/mistral-large-latest", "mistral/mistral-medium-latest", "mistral/mistral-small-latest"
  // xAI: "xai/grok-beta", "xai/grok-2-1212"
  // Meta Llama via OpenRouter: "openrouter/meta-llama/llama-4-maverick" (requires OPENROUTER_API_KEY)
  // Meta Llama via Vercel: "vercel/meta/llama-4-maverick" (requires VERCEL_API_KEY)
  // Meta Llama via Groq: "groq/meta-llama/llama-4-maverick-17b-128e-instruct" (requires GROQ_API_KEY)
  model: process.env.MODEL_NAME || "openrouter/meta-llama/llama-4-maverick",
  tools: { weatherTool },
  scorers: {
    toolCallAppropriateness: {
      scorer: scorers.toolCallAppropriatenessScorer,
      sampling: {
        type: "ratio",
        rate: 1,
      },
    },
    completeness: {
      scorer: scorers.completenessScorer,
      sampling: {
        type: "ratio",
        rate: 1,
      },
    },
    translation: {
      scorer: scorers.translationScorer,
      sampling: {
        type: "ratio",
        rate: 1,
      },
    },
  },
  memory: new Memory({
    storage: new LibSQLStore({
      url: "file:../mastra.db", // path is relative to the .mastra/output directory
    }),
  }),
});
