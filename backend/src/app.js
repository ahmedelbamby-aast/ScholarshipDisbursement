import express from "express";
import cors from "cors";
import helmet from "helmet";
import healthRouter from "./routes/health-routes.js";
import scholarshipRouter from "./routes/scholarship-routes.js";
import { requestContext } from "./middleware/request-context.js";
import { requestLogger } from "./middleware/request-logger.js";
import { errorHandler } from "./middleware/error-handler.js";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(requestContext);
app.use(requestLogger);

app.use(healthRouter);
app.use(scholarshipRouter);
app.use(errorHandler);

export default app;
