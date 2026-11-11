import { GoogleGenAI, Type } from "@google/genai";
import { isDialect, MAX_PROMPT_LENGTH, parseForgeResponse } from "./forge.js";

// Shared by the Express server (local dev) and the Vercel function (api/forge.ts)
export interface ForgeApiResult {
  status: number;
  body: unknown;
}

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

export async function handleForge(reqBody: any): Promise<ForgeApiResult> {
  try {
    const { prompt, apiKey, dialect = "PostgreSQL" } = reqBody ?? {};

    if (typeof prompt !== "string" || !prompt.trim()) {
      return { status: 400, body: { error: "Please describe your application concept." } };
    }
    if (prompt.length > MAX_PROMPT_LENGTH) {
      return { status: 400, body: { error: `Description must be ${MAX_PROMPT_LENGTH} characters or fewer.` } };
    }
    if (!isDialect(dialect)) {
      return { status: 400, body: { error: "Unsupported SQL dialect." } };
    }

    const keyToUse = (typeof apiKey === "string" && apiKey.trim()) || process.env.GEMINI_API_KEY;
    if (!keyToUse) {
      return { status: 400, body: { error: "API key is required" } };
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

    return { status: 200, body: parseForgeResponse(response.text || "") };
  } catch (error: any) {
    console.error("Error forging schema:", error);
    const { status, message } = publicErrorMessage(error);
    return { status, body: { error: message } };
  }
}
