const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const pool = require("../db/pool");
const redisClient = require("../../config/redis");
const { adminAuth, JWT_SECRET } = require("../middleware/adminAuth");
const { generateOTP, hashOTP, verifyOTP } = require("../utils/otpHelper");
const { sendEmailOTP } = require("../utils/emailSender");

const crypto = require("crypto");

const BCRYPT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_SECONDS = 900; // 15 min
const OTP_EXPIRY_SECONDS = 120;
const OTP_MAX_ATTEMPTS = 5;

const MAX_IP_ATTEMPTS = 5;
const IP_BLOCK_DURATION = 900; // 15 min

const REFRESH_TOKEN_EXPIRY_SECONDS = 30 * 24 * 60 * 60; // 30 days

const isProduction = process.env.NODE_ENV === "production";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  maxAge: REFRESH_TOKEN_EXPIRY_SECONDS * 1000,
  path: "/",
};


// =============================
// LOGIN LOG HELPER
// =============================
async function logAdminLogin({ success, adminId, businessId, req }) {
  try {
    await pool.query(
      `INSERT INTO admin_login_logs 
       (success, admin_id, ip_address, user_agent, business_id)
       VALUES ($1,$2,$3,$4,$5)`,
      [
        success,
        adminId,
        req.ip,
        req.headers["user-agent"],
        businessId || null
      ]
    );
  } catch (err) {
    console.error("Login log error:", err);
  }
}


// =============================
// RATE LIMITERS
// =============================
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many login attempts. Try again later." },
});

const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Too many reset requests. Try again later." },
});


// ======================================================
// LOGIN
// ======================================================
router.post("/login", loginLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password || typeof password !== "string") {
    return res.status(400).json({ error: "Username and password are required" });
  }

  try {
    const ip = req.ip;

    // Check IP block
    const blocked = await redisClient.get(`admin:ip_block:${ip}`);
    if (blocked) {
      return res.status(403).json({
        error: "Too many failed attempts. IP blocked for 15 minutes.",
      });
    }

    let admin = null;
    let valid = false;

    const result = await pool.query(
      `SELECT a.id, a.password_hash, a.business_id, b.features, b.name as business_name, b.status, b.parent_business_id
       FROM admin_account a
       JOIN businesses b ON a.business_id = b.id
       WHERE a.mobile_number = $1 AND a.business_id = $2
       LIMIT 1`,
      [username.trim().toLowerCase(), req.business_id]
    );

    if (result.rows.length > 0) {
      admin = result.rows[0];
      valid = await bcrypt.compare(password, admin.password_hash);
    }

    // --- PARENT FALLBACK STRATEGY ---
    if (!admin || !valid) {
      const parentCheck = await pool.query(
        `SELECT b.parent_business_id, b.features, b.name as business_name, b.status 
         FROM businesses b 
         WHERE b.id = $1`,
        [req.business_id]
      );
      
      if (parentCheck.rows.length > 0 && parentCheck.rows[0].parent_business_id) {
        const parentId = parentCheck.rows[0].parent_business_id;
        
        const parentResult = await pool.query(
          `SELECT a.id, a.password_hash, a.business_id 
           FROM admin_account a
           WHERE a.mobile_number = $1 AND a.business_id = $2
           LIMIT 1`,
          [username.trim().toLowerCase(), parentId]
        );

        if (parentResult.rows.length > 0) {
          const parentValid = await bcrypt.compare(password, parentResult.rows[0].password_hash);
          if (parentValid) {
            valid = true;
            admin = {
              id: parentResult.rows[0].id,
              business_id: req.business_id,
              features: parentCheck.rows[0].features,
              business_name: parentCheck.rows[0].business_name,
              status: parentCheck.rows[0].status
            };
          }
        }
      }
    }

    if (!admin) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (admin.status !== 'active') {
      return res.status(403).json({ error: "Access Denied: Your restaurant account has been suspended by the platform administrator." });
    }

    const locked = await redisClient.get(`admin:lock:${admin.id}`);
    if (locked) {
      return res.status(403).json({
        error: "Account locked. Try again in 15 minutes.",
      });
    }

    // =====================
    // FAILED LOGIN
    // =====================
    if (!valid) {

      await logAdminLogin({
        success: false,
        adminId: admin.id,
        businessId: admin.business_id,
        req
      });

      const attempts = await redisClient.incr(`admin:login_attempts:${admin.id}`);
      const ipAttempts = await redisClient.incr(`admin:ip_attempts:${ip}`);

      if (attempts === 1) {
        await redisClient.expire(
          `admin:login_attempts:${admin.id}`,
          LOCK_DURATION_SECONDS
        );
      }

      if (ipAttempts === 1) {
        await redisClient.expire(
          `admin:ip_attempts:${ip}`,
          LOCK_DURATION_SECONDS
        );
      }

      // Block IP
      if (ipAttempts >= MAX_IP_ATTEMPTS) {
        await redisClient.setEx(
          `admin:ip_block:${ip}`,
          IP_BLOCK_DURATION,
          "blocked"
        );

        return res.status(403).json({
          error: "Too many failed attempts. IP blocked for 15 minutes.",
        });
      }

      // Lock account
      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        await redisClient.setEx(
          `admin:lock:${admin.id}`,
          LOCK_DURATION_SECONDS,
          "locked"
        );

        return res.status(403).json({
          error: "Account locked for 15 minutes.",
        });
      }

      return res.status(401).json({
        error: `Invalid password. ${MAX_LOGIN_ATTEMPTS - attempts} attempt(s) remaining.`,
      });
    }

    // =====================
    // SUCCESS LOGIN
    // =====================
    await redisClient.del(`admin:login_attempts:${admin.id}`);
    await redisClient.del(`admin:ip_attempts:${ip}`);

    const token = jwt.sign(
      { 
        id: admin.id, 
        role: "admin",
        business_id: admin.business_id 
      },
      JWT_SECRET,
      { expiresIn: "10h" } // Reasonable shift duration
    );

    const refreshToken = crypto.randomBytes(40).toString("hex");

    await redisClient.setEx(
      `refresh_token:${refreshToken}`,
      REFRESH_TOKEN_EXPIRY_SECONDS,
      JSON.stringify({ 
        adminId: admin.id, 
        business_id: admin.business_id 
      })
    );

    res.cookie("refreshToken", refreshToken, COOKIE_OPTIONS);

    res.json({ 
      message: "Login successful", 
      token,
      user: { name: admin.business_name, role: "admin" },
      features: admin.features || {} 
    });

    await logAdminLogin({
      success: true,
      adminId: admin.id,
      businessId: admin.business_id,
      req
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


// ======================================================
// GET CURRENT ADMIN SESSION
// ======================================================
router.get("/me", adminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT features, parent_business_id FROM businesses WHERE id = $1",
      [req.admin.business_id]
    );
    const features = result.rows.length ? result.rows[0].features : {};
    const parent_business_id = result.rows.length ? result.rows[0].parent_business_id : null;

    let user = req.admin;
    if (req.admin.isStaff) {
      const staffRes = await pool.query("SELECT * FROM staff WHERE id = $1", [req.admin.id]);
      if (staffRes.rows.length) {
        user = {
          ...req.admin,
          permissions: staffRes.rows[0].permissions || {},
          role: staffRes.rows[0].role,
          name: staffRes.rows[0].name,
          phone: staffRes.rows[0].phone
        };
      }
    }
    
    res.json({ 
      authenticated: true, 
      user: { ...user, parent_business_id },
      features
    });
  } catch (err) {
    console.error("Auth check error:", err);
    res.json({ authenticated: false });
  }
});


// ======================================================
// LOGOUT
// ======================================================
router.post("/logout", async (req, res) => {
  // Remove refresh token from Redis if we can identify the admin
  try {
    const authHeader = req.headers.authorization;
    let token = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    } else {
      token = req.cookies?.admin_token;
    }
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
        if (decoded.id) {
          await redisClient.del(`admin:refresh_token:${decoded.id}`);
        }
      } catch { /* token invalid, still clear cookies */ }
    }
  } catch { /* ignore */ }

  res.clearCookie("admin_token", { path: "/" });
  res.clearCookie("refreshToken", { path: "/" });
  res.json({ message: "Logged out" });
});


// ======================================================
// REFRESH TOKEN
// ======================================================
router.post("/refresh", async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ error: "No refresh token" });
  }

  try {
    const sessionData = await redisClient.get(`refresh_token:${refreshToken}`);
    if (!sessionData) {
      res.clearCookie("refreshToken", { path: "/" });
      return res.status(401).json({ error: "Invalid or expired refresh token" });
    }

    const { adminId, business_id } = JSON.parse(sessionData);

    // Verify admin still exists
    const result = await pool.query("SELECT id FROM admin_account WHERE id = $1 AND business_id = $2", [adminId, business_id]);
    if (!result.rows.length) {
      return res.status(401).json({ error: "Account no longer valid" });
    }

    // Issue new access token
    const newAccessToken = jwt.sign(
      { id: adminId, role: "admin", business_id },
      JWT_SECRET,
      { expiresIn: "10h" }
    );

    res.json({ token: newAccessToken });

  } catch (err) {
    console.error("Refresh token error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


// ======================================================
// LOGIN LOGS
// ======================================================
router.get("/login-logs", adminAuth, async (req, res) => {
  try {

    const result = await pool.query(
      `SELECT success,
              ip_address,
              user_agent,
              created_at
       FROM admin_login_logs
       WHERE business_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.business_id]
    );

    res.json(result.rows);

  } catch (err) {
    console.error("Login logs error:", err);
    res.status(500).json({ error: "Failed to fetch login logs" });
  }
});


// ======================================================
// AUDIT LOGS
// ======================================================
router.get("/audit-logs", adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT a.id, a.action, a.entity_type, a.entity_id, a.details, a.ip_address, a.created_at,
              s.name AS actor_name, s.role AS actor_role
       FROM audit_logs a
       LEFT JOIN staff s ON a.actor_id = s.id
       WHERE a.business_id = $1
       ORDER BY a.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.business_id, limit, offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM audit_logs WHERE business_id = $1`,
      [req.business_id]
    );

    res.json({
      logs: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit
    });

  } catch (err) {
    console.error("Audit logs error:", err);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});


// ======================================================
// REQUEST RESET
// ======================================================
router.post("/request-reset", resetLimiter, async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: "Username (mobile number) is required" });

  try {
    const result = await pool.query("SELECT * FROM admin_account WHERE mobile_number = $1 AND business_id = $2", [username.trim(), req.business_id]);

    if (!result.rows.length) {
      return res.status(500).json({ error: "Admin account not configured" });
    }

    const admin = result.rows[0];

    const existingOtp = await redisClient.get(`admin:otp:${admin.id}`);

    if (existingOtp) {
      return res.status(429).json({
        error: `OTP already sent. Please wait ${OTP_EXPIRY_SECONDS / 60} minutes.`,
      });
    }

    if (!admin.email) {
      return res.status(400).json({ error: "Recovery email not configured. Please contact support." });
    }

    const otp = generateOTP();
    const otpHash = hashOTP(otp);

    await redisClient.setEx(
      `admin:otp:${admin.id}`,
      OTP_EXPIRY_SECONDS,
      otpHash
    );

    await redisClient.setEx(
      `admin:otp_attempts:${admin.id}`,
      OTP_EXPIRY_SECONDS,
      "0"
    );
    console.log("Generated OTP for admin:", otp);
    await sendEmailOTP(admin.email, otp, "Password Reset");

    res.json({
      message: "OTP sent to registered email address.",
      mobile: admin.mobile_number.replace(/.(?=.{4})/g, "*"),
      email: admin.email.replace(/(.{2})(.*)(?=@)/, "$1***"),
    });

  } catch (err) {
    console.error("Request reset error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


// ======================================================
// RESET PASSWORD
// ======================================================
router.post("/reset-password", resetLimiter, async (req, res) => {

  const { username, otp, newPassword } = req.body;

  if (!username || !otp || !newPassword) {
    return res.status(400).json({ error: "Username, OTP and new password are required" });
  }

  try {
    const result = await pool.query("SELECT * FROM admin_account WHERE mobile_number = $1 AND business_id = $2", [username.trim(), req.business_id]);
    if (!result.rows.length) return res.status(404).json({ error: "Account not found" });
    
    const admin = result.rows[0];

    const storedHash = await redisClient.get(`admin:otp:${admin.id}`);

    if (!storedHash) {
      return res.status(400).json({ error: "OTP expired or not requested" });
    }

    const attempts = await redisClient.incr(`admin:otp_attempts:${admin.id}`);

    if (attempts > OTP_MAX_ATTEMPTS) {
      await redisClient.del(`admin:otp:${admin.id}`);
      return res.status(400).json({ error: "Too many OTP attempts" });
    }

    if (!verifyOTP(otp, storedHash)) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await pool.query(
      "UPDATE admin_account SET password_hash=$1, updated_at=NOW() WHERE id=$2",
      [passwordHash, admin.id]
    );

    await redisClient.del(`admin:otp:${admin.id}`);
    await redisClient.del(`admin:otp_attempts:${admin.id}`);

    res.clearCookie("admin_token", { path: "/" });

    res.json({
      message: "Password reset successful. Please login again.",
    });

  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


// ======================================================
// REQUEST OTP FOR SETTINGS CHANGES (authenticated)
// ======================================================
router.post("/request-settings-otp", adminAuth, resetLimiter, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM admin_account WHERE id = $1 AND business_id = $2", [req.admin.id, req.business_id]);
    if (!result.rows.length) {
      return res.status(500).json({ error: "Admin account not found" });
    }

    const admin = result.rows[0];

    const existingOtp = await redisClient.get(`admin:settings_otp:${admin.id}`);
    if (existingOtp) {
      return res.status(429).json({
        error: `OTP already sent. Please wait ${OTP_EXPIRY_SECONDS / 60} minutes.`,
      });
    }

    if (!admin.email) {
      return res.status(400).json({ error: "Recovery email not configured. Please contact support." });
    }

    const otp = generateOTP();
    const otpHash = hashOTP(otp);

    await redisClient.setEx(
      `admin:settings_otp:${admin.id}`,
      OTP_EXPIRY_SECONDS,
      otpHash
    );

    await redisClient.setEx(
      `admin:settings_otp_attempts:${admin.id}`,
      OTP_EXPIRY_SECONDS,
      "0"
    );

    console.log("Generated settings OTP for admin:", otp);
    await sendEmailOTP(admin.email, otp, "Security Settings");

    res.json({
      message: "OTP sent to registered email address.",
      email: admin.email.replace(/(.{2})(.*)(?=@)/, "$1***"),
    });
  } catch (err) {
    console.error("Request settings OTP error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


// ======================================================
// CHANGE PASSWORD (authenticated + OTP)
// ======================================================
router.post("/change-password", adminAuth, resetLimiter, async (req, res) => {
  const { otp, currentPassword, newPassword } = req.body;

  if (!otp || !currentPassword || !newPassword) {
    return res.status(400).json({ error: "OTP, current password, and new password are required" });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters" });
  }
  if (!/[a-zA-Z]/.test(newPassword)) {
    return res.status(400).json({ error: "New password must contain at least 1 letter" });
  }
  if (!/[0-9]/.test(newPassword)) {
    return res.status(400).json({ error: "New password must contain at least 1 number" });
  }

  try {
    const result = await pool.query("SELECT * FROM admin_account WHERE id = $1 AND business_id = $2", [req.admin.id, req.business_id]);
    if (!result.rows.length) return res.status(404).json({ error: "Admin not found" });
    const admin = result.rows[0];

    // Verify current password
    const validCurrent = await bcrypt.compare(currentPassword, admin.password_hash);
    if (!validCurrent) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    // Verify OTP
    const storedHash = await redisClient.get(`admin:settings_otp:${admin.id}`);
    if (!storedHash) {
      return res.status(400).json({ error: "OTP expired or not requested" });
    }

    const attempts = await redisClient.incr(`admin:settings_otp_attempts:${admin.id}`);
    if (attempts > OTP_MAX_ATTEMPTS) {
      await redisClient.del(`admin:settings_otp:${admin.id}`);
      return res.status(400).json({ error: "Too many OTP attempts" });
    }

    if (!verifyOTP(otp, storedHash)) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    // Update password
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await pool.query(
      "UPDATE admin_account SET password_hash=$1, updated_at=NOW() WHERE id=$2",
      [passwordHash, admin.id]
    );

    await redisClient.del(`admin:settings_otp:${admin.id}`);
    await redisClient.del(`admin:settings_otp_attempts:${admin.id}`);

    res.json({ message: "Password changed successfully." });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


// ======================================================
// CHANGE MOBILE NUMBER (authenticated + OTP)
// ======================================================
router.post("/change-mobile", adminAuth, resetLimiter, async (req, res) => {
  const { otp, newMobile } = req.body;

  if (!otp || !newMobile) {
    return res.status(400).json({ error: "OTP and new mobile number are required" });
  }

  // Basic mobile validation
  const trimmedMobile = newMobile.trim();
  if (!/^[0-9]{10}$/.test(trimmedMobile)) {
    return res.status(400).json({ error: "Phone number must be exactly 10 digits." });
  }

  try {
    const result = await pool.query("SELECT * FROM admin_account WHERE id = $1 AND business_id = $2", [req.admin.id, req.business_id]);
    if (!result.rows.length) return res.status(404).json({ error: "Admin not found" });
    const admin = result.rows[0];

    // Verify OTP
    const storedHash = await redisClient.get(`admin:settings_otp:${admin.id}`);
    if (!storedHash) {
      return res.status(400).json({ error: "OTP expired or not requested" });
    }

    const attempts = await redisClient.incr(`admin:settings_otp_attempts:${admin.id}`);
    if (attempts > OTP_MAX_ATTEMPTS) {
      await redisClient.del(`admin:settings_otp:${admin.id}`);
      return res.status(400).json({ error: "Too many OTP attempts" });
    }

    if (!verifyOTP(otp, storedHash)) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    // Update mobile
    await pool.query(
      "UPDATE admin_account SET mobile_number=$1, updated_at=NOW() WHERE id=$2",
      [trimmedMobile, admin.id]
    );

    await redisClient.del(`admin:settings_otp:${admin.id}`);
    await redisClient.del(`admin:settings_otp_attempts:${admin.id}`);

    res.json({
      message: "Mobile number updated successfully.",
      mobile: trimmedMobile.replace(/.(?=.{4})/g, "*"),
    });
  } catch (err) {
    console.error("Change mobile error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


// ======================================================
// CHANGE EMAIL (authenticated + OTP)
// ======================================================
router.post("/change-email", adminAuth, resetLimiter, async (req, res) => {
  const { otp, newEmail } = req.body;

  if (!newEmail) {
    return res.status(400).json({ error: "New email is required" });
  }

  // Basic email validation
  const cleanEmail = newEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  try {
    const result = await pool.query("SELECT * FROM admin_account WHERE id = $1 AND business_id = $2", [req.admin.id, req.business_id]);
    if (!result.rows.length) return res.status(404).json({ error: "Admin not found" });
    const admin = result.rows[0];

    // If an email is already set, we verify OTP. If no email is set, we bypass OTP requirement for the FIRST setup.
    if (admin.email) {
      if (!otp) {
        return res.status(400).json({ error: "OTP is required to change an existing email" });
      }
      
      // Verify OTP
      const storedHash = await redisClient.get(`admin:settings_otp:${admin.id}`);
      if (!storedHash) {
        return res.status(400).json({ error: "OTP expired or not requested" });
      }

      const attempts = await redisClient.incr(`admin:settings_otp_attempts:${admin.id}`);
      if (attempts > OTP_MAX_ATTEMPTS) {
        await redisClient.del(`admin:settings_otp:${admin.id}`);
        return res.status(400).json({ error: "Too many OTP attempts" });
      }

      if (!verifyOTP(otp, storedHash)) {
        return res.status(400).json({ error: "Invalid OTP" });
      }
    }

    // Update email
    await pool.query(
      "UPDATE admin_account SET email=$1, updated_at=NOW() WHERE id=$2",
      [cleanEmail, admin.id]
    );

    if (admin.email) {
      await redisClient.del(`admin:settings_otp:${admin.id}`);
      await redisClient.del(`admin:settings_otp_attempts:${admin.id}`);
    }

    res.json({
      message: "Recovery email updated successfully.",
      email: cleanEmail.replace(/(.{2})(.*)(?=@)/, "$1***"),
    });
  } catch (err) {
    console.error("Change email error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});


// ======================================================
// GET CURRENT ADMIN INFO (masked mobile)
// ======================================================
router.get("/info", adminAuth, async (req, res) => {
  try {
    const result = await pool.query("SELECT mobile_number, email FROM admin_account WHERE id = $1 AND business_id = $2", [req.admin.id, req.business_id]);
    if (!result.rows.length) {
      return res.status(500).json({ error: "Admin account not configured" });
    }
    const mobile = result.rows[0].mobile_number;
    const email = result.rows[0].email;
    res.json({
      mobile: mobile ? mobile.replace(/.(?=.{4})/g, "*") : null,
      email: email ? email.replace(/(.{2})(.*)(?=@)/, "$1***") : null,
    });
  } catch (err) {
    console.error("Admin info error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ======================================================
// REGISTER BIOMETRIC DEVICE
// ======================================================
router.post("/biometric/register", adminAuth, async (req, res) => {
  try {
    const biometricToken = crypto.randomBytes(64).toString("hex");
    
    // Store in redis with 1 year expiry
    await redisClient.setEx(
      `biometric_token:${biometricToken}`,
      31536000,
      JSON.stringify({
        adminId: req.admin.id,
        business_id: req.business_id
      })
    );
    
    res.json({ biometricToken });
  } catch (err) {
    console.error("Biometric register error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ======================================================
// BIOMETRIC LOGIN
// ======================================================
router.post("/biometric/login", loginLimiter, async (req, res) => {
  const { biometricToken } = req.body;
  if (!biometricToken) return res.status(400).json({ error: "Biometric token is required" });

  try {
    const sessionData = await redisClient.get(`biometric_token:${biometricToken}`);
    if (!sessionData) {
      return res.status(401).json({ error: "Invalid or expired biometric token. Please login with password." });
    }

    const { adminId, business_id } = JSON.parse(sessionData);

    const result = await pool.query(
      `SELECT a.id, b.features, b.name as business_name
       FROM admin_account a
       JOIN businesses b ON a.business_id = b.id
       WHERE a.id = $1 AND a.business_id = $2
       LIMIT 1`,
      [adminId, business_id]
    );

    if (!result.rows.length) {
      return res.status(401).json({ error: "Account no longer valid" });
    }

    const admin = result.rows[0];

    const token = jwt.sign(
      { id: adminId, role: "admin", business_id },
      JWT_SECRET,
      { expiresIn: "10h" }
    );

    const refreshToken = crypto.randomBytes(40).toString("hex");
    await redisClient.setEx(
      `refresh_token:${refreshToken}`,
      REFRESH_TOKEN_EXPIRY_SECONDS,
      JSON.stringify({ adminId, business_id })
    );

    res.cookie("refreshToken", refreshToken, COOKIE_OPTIONS);

    res.json({ 
      message: "Biometric login successful", 
      token,
      user: { name: admin.business_name, role: "admin" },
      features: admin.features || {} 
    });
  } catch (err) {
    console.error("Biometric login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
// ======================================================
// MULTI-BRANCH MANAGEMENT
// ======================================================
router.get("/branches", adminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
          b.id, b.name, b.slug, b.subscription_tier, b.status, b.is_active,
          (
            SELECT COUNT(id) FROM orders 
            WHERE business_id = b.id AND (created_at AT TIME ZONE 'Asia/Kolkata')::date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date AND status != 'cancelled'
          ) as today_orders,
          (
            SELECT COALESCE(SUM(total), 0) FROM orders 
            WHERE business_id = b.id AND (created_at AT TIME ZONE 'Asia/Kolkata')::date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date AND status != 'cancelled'
          ) as today_revenue,
          (
            SELECT COUNT(id) FROM orders 
            WHERE business_id = b.id AND status != 'cancelled'
          ) as all_time_orders,
          (
            SELECT COALESCE(SUM(total), 0) FROM orders 
            WHERE business_id = b.id AND status != 'cancelled'
          ) as all_time_revenue,
          (
            SELECT COUNT(id) FROM orders 
            WHERE business_id = b.id AND status IN ('new', 'preparing')
          ) as active_orders_count
       FROM businesses b 
       WHERE b.parent_business_id = $1 
       ORDER BY b.created_at DESC`,
      [req.business_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching branches:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/impersonate-branch", adminAuth, async (req, res) => {
  const { branchId } = req.body;
  if (!branchId) return res.status(400).json({ error: "Branch ID required" });

  try {
    // Verify the branch belongs to this HQ
    const branchRes = await pool.query(
      "SELECT id, name FROM businesses WHERE id = $1 AND parent_business_id = $2",
      [branchId, req.business_id]
    );
    
    if (branchRes.rows.length === 0) {
      return res.status(403).json({ error: "Unauthorized or branch not found" });
    }

    // Since the HQ admin is verified, issue a token for the branch
    const token = require("jsonwebtoken").sign(
      { 
        id: req.admin.id, // Using same admin id but acting under a different business
        role: "admin",
        business_id: branchId 
      },
      require("../middleware/adminAuth").JWT_SECRET,
      { expiresIn: "1h" } // Short-lived impersonation token
    );

    res.json({ token, branch: branchRes.rows[0] });
  } catch (err) {
    console.error("Error impersonating branch:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/branches/:id/toggle-status", adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // First verify ownership
    const checkRes = await pool.query(
      "SELECT is_active FROM businesses WHERE id = $1 AND parent_business_id = $2",
      [id, req.business_id]
    );
    
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: "Branch not found" });
    }
    
    const newStatus = !checkRes.rows[0].is_active;
    
    await pool.query(
      "UPDATE businesses SET is_active = $1 WHERE id = $2",
      [newStatus, id]
    );
    
    res.json({ message: "Branch status updated", is_active: newStatus });
  } catch (err) {
    console.error("Error toggling branch status:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/branches/:id", adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { slug, subscription_tier } = req.body;
    
    // Verify ownership
    const checkRes = await pool.query(
      "SELECT id FROM businesses WHERE id = $1 AND parent_business_id = $2",
      [id, req.business_id]
    );
    
    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: "Branch not found" });
    }
    
    // Check if new slug is taken by a different business
    if (slug) {
      const slugCheck = await pool.query("SELECT id FROM businesses WHERE slug = $1 AND id != $2", [slug, id]);
      if (slugCheck.rows.length > 0) {
        return res.status(400).json({ error: "Slug is already in use" });
      }
    }
    
    await pool.query(
      "UPDATE businesses SET slug = COALESCE($1, slug), subscription_tier = COALESCE($2, subscription_tier) WHERE id = $3",
      [slug, subscription_tier, id]
    );
    
    res.json({ message: "Branch updated successfully" });
  } catch (err) {
    console.error("Error updating branch:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/branch-requests", adminAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM branch_requests WHERE parent_business_id = $1 ORDER BY created_at DESC",
      [req.business_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching branch requests:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/branch-requests", adminAuth, async (req, res) => {
  const { name, slug, tier, mobile, password } = req.body;
  if (!name || !slug || !tier || !mobile || !password) {
    return res.status(400).json({ error: "Name, slug, tier, mobile, and password are required." });
  }

  // Basic slug validation (alphanumeric, dashes, lowercase)
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return res.status(400).json({ error: "Slug must contain only lowercase letters, numbers, and dashes" });
  }

  try {
    // Check if slug is already taken globally
    const slugCheck = await pool.query("SELECT id FROM businesses WHERE slug = $1", [slug]);
    if (slugCheck.rows.length > 0) {
      return res.status(400).json({ error: "This domain slug is already in use by another restaurant." });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      "INSERT INTO branch_requests (parent_business_id, requested_name, requested_slug, requested_tier, requested_mobile, requested_password_hash) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [req.business_id, name, slug, tier, mobile, passwordHash]
    );
    res.status(201).json({ message: "Branch request submitted successfully", request: result.rows[0] });
  } catch (err) {
    console.error("Error submitting branch request:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
router.get("/franchise-analytics", adminAuth, async (req, res) => {
  try {
    const today = await pool.query(`
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total), 0) as total_revenue
      FROM orders 
      WHERE (created_at AT TIME ZONE 'Asia/Kolkata')::date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date 
      AND status != 'cancelled'
      AND (business_id = $1 OR business_id IN (SELECT id FROM businesses WHERE parent_business_id = $1))
    `, [req.business_id]);

    const allTime = await pool.query(`
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total), 0) as total_revenue
      FROM orders 
      WHERE status != 'cancelled'
      AND (business_id = $1 OR business_id IN (SELECT id FROM businesses WHERE parent_business_id = $1))
    `, [req.business_id]);

    res.json({
      today: today.rows[0],
      allTime: allTime.rows[0]
    });
  } catch (err) {
    console.error("Error fetching franchise analytics:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;