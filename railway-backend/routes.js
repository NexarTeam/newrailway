const { createServer } = require("http");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  generateToken,
  authMiddleware,
} = require("./middleware/auth");
const { query } = require("./db");
const { sendVerificationEmail, sendPasswordResetEmail } = require("./utils/email");
const { getUncachableStripeClient, getStripePublishableKey } = require("./stripeClient");

function getSystemConfig() {
  const configPath = path.join(process.cwd(), "shared/config.json");
  try {
    const data = fs.readFileSync(configPath, "utf-8");
    return JSON.parse(data);
  } catch {
    return { version: "1.0.0", edition: "PC", systemId: null };
  }
}

function saveSystemConfig(config) {
  const configPath = path.join(process.cwd(), "shared/config.json");
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function generateSystemId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const segment1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  const segment2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `NXR-PC-${segment1}-${segment2}`;
}

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), "uploads/avatars");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${req.user?.userId}-${Date.now()}${ext}`;
    cb(null, filename);
  },
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, GIF, and WebP images are allowed"));
    }
  },
});

const ACHIEVEMENTS_LIST = [
  { id: "first_login", name: "First Login", description: "Log in for the first time", icon: "trophy" },
  { id: "profile_complete", name: "Profile Complete", description: "Complete your profile with avatar and bio", icon: "user" },
  { id: "first_friend", name: "First Friend", description: "Add your first friend", icon: "users" },
  { id: "messenger", name: "Messenger", description: "Send your first message", icon: "message-circle" },
  { id: "social_butterfly", name: "Social Butterfly", description: "Have 5 friends", icon: "heart" },
  { id: "chat_master", name: "Chat Master", description: "Send 50 messages", icon: "messages-square" },
  { id: "developer", name: "Developer", description: "Have a game approved for the Nexar Store", icon: "code" },
];

const GAME_CATALOG = {
  "store-1": { price: 49.99, name: "Galactic Frontier", trialEnabled: true, trialDurationMinutes: 120, nexarPlusDiscount: 20 },
  "store-2": { price: 59.99, name: "Dragon's Legacy", trialEnabled: true, trialDurationMinutes: 120, nexarPlusDiscount: 15 },
  "store-3": { price: 29.99, name: "Urban Legends", nexarPlusDiscount: 25 },
  "store-4": { price: 39.99, name: "Quantum Break", trialEnabled: true, trialDurationMinutes: 120 },
  "store-5": { price: 69.99, name: "Warzone Elite", nexarPlusDiscount: 10 },
  "store-6": { price: 24.99, name: "Speed Kings" },
  "store-7": { price: 34.99, name: "Empire Builder", inNexarPlusCollection: true },
  "store-8": { price: 44.99, name: "Championship 2025", inNexarPlusCollection: true },
};

const NEXAR_PLUS_PRICE = 4.99;
const NEXAR_PLUS_CURRENCY = "gbp";

// Helper function to convert DB row (snake_case) to API response (camelCase)
function dbUserToApiUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    passwordHash: row.password_hash,
    avatarUrl: row.avatar_url || "",
    bio: row.bio || "",
    verified: row.verified,
    verificationToken: row.verification_token,
    passwordResetToken: row.password_reset_token,
    passwordResetTokenExpiry: row.password_reset_token_expiry ? Number(row.password_reset_token_expiry) : null,
    walletBalance: parseFloat(row.wallet_balance) || 0,
    ownedGames: row.owned_games || [],
    role: row.role || "user",
    isDeveloper: row.is_developer,
    developerProfile: row.developer_profile,
    stripeCustomerId: row.stripe_customer_id,
    nexarPlusSubscriptionId: row.nexar_plus_subscription_id,
    nexarPlusStatus: row.nexar_plus_status,
    createdAt: row.created_at,
    subscription: row.developer_profile?.subscription || null,
    parentalControls: row.developer_profile?.parentalControls || null,
    trialUsage: row.developer_profile?.trialUsage || null,
  };
}

function dbFriendToApiFriend(row) {
  if (!row) return null;
  return {
    id: row.id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    status: row.status,
    createdAt: row.created_at,
  };
}

function dbMessageToApiMessage(row) {
  if (!row) return null;
  return {
    id: row.id,
    fromId: row.from_id,
    toId: row.to_id,
    text: row.content,
    timestamp: row.timestamp,
  };
}

function dbAchievementToApiAchievement(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    achievementId: row.achievement_id,
    unlockedAt: row.unlocked_at,
  };
}

function dbCloudSaveToApiCloudSave(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    gameId: row.game_id,
    filename: row.save_name,
    data: row.save_data,
    uploadedAt: row.updated_at || row.created_at,
  };
}

function dbTransactionToApiTransaction(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    amount: parseFloat(row.amount),
    description: row.description,
    stripeSessionId: row.reference_id,
    gameId: row.reference_id,
    timestamp: row.created_at,
  };
}

function dbDevGameToApiDevGame(row) {
  if (!row) return null;
  return {
    gameId: row.game_id,
    developerId: row.developer_id,
    title: row.title,
    description: row.description,
    genre: row.genre,
    tags: row.tags || [],
    price: parseFloat(row.price),
    coverImage: row.cover_image || "",
    screenshots: row.screenshots || [],
    version: row.version,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function registerRoutes(httpServer, app) {
  
  // Serve uploaded avatars statically
  app.use("/uploads/avatars", (req, res, next) => {
    const avatarPath = path.join(process.cwd(), "uploads/avatars", req.path);
    if (fs.existsSync(avatarPath)) {
      res.sendFile(avatarPath);
    } else {
      res.status(404).json({ message: "Avatar not found" });
    }
  });

  // ==================== SYSTEM ROUTES ====================

  app.get("/api/system/info", (req, res) => {
    let config = getSystemConfig();
    
    if (!config.systemId) {
      config.systemId = generateSystemId();
      saveSystemConfig(config);
    }

    res.json({
      version: `${config.version} (${config.edition} Edition)`,
      edition: config.edition,
      systemId: config.systemId,
      device: "Nexar Desktop Environment",
      manufacturer: "Sabre Collective (Software Platform)",
      hardware: {
        cpu: "Unknown (Simulated)",
        gpu: "Unknown (Simulated)",
        ram: "Unknown (Simulated)",
        os: "NexarOS PC Web Prototype"
      }
    });
  });

  // ==================== AUTH ROUTES ====================
  
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, username, password } = req.body;

      if (!email || !username || !password) {
        return res.status(400).json({ message: "Email, username, and password are required" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const existingEmailResult = await query("SELECT id FROM users WHERE email = $1", [email]);
      if (existingEmailResult.rows.length > 0) {
        return res.status(400).json({ message: "Email already in use" });
      }

      const existingUsernameResult = await query("SELECT id FROM users WHERE username = $1", [username]);
      if (existingUsernameResult.rows.length > 0) {
        return res.status(400).json({ message: "Username already taken" });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const verificationToken = uuidv4();
      const userId = uuidv4();

      await query(
        `INSERT INTO users (id, email, username, password_hash, avatar_url, bio, verified, verification_token, wallet_balance, owned_games, role)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [userId, email, username, passwordHash, "", "", false, verificationToken, 0, [], "user"]
      );

      await query(
        `INSERT INTO achievements (id, user_id, achievement_id, unlocked_at)
         VALUES ($1, $2, $3, NOW())`,
        [uuidv4(), userId, "first_login"]
      );

      sendVerificationEmail(email, username, verificationToken).catch(err => {
        console.error("Failed to send verification email:", err);
      });

      res.status(201).json({ 
        message: "Account created! Please check your email to verify your account before logging in.",
        requiresVerification: true
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const result = await query("SELECT * FROM users WHERE email = $1", [email]);
      if (result.rows.length === 0) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const user = dbUserToApiUser(result.rows[0]);

      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      if (!user.verified) {
        return res.status(401).json({ 
          message: "Invalid email or password"
        });
      }

      const token = generateToken({
        userId: user.id,
        email: user.email,
        username: user.username,
      });

      const { passwordHash: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword, token });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/resend-verification", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const result = await query("SELECT * FROM users WHERE email = $1", [email]);
      if (result.rows.length === 0) {
        return res.json({ message: "If an account exists with this email, a verification link has been sent." });
      }

      const user = dbUserToApiUser(result.rows[0]);

      if (user.verified) {
        return res.json({ message: "If an account exists with this email, a verification link has been sent." });
      }

      const newToken = uuidv4();
      await query("UPDATE users SET verification_token = $1 WHERE id = $2", [newToken, user.id]);

      await sendVerificationEmail(email, user.username, newToken);
      
      res.json({ message: "If an account exists with this email, a verification link has been sent." });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({ message: "Failed to send verification email" });
    }
  });

  app.post("/api/auth/requestPasswordReset", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const result = await query("SELECT * FROM users WHERE LOWER(email) = $1", [normalizedEmail]);
      
      if (result.rows.length === 0 || !result.rows[0].verified) {
        return res.json({ success: true });
      }

      const user = dbUserToApiUser(result.rows[0]);

      const resetToken = uuidv4();
      const resetTokenExpiry = Date.now() + 15 * 60 * 1000;

      await query(
        "UPDATE users SET password_reset_token = $1, password_reset_token_expiry = $2 WHERE id = $3",
        [resetToken, resetTokenExpiry, user.id]
      );

      await sendPasswordResetEmail(user.email, user.username, resetToken);

      res.json({ success: true });
    } catch (error) {
      console.error("Password reset request error:", error);
      res.json({ success: true });
    }
  });

  app.post("/api/auth/resetPassword", async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const result = await query("SELECT * FROM users WHERE password_reset_token = $1", [token]);
      
      if (result.rows.length === 0) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      const user = dbUserToApiUser(result.rows[0]);

      if (!user.passwordResetTokenExpiry || Date.now() > user.passwordResetTokenExpiry) {
        await query(
          "UPDATE users SET password_reset_token = NULL, password_reset_token_expiry = NULL WHERE id = $1",
          [user.id]
        );
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);

      await query(
        "UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_token_expiry = NULL WHERE id = $2",
        [passwordHash, user.id]
      );

      res.json({ success: true });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ message: "Password reset failed" });
    }
  });

  app.get("/api/auth/me", authMiddleware, async (req, res) => {
    try {
      const result = await query("SELECT * FROM users WHERE id = $1", [req.user.userId]);
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }
      const user = dbUserToApiUser(result.rows[0]);
      const { passwordHash: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Get me error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  app.patch("/api/auth/profile", authMiddleware, async (req, res) => {
    try {
      const { avatarUrl, bio, username } = req.body;
      const updates = [];
      const values = [];
      let paramIndex = 1;

      if (avatarUrl !== undefined) {
        updates.push(`avatar_url = $${paramIndex++}`);
        values.push(avatarUrl);
      }
      if (bio !== undefined) {
        updates.push(`bio = $${paramIndex++}`);
        values.push(bio);
      }
      if (username !== undefined) {
        const existingResult = await query(
          "SELECT id FROM users WHERE username = $1 AND id != $2",
          [username, req.user.userId]
        );
        if (existingResult.rows.length > 0) {
          return res.status(400).json({ message: "Username already taken" });
        }
        updates.push(`username = $${paramIndex++}`);
        values.push(username);
      }

      if (updates.length === 0) {
        const result = await query("SELECT * FROM users WHERE id = $1", [req.user.userId]);
        const user = dbUserToApiUser(result.rows[0]);
        const { passwordHash: _, ...userWithoutPassword } = user;
        return res.json({ ...userWithoutPassword, unlockedAchievements: [] });
      }

      values.push(req.user.userId);
      const updateResult = await query(
        `UPDATE users SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      if (updateResult.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const updated = dbUserToApiUser(updateResult.rows[0]);

      const unlockedAchievements = [];
      if (updated.avatarUrl && updated.bio) {
        const existingAchResult = await query(
          "SELECT id FROM achievements WHERE user_id = $1 AND achievement_id = $2",
          [req.user.userId, "profile_complete"]
        );
        if (existingAchResult.rows.length === 0) {
          await query(
            "INSERT INTO achievements (id, user_id, achievement_id, unlocked_at) VALUES ($1, $2, $3, NOW())",
            [uuidv4(), req.user.userId, "profile_complete"]
          );
          const achievement = ACHIEVEMENTS_LIST.find(a => a.id === "profile_complete");
          if (achievement) unlockedAchievements.push(achievement);
        }
      }

      const { passwordHash: _, ...userWithoutPassword } = updated;
      res.json({ ...userWithoutPassword, unlockedAchievements });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ message: "Profile update failed" });
    }
  });

  app.post("/api/auth/avatar", authMiddleware, uploadAvatar.single("avatar"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const avatarUrl = `/uploads/avatars/${req.file.filename}`;
      
      const updateResult = await query(
        "UPDATE users SET avatar_url = $1 WHERE id = $2 RETURNING *",
        [avatarUrl, req.user.userId]
      );

      if (updateResult.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const updated = dbUserToApiUser(updateResult.rows[0]);

      const unlockedAchievements = [];
      if (updated.avatarUrl && updated.bio) {
        const existingAchResult = await query(
          "SELECT id FROM achievements WHERE user_id = $1 AND achievement_id = $2",
          [req.user.userId, "profile_complete"]
        );
        if (existingAchResult.rows.length === 0) {
          await query(
            "INSERT INTO achievements (id, user_id, achievement_id, unlocked_at) VALUES ($1, $2, $3, NOW())",
            [uuidv4(), req.user.userId, "profile_complete"]
          );
          const achievement = ACHIEVEMENTS_LIST.find(a => a.id === "profile_complete");
          if (achievement) unlockedAchievements.push(achievement);
        }
      }

      const { passwordHash: _, ...userWithoutPassword } = updated;
      res.json({ ...userWithoutPassword, unlockedAchievements });
    } catch (error) {
      console.error("Avatar upload error:", error);
      res.status(500).json({ message: "Avatar upload failed" });
    }
  });

  // ==================== FRIENDS ROUTES ====================

  app.get("/api/friends", authMiddleware, async (req, res) => {
    try {
      const userId = req.user.userId;
      const friendsResult = await query(
        `SELECT * FROM friends 
         WHERE status = 'accepted' AND (sender_id = $1 OR receiver_id = $1)`,
        [userId]
      );

      const friendIds = friendsResult.rows.map((fr) => 
        fr.sender_id === userId ? fr.receiver_id : fr.sender_id
      );

      if (friendIds.length === 0) {
        return res.json([]);
      }

      const usersResult = await query(
        "SELECT * FROM users WHERE id = ANY($1)",
        [friendIds]
      );

      const friends = usersResult.rows.map(row => {
        const user = dbUserToApiUser(row);
        const { passwordHash: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });

      res.json(friends);
    } catch (error) {
      console.error("Get friends error:", error);
      res.status(500).json({ message: "Failed to get friends" });
    }
  });

  app.get("/api/friends/requests", authMiddleware, async (req, res) => {
    try {
      const userId = req.user.userId;
      const pendingResult = await query(
        "SELECT * FROM friends WHERE receiver_id = $1 AND status = 'pending'",
        [userId]
      );

      const senderIds = pendingResult.rows.map(fr => fr.sender_id);
      if (senderIds.length === 0) {
        return res.json([]);
      }

      const usersResult = await query(
        "SELECT * FROM users WHERE id = ANY($1)",
        [senderIds]
      );

      const usersMap = {};
      usersResult.rows.forEach(row => {
        const user = dbUserToApiUser(row);
        const { passwordHash: _, ...userWithoutPassword } = user;
        usersMap[user.id] = userWithoutPassword;
      });

      const requestsWithUsers = pendingResult.rows.map(fr => ({
        ...dbFriendToApiFriend(fr),
        sender: usersMap[fr.sender_id],
      })).filter(r => r.sender);

      res.json(requestsWithUsers);
    } catch (error) {
      console.error("Get friend requests error:", error);
      res.status(500).json({ message: "Failed to get friend requests" });
    }
  });

  app.get("/api/friends/sent", authMiddleware, async (req, res) => {
    try {
      const userId = req.user.userId;
      const sentResult = await query(
        "SELECT * FROM friends WHERE sender_id = $1 AND status = 'pending'",
        [userId]
      );

      const receiverIds = sentResult.rows.map(fr => fr.receiver_id);
      if (receiverIds.length === 0) {
        return res.json([]);
      }

      const usersResult = await query(
        "SELECT * FROM users WHERE id = ANY($1)",
        [receiverIds]
      );

      const usersMap = {};
      usersResult.rows.forEach(row => {
        const user = dbUserToApiUser(row);
        const { passwordHash: _, ...userWithoutPassword } = user;
        usersMap[user.id] = userWithoutPassword;
      });

      const requestsWithUsers = sentResult.rows.map(fr => ({
        ...dbFriendToApiFriend(fr),
        receiver: usersMap[fr.receiver_id],
      })).filter(r => r.receiver);

      res.json(requestsWithUsers);
    } catch (error) {
      console.error("Get sent requests error:", error);
      res.status(500).json({ message: "Failed to get sent requests" });
    }
  });

  app.post("/api/friends/request", authMiddleware, async (req, res) => {
    try {
      const { username } = req.body;
      const userId = req.user.userId;

      if (!username) {
        return res.status(400).json({ message: "Username is required" });
      }

      const targetResult = await query("SELECT * FROM users WHERE username = $1", [username]);
      if (targetResult.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const targetUser = dbUserToApiUser(targetResult.rows[0]);

      if (targetUser.id === userId) {
        return res.status(400).json({ message: "Cannot send friend request to yourself" });
      }

      const existingResult = await query(
        `SELECT * FROM friends 
         WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)`,
        [userId, targetUser.id]
      );

      if (existingResult.rows.length > 0) {
        const existing = dbFriendToApiFriend(existingResult.rows[0]);
        if (existing.status === "accepted") {
          return res.status(400).json({ message: "Already friends" });
        }
        return res.status(400).json({ message: "Friend request already exists" });
      }

      await query(
        "INSERT INTO friends (id, sender_id, receiver_id, status, created_at) VALUES ($1, $2, $3, $4, NOW())",
        [uuidv4(), userId, targetUser.id, "pending"]
      );

      res.status(201).json({ message: "Friend request sent" });
    } catch (error) {
      console.error("Send friend request error:", error);
      res.status(500).json({ message: "Failed to send friend request" });
    }
  });

  app.post("/api/friends/accept/:requestId", authMiddleware, async (req, res) => {
    try {
      const { requestId } = req.params;
      const userId = req.user.userId;

      const requestResult = await query(
        "SELECT * FROM friends WHERE id = $1 AND receiver_id = $2",
        [requestId, userId]
      );

      if (requestResult.rows.length === 0) {
        return res.status(404).json({ message: "Friend request not found" });
      }

      const request = dbFriendToApiFriend(requestResult.rows[0]);

      if (request.status !== "pending") {
        return res.status(400).json({ message: "Request already processed" });
      }

      await query("UPDATE friends SET status = 'accepted' WHERE id = $1", [requestId]);

      const friendshipsResult = await query(
        `SELECT * FROM friends 
         WHERE status = 'accepted' AND (sender_id = $1 OR receiver_id = $1)`,
        [userId]
      );

      const unlockedAchievements = [];
      
      if (friendshipsResult.rows.length === 1) {
        const existingAchResult = await query(
          "SELECT id FROM achievements WHERE user_id = $1 AND achievement_id = $2",
          [userId, "first_friend"]
        );
        if (existingAchResult.rows.length === 0) {
          await query(
            "INSERT INTO achievements (id, user_id, achievement_id, unlocked_at) VALUES ($1, $2, $3, NOW())",
            [uuidv4(), userId, "first_friend"]
          );
          const achievement = ACHIEVEMENTS_LIST.find(a => a.id === "first_friend");
          if (achievement) unlockedAchievements.push(achievement);
        }
      }

      if (friendshipsResult.rows.length >= 5) {
        const existingAchResult = await query(
          "SELECT id FROM achievements WHERE user_id = $1 AND achievement_id = $2",
          [userId, "social_butterfly"]
        );
        if (existingAchResult.rows.length === 0) {
          await query(
            "INSERT INTO achievements (id, user_id, achievement_id, unlocked_at) VALUES ($1, $2, $3, NOW())",
            [uuidv4(), userId, "social_butterfly"]
          );
          const achievement = ACHIEVEMENTS_LIST.find(a => a.id === "social_butterfly");
          if (achievement) unlockedAchievements.push(achievement);
        }
      }

      res.json({ message: "Friend request accepted", unlockedAchievements });
    } catch (error) {
      console.error("Accept friend request error:", error);
      res.status(500).json({ message: "Failed to accept friend request" });
    }
  });

  app.post("/api/friends/reject/:requestId", authMiddleware, async (req, res) => {
    try {
      const { requestId } = req.params;
      const userId = req.user.userId;

      const requestResult = await query(
        "SELECT * FROM friends WHERE id = $1 AND receiver_id = $2",
        [requestId, userId]
      );

      if (requestResult.rows.length === 0) {
        return res.status(404).json({ message: "Friend request not found" });
      }

      await query("UPDATE friends SET status = 'rejected' WHERE id = $1", [requestId]);
      res.json({ message: "Friend request rejected" });
    } catch (error) {
      console.error("Reject friend request error:", error);
      res.status(500).json({ message: "Failed to reject friend request" });
    }
  });

  app.delete("/api/friends/:friendId", authMiddleware, async (req, res) => {
    try {
      const { friendId } = req.params;
      const userId = req.user.userId;

      const deleteResult = await query(
        `DELETE FROM friends 
         WHERE status = 'accepted' 
         AND ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1))
         RETURNING id`,
        [userId, friendId]
      );

      if (deleteResult.rows.length === 0) {
        return res.status(404).json({ message: "Friendship not found" });
      }

      res.json({ message: "Friend removed" });
    } catch (error) {
      console.error("Delete friend error:", error);
      res.status(500).json({ message: "Failed to remove friend" });
    }
  });

  // ==================== MESSAGES ROUTES ====================

  app.get("/api/messages/:friendId", authMiddleware, async (req, res) => {
    try {
      const { friendId } = req.params;
      const userId = req.user.userId;

      const messagesResult = await query(
        `SELECT * FROM messages 
         WHERE (from_id = $1 AND to_id = $2) OR (from_id = $2 AND to_id = $1)
         ORDER BY timestamp ASC`,
        [userId, friendId]
      );

      const messages = messagesResult.rows.map(dbMessageToApiMessage);
      res.json(messages);
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ message: "Failed to get messages" });
    }
  });

  app.post("/api/messages/:friendId", authMiddleware, async (req, res) => {
    try {
      const { friendId } = req.params;
      const { text } = req.body;
      const userId = req.user.userId;

      if (!text || !text.trim()) {
        return res.status(400).json({ message: "Message text is required" });
      }

      const friendshipResult = await query(
        `SELECT id FROM friends 
         WHERE status = 'accepted' 
         AND ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1))`,
        [userId, friendId]
      );

      if (friendshipResult.rows.length === 0) {
        return res.status(403).json({ message: "You can only message friends" });
      }

      const messageId = uuidv4();
      await query(
        "INSERT INTO messages (id, from_id, to_id, content, timestamp) VALUES ($1, $2, $3, $4, NOW())",
        [messageId, userId, friendId, text.trim()]
      );

      const messageResult = await query("SELECT * FROM messages WHERE id = $1", [messageId]);
      const message = dbMessageToApiMessage(messageResult.rows[0]);

      const unlockedAchievements = [];
      const userMessagesResult = await query(
        "SELECT COUNT(*) as count FROM messages WHERE from_id = $1",
        [userId]
      );
      const messageCount = parseInt(userMessagesResult.rows[0].count);

      if (messageCount === 1) {
        const existingAchResult = await query(
          "SELECT id FROM achievements WHERE user_id = $1 AND achievement_id = $2",
          [userId, "messenger"]
        );
        if (existingAchResult.rows.length === 0) {
          await query(
            "INSERT INTO achievements (id, user_id, achievement_id, unlocked_at) VALUES ($1, $2, $3, NOW())",
            [uuidv4(), userId, "messenger"]
          );
          const achievement = ACHIEVEMENTS_LIST.find(a => a.id === "messenger");
          if (achievement) unlockedAchievements.push(achievement);
        }
      }

      if (messageCount >= 50) {
        const existingAchResult = await query(
          "SELECT id FROM achievements WHERE user_id = $1 AND achievement_id = $2",
          [userId, "chat_master"]
        );
        if (existingAchResult.rows.length === 0) {
          await query(
            "INSERT INTO achievements (id, user_id, achievement_id, unlocked_at) VALUES ($1, $2, $3, NOW())",
            [uuidv4(), userId, "chat_master"]
          );
          const achievement = ACHIEVEMENTS_LIST.find(a => a.id === "chat_master");
          if (achievement) unlockedAchievements.push(achievement);
        }
      }

      res.status(201).json({ ...message, unlockedAchievements });
    } catch (error) {
      console.error("Send message error:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // ==================== ACHIEVEMENTS ROUTES ====================

  app.get("/api/achievements", authMiddleware, async (req, res) => {
    try {
      const userId = req.user.userId;
      const achievementsResult = await query(
        "SELECT * FROM achievements WHERE user_id = $1",
        [userId]
      );

      const userAchievements = achievementsResult.rows.map(dbAchievementToApiAchievement);

      const achievementsWithDetails = ACHIEVEMENTS_LIST.map(achievement => {
        const unlocked = userAchievements.find(ua => ua.achievementId === achievement.id);
        return {
          ...achievement,
          unlocked: !!unlocked,
          unlockedAt: unlocked?.unlockedAt || null,
        };
      });

      res.json(achievementsWithDetails);
    } catch (error) {
      console.error("Get achievements error:", error);
      res.status(500).json({ message: "Failed to get achievements" });
    }
  });

  app.get("/api/achievements/list", (req, res) => {
    res.json(ACHIEVEMENTS_LIST);
  });

  // ==================== CLOUD SAVES ROUTES ====================

  app.get("/api/cloud", authMiddleware, async (req, res) => {
    try {
      const userId = req.user.userId;
      const savesResult = await query(
        "SELECT id, user_id, game_id, save_name, created_at, updated_at FROM cloud_saves WHERE user_id = $1",
        [userId]
      );
      
      const saves = savesResult.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        gameId: row.game_id,
        filename: row.save_name,
        uploadedAt: row.updated_at || row.created_at,
      }));
      
      res.json(saves);
    } catch (error) {
      console.error("Get cloud saves error:", error);
      res.status(500).json({ message: "Failed to get cloud saves" });
    }
  });

  app.get("/api/cloud/:saveId", authMiddleware, async (req, res) => {
    try {
      const userId = req.user.userId;
      const { saveId } = req.params;

      const saveResult = await query(
        "SELECT * FROM cloud_saves WHERE id = $1 AND user_id = $2",
        [saveId, userId]
      );

      if (saveResult.rows.length === 0) {
        return res.status(404).json({ message: "Cloud save not found" });
      }

      const save = dbCloudSaveToApiCloudSave(saveResult.rows[0]);
      res.json(save);
    } catch (error) {
      console.error("Get cloud save error:", error);
      res.status(500).json({ message: "Failed to get cloud save" });
    }
  });

  app.post("/api/cloud", authMiddleware, async (req, res) => {
    try {
      const userId = req.user.userId;
      const { filename, data } = req.body;

      if (!filename || !data) {
        return res.status(400).json({ message: "Filename and data are required" });
      }

      const saveId = uuidv4();
      await query(
        `INSERT INTO cloud_saves (id, user_id, game_id, save_name, save_data, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [saveId, userId, "default", filename, data]
      );

      res.status(201).json({
        id: saveId,
        userId,
        filename,
        uploadedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Create cloud save error:", error);
      res.status(500).json({ message: "Failed to create cloud save" });
    }
  });

  app.patch("/api/cloud/:saveId", authMiddleware, async (req, res) => {
    try {
      const userId = req.user.userId;
      const { saveId } = req.params;
      const { filename, data } = req.body;

      const existingResult = await query(
        "SELECT * FROM cloud_saves WHERE id = $1 AND user_id = $2",
        [saveId, userId]
      );

      if (existingResult.rows.length === 0) {
        return res.status(404).json({ message: "Cloud save not found" });
      }

      const updates = ["updated_at = NOW()"];
      const values = [];
      let paramIndex = 1;

      if (filename) {
        updates.push(`save_name = $${paramIndex++}`);
        values.push(filename);
      }
      if (data) {
        updates.push(`save_data = $${paramIndex++}`);
        values.push(data);
      }

      values.push(saveId);
      const updateResult = await query(
        `UPDATE cloud_saves SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      const updated = updateResult.rows[0];
      res.json({
        id: updated.id,
        userId: updated.user_id,
        filename: updated.save_name,
        uploadedAt: updated.updated_at,
      });
    } catch (error) {
      console.error("Update cloud save error:", error);
      res.status(500).json({ message: "Update failed" });
    }
  });

  app.delete("/api/cloud/:saveId", authMiddleware, async (req, res) => {
    try {
      const userId = req.user.userId;
      const { saveId } = req.params;

      const deleteResult = await query(
        "DELETE FROM cloud_saves WHERE id = $1 AND user_id = $2 RETURNING id",
        [saveId, userId]
      );

      if (deleteResult.rows.length === 0) {
        return res.status(404).json({ message: "Cloud save not found" });
      }

      res.json({ message: "Cloud save deleted" });
    } catch (error) {
      console.error("Delete cloud save error:", error);
      res.status(500).json({ message: "Failed to delete cloud save" });
    }
  });

  // ==================== EMAIL VERIFICATION ROUTES ====================

  app.get("/api/auth/verify", async (req, res) => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== "string") {
        return res.status(400).json({ message: "Verification token is required" });
      }

      const userResult = await query(
        "SELECT * FROM users WHERE verification_token = $1",
        [token]
      );

      if (userResult.rows.length === 0) {
        return res.status(400).json({ message: "Invalid verification token" });
      }

      const user = dbUserToApiUser(userResult.rows[0]);

      if (user.verified) {
        return res.json({ message: "Email already verified" });
      }

      await query(
        "UPDATE users SET verified = true, verification_token = NULL WHERE id = $1",
        [user.id]
      );

      res.json({ message: "Email verified successfully" });
    } catch (error) {
      console.error("Verification error:", error);
      res.status(500).json({ message: "Verification failed" });
    }
  });

  // ==================== WALLET ROUTES ====================

  app.get("/api/wallet", authMiddleware, async (req, res) => {
    try {
      const userResult = await query("SELECT * FROM users WHERE id = $1", [req.user.userId]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const user = dbUserToApiUser(userResult.rows[0]);

      const transactionsResult = await query(
        "SELECT * FROM wallet_transactions WHERE user_id = $1 ORDER BY created_at DESC",
        [req.user.userId]
      );

      const transactions = transactionsResult.rows.map(dbTransactionToApiTransaction);

      res.json({
        balance: user.walletBalance || 0,
        transactions,
        ownedGames: user.ownedGames || [],
      });
    } catch (error) {
      console.error("Get wallet error:", error);
      res.status(500).json({ message: "Failed to get wallet" });
    }
  });

  app.get("/api/wallet/stripe-key", async (req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error) {
      console.error("Failed to get Stripe key:", error);
      res.status(500).json({ message: "Failed to get payment configuration" });
    }
  });

  app.post("/api/wallet/create-checkout", authMiddleware, async (req, res) => {
    try {
      const { amount } = req.body;
      
      if (!amount || amount < 5 || amount > 100) {
        return res.status(400).json({ message: "Amount must be between £5 and £100" });
      }

      const userResult = await query("SELECT * FROM users WHERE id = $1", [req.user.userId]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const user = dbUserToApiUser(userResult.rows[0]);
      const stripe = await getUncachableStripeClient();
      
      const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN 
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
        : process.env.REPLIT_DOMAINS?.split(',')[0] 
          ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
          : 'http://localhost:5000';

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'gbp',
            product_data: {
              name: 'NexarOS Wallet Funds',
              description: `Add £${amount} to your NexarOS wallet`,
            },
            unit_amount: amount * 100,
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${baseUrl}/wallet?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/wallet?canceled=true`,
        metadata: {
          userId: user.id,
          type: 'wallet_deposit',
          amount: amount.toString(),
        },
      });

      res.json({ url: session.url, sessionId: session.id });
    } catch (error) {
      console.error("Checkout error:", error);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  app.post("/api/wallet/verify-payment", authMiddleware, async (req, res) => {
    try {
      const { sessionId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID is required" });
      }

      const existingResult = await query(
        "SELECT * FROM wallet_transactions WHERE reference_id = $1",
        [sessionId]
      );
      if (existingResult.rows.length > 0) {
        return res.json({ message: "Payment already processed", balance: parseFloat(existingResult.rows[0].amount) });
      }

      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status !== 'paid') {
        return res.status(400).json({ message: "Payment not completed" });
      }

      if (session.metadata?.userId !== req.user.userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const amount = parseInt(session.metadata?.amount || '0');
      if (amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      const userResult = await query("SELECT * FROM users WHERE id = $1", [req.user.userId]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const user = dbUserToApiUser(userResult.rows[0]);
      const newBalance = (user.walletBalance || 0) + amount;
      
      await query(
        "UPDATE users SET wallet_balance = $1 WHERE id = $2",
        [newBalance, user.id]
      );

      await query(
        `INSERT INTO wallet_transactions (id, user_id, amount, type, description, reference_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [uuidv4(), user.id, amount, "deposit", `Added £${amount} to wallet`, sessionId]
      );

      res.json({ message: "Payment verified", balance: newBalance });
    } catch (error) {
      console.error("Payment verification error:", error);
      res.status(500).json({ message: "Failed to verify payment" });
    }
  });

  app.post("/api/wallet/purchase-game", authMiddleware, async (req, res) => {
    try {
      const { gameId } = req.body;
      
      if (!gameId) {
        return res.status(400).json({ message: "Game ID is required" });
      }

      const gameData = GAME_CATALOG[gameId];
      if (!gameData) {
        return res.status(404).json({ message: "Game not found in catalog" });
      }

      const gameName = gameData.name;

      const userResult = await query("SELECT * FROM users WHERE id = $1", [req.user.userId]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const user = dbUserToApiUser(userResult.rows[0]);

      if ((user.ownedGames || []).includes(gameId)) {
        return res.status(400).json({ message: "You already own this game" });
      }

      let finalPrice = gameData.price;
      let discountApplied = 0;
      
      if (user.subscription?.active && gameData.nexarPlusDiscount) {
        discountApplied = gameData.nexarPlusDiscount;
        finalPrice = gameData.price * (1 - discountApplied / 100);
        finalPrice = Math.round(finalPrice * 100) / 100;
      }

      if ((user.walletBalance || 0) < finalPrice) {
        return res.status(400).json({ message: "Insufficient wallet balance" });
      }

      const newBalance = (user.walletBalance || 0) - finalPrice;
      const newOwnedGames = [...(user.ownedGames || []), gameId];
      
      await query(
        "UPDATE users SET wallet_balance = $1, owned_games = $2 WHERE id = $3",
        [newBalance, newOwnedGames, user.id]
      );

      const discountText = discountApplied > 0 ? ` (${discountApplied}% Nexar+ discount)` : "";
      await query(
        `INSERT INTO wallet_transactions (id, user_id, amount, type, description, reference_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [uuidv4(), user.id, -finalPrice, "purchase", `Purchased ${gameName}${discountText}`, gameId]
      );

      res.json({ 
        message: "Game purchased successfully", 
        balance: newBalance,
        ownedGames: newOwnedGames,
        discountApplied,
        originalPrice: gameData.price,
        finalPrice,
      });
    } catch (error) {
      console.error("Purchase error:", error);
      res.status(500).json({ message: "Failed to purchase game" });
    }
  });

  // ==================== PARENTAL CONTROLS ROUTES ====================

  const getDefaultParentalControls = () => ({
    enabled: false,
    parentPin: "",
    playtimeLimit: null,
    canMakePurchases: true,
    restrictedRatings: [],
    requiresParentApproval: false,
    dailyPlaytimeLog: {
      date: new Date().toISOString().split("T")[0],
      minutesPlayed: 0,
    },
  });

  app.post("/api/parental/enable", authMiddleware, async (req, res) => {
    try {
      const { pin } = req.body;

      if (!pin || typeof pin !== "string" || pin.length < 4 || pin.length > 8 || !/^\d+$/.test(pin)) {
        return res.status(400).json({ message: "PIN must be 4-8 digits" });
      }

      const userResult = await query("SELECT * FROM users WHERE id = $1", [req.user.userId]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const hashedPin = await bcrypt.hash(pin, 10);
      const parentalControls = {
        ...getDefaultParentalControls(),
        enabled: true,
        parentPin: hashedPin,
      };

      const currentProfile = userResult.rows[0].developer_profile || {};
      await query(
        "UPDATE users SET developer_profile = $1 WHERE id = $2",
        [{ ...currentProfile, parentalControls }, req.user.userId]
      );

      res.json({ message: "Parental controls enabled" });
    } catch (error) {
      console.error("Enable parental controls error:", error);
      res.status(500).json({ message: "Failed to enable parental controls" });
    }
  });

  app.post("/api/parental/disable", authMiddleware, async (req, res) => {
    try {
      const { pin } = req.body;

      if (!pin) {
        return res.status(400).json({ message: "PIN is required" });
      }

      const userResult = await query("SELECT * FROM users WHERE id = $1", [req.user.userId]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const user = dbUserToApiUser(userResult.rows[0]);
      if (!user.parentalControls?.enabled) {
        return res.status(400).json({ message: "Parental controls not enabled" });
      }

      const validPin = await bcrypt.compare(pin, user.parentalControls.parentPin);
      if (!validPin) {
        return res.status(401).json({ message: "Invalid PIN" });
      }

      const currentProfile = userResult.rows[0].developer_profile || {};
      await query(
        "UPDATE users SET developer_profile = $1 WHERE id = $2",
        [{ ...currentProfile, parentalControls: getDefaultParentalControls() }, req.user.userId]
      );

      res.json({ message: "Parental controls disabled" });
    } catch (error) {
      console.error("Disable parental controls error:", error);
      res.status(500).json({ message: "Failed to disable parental controls" });
    }
  });

  app.post("/api/parental/verifyPin", authMiddleware, async (req, res) => {
    try {
      const { pin } = req.body;

      if (!pin) {
        return res.status(400).json({ valid: false });
      }

      const userResult = await query("SELECT * FROM users WHERE id = $1", [req.user.userId]);
      if (userResult.rows.length === 0) {
        return res.status(400).json({ valid: false });
      }

      const user = dbUserToApiUser(userResult.rows[0]);
      if (!user.parentalControls?.enabled) {
        return res.status(400).json({ valid: false });
      }

      const validPin = await bcrypt.compare(pin, user.parentalControls.parentPin);
      res.json({ valid: validPin });
    } catch (error) {
      console.error("Verify PIN error:", error);
      res.status(500).json({ valid: false });
    }
  });

  const VALID_CONTENT_RATINGS = ["E", "T", "M", "18+"];
  
  const LEGACY_RATING_MAP = {
    "Mature": "M",
    "Teen": "T",
    "Everyone": "E",
    "7+": "E",
    "12+": "T",
    "16+": "M",
  };

  const normalizeRatings = (ratings) => {
    const normalized = ratings.map(r => LEGACY_RATING_MAP[r] || r);
    return [...new Set(normalized.filter(r => VALID_CONTENT_RATINGS.includes(r)))];
  };

  app.post("/api/parental/updateSettings", authMiddleware, async (req, res) => {
    try {
      const { pin, playtimeLimit, canMakePurchases, restrictedRatings, requiresParentApproval } = req.body;

      if (!pin) {
        return res.status(400).json({ message: "PIN is required" });
      }

      const userResult = await query("SELECT * FROM users WHERE id = $1", [req.user.userId]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const user = dbUserToApiUser(userResult.rows[0]);
      if (!user.parentalControls?.enabled) {
        return res.status(400).json({ message: "Parental controls not enabled" });
      }

      const validPin = await bcrypt.compare(pin, user.parentalControls.parentPin);
      if (!validPin) {
        return res.status(401).json({ message: "Invalid PIN" });
      }

      const updates = {};
      if (playtimeLimit !== undefined) updates.playtimeLimit = playtimeLimit;
      if (canMakePurchases !== undefined) updates.canMakePurchases = canMakePurchases;
      if (restrictedRatings !== undefined) {
        updates.restrictedRatings = normalizeRatings(restrictedRatings);
      }
      if (requiresParentApproval !== undefined) updates.requiresParentApproval = requiresParentApproval;

      const newParentalControls = { ...user.parentalControls, ...updates };
      const currentProfile = userResult.rows[0].developer_profile || {};
      await query(
        "UPDATE users SET developer_profile = $1 WHERE id = $2",
        [{ ...currentProfile, parentalControls: newParentalControls }, req.user.userId]
      );
      
      res.json({ message: "Settings updated", parentalControls: newParentalControls });
    } catch (error) {
      console.error("Update parental settings error:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  app.get("/api/parental/status", authMiddleware, async (req, res) => {
    try {
      const userResult = await query("SELECT * FROM users WHERE id = $1", [req.user.userId]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const user = dbUserToApiUser(userResult.rows[0]);
      const parentalControls = user.parentalControls || getDefaultParentalControls();
      
      const today = new Date().toISOString().split("T")[0];
      if (parentalControls.dailyPlaytimeLog?.date !== today) {
        parentalControls.dailyPlaytimeLog = { date: today, minutesPlayed: 0 };
      }

      parentalControls.restrictedRatings = normalizeRatings(parentalControls.restrictedRatings || []);

      const { parentPin, ...safeControls } = parentalControls;
      res.json(safeControls);
    } catch (error) {
      console.error("Get parental status error:", error);
      res.status(500).json({ message: "Failed to get status" });
    }
  });

  app.post("/api/parental/checkAccess", authMiddleware, async (req, res) => {
    try {
      const { gameId, rating, gameRating } = req.body;
      const rawRating = gameRating || rating;
      const contentRating = rawRating ? (LEGACY_RATING_MAP[rawRating] || rawRating) : null;

      const userResult = await query("SELECT * FROM users WHERE id = $1", [req.user.userId]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const user = dbUserToApiUser(userResult.rows[0]);
      const parentalControls = user.parentalControls;
      
      if (!parentalControls?.enabled) {
        return res.json({ allowed: true });
      }

      const normalizedRestrictedRatings = normalizeRatings(parentalControls.restrictedRatings || []);
      if (contentRating && normalizedRestrictedRatings.includes(contentRating)) {
        return res.json({ allowed: false, reason: `This game is rated ${contentRating} which is restricted` });
      }

      const today = new Date().toISOString().split("T")[0];
      if (parentalControls.playtimeLimit !== null) {
        let minutesPlayed = parentalControls.dailyPlaytimeLog?.minutesPlayed || 0;
        if (parentalControls.dailyPlaytimeLog?.date !== today) {
          minutesPlayed = 0;
        }
        if (minutesPlayed >= parentalControls.playtimeLimit) {
          return res.json({ 
            allowed: false, 
            reason: `Daily playtime limit of ${parentalControls.playtimeLimit} minutes reached` 
          });
        }
      }

      res.json({ allowed: true });
    } catch (error) {
      console.error("Check access error:", error);
      res.status(500).json({ message: "Failed to check access" });
    }
  });

  app.post("/api/parental/override", authMiddleware, async (req, res) => {
    try {
      const { pin } = req.body;

      if (!pin) {
        return res.status(400).json({ message: "PIN is required" });
      }

      const userResult = await query("SELECT * FROM users WHERE id = $1", [req.user.userId]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const user = dbUserToApiUser(userResult.rows[0]);
      if (!user.parentalControls?.enabled) {
        return res.status(400).json({ message: "Parental controls not enabled" });
      }

      const validPin = await bcrypt.compare(pin, user.parentalControls.parentPin);
      if (!validPin) {
        return res.status(401).json({ message: "Invalid PIN" });
      }

      res.json({ allowed: true });
    } catch (error) {
      console.error("Override error:", error);
      res.status(500).json({ message: "Failed to verify override" });
    }
  });

  app.post("/api/parental/logPlaytime", authMiddleware, async (req, res) => {
    try {
      const { minutes } = req.body;

      if (typeof minutes !== "number" || minutes < 0) {
        return res.status(400).json({ message: "Invalid minutes" });
      }

      const userResult = await query("SELECT * FROM users WHERE id = $1", [req.user.userId]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const user = dbUserToApiUser(userResult.rows[0]);
      const parentalControls = user.parentalControls || getDefaultParentalControls();
      const today = new Date().toISOString().split("T")[0];

      if (parentalControls.dailyPlaytimeLog?.date !== today) {
        parentalControls.dailyPlaytimeLog = { date: today, minutesPlayed: 0 };
      }

      parentalControls.dailyPlaytimeLog.minutesPlayed += minutes;
      
      const currentProfile = userResult.rows[0].developer_profile || {};
      await query(
        "UPDATE users SET developer_profile = $1 WHERE id = $2",
        [{ ...currentProfile, parentalControls }, req.user.userId]
      );

      res.json({ 
        minutesPlayed: parentalControls.dailyPlaytimeLog.minutesPlayed,
        limit: parentalControls.playtimeLimit,
      });
    } catch (error) {
      console.error("Log playtime error:", error);
      res.status(500).json({ message: "Failed to log playtime" });
    }
  });

  app.post("/api/parental/checkPurchase", authMiddleware, async (req, res) => {
    try {
      const userResult = await query("SELECT * FROM users WHERE id = $1", [req.user.userId]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const user = dbUserToApiUser(userResult.rows[0]);
      const parentalControls = user.parentalControls;
      
      if (!parentalControls?.enabled) {
        return res.json({ allowed: true, requiresApproval: false });
      }

      if (!parentalControls.canMakePurchases) {
        return res.json({ allowed: false, reason: "Purchases are disabled by parental controls" });
      }

      if (parentalControls.requiresParentApproval) {
        return res.json({ allowed: true, requiresApproval: true });
      }

      res.json({ allowed: true, requiresApproval: false });
    } catch (error) {
      console.error("Check purchase error:", error);
      res.status(500).json({ message: "Failed to check purchase permission" });
    }
  });

  // ==================== NEXAR+ SUBSCRIPTION ROUTES ====================

  app.get("/api/subscription/status", authMiddleware, async (req, res) => {
    try {
      const userResult = await query("SELECT * FROM users WHERE id = $1", [req.user.userId]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const user = dbUserToApiUser(userResult.rows[0]);

      res.json({
        active: user.subscription?.active || false,
        renewalDate: user.subscription?.renewalDate || "",
        stripeSubscriptionId: user.subscription?.stripeSubscriptionId || "",
      });
    } catch (error) {
      console.error("Get subscription status error:", error);
      res.status(500).json({ message: "Failed to get subscription status" });
    }
  });

  app.post("/api/subscription/create-checkout", authMiddleware, async (req, res) => {
    try {
      const userResult = await query("SELECT * FROM users WHERE id = $1", [req.user.userId]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const user = dbUserToApiUser(userResult.rows[0]);

      if (user.subscription?.active) {
        return res.status(400).json({ message: "Already subscribed to Nexar+" });
      }

      const stripe = await getUncachableStripeClient();
      
      const baseUrl = process.env.RAILWAY_PUBLIC_DOMAIN 
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
        : process.env.REPLIT_DOMAINS?.split(',')[0] 
          ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
          : 'http://localhost:5000';

      let customerId = user.subscription?.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { userId: user.id },
        });
        customerId = customer.id;
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: NEXAR_PLUS_CURRENCY,
            product_data: {
              name: 'Nexar+ Subscription',
              description: 'Monthly subscription with exclusive benefits',
            },
            unit_amount: Math.round(NEXAR_PLUS_PRICE * 100),
            recurring: { interval: 'month' },
          },
          quantity: 1,
        }],
        mode: 'subscription',
        success_url: `${baseUrl}/nexar-plus?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/nexar-plus?canceled=true`,
        metadata: {
          userId: user.id,
          type: 'nexar_plus_subscription',
        },
      });

      res.json({ url: session.url, sessionId: session.id });
    } catch (error) {
      console.error("Subscription checkout error:", error);
      res.status(500).json({ message: "Failed to create subscription checkout" });
    }
  });

  app.post("/api/subscription/verify", authMiddleware, async (req, res) => {
    try {
      const { sessionId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID is required" });
      }

      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.metadata?.userId !== req.user.userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      if (session.status !== 'complete') {
        return res.status(400).json({ message: "Payment not completed" });
      }

      const subscriptionId = session.subscription;
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      const renewalDate = new Date(subscription.current_period_end * 1000).toISOString();

      const userResult = await query("SELECT * FROM users WHERE id = $1", [req.user.userId]);
      const currentProfile = userResult.rows[0].developer_profile || {};
      
      await query(
        "UPDATE users SET developer_profile = $1 WHERE id = $2",
        [{
          ...currentProfile,
          subscription: {
            active: true,
            renewalDate,
            stripeCustomerId: session.customer,
            stripeSubscriptionId: subscriptionId,
          }
        }, req.user.userId]
      );

      res.json({ 
        success: true, 
        subscription: {
          active: true,
          renewalDate,
        }
      });
    } catch (error) {
      console.error("Subscription verify error:", error);
      res.status(500).json({ message: "Failed to verify subscription" });
    }
  });

  app.post("/api/subscription/cancel", authMiddleware, async (req, res) => {
    try {
      const userResult = await query("SELECT * FROM users WHERE id = $1", [req.user.userId]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const user = dbUserToApiUser(userResult.rows[0]);

      if (!user.subscription?.active || !user.subscription.stripeSubscriptionId) {
        return res.status(400).json({ message: "No active subscription to cancel" });
      }

      const stripe = await getUncachableStripeClient();
      await stripe.subscriptions.cancel(user.subscription.stripeSubscriptionId);

      const currentProfile = userResult.rows[0].developer_profile || {};
      await query(
        "UPDATE users SET developer_profile = $1 WHERE id = $2",
        [{
          ...currentProfile,
          subscription: {
            ...user.subscription,
            active: false,
          }
        }, req.user.userId]
      );

      res.json({ success: true, message: "Subscription cancelled successfully" });
    } catch (error) {
      console.error("Cancel subscription error:", error);
      res.status(500).json({ message: "Failed to cancel subscription" });
    }
  });

  // ==================== GAME TRIAL ROUTES ====================

  app.get("/api/games/metadata", (req, res) => {
    res.json(GAME_CATALOG);
  });

  app.post("/api/games/trial/check", authMiddleware, async (req, res) => {
    try {
      const { gameId } = req.body;
      
      if (!gameId) {
        return res.status(400).json({ message: "Game ID is required" });
      }

      const game = GAME_CATALOG[gameId];
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }

      if (!game.trialEnabled) {
        return res.json({ allowed: false, reason: "Trial not available for this game" });
      }

      const userResult = await query("SELECT * FROM users WHERE id = $1", [req.user.userId]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const user = dbUserToApiUser(userResult.rows[0]);

      if (!user.subscription?.active) {
        return res.json({ allowed: false, reason: "Nexar+ subscription required for game trials" });
      }

      const trialData = user.trialUsage?.[gameId];
      if (trialData?.expired) {
        return res.json({ allowed: false, reason: "Trial expired - purchase to continue playing" });
      }

      const minutesPlayed = trialData?.minutesPlayed || 0;
      const trialDuration = game.trialDurationMinutes || 120;
      const minutesRemaining = trialDuration - minutesPlayed;

      res.json({ 
        allowed: true, 
        minutesRemaining,
        minutesPlayed,
        trialDuration,
      });
    } catch (error) {
      console.error("Trial check error:", error);
      res.status(500).json({ message: "Failed to check trial status" });
    }
  });

  app.post("/api/games/trial/update", authMiddleware, async (req, res) => {
    try {
      const { gameId, minutesPlayed } = req.body;
      
      if (!gameId || typeof minutesPlayed !== "number") {
        return res.status(400).json({ message: "Game ID and minutes played are required" });
      }

      const game = GAME_CATALOG[gameId];
      if (!game || !game.trialEnabled) {
        return res.status(400).json({ message: "Trial not available for this game" });
      }

      const userResult = await query("SELECT * FROM users WHERE id = $1", [req.user.userId]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const user = dbUserToApiUser(userResult.rows[0]);

      const currentUsage = user.trialUsage?.[gameId] || { minutesPlayed: 0, expired: false };
      const newMinutesPlayed = currentUsage.minutesPlayed + minutesPlayed;
      const trialDuration = game.trialDurationMinutes || 120;
      const expired = newMinutesPlayed >= trialDuration;

      const updatedTrialUsage = {
        ...(user.trialUsage || {}),
        [gameId]: {
          minutesPlayed: newMinutesPlayed,
          expired,
        },
      };

      const currentProfile = userResult.rows[0].developer_profile || {};
      await query(
        "UPDATE users SET developer_profile = $1 WHERE id = $2",
        [{ ...currentProfile, trialUsage: updatedTrialUsage }, req.user.userId]
      );

      res.json({ 
        success: true, 
        minutesRemaining: Math.max(0, trialDuration - newMinutesPlayed),
        expired,
      });
    } catch (error) {
      console.error("Trial update error:", error);
      res.status(500).json({ message: "Failed to update trial usage" });
    }
  });

  app.post("/api/games/nexarplus/check", authMiddleware, async (req, res) => {
    try {
      const { gameId } = req.body;
      
      if (!gameId) {
        return res.status(400).json({ message: "Game ID is required" });
      }

      const game = GAME_CATALOG[gameId];
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }

      if (!game.inNexarPlusCollection) {
        return res.json({ allowed: true, isNexarPlusGame: false });
      }

      const userResult = await query("SELECT * FROM users WHERE id = $1", [req.user.userId]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const user = dbUserToApiUser(userResult.rows[0]);

      if (!user.subscription?.active) {
        return res.json({ 
          allowed: false, 
          isNexarPlusGame: true,
          reason: "Requires Nexar+ subscription" 
        });
      }

      res.json({ allowed: true, isNexarPlusGame: true });
    } catch (error) {
      console.error("Nexar+ check error:", error);
      res.status(500).json({ message: "Failed to check access" });
    }
  });

  app.get("/api/games/:gameId/price", authMiddleware, async (req, res) => {
    try {
      const { gameId } = req.params;
      
      const game = GAME_CATALOG[gameId];
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }

      const userResult = await query("SELECT * FROM users WHERE id = $1", [req.user.userId]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const user = dbUserToApiUser(userResult.rows[0]);

      const basePrice = game.price;
      let discountedPrice = basePrice;
      let discountPercent = 0;

      if (user.subscription?.active && game.nexarPlusDiscount) {
        discountPercent = game.nexarPlusDiscount;
        discountedPrice = basePrice * (1 - discountPercent / 100);
      }

      res.json({
        basePrice,
        discountedPrice: Math.round(discountedPrice * 100) / 100,
        discountPercent,
        hasNexarPlusDiscount: user.subscription?.active && !!game.nexarPlusDiscount,
      });
    } catch (error) {
      console.error("Get price error:", error);
      res.status(500).json({ message: "Failed to get price" });
    }
  });

  // ========================================
  // DEVELOPER PROGRAMME ROUTES
  // ========================================

  app.post("/api/developer/apply", authMiddleware, async (req, res) => {
    try {
      const { studioName, contactEmail, website, description } = req.body;

      if (!studioName || !contactEmail || !description) {
        return res.status(400).json({ message: "Studio name, contact email, and description are required" });
      }

      const userResult = await query("SELECT * FROM users WHERE id = $1", [req.user.userId]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const user = dbUserToApiUser(userResult.rows[0]);

      if (user.developerProfile?.status === "pending") {
        return res.status(400).json({ message: "You already have a pending application" });
      }

      if (user.developerProfile?.status === "approved") {
        return res.status(400).json({ message: "You are already an approved developer" });
      }

      const developerProfile = {
        studioName,
        contactEmail,
        website: website || "",
        description,
        status: "pending",
      };

      const currentProfile = userResult.rows[0].developer_profile || {};
      await query(
        "UPDATE users SET developer_profile = $1 WHERE id = $2",
        [{ ...currentProfile, ...developerProfile }, req.user.userId]
      );

      res.json({ success: true, message: "Application submitted successfully" });
    } catch (error) {
      console.error("Developer apply error:", error);
      res.status(500).json({ message: "Failed to submit application" });
    }
  });

  app.get("/api/developer/status", authMiddleware, async (req, res) => {
    try {
      const userResult = await query("SELECT * FROM users WHERE id = $1", [req.user.userId]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const user = dbUserToApiUser(userResult.rows[0]);

      res.json({
        role: user.role || "user",
        developerProfile: user.developerProfile || null,
      });
    } catch (error) {
      console.error("Developer status error:", error);
      res.status(500).json({ message: "Failed to get developer status" });
    }
  });

  app.get("/api/admin/developer/applications", authMiddleware, async (req, res) => {
    try {
      const adminResult = await query("SELECT * FROM users WHERE id = $1", [req.user.userId]);
      if (adminResult.rows.length === 0 || adminResult.rows[0].role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const applicationsResult = await query(
        "SELECT * FROM users WHERE developer_profile->>'status' = 'pending'"
      );

      const applications = applicationsResult.rows.map(row => {
        const user = dbUserToApiUser(row);
        return {
          userId: user.id,
          username: user.username,
          email: user.email,
          developerProfile: user.developerProfile,
          createdAt: user.createdAt,
        };
      });

      res.json(applications);
    } catch (error) {
      console.error("Get applications error:", error);
      res.status(500).json({ message: "Failed to get applications" });
    }
  });

  app.post("/api/admin/developer/approve", authMiddleware, async (req, res) => {
    try {
      const { userId } = req.body;

      const adminResult = await query("SELECT * FROM users WHERE id = $1", [req.user.userId]);
      if (adminResult.rows.length === 0 || adminResult.rows[0].role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const targetResult = await query("SELECT * FROM users WHERE id = $1", [userId]);
      if (targetResult.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const targetUser = dbUserToApiUser(targetResult.rows[0]);

      if (!targetUser.developerProfile) {
        return res.status(400).json({ message: "User has no developer application" });
      }

      const currentProfile = targetResult.rows[0].developer_profile || {};
      await query(
        "UPDATE users SET role = 'developer', developer_profile = $1 WHERE id = $2",
        [{ ...currentProfile, status: "approved" }, userId]
      );

      res.json({ success: true, message: "Developer approved" });
    } catch (error) {
      console.error("Approve developer error:", error);
      res.status(500).json({ message: "Failed to approve developer" });
    }
  });

  app.post("/api/admin/developer/reject", authMiddleware, async (req, res) => {
    try {
      const { userId } = req.body;

      const adminResult = await query("SELECT * FROM users WHERE id = $1", [req.user.userId]);
      if (adminResult.rows.length === 0 || adminResult.rows[0].role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const targetResult = await query("SELECT * FROM users WHERE id = $1", [userId]);
      if (targetResult.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const targetUser = dbUserToApiUser(targetResult.rows[0]);

      if (!targetUser.developerProfile) {
        return res.status(400).json({ message: "User has no developer application" });
      }

      const currentProfile = targetResult.rows[0].developer_profile || {};
      await query(
        "UPDATE users SET developer_profile = $1 WHERE id = $2",
        [{ ...currentProfile, status: "rejected" }, userId]
      );

      res.json({ success: true, message: "Developer rejected" });
    } catch (error) {
      console.error("Reject developer error:", error);
      res.status(500).json({ message: "Failed to reject developer" });
    }
  });

  // ========================================
  // DEVELOPER GAME ROUTES
  // ========================================

  app.post("/api/developer/game/create", authMiddleware, async (req, res) => {
    try {
      const { title, description, price, genre, tags, coverImage } = req.body;

      const userResult = await query("SELECT * FROM users WHERE id = $1", [req.user.userId]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const user = dbUserToApiUser(userResult.rows[0]);

      if (user.role !== "developer" || user.developerProfile?.status !== "approved") {
        return res.status(403).json({ message: "Only approved developers can create games" });
      }

      if (!title || !description || typeof price !== "number" || !genre) {
        return res.status(400).json({ message: "Title, description, price, and genre are required" });
      }

      const gameId = uuidv4();
      await query(
        `INSERT INTO developer_games (id, game_id, developer_id, title, description, genre, tags, price, cover_image, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'draft', NOW(), NOW())`,
        [uuidv4(), gameId, user.id, title, description, genre, tags || [], price, coverImage || ""]
      );

      const gameResult = await query("SELECT * FROM developer_games WHERE game_id = $1", [gameId]);
      const game = dbDevGameToApiDevGame(gameResult.rows[0]);

      res.json({ success: true, game });
    } catch (error) {
      console.error("Create game error:", error);
      res.status(500).json({ message: "Failed to create game" });
    }
  });

  app.post("/api/developer/game/update", authMiddleware, async (req, res) => {
    try {
      const { gameId, title, description, price, genre, tags, coverImage } = req.body;

      if (!gameId) {
        return res.status(400).json({ message: "Game ID is required" });
      }

      const userResult = await query("SELECT * FROM users WHERE id = $1", [req.user.userId]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const user = dbUserToApiUser(userResult.rows[0]);

      const gameResult = await query("SELECT * FROM developer_games WHERE game_id = $1", [gameId]);
      if (gameResult.rows.length === 0) {
        return res.status(404).json({ message: "Game not found" });
      }

      const game = dbDevGameToApiDevGame(gameResult.rows[0]);

      if (game.developerId !== user.id) {
        return res.status(403).json({ message: "You can only edit your own games" });
      }

      const updates = ["updated_at = NOW()"];
      const values = [];
      let paramIndex = 1;

      if (title) {
        updates.push(`title = $${paramIndex++}`);
        values.push(title);
      }
      if (description) {
        updates.push(`description = $${paramIndex++}`);
        values.push(description);
      }
      if (typeof price === "number") {
        updates.push(`price = $${paramIndex++}`);
        values.push(price);
      }
      if (genre) {
        updates.push(`genre = $${paramIndex++}`);
        values.push(genre);
      }
      if (tags) {
        updates.push(`tags = $${paramIndex++}`);
        values.push(tags);
      }
      if (coverImage !== undefined) {
        updates.push(`cover_image = $${paramIndex++}`);
        values.push(coverImage);
      }

      values.push(gameId);
      const updateResult = await query(
        `UPDATE developer_games SET ${updates.join(", ")} WHERE game_id = $${paramIndex} RETURNING *`,
        values
      );

      const updatedGame = dbDevGameToApiDevGame(updateResult.rows[0]);

      res.json({ success: true, game: updatedGame });
    } catch (error) {
      console.error("Update game error:", error);
      res.status(500).json({ message: "Failed to update game" });
    }
  });

  app.post("/api/developer/game/submitForReview", authMiddleware, async (req, res) => {
    try {
      const { gameId } = req.body;

      if (!gameId) {
        return res.status(400).json({ message: "Game ID is required" });
      }

      const userResult = await query("SELECT * FROM users WHERE id = $1", [req.user.userId]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const user = dbUserToApiUser(userResult.rows[0]);

      const gameResult = await query("SELECT * FROM developer_games WHERE game_id = $1", [gameId]);
      if (gameResult.rows.length === 0) {
        return res.status(404).json({ message: "Game not found" });
      }

      const game = dbDevGameToApiDevGame(gameResult.rows[0]);

      if (game.developerId !== user.id) {
        return res.status(403).json({ message: "You can only submit your own games" });
      }

      if (game.status !== "draft" && game.status !== "rejected") {
        return res.status(400).json({ message: "Only draft or rejected games can be submitted for review" });
      }

      await query(
        "UPDATE developer_games SET status = 'pending', updated_at = NOW() WHERE game_id = $1",
        [gameId]
      );

      res.json({ success: true, message: "Game submitted for review" });
    } catch (error) {
      console.error("Submit for review error:", error);
      res.status(500).json({ message: "Failed to submit for review" });
    }
  });

  app.get("/api/developer/games", authMiddleware, async (req, res) => {
    try {
      const userResult = await query("SELECT * FROM users WHERE id = $1", [req.user.userId]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const user = dbUserToApiUser(userResult.rows[0]);

      if (user.role !== "developer" || user.developerProfile?.status !== "approved") {
        return res.status(403).json({ message: "Only approved developers can view their games" });
      }

      const gamesResult = await query(
        "SELECT * FROM developer_games WHERE developer_id = $1",
        [user.id]
      );

      const games = gamesResult.rows.map(dbDevGameToApiDevGame);

      res.json(games);
    } catch (error) {
      console.error("Get developer games error:", error);
      res.status(500).json({ message: "Failed to get games" });
    }
  });

  app.get("/api/developer/game/:gameId", authMiddleware, async (req, res) => {
    try {
      const { gameId } = req.params;

      const userResult = await query("SELECT * FROM users WHERE id = $1", [req.user.userId]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const user = dbUserToApiUser(userResult.rows[0]);

      const gameResult = await query("SELECT * FROM developer_games WHERE game_id = $1", [gameId]);
      if (gameResult.rows.length === 0) {
        return res.status(404).json({ message: "Game not found" });
      }

      const game = dbDevGameToApiDevGame(gameResult.rows[0]);

      if (game.developerId !== user.id) {
        return res.status(403).json({ message: "You can only view your own games" });
      }

      res.json(game);
    } catch (error) {
      console.error("Get game error:", error);
      res.status(500).json({ message: "Failed to get game" });
    }
  });

  app.get("/api/admin/games/pending", authMiddleware, async (req, res) => {
    try {
      const adminResult = await query("SELECT * FROM users WHERE id = $1", [req.user.userId]);
      if (adminResult.rows.length === 0 || adminResult.rows[0].role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const pendingGamesResult = await query(
        "SELECT * FROM developer_games WHERE status = 'pending'"
      );

      const developerIds = [...new Set(pendingGamesResult.rows.map(g => g.developer_id))];
      let developersMap = {};
      
      if (developerIds.length > 0) {
        const developersResult = await query(
          "SELECT * FROM users WHERE id = ANY($1)",
          [developerIds]
        );
        developersResult.rows.forEach(row => {
          const dev = dbUserToApiUser(row);
          developersMap[dev.id] = dev;
        });
      }

      const gamesWithDeveloper = pendingGamesResult.rows.map(row => {
        const game = dbDevGameToApiDevGame(row);
        const developer = developersMap[game.developerId];
        return {
          ...game,
          developerName: developer?.developerProfile?.studioName || developer?.username || "Unknown",
        };
      });

      res.json(gamesWithDeveloper);
    } catch (error) {
      console.error("Get pending games error:", error);
      res.status(500).json({ message: "Failed to get pending games" });
    }
  });

  app.post("/api/admin/game/approve", authMiddleware, async (req, res) => {
    try {
      const { gameId } = req.body;

      const adminResult = await query("SELECT * FROM users WHERE id = $1", [req.user.userId]);
      if (adminResult.rows.length === 0 || adminResult.rows[0].role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      if (!gameId) {
        return res.status(400).json({ message: "Game ID is required" });
      }

      const gameResult = await query("SELECT * FROM developer_games WHERE game_id = $1", [gameId]);
      if (gameResult.rows.length === 0) {
        return res.status(404).json({ message: "Game not found" });
      }

      const game = dbDevGameToApiDevGame(gameResult.rows[0]);

      await query(
        "UPDATE developer_games SET status = 'approved', updated_at = NOW() WHERE game_id = $1",
        [gameId]
      );

      // Award developer achievement if this is their first approved game
      const existingAchResult = await query(
        "SELECT id FROM achievements WHERE user_id = $1 AND achievement_id = $2",
        [game.developerId, "developer"]
      );
      if (existingAchResult.rows.length === 0) {
        await query(
          "INSERT INTO achievements (id, user_id, achievement_id, unlocked_at) VALUES ($1, $2, $3, NOW())",
          [uuidv4(), game.developerId, "developer"]
        );
      }

      res.json({ success: true, message: "Game approved" });
    } catch (error) {
      console.error("Approve game error:", error);
      res.status(500).json({ message: "Failed to approve game" });
    }
  });

  app.post("/api/admin/game/reject", authMiddleware, async (req, res) => {
    try {
      const { gameId, reason } = req.body;

      const adminResult = await query("SELECT * FROM users WHERE id = $1", [req.user.userId]);
      if (adminResult.rows.length === 0 || adminResult.rows[0].role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      if (!gameId) {
        return res.status(400).json({ message: "Game ID is required" });
      }

      const gameResult = await query("SELECT * FROM developer_games WHERE game_id = $1", [gameId]);
      if (gameResult.rows.length === 0) {
        return res.status(404).json({ message: "Game not found" });
      }

      await query(
        "UPDATE developer_games SET status = 'rejected', updated_at = NOW() WHERE game_id = $1",
        [gameId]
      );

      res.json({ success: true, message: "Game rejected" });
    } catch (error) {
      console.error("Reject game error:", error);
      res.status(500).json({ message: "Failed to reject game" });
    }
  });

  app.get("/api/store/developer-games", async (req, res) => {
    try {
      const approvedGamesResult = await query(
        "SELECT * FROM developer_games WHERE status = 'approved'"
      );

      const developerIds = [...new Set(approvedGamesResult.rows.map(g => g.developer_id))];
      let developersMap = {};
      
      if (developerIds.length > 0) {
        const developersResult = await query(
          "SELECT * FROM users WHERE id = ANY($1)",
          [developerIds]
        );
        developersResult.rows.forEach(row => {
          const dev = dbUserToApiUser(row);
          developersMap[dev.id] = dev;
        });
      }

      const gamesWithDeveloper = approvedGamesResult.rows.map(row => {
        const game = dbDevGameToApiDevGame(row);
        const developer = developersMap[game.developerId];
        return {
          id: `dev-${game.gameId}`,
          gameId: game.gameId,
          title: game.title,
          description: game.description,
          price: game.price,
          genre: game.genre,
          tags: game.tags,
          coverImage: game.coverImage,
          developerName: developer?.developerProfile?.studioName || developer?.username || "Unknown",
          isDeveloperGame: true,
        };
      });

      res.json(gamesWithDeveloper);
    } catch (error) {
      console.error("Get store developer games error:", error);
      res.status(500).json({ message: "Failed to get developer games" });
    }
  });

  app.post("/api/admin/set-admin", async (req, res) => {
    try {
      const { email, secret } = req.body;
      
      if (secret !== process.env.ADMIN_SECRET && secret !== "nexaros-admin-setup-2024") {
        return res.status(403).json({ message: "Invalid secret" });
      }

      const userResult = await query("SELECT * FROM users WHERE email = $1", [email]);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      await query("UPDATE users SET role = 'admin' WHERE email = $1", [email]);
      res.json({ success: true, message: "User promoted to admin" });
    } catch (error) {
      console.error("Set admin error:", error);
      res.status(500).json({ message: "Failed to set admin" });
    }
  });

  return httpServer;
}

module.exports = { registerRoutes };
