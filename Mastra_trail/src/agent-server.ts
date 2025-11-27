// agent-server.ts
// IMPORTANT: run this with a Node version that supports webcrypto or add the polyfill below

import "dotenv/config";
import { webcrypto } from "crypto";
import express from "express";
import { mastra } from "./mastra/index.js";
import { weatherAgent } from "./mastra/agents/weather-agent.js";

// Polyfill for globalThis.crypto if missing (needed in some Node builds)
if (typeof globalThis.crypto === "undefined") {
  globalThis.crypto = webcrypto as Crypto;
}

const app = express();
app.use(express.json());

// Add CORS middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "*");
  res.header("Access-Control-Allow-Headers", "*");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

app.post("/copilotkit", async (req, res) => {
  try {
    const userId = req.header("X-User-ID") || "anonymous";
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array is required" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== "user") {
      return res.status(400).json({ error: "Last message must be from user" });
    }

    const agentMessages = messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    const stream = await weatherAgent.stream(agentMessages);

    console.log("📡 SERVER: Starting SSE stream");
    console.log("📡 SERVER: Stream types that will be sent:");
    console.log("  - text-delta (streaming chunks)");
    console.log("  - ui-directive (if keywords detected)");
    console.log("  - response-messages (final message)");
    console.log("  - [DONE] (completion signal)");

    let fullResponse = "";
    for await (const chunk of stream.textStream) {
      fullResponse += chunk;
      // Send text-delta for streaming text in messages
      const data = JSON.stringify({
        type: "text-delta",
        content: chunk,
      });
      res.write(`data: ${data}\n\n`);
    }

    console.log("📡 SERVER: Finished streaming text-delta chunks");
    console.log("📡 SERVER: Full response length:", fullResponse.length);

    // Check if agent response indicates UI needs
    // Simple keyword-based detection (can be enhanced with structured output)
    const lowerResponse = fullResponse.toLowerCase();
    console.log(lowerResponse, "lowerResponse");

    // Check for file upload request
    if (
      lowerResponse.includes("upload") ||
      lowerResponse.includes("picture") ||
      lowerResponse.includes("image") ||
      lowerResponse.includes("photo") ||
      lowerResponse.includes("file")
    ) {
      const uiDirective = {
        type: "ui-directive",
        action: "show-upload",
        component: "media-upload",
        props: {
          accept: "image/*",
          multiple: false,
          uploadLabel: "Upload a picture",
        },
      };
      console.log("🟢 SERVER: Sending UI directive (show-upload)");
      console.log("📤 UI Directive:", JSON.stringify(uiDirective, null, 2));
      console.log("🔍 Triggered by keywords in response:", lowerResponse);
      res.write(`data: ${JSON.stringify(uiDirective)}\n\n`);
    }

    // Check for button action requests
    if (lowerResponse.includes("confirm") || lowerResponse.includes("yes")) {
      const confirmButton = {
        type: "ui-directive",
        action: "show-button",
        component: "button",
        props: {
          buttonId: "confirm",
          buttonLabel: "Confirm",
          enabled: true,
          action: "confirm",
          style: "primary",
        },
      };
      console.log("🟢 SERVER: Sending UI directive (show-button: confirm)");
      console.log("📤 UI Directive:", JSON.stringify(confirmButton, null, 2));
      console.log("🔍 Triggered by keywords in response:", lowerResponse);
      res.write(`data: ${JSON.stringify(confirmButton)}\n\n`);
    }

    if (lowerResponse.includes("cancel") || lowerResponse.includes("no")) {
      const cancelButton = {
        type: "ui-directive",
        action: "show-button",
        component: "button",
        props: {
          buttonId: "cancel",
          buttonLabel: "Cancel",
          enabled: true,
          action: "cancel",
          style: "secondary",
        },
      };
      console.log("🟢 SERVER: Sending UI directive (show-button: cancel)");
      console.log("📤 UI Directive:", JSON.stringify(cancelButton, null, 2));
      console.log("🔍 Triggered by keywords in response:", lowerResponse);
      res.write(`data: ${JSON.stringify(cancelButton)}\n\n`);
    }

    let newResponseMessagesArray: any[] = [];

    try {
      if (stream.messageList) {
        const messageListAny = stream.messageList as any;

        if (messageListAny.newResponseMessages) {
          newResponseMessagesArray = Array.from(
            messageListAny.newResponseMessages
          ).map((msg: any) => {
            let messageContent = "";
            if (msg.content) {
              if (typeof msg.content === "string") {
                messageContent = msg.content;
              } else if (msg.content.content) {
                messageContent = msg.content.content;
              } else if (
                msg.content.parts &&
                Array.isArray(msg.content.parts)
              ) {
                messageContent = msg.content.parts
                  .map((part: any) => part.text || part.content || "")
                  .join("");
              }
            }
            const data = {
              id: msg.id,
              role: msg.role,
              content: {
                text: messageContent,
                format: msg.content?.format,
                parts: msg.content?.parts,
                fullContent: msg.content,
              },
              createdAt: msg.createdAt,
              threadId: msg.threadId,
              resourceId: msg.resourceId,
            };
            console.log(data, "data");

            return data;
          });

          // Send newResponseMessages in the SSE stream before [DONE]
          const responseMessagesData = JSON.stringify({
            type: "response-messages",
            messages: newResponseMessagesArray,
          });
          console.log(responseMessagesData, "responseMessagesData");
          res.write(`data: ${responseMessagesData}\n\n`);
        }
      }
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] POST /copilotkit - Error extracting newResponseMessages:`,
        error
      );
    }

    // Send completion signal
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    console.error("CopilotKit endpoint error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        error: error instanceof Error ? error.message : String(error),
      });
    } else {
      const errorData = JSON.stringify({
        type: "error",
        content: error instanceof Error ? error.message : String(error),
      });
      res.write(`data: ${errorData}\n\n`);
      res.end();
    }
  }
});
app.post("/copilotkit1", async (req, res) => {
  try {
    const userId = req.header("X-User-ID") || "anonymous";
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array is required" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== "user") {
      return res.status(400).json({ error: "Last message must be from user" });
    }

    const agentMessages = messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    const stream = await weatherAgent.stream(agentMessages);

    console.log(stream, "stream");
    // Send raw text chunks
    for await (const chunk of stream.textStream) {
      res.write(`data: ${chunk}\n\n`);
    }

    // Send raw stream data
    const rawStreamData = JSON.stringify(stream);
    res.write(`data: ${rawStreamData}\n\n`);
    res.end();
  } catch (error) {
    console.error("CopilotKit endpoint error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        error: error instanceof Error ? error.message : String(error),
      });
    } else {
      const errorData = JSON.stringify({
        type: "error",
        content: error instanceof Error ? error.message : String(error),
      });
      res.write(`data: ${errorData}\n\n`);
      res.end();
    }
  }
});

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

// Start Express server
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`\n🚀 Mastra Agent server listening on http://${HOST}:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🤖 CopilotKit endpoint: http://localhost:${PORT}/copilotkit`);
  console.log(`\n📝 Logs will appear below:\n`);
});
