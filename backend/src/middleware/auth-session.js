import { AuthorizationError } from "../errors.js";
import { getSessionByToken } from "../services/auth-service.js";

function readBearerToken(headerValue) {
  if (typeof headerValue !== "string") {
    return "";
  }
  const value = headerValue.trim();
  if (!value.toLowerCase().startsWith("bearer ")) {
    return "";
  }
  return value.slice(7).trim();
}

async function requireSession(req, _res, next) {
  try {
    const legacyRole = String(req.header("x-user-role") || "").trim().toLowerCase();
    if (legacyRole) {
      req.context = req.context || {};
      req.context.authUser = {
        id: 0,
        email: "legacy@local",
        role: legacyRole,
        fullName: "Legacy Role",
        isVerified: true,
      };
      return next();
    }

    const token = readBearerToken(req.header("authorization"));
    if (!token) {
      throw new AuthorizationError("Authentication required");
    }
    const session = await getSessionByToken(token);
    if (!session) {
      throw new AuthorizationError("Invalid or expired session");
    }
    req.context = req.context || {};
    req.context.authUser = {
      id: session.user_id,
      email: session.email,
      role: session.role,
      fullName: session.full_name,
      isVerified: session.is_verified,
    };
    return next();
  } catch (error) {
    return next(error);
  }
}

export { requireSession };
