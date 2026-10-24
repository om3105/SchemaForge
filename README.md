# SchemaForge

**Describe your app in plain English, get a normalized database schema.** SchemaForge turns a natural-language app concept into an interactive ER diagram and ready-to-run SQL DDL, powered by Google Gemini.

**Live demo:** https://schemaforge-1y02.onrender.com/

## Features

- **Natural language → schema**: describe entities and relationships ("a food delivery app with customers, drivers, restaurants…") and get a normalized relational design.
- **Visual ER diagram**: rendered with Mermaid.js.
- **SQL export**: DDL for PostgreSQL, MySQL, SQLite or SQL Server, with copy-to-clipboard and `.sql` download.
- **Bring your own key**: use the server's Gemini key or paste your own (sent only to the backend for that request, never stored).
- **Keyboard friendly**: `⌘/Ctrl + Enter` to forge.

## Architecture

```
React (Vite) ──POST /api/forge──▶ Express ──▶ Gemini (structured JSON output)
     ▲                              │
     └──── { mermaid, sql } ◀───────┘
```

- **Frontend** (`src/`): React 19 + Tailwind CSS v4. `MermaidDiagram` renders the ER diagram client-side.
- **Backend** (`server.ts`): a single Express endpoint that validates input, rate-limits per client, and asks Gemini for a JSON response matching a `{ mermaid, sql }` schema. In development it serves the app through Vite middleware; in production it serves the static build.
- **Shared logic** (`src/lib/forge.ts`): dialect list, input limits and response parsing (with a fallback for non-JSON output), covered by unit tests.

### Safeguards

- Per-IP rate limiting (20 requests / 15 min) protects the shared API key.
- Prompt length is capped at 4,000 characters, and request bodies at 16 KB.
- Upstream errors are logged on the server and mapped to safe, user-friendly messages.

## Tech stack

React 19 · TypeScript · Vite 6 · Tailwind CSS v4 · Express · Google Gen AI SDK · Mermaid.js · Node test runner

## Run locally

**Prerequisites:** Node.js 20+

```bash
npm install
cp .env.example .env    # then set GEMINI_API_KEY
npm run dev             # http://localhost:3000
```

The server key is optional if you paste your own key into the app.

## Scripts

| Command         | Description                                  |
| --------------- | -------------------------------------------- |
| `npm run dev`   | Start the dev server with Vite middleware    |
| `npm run build` | Build the client and bundle the server       |
| `npm start`     | Run the production build                     |
| `npm test`      | Run unit tests                               |
| `npm run lint`  | Type-check with `tsc`                        |

## Deployment

Any Node host works (the live demo runs on Render):

- **Build command:** `npm install && npm run build`
- **Start command:** `npm start`
- **Environment:** `GEMINI_API_KEY=<your key>`. Optional: `GEMINI_MODEL` (defaults to `gemini-3.6-flash`) and `PORT` (defaults to 3000; most hosts set it automatically).
