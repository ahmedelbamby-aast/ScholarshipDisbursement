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
