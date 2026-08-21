require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const cookieParser = require("cookie-parser");
const { Server } = require("socket.io");

const orderRoutes = require("./routes/orders");
const dashboardRoutes = require("./routes/dashboard");
const reviewRoutes = require("./routes/reviews");
const couponRoutes = require("./routes/coupons");
const adminRoutes = require("./routes/admin");
const adminBusinessSettingsRoutes = require("./routes/adminBusinessSettings");
const businessSettingsRoutes = require("./routes/businessSettings");
const menuRoutes = require("./routes/menu");
const categoryRoutes = require("./routes/categories");
const heroRoutes = require("./routes/hero");
const galleryRoutes = require("./routes/gallery");
const locationRoutes = require("./routes/location");
const promotionRoutes = require("./routes/promotions");
const kitchenRoutes = require("./routes/kitchen");
const tablesRoutes = require("./routes/tables");
const staffRoutes = require("./routes/staff");
const reportsRoutes = require("./routes/reports");
const customersRoutes = require("./routes/customers");
const aiRoutes = require("./routes/ai");
const webauthnRoutes = require("./routes/webauthn");
const updateRoutes = require("./routes/updates");
const superAdminRoutes = require("./routes/superAdmin");
const { tenantEnforcer } = require("./middleware/tenantEnforcer");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 4000;

// 🔥 VERY IMPORTANT FOR RENDER / PROXY
app.set("trust proxy", 1);

const corsOrigin = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()) 
  : "http://localhost:8080";

// ---- CORS ----
app.use(cors({
  origin: corsOrigin,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "x-dashboard-password", "Authorization"],
  credentials: true
}));

app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Serve static updates files
app.use("/public/updates", express.static(path.join(__dirname, "../public/updates")));

const { tenantContext } = require("./middleware/tenantContext");

// ---- System Cron Routes ----
// These must come before tenant enforcer since they run system-wide
app.use("/api/reports", (req, res, next) => tenantContext.run('super_admin', next), reportsRoutes);

// ---- Public Tenant Verification ----
app.get("/api/verify-tenant/:slug", async (req, res) => {
  try {
    const pool = require("./db/pool");
    const result = await pool.query(
      "SELECT name FROM businesses WHERE slug = $1 AND status = 'active' LIMIT 1",
      [req.params.slug.trim().toLowerCase()]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: "Restaurant code not found or inactive" });
    }
    res.json({ valid: true, name: result.rows[0].name });
  } catch(err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---- Super Admin Portal ----
// Global routes that should not be scoped to a specific restaurant
app.use("/api/super", superAdminRoutes);

// ---- Single-Tenant Enforcer ----
app.use(tenantEnforcer);

// ---- Create HTTP Server ----
const server = http.createServer(app);

// ---- Attach Socket.IO ----
const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"]
  }
});

// Make io accessible inside routes
app.set("io", io);

// Socket connection logging
io.on("connection", (socket) => {
  console.log("🔌 Socket connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.id);
  });
});

// Health check
app.get("/api/health", (_, res) => res.json({ status: "ok" }));

// Urgent flush endpoint
app.get("/api/flush-redis-urgent", async (req, res) => {
  try {
    const redisClient = require("../config/redis");
    await redisClient.flushAll();
    res.json({ message: "Flushed all Redis databases on production." });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// Database schema migration for decimals
app.get("/api/migrate-decimals", async (req, res) => {
  try {
    const pool = require("./db/pool");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("ALTER TABLE orders ALTER COLUMN points_earned TYPE numeric(10,2) USING points_earned::numeric(10,2)");
      await client.query("ALTER TABLE orders ALTER COLUMN points_redeemed TYPE numeric(10,2) USING points_redeemed::numeric(10,2)");
      await client.query("ALTER TABLE customers ALTER COLUMN points_balance TYPE numeric(10,2) USING points_balance::numeric(10,2)");
      await client.query("COMMIT");
      res.json({ message: "Database altered successfully for decimal points." });
    } catch(err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/debug-db", async (req, res) => {
  try {
    const pool = require("./db/pool");
    const { query } = req.query;
    if (!query) return res.json({ error: "No query provided" });
    const result = await pool.query(query);
    res.json({ rows: result.rows });
  } catch(e) {
    res.json({ error: e.message });
  }
});

// Routes
app.use("/api/orders", orderRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/admin/business-settings", adminBusinessSettingsRoutes);
app.use("/api/business-settings", businessSettingsRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/hero", heroRoutes);
app.use("/api/gallery", galleryRoutes);
app.use("/api/location", locationRoutes);
app.use("/api/promotions", promotionRoutes);
app.use("/api/kitchen", kitchenRoutes);
app.use("/api/tables", tablesRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/customers", customersRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/webauthn", webauthnRoutes);
app.use("/api/updates", updateRoutes);

// ---- Start Server ----
server.listen(PORT, () => {
  console.log(`🍜 The Chinese House backend running on port ${PORT}`);
});