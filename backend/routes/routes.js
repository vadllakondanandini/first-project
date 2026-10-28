const express = require("express");
const supabase = require("../supabase");
const requireAdmin = require("../middleware/admin");
const router = express.Router();
router.get("/", async (req, res, next) => {
  try {
    const from = String(req.query.from || "");
    const to = String(req.query.to || "");
    if (!from || !to) return res.status(400).json({ error:"Both from and to place IDs are required." });
    if (from === to) return res.status(400).json({ error:"Starting point and destination must be different." });
    const { data, error } = await supabase.from("campus_routes")
      .select("id,instructions,estimated_minutes,accessibility_notes,from:places!campus_routes_from_place_id_fkey(id,name),to:places!campus_routes_to_place_id_fkey(id,name)")
      .eq("from_place_id", from).eq("to_place_id", to).eq("is_active", true).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error:"No saved route is available for this pair yet. Ask campus staff for directions." });
    res.json({ route:data });
  } catch (error) { next(error); }
});
router.post("/", requireAdmin, async (req, res, next) => {
  try {
    const { from_place_id, to_place_id, instructions, estimated_minutes, accessibility_notes } = req.body || {};
    if (!from_place_id || !to_place_id || from_place_id === to_place_id) return res.status(400).json({ error:"Choose two different valid place IDs." });
    if (typeof instructions !== "string" || instructions.trim().length < 10 || instructions.length > 1500) return res.status(400).json({ error:"Instructions must be 10–1500 characters." });
    if (estimated_minutes != null && (!Number.isInteger(estimated_minutes) || estimated_minutes < 1 || estimated_minutes > 180)) return res.status(400).json({ error:"estimated_minutes must be an integer from 1 to 180." });
    const { data, error } = await supabase.from("campus_routes").upsert({
      from_place_id, to_place_id, instructions:instructions.trim(),
      estimated_minutes:estimated_minutes || null,
      accessibility_notes:typeof accessibility_notes === "string" ? accessibility_notes.trim().slice(0,500) || null : null
    }, { onConflict:"from_place_id,to_place_id" }).select().single();
    if (error) throw error;
    res.status(201).json({ route:data });
  } catch (error) { next(error); }
});
module.exports = router;
