function requireAdmin(req, res, next) {
  const expected = process.env.ADMIN_TOKEN;
  const provided = req.get("x-admin-token");
  if (!expected || expected.length < 24 || !provided || provided !== expected) {
    return res.status(401).json({ error:"Admin authorization required." });
  }
  next();
}
module.exports = requireAdmin;
