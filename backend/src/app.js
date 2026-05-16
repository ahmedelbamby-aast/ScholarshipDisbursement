/**
 * Express application composition root.
 *
 * Responsibilities:
 * - Registers security and parsing middleware in deterministic order.
 * - Registers request context/logging before any route handlers.
 * - Mounts route modules and terminal error middleware.
 *
 * Architectural role:
 * - This module builds the app object without binding a network port; `server.js`
 *   is responsible for startup lifecycle and process-level failure handling.
 *
 * Security/performance considerations:
 * - `helmet` is applied early to set security headers for all responses.
 * - JSON parsing limit prevents oversized body abuse.
 * - Error middleware is last to ensure all thrown/forwarded errors are normalized.
 */
import express from "express";
import cors from "cors";
import helmet from "helmet";
import healthRouter from "./routes/health-routes.js";
import scholarshipRouter from "./routes/scholarship-routes.js";
import authRouter from "./routes/auth-routes.js";
import { requestContext } from "./middleware/request-context.js";
import { requestLogger } from "./middleware/request-logger.js";
import { errorHandler } from "./middleware/error-handler.js";

const app = express();

// Baseline security + parsing middleware before request context and routers.
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
// Request-scoped metadata/logging are registered before any handlers.
app.use(requestContext);
app.use(requestLogger);

// Route order is explicit; error handler must remain last.
app.use(healthRouter);
app.use(authRouter);
app.use(scholarshipRouter);
app.use(errorHandler);

export default app;
