// agent-server.ts
// IMPORTANT: run this with a Node version that supports webcrypto or add the polyfill below

import "dotenv/config";
import { webcrypto } from "crypto";
import express from "express";
import { weatherAgent } from "./mastra/agents/weather-agent.js";

// Polyfill for globalThis.crypto if missing (needed in some Node builds)
if (typeof globalThis.crypto === "undefined") {
  globalThis.crypto = webcrypto as Crypto;
}

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Root endpoint - API information
app.get("/", (req, res) => {
  console.log(`[${new Date().toISOString()}] Root endpoint accessed`);
  res.json({
    name: "Mastra Agent Server",
    status: "running",
    endpoints: {
      health: "GET /health",
      chat: "POST /chat",
    },
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  console.log(`[${new Date().toISOString()}] Health check requested`);
  res.json({
    ok: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

// GET handler for /chat - shows API info
app.get("/chat", (req, res) => {
  console.log(`[${new Date().toISOString()}] GET /chat - showing API info`);
  res.json({
    message: "Chat endpoint - use POST method",
    method: "POST",
    endpoint: "/chat",
    body: {
      prompt: "string (required)",
    },
    example: {
      method: "POST",
      url: "/chat",
      body: {
        prompt: "What's the weather in New York?",
      },
    },
  });
});

// Chat endpoint
app.post("/chat", async (req, res) => {
  const startTime = Date.now();
  try {
    const { prompt } = req.body;
    console.log(
      `[${new Date().toISOString()}] POST /chat - Received prompt:`,
      prompt
    );

    if (!prompt) {
      console.log(
        `[${new Date().toISOString()}] POST /chat - Error: prompt required`
      );
      return res.status(400).json({ error: "prompt required" });
    }

    console.log(
      `[${new Date().toISOString()}] POST /chat - Starting agent stream...`
    );
    const stream = await weatherAgent.stream(prompt);
    let response = "";
    let chunkCount = 0;

    for await (const chunk of stream.textStream) {
      response += chunk;
      chunkCount++;
      // Log each chunk as it arrives
      console.log(
        `[${new Date().toISOString()}] POST /chat - Chunk #${chunkCount}:`,
        JSON.stringify(chunk)
      );
    }

    const duration = Date.now() - startTime;
    console.log(
      `[${new Date().toISOString()}] POST /chat - Response completed in ${duration}ms (${chunkCount} chunks, ${response.length} chars)`
    );
    console.log(
      `[${new Date().toISOString()}] POST /chat - Complete response data:`,
      response
    );
    res.json({ response });
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(
      `[${new Date().toISOString()}] POST /chat - Error after ${duration}ms:`,
      err
    );
    res.status(500).json({
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`\n🚀 Mastra Agent server listening on http://${HOST}:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`💬 Chat endpoint: http://localhost:${PORT}/chat`);
  console.log(`\n📝 Logs will appear below:\n`);
});
