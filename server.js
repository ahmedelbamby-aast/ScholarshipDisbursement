import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const port = Number(process.env.FRONTEND_PORT || 3300);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.join(__dirname, "frontend");

app.use(express.static(frontendDir));

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true, service: "scholarship-frontend" });
});

app.listen(port, () => {
  console.log(`Running at\nhttp://localhost:${port}`);
});
