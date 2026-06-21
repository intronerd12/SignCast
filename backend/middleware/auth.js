const jwt = require("jsonwebtoken");

const getBearerToken = (req) => {
  const header = req.headers.authorization || req.headers.Authorization || "";
  if (!header) return "";
  const [scheme, token] = header.split(" ");
  if (scheme && scheme.toLowerCase() === "bearer" && token) {
    return token.trim();
  }
  return "";
};

const requireAuth = (req, res, next) => {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ message: "Authorization token is required" });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({
      message: "Server authentication is not configured. Set JWT_SECRET."
    });
  }

  try {
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const requireAdmin = (req, res, next) => {
  return requireAuth(req, res, () => {
    if (!req.user || !req.user.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    return next();
  });
};

module.exports = {
  requireAuth,
  requireAdmin,
};
