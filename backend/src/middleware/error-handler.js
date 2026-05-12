import { AppError } from "../errors.js";

function toErrorMessage(error, fallback) {
  return error?.message || fallback;
}

function errorHandler(error, req, res, _next) {
  const requestId = req.context?.requestId || "n/a";
  const appError =
    error instanceof AppError ? error : new AppError(toErrorMessage(error, "Internal server error"), 500);

  if (appError.statusCode >= 500) {
    // Only server-side faults are logged at error level to reduce expected-noise.
    console.error(
      `[api] request_id=${requestId} status=${appError.statusCode} message=${appError.message}`
    );
  }

  return res.status(appError.statusCode).json({ error: appError.message });
}

export { errorHandler };
