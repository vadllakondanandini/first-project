require("dotenv").config();
const path = require("node:path");
const express = require("express");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const placesRouter = require("./routes/places");
const routesRouter = require("./routes/routes");
const issuesRouter = require("./routes/issues");
const adminRouter = require("./routes/admin");

const app = express();
app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy:false }));
app.use(express.json({ limit:"20kb" }));
app.use("/api", rateLimit({ windowMs:15 * 60 * 1000, limit:180, standardHeaders:"draft-8", legacyHeaders:false }));
app.get("/api/health", (_req, res) => res.json({ status:"ok", service:"Campus Quest API" }));
app.use("/api/places", placesRouter);
app.use("/api/routes", routesRouter);
app.use("/api/issues", issuesRouter);
app.use("/api/admin", adminRouter);
app.use(express.static(path.join(__dirname, "..", "frontend")));
app.use("/api", (_req, res) => res.status(404).json({ error:"API endpoint not found." }));
app.use((error, _req, res, _next) => {
  // Log technical details on the server only; do not send database errors to the browser.
  console.error("Request failed:", error?.message || "Unknown error");
  if (res.headersSent) return;
  res.status(500).json({ error:"The server could not complete this request. Check server logs and Supabase configuration." });
});
const port = Number(process.env.PORT) || 3000;
if (require.main === module) app.listen(port, () => console.log(`Campus Quest is running at http://localhost:${port}`));
module.exports = app;
