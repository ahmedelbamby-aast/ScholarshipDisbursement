import { Pool } from "pg";
import config from "./config.js";

let cachedPool = null;

function getPostgresPool() {
  if (!config.databaseUrl) {
    return null;
  }

  if (cachedPool) {
    return cachedPool;
  }

  cachedPool = new Pool({
    connectionString: config.databaseUrl,
  });

  return cachedPool;
}

export { getPostgresPool };
