import express from "express";
import path from "path";
import rateLimit from "express-rate-limit";
import { createServer as createViteServer } from "vite";
import "dotenv/config";
import { handleForge } from "./src/lib/forgeApi";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Render and similar hosts sit behind a proxy; needed for per-client rate limiting
  app.set("trust proxy", 1);

  // The app moved to Vercel; send visitors of the old Render URL there
  app.use((req, res, next) => {
    if (req.hostname.endsWith(".onrender.com")) {
      return res.redirect(302, `https://schemaforge-om.vercel.app${req.originalUrl}`);
    }
    next();
  });

  app.use(express.json({ limit: "16kb" }));

  const forgeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: "Too many requests. Please wait a few minutes and try again." },
  });

  app.post("/api/forge", forgeLimiter, async (req, res) => {
    const { status, body } = await handleForge(req.body);
    res.status(status).json(body);
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
