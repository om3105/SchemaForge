import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post("/api/forge", async (req, res) => {
    try {
      const { prompt, apiKey } = req.body;
      const keyToUse = apiKey || process.env.GEMINI_API_KEY;

      if (!keyToUse) {
        return res.status(400).json({ error: "API key is required" });
      }

      const ai = new GoogleGenAI({ apiKey: keyToUse });

      const systemInstruction = `You are a Principal Database Administrator. Analyze the application concept. Design a normalized relational database schema. Return your response strictly formatted as a clean text containing two parts separated by a custom unique delimiter '---SQL-SPLIT---'. Part 1 must be clean Mermaid.js ER diagram syntax code (using erDiagram blocks). Part 2 must be standard, syntax-clean SQL DDL code. 
      CRITICAL:
      1. Output ONLY the raw Mermaid code, then the delimiter, then the raw SQL code.
      2. DO NOT wrap the code in markdown code blocks (e.g., no \`\`\`mermaid or \`\`\`sql). 
      3. DO NOT include any explanatory text before or after. Just Code 1 + Delimiter + Code 2.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.2,
        },
      });

      const text = response.text || "";
      const parts = text.split("---SQL-SPLIT---");

      if (parts.length < 2) {
        // Fallback in case LLM didn't split well
        return res.json({ mermaid: "", sql: text, raw: text });
      }

      res.json({
        mermaid: parts[0].trim(),
        sql: parts[1].trim(),
      });
    } catch (error: any) {
      console.error("Error forging schema:", error);
      res.status(500).json({ error: error.message || "Failed to forge schema" });
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
