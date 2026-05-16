/**
 * Role-based authorization middleware.
 *
 * Responsibilities:
 * - Defines normalized application role constants.
 * - Enforces endpoint role allow-lists after authentication middleware.
 *
 * Security boundary:
 * - This middleware assumes identity has been resolved into `req.context.authUser`.
 * - If legacy role headers are enabled upstream, trust boundary is weaker by design.
 */
import { AuthorizationError } from "../errors.js";

const ROLES = {
  ADMIN: "admin",
  AUDITOR: "auditor",
  STUDENT: "student",
};

function parseRole(headerValue) {
  if (typeof headerValue !== "string") {
    return "";
  }
  return headerValue.trim().toLowerCase();
}

function requireRole(allowedRoles) {
  // Higher-order middleware lets each route declare its own minimal privilege set.
  return (req, _res, next) => {
    const role = parseRole(req.context?.authUser?.role || req.header("x-user-role"));
    if (!allowedRoles.includes(role)) {
      return next(new AuthorizationError("Forbidden for this role"));
    }
    req.context = req.context || {};
    req.context.role = role;
    return next();
  };
}

export { ROLES, requireRole };
