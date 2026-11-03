export function createGracefulShutdown({
  server,
  stopDatabaseRetries,
  closeDatabase,
  log,
  forceExit = (code) => process.exit(code),
  setExitCode = (code) => {
    process.exitCode = code;
  },
  timeoutMs = 10_000,
}) {
  let shutdownPromise;

  return function shutdown(signal) {
    if (shutdownPromise) return shutdownPromise;
    log('info', 'server_shutdown_started', { signal });
    stopDatabaseRetries();

    const forcedShutdown = setTimeout(() => {
      log('error', 'server_shutdown_timeout');
      forceExit(1);
    }, timeoutMs);
    forcedShutdown.unref();

    shutdownPromise = new Promise((resolve) => {
      server.close((error) => {
        if (error) log('error', 'http_server_close_failed', { name: error.name });
        closeDatabase()
          .then(() => {
            clearTimeout(forcedShutdown);
            log('info', 'server_shutdown_complete');
            setExitCode(error ? 1 : 0);
            resolve();
          })
          .catch((closeError) => {
            clearTimeout(forcedShutdown);
            log('error', 'database_close_failed', { name: closeError.name });
            setExitCode(1);
            resolve();
          });
      });
    });

    return shutdownPromise;
  };
}
