import { handleForge } from "../src/lib/forgeApi.js";

// Vercel serverless function for POST /api/forge (server.ts is used for local dev)
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { status, body } = await handleForge(req.body);
  res.status(status).json(body);
}
