import crypto from "node:crypto";

function requestContext(req, res, next) {
  const requestId = req.headers["x-request-id"] || crypto.randomUUID();
  req.context = { requestId };
  res.setHeader("x-request-id", requestId);
  next();
}

export { requestContext };
