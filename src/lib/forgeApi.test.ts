import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isOverloaded, withRetry } from './forgeApi.ts';

const busy = Object.assign(new Error('This model is currently experiencing high demand.'), { status: 503 });

test('detects Gemini overload errors', () => {
  assert.equal(isOverloaded(busy), true);
  assert.equal(isOverloaded(new Error('API_KEY_INVALID')), false);
});

test('retries overload errors until a call succeeds', async () => {
  let calls = 0;
  const result = await withRetry(async () => {
    calls++;
    if (calls < 3) throw busy;
    return 'ok';
  }, [0, 0]);
  assert.equal(result, 'ok');
  assert.equal(calls, 3);
});

test('gives up after the last retry', async () => {
  let calls = 0;
  await assert.rejects(withRetry(async () => { calls++; throw busy; }, [0, 0]));
  assert.equal(calls, 3);
});

test('does not retry other errors', async () => {
  let calls = 0;
  await assert.rejects(withRetry(async () => { calls++; throw new Error('API_KEY_INVALID'); }, [0, 0]));
  assert.equal(calls, 1);
});

test('does not treat timeouts as overload', () => {
  assert.equal(isOverloaded(new Error('Request timed out')), false);
});
