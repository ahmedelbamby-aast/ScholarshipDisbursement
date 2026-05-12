import app from "./app.js";
import config from "./config.js";

// Dedicated entrypoint keeps app construction testable (app imported without listen()).
app.listen(config.port, () => {
  console.log(`Backend running on http://localhost:${config.port}`);
});
