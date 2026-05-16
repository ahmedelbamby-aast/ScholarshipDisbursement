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
