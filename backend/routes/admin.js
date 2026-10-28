const express = require("express");
const requireAdmin = require("../middleware/admin");
const router = express.Router();
router.get("/verify", requireAdmin, (_req, res) => res.json({ ok:true, message:"Admin token accepted." }));
module.exports = router;
