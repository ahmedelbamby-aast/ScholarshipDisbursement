function requestLogger(req, _res, next) {
  const startedAt = Date.now();
  req.on("end", () => {
    const elapsedMs = Date.now() - startedAt;
    const requestId = req.context?.requestId || "n/a";
    console.info(
      `[api] request_id=${requestId} method=${req.method} path=${req.path} elapsed_ms=${elapsedMs}`
    );
  });
  next();
}

export { requestLogger };
