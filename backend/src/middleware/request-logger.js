/**
 * Lightweight request duration logger.
 *
 * Responsibilities:
 * - Captures per-request elapsed milliseconds.
 * - Emits method/path/request-id log line after request stream ends.
 *
 * Performance note:
 * - Uses low-overhead timestamp diff and `console.info`; suitable for local/small deployments.
 */
function requestLogger(req, _res, next) {
  const startedAt = Date.now();
  req.on("end", () => {
    // Log on end so elapsed duration reflects full request lifecycle.
    const elapsedMs = Date.now() - startedAt;
    const requestId = req.context?.requestId || "n/a";
    console.info(
      `[api] request_id=${requestId} method=${req.method} path=${req.path} elapsed_ms=${elapsedMs}`
    );
  });
  next();
}

export { requestLogger };
