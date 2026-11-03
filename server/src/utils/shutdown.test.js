import test from 'node:test';
import assert from 'node:assert/strict';
import { createGracefulShutdown } from './shutdown.js';

function createHarness({ closeDatabase = async () => {}, closeError } = {}) {
  const events = [];
  let closeServer;
  let exitCode;
  const shutdown = createGracefulShutdown({
    server: {
      close(callback) {
        closeServer = callback;
      },
    },
    stopDatabaseRetries() {
      events.push('stop-retries');
    },
    closeDatabase,
    log(level, event) {
      events.push(`${level}:${event}`);
    },
    setExitCode(code) {
      exitCode = code;
    },
  });
  return {
    events,
    shutdown,
    finishClose() {
      closeServer(closeError);
    },
    setExitCode(code) {
      exitCode = code;
    },
    get exitCode() {
      return exitCode;
    },
  };
}

test('graceful shutdown stops retries, closes resources once, and exits successfully', async () => {
  let databaseCloseCount = 0;
  const harness = createHarness({
    closeDatabase: async () => {
      databaseCloseCount += 1;
    },
  });

  const firstShutdown = harness.shutdown('SIGTERM');
  assert.equal(harness.shutdown('SIGINT'), firstShutdown);
  harness.finishClose();
  await firstShutdown;

  assert.equal(databaseCloseCount, 1);
  assert.equal(harness.exitCode, 0);
  assert.deepEqual(harness.events, [
    'info:server_shutdown_started',
    'stop-retries',
    'info:server_shutdown_complete',
  ]);
});

test('graceful shutdown reports HTTP close errors and exits unsuccessfully', async () => {
  const closeError = new Error('HTTP close failed');
  const harness = createHarness({ closeError });
  const shutdownPromise = harness.shutdown('SIGTERM');
  harness.finishClose();
  await shutdownPromise;

  assert.equal(harness.exitCode, 1);
  assert.ok(harness.events.includes('error:http_server_close_failed'));
  assert.ok(harness.events.includes('info:server_shutdown_complete'));
});

test('graceful shutdown reports database close failures and exits unsuccessfully', async () => {
  const harness = createHarness({
    closeDatabase: async () => {
      throw new Error('Database close failed');
    },
  });
  const shutdownPromise = harness.shutdown('SIGTERM');
  harness.finishClose();
  await shutdownPromise;

  assert.equal(harness.exitCode, 1);
  assert.ok(harness.events.includes('error:database_close_failed'));
  assert.ok(!harness.events.includes('info:server_shutdown_complete'));
});
