import crypto from "node:crypto";

function requestContext(req, res, next) {
  // Honor upstream request id when present so cross-service traces stay correlated.
  const requestId = req.headers["x-request-id"] || crypto.randomUUID();
  req.context = { requestId };
  res.setHeader("x-request-id", requestId);
  next();
}

export { requestContext };
