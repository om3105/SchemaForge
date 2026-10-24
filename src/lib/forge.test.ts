import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isDialect, parseForgeResponse, sqlFileName, stripCodeFences, SQL_SPLIT_DELIMITER } from './forge.ts';

const mermaid = 'erDiagram\n  USER ||--o{ ORDER : places';
const sql = 'CREATE TABLE users (id SERIAL PRIMARY KEY);';

test('parses structured JSON responses', () => {
  assert.deepEqual(parseForgeResponse(JSON.stringify({ mermaid, sql })), { mermaid, sql });
});

test('strips code fences inside JSON fields', () => {
  const text = JSON.stringify({ mermaid: '```mermaid\n' + mermaid + '\n```', sql: '```sql\n' + sql + '\n```' });
  assert.deepEqual(parseForgeResponse(text), { mermaid, sql });
});

test('parses JSON wrapped in a code fence', () => {
  assert.deepEqual(parseForgeResponse('```json\n' + JSON.stringify({ mermaid, sql }) + '\n```'), { mermaid, sql });
});

test('falls back to the delimiter format', () => {
  const text = `\`\`\`mermaid\n${mermaid}\n\`\`\`\n${SQL_SPLIT_DELIMITER}\n\`\`\`sql\n${sql}\n\`\`\``;
  assert.deepEqual(parseForgeResponse(text), { mermaid, sql });
});

test('throws on unrecognized output', () => {
  assert.throws(() => parseForgeResponse('Sorry, I cannot help with that.'), /unexpected format/);
  assert.throws(() => parseForgeResponse('{"mermaid": 1}'), /unexpected format/);
});

test('stripCodeFences leaves plain code unchanged', () => {
  assert.equal(stripCodeFences(`  ${sql}  `), sql);
});

test('isDialect validates against the allowlist', () => {
  assert.equal(isDialect('PostgreSQL'), true);
  assert.equal(isDialect('Oracle'), false);
  assert.equal(isDialect(undefined), false);
});

test('sqlFileName slugifies the dialect', () => {
  assert.equal(sqlFileName('SQL Server'), 'schema-sql-server.sql');
});
