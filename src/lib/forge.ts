export const DIALECTS = ['PostgreSQL', 'MySQL', 'SQLite', 'SQL Server'] as const;
export type Dialect = (typeof DIALECTS)[number];

export const MAX_PROMPT_LENGTH = 4000;
export const SQL_SPLIT_DELIMITER = '---SQL-SPLIT---';

export interface ForgeResult {
  mermaid: string;
  sql: string;
}

export function isDialect(value: unknown): value is Dialect {
  return typeof value === 'string' && (DIALECTS as readonly string[]).includes(value);
}

// Remove markdown code fences (```mermaid, ```sql, ```) the model sometimes adds anyway
export function stripCodeFences(code: string): string {
  return code.replace(/```[a-zA-Z]*\s*\n?/g, '').trim();
}

// Accepts the structured JSON response, falling back to the legacy delimiter format
export function parseForgeResponse(text: string): ForgeResult {
  const trimmed = text.trim();

  try {
    const parsed = JSON.parse(stripCodeFences(trimmed));
    if (parsed && typeof parsed.mermaid === 'string' && typeof parsed.sql === 'string') {
      return { mermaid: stripCodeFences(parsed.mermaid), sql: stripCodeFences(parsed.sql) };
    }
  } catch {
    // Not JSON, try the delimiter format below
  }

  const parts = trimmed.split(SQL_SPLIT_DELIMITER);
  if (parts.length >= 2) {
    return { mermaid: stripCodeFences(parts[0]), sql: stripCodeFences(parts.slice(1).join('')) };
  }

  throw new Error('The AI returned an unexpected format. Please try again.');
}

export function sqlFileName(dialect: Dialect): string {
  return `schema-${dialect.toLowerCase().replace(/\s+/g, '-')}.sql`;
}
