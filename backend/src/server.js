/**
 * Backend process entrypoint.
 *
 * Responsibilities:
 * - Ensures DB schema compatibility before accepting traffic.
 * - Starts HTTP listener only after initialization succeeds.
 * - Fails fast on bootstrap errors to avoid serving partial functionality.
 *
 * Failure behavior:
 * - If schema initialization fails (connection/auth/SQL error), process exits 1.
 * - This prevents runtime 500s caused by missing tables/columns on first request.
 */
import app from "./app.js";
import config from "./config.js";
import { ensureDatabaseSchema } from "./postgres.js";

// Dedicated entrypoint keeps app construction testable (app imported without listen()).
ensureDatabaseSchema()
  .then(() => {
    app.listen(config.port, () => {
      console.log(`Backend running on http://localhost:${config.port}`);
    });
  })
  .catch((error) => {
    console.error("Backend failed to initialize schema:", error);
    process.exit(1);
  });
