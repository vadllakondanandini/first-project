const express = require("express");
const supabase = require("../supabase");
const requireAdmin = require("../middleware/admin");
const router = express.Router();
const CATEGORIES = ["academic","library","food","office","sports","health","transport","services","hostel","other"];

function validPlace(body) {
  return body && typeof body.name === "string" && body.name.trim().length >= 2 &&
    body.name.trim().length <= 100 && typeof body.description === "string" &&
    body.description.trim().length >= 5 && body.description.trim().length <= 500 &&
    CATEGORIES.includes(body.category) &&
    (body.building == null || (typeof body.building === "string" && body.building.length <= 100)) &&
    (body.floor == null || (typeof body.floor === "string" && body.floor.length <= 50));
}
router.get("/", async (req, res, next) => {
  try {
    let query = supabase.from("places").select("id,name,slug,category,description,building,floor,landmark,opening_hours,accessibility_notes").eq("is_active", true).order("name");
    if (req.query.category) {
      if (!CATEGORIES.includes(req.query.category)) return res.status(400).json({ error:"Invalid category." });
      query = query.eq("category", req.query.category);
    }
    if (req.query.search) {
      const search = String(req.query.search).trim().slice(0, 80).replace(/[,%()]/g, "");
      if (search) query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,building.ilike.%${search}%`);
    }
    const { data, error } = await query;
    if (error) throw error;
    res.json({ places:data });
  } catch (error) { next(error); }
});
router.get("/:id", async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("places").select("id,name,slug,category,description,building,floor,landmark,opening_hours,accessibility_notes").eq("id", req.params.id).eq("is_active", true).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error:"Place not found." });
    res.json({ place:data });
  } catch (error) { next(error); }
});
router.post("/", requireAdmin, async (req, res, next) => {
  try {
    if (!validPlace(req.body)) return res.status(400).json({ error:"Enter a name, description, valid category, and optional building/floor within the stated limits." });
    const slug = req.body.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90);
    const { data, error } = await supabase.from("places").insert({
      name:req.body.name.trim(), slug, category:req.body.category,
      description:req.body.description.trim(), building:(req.body.building || "").trim() || null,
      floor:(req.body.floor || "").trim() || null, landmark:(req.body.landmark || "").trim() || null,
      opening_hours:(req.body.opening_hours || "").trim() || null,
      accessibility_notes:(req.body.accessibility_notes || "").trim() || null
    }).select().single();
    if (error) {
      if (error.code === "23505") return res.status(409).json({ error:"A place with that slug already exists. Use a more specific name." });
      throw error;
    }
    res.status(201).json({ place:data });
  } catch (error) { next(error); }
});
router.patch("/:id", requireAdmin, async (req, res, next) => {
  try {
    const allowed = ["name","category","description","building","floor","landmark","opening_hours","accessibility_notes","is_active"];
    const update = {};
    for (const key of allowed) if (Object.hasOwn(req.body || {}, key)) update[key] = req.body[key];
    if (!Object.keys(update).length) return res.status(400).json({ error:"Provide at least one supported field to update." });
    if (update.name !== undefined && (typeof update.name !== "string" || update.name.trim().length < 2 || update.name.length > 100)) return res.status(400).json({ error:"Name must be 2–100 characters." });
    if (update.description !== undefined && (typeof update.description !== "string" || update.description.trim().length < 5 || update.description.length > 500)) return res.status(400).json({ error:"Description must be 5–500 characters." });
    if (update.category !== undefined && !CATEGORIES.includes(update.category)) return res.status(400).json({ error:"Invalid category." });
    if (update.is_active !== undefined && typeof update.is_active !== "boolean") return res.status(400).json({ error:"is_active must be true or false." });
    const { data, error } = await supabase.from("places").update(update).eq("id", req.params.id).select().maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ error:"Place not found." });
    res.json({ place:data });
  } catch (error) { next(error); }
});
module.exports = router;
