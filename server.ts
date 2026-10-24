import express from "express";
import path from "path";
import rateLimit from "express-rate-limit";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import "dotenv/config";
import { isDialect, MAX_PROMPT_LENGTH, parseForgeResponse } from "./src/lib/forge";

// Map SDK errors to messages that are safe to show the user
function publicErrorMessage(error: any): { status: number; message: string } {
  const message = String(error?.message || "");
  if (/api key|API_KEY_INVALID|PERMISSION_DENIED/i.test(message)) {
    return { status: 401, message: "Invalid or unauthorized Gemini API key." };
  }
  if (/quota|RESOURCE_EXHAUSTED|429/i.test(message)) {
    return { status: 429, message: "Gemini quota exceeded. Please try again later or use your own API key." };
  }
  if (/unexpected format/i.test(message)) {
    return { status: 502, message };
  }
  return { status: 500, message: "Failed to forge schema. Please try again." };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Render and similar hosts sit behind a proxy; needed for per-client rate limiting
  app.set("trust proxy", 1);
  app.use(express.json({ limit: "16kb" }));

  const forgeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many requests. Please wait a few minutes and try again." },
  });

  app.post("/api/forge", forgeLimiter, async (req, res) => {
    try {
      const { prompt, apiKey, dialect = "PostgreSQL" } = req.body ?? {};

      if (typeof prompt !== "string" || !prompt.trim()) {
        return res.status(400).json({ error: "Please describe your application concept." });
      }
      if (prompt.length > MAX_PROMPT_LENGTH) {
        return res.status(400).json({ error: `Description must be ${MAX_PROMPT_LENGTH} characters or fewer.` });
      }
      if (!isDialect(dialect)) {
        return res.status(400).json({ error: "Unsupported SQL dialect." });
      }

      const keyToUse = (typeof apiKey === "string" && apiKey.trim()) || process.env.GEMINI_API_KEY;
      if (!keyToUse) {
        return res.status(400).json({ error: "API key is required" });
      }

      const ai = new GoogleGenAI({ apiKey: keyToUse });

      const systemInstruction = `You are a Principal Database Administrator. Analyze the application concept and design a normalized relational database schema.
      Return a JSON object with two fields:
      1. "mermaid": valid Mermaid.js ER diagram code starting with "erDiagram". Use only alphanumeric characters and underscores in entity and attribute names, and mark keys with PK / FK.
      2. "sql": syntax-clean ${dialect} DDL (CREATE TABLE statements with primary keys, foreign keys, constraints and useful indexes).
      Do not wrap either field in markdown code fences and do not include explanatory text.`;

      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              mermaid: { type: Type.STRING },
              sql: { type: Type.STRING },
            },
            required: ["mermaid", "sql"],
            propertyOrdering: ["mermaid", "sql"],
          },
        },
      });

      res.json(parseForgeResponse(response.text || ""));
    } catch (error: any) {
      console.error("Error forging schema:", error);
      const { status, message } = publicErrorMessage(error);
      res.status(status).json({ error: message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
