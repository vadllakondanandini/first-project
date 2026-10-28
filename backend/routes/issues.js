const express = require("express");
const supabase = require("../supabase");
const requireAdmin = require("../middleware/admin");
const router = express.Router();
const ISSUE_TYPES = ["wrong_information","place_closed","missing_place","accessibility","other"];
router.post("/", async (req, res, next) => {
  try {
    const { reporter_name, issue_type, details } = req.body || {};
    if (!ISSUE_TYPES.includes(issue_type)) return res.status(400).json({ error:"Choose a valid issue type." });
    if (typeof details !== "string" || details.trim().length < 10 || details.trim().length > 1000) return res.status(400).json({ error:"Details must be between 10 and 1000 characters." });
    if (reporter_name != null && (typeof reporter_name !== "string" || reporter_name.trim().length > 80)) return res.status(400).json({ error:"Name must be at most 80 characters." });
    const { data, error } = await supabase.from("issue_reports").insert({
      reporter_name:typeof reporter_name === "string" ? reporter_name.trim() || null : null,
      issue_type, details:details.trim()
    }).select("id,issue_type,status,created_at").single();
    if (error) throw error;
    res.status(201).json({ issue:data });
  } catch (error) { next(error); }
});
router.get("/", requireAdmin, async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("issue_reports").select("id,reporter_name,issue_type,details,status,created_at").order("created_at", { ascending:false }).limit(100);
    if (error) throw error;
    res.json({ issues:data });
  } catch (error) { next(error); }
});
router.patch("/:id", requireAdmin, async (req, res, next) => {
  try {
    const allowed = ["new","reviewing","resolved","dismissed"];
    if (!allowed.includes(req.body?.status)) return res.status(400).json({ error:"Status must be new, reviewing, resolved, or dismissed." });
    const { data, error } = await supabase.from("issue_reports").update({ status:req.body.status }).eq("id", req.params.id).select("id,status").maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error:"Issue report not found." });
    res.json({ issue:data });
  } catch (error) { next(error); }
});
module.exports = router;
