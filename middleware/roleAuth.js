export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    const role = req.headers["x-role"];

    if (!role) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ message: "You do not have permission to do this" });
    }

    next();
  };
};