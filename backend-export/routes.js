const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  generateToken,
  authMiddleware,
} = require("./middleware/auth");
const {
  readJson,
  writeJson,
  findOne,
  findMany,
  insertOne,
  updateOne,
  deleteOne,
} = require("./utils/fileDb");
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
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
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

async function registerRoutes(app) {
  
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

      const existingEmail = findOne("users.json", (u) => u.email === email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already in use" });
      }

      const existingUsername = findOne("users.json", (u) => u.username === username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already taken" });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const verificationToken = uuidv4();
      const user = {
        id: uuidv4(),
        email,
        username,
        passwordHash,
        avatarUrl: "",
        bio: "",
        createdAt: new Date().toISOString(),
        verified: false,
        verificationToken,
        walletBalance: 0,
        ownedGames: [],
      };

      insertOne("users.json", user);

      insertOne("achievements.json", {
        id: uuidv4(),
        userId: user.id,
        achievementId: "first_login",
        unlockedAt: new Date().toISOString(),
      });

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

      const user = findOne("users.json", (u) => u.email === email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

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

      const user = findOne("users.json", (u) => u.email === email);
      if (!user) {
        return res.json({ message: "If an account exists with this email, a verification link has been sent." });
      }

      if (user.verified) {
        return res.json({ message: "If an account exists with this email, a verification link has been sent." });
      }

      const newToken = uuidv4();
      updateOne("users.json", (u) => u.id === user.id, { verificationToken: newToken });

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
      const user = findOne("users.json", (u) => u.email.toLowerCase() === normalizedEmail);
      
      if (!user || !user.verified) {
        return res.json({ success: true });
      }

      const resetToken = uuidv4();
      const resetTokenExpiry = Date.now() + 15 * 60 * 1000;

      updateOne("users.json", (u) => u.id === user.id, {
        passwordResetToken: resetToken,
        passwordResetTokenExpiry: resetTokenExpiry,
      });

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

      const user = findOne("users.json", (u) => u.passwordResetToken === token);
      
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      if (!user.passwordResetTokenExpiry || Date.now() > user.passwordResetTokenExpiry) {
        updateOne("users.json", (u) => u.id === user.id, {
          passwordResetToken: "",
          passwordResetTokenExpiry: 0,
        });
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);

      updateOne("users.json", (u) => u.id === user.id, {
        passwordHash,
        passwordResetToken: "",
        passwordResetTokenExpiry: 0,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ message: "Password reset failed" });
    }
  });

  app.get("/api/auth/me", authMiddleware, (req, res) => {
    const user = findOne("users.json", (u) => u.id === req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const { passwordHash: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  app.patch("/api/auth/profile", authMiddleware, async (req, res) => {
    try {
      const { avatarUrl, bio, username } = req.body;
      const updates = {};

      if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
      if (bio !== undefined) updates.bio = bio;
      if (username !== undefined) {
        const existing = findOne("users.json", (u) => u.username === username && u.id !== req.user.userId);
        if (existing) {
          return res.status(400).json({ message: "Username already taken" });
        }
        updates.username = username;
      }

      const updated = updateOne("users.json", (u) => u.id === req.user.userId, updates);
      if (!updated) {
        return res.status(404).json({ message: "User not found" });
      }

      const unlockedAchievements = [];
      if (updated.avatarUrl && updated.bio) {
        const existing = findOne("achievements.json", 
          (a) => a.userId === req.user.userId && a.achievementId === "profile_complete"
        );
        if (!existing) {
          insertOne("achievements.json", {
            id: uuidv4(),
            userId: req.user.userId,
            achievementId: "profile_complete",
            unlockedAt: new Date().toISOString(),
          });
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
      
      const updated = updateOne("users.json", (u) => u.id === req.user.userId, { avatarUrl });
      if (!updated) {
        return res.status(404).json({ message: "User not found" });
      }

      const unlockedAchievements = [];
      if (updated.avatarUrl && updated.bio) {
        const existing = findOne("achievements.json", 
          (a) => a.userId === req.user.userId && a.achievementId === "profile_complete"
        );
        if (!existing) {
          insertOne("achievements.json", {
            id: uuidv4(),
            userId: req.user.userId,
            achievementId: "profile_complete",
            unlockedAt: new Date().toISOString(),
          });
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

  app.get("/api/friends", authMiddleware, (req, res) => {
    const userId = req.user.userId;
    const friendRequests = findMany("friends.json", 
      (fr) => fr.status === "accepted" && (fr.senderId === userId || fr.receiverId === userId)
    );

    const friendIds = friendRequests.map((fr) => 
      fr.senderId === userId ? fr.receiverId : fr.senderId
    );

    const friends = friendIds.map((id) => {
      const user = findOne("users.json", (u) => u.id === id);
      if (!user) return null;
      const { passwordHash: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }).filter(Boolean);

    res.json(friends);
  });

  app.get("/api/friends/requests", authMiddleware, (req, res) => {
    const userId = req.user.userId;
    const pending = findMany("friends.json",
      (fr) => fr.receiverId === userId && fr.status === "pending"
    );

    const requestsWithUsers = pending.map((fr) => {
      const sender = findOne("users.json", (u) => u.id === fr.senderId);
      if (!sender) return null;
      const { passwordHash: _, ...senderWithoutPassword } = sender;
      return { ...fr, sender: senderWithoutPassword };
    }).filter(Boolean);

    res.json(requestsWithUsers);
  });

  app.get("/api/friends/sent", authMiddleware, (req, res) => {
    const userId = req.user.userId;
    const sent = findMany("friends.json",
      (fr) => fr.senderId === userId && fr.status === "pending"
    );

    const requestsWithUsers = sent.map((fr) => {
      const receiver = findOne("users.json", (u) => u.id === fr.receiverId);
      if (!receiver) return null;
      const { passwordHash: _, ...receiverWithoutPassword } = receiver;
      return { ...fr, receiver: receiverWithoutPassword };
    }).filter(Boolean);

    res.json(requestsWithUsers);
  });

  app.post("/api/friends/request", authMiddleware, (req, res) => {
    const { username } = req.body;
    const userId = req.user.userId;

    if (!username) {
      return res.status(400).json({ message: "Username is required" });
    }

    const targetUser = findOne("users.json", (u) => u.username === username);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (targetUser.id === userId) {
      return res.status(400).json({ message: "Cannot send friend request to yourself" });
    }

    const existingRequest = findOne("friends.json", (fr) =>
      (fr.senderId === userId && fr.receiverId === targetUser.id) ||
      (fr.senderId === targetUser.id && fr.receiverId === userId)
    );

    if (existingRequest) {
      if (existingRequest.status === "accepted") {
        return res.status(400).json({ message: "Already friends" });
      }
      return res.status(400).json({ message: "Friend request already exists" });
    }

    const friendRequest = {
      id: uuidv4(),
      senderId: userId,
      receiverId: targetUser.id,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    insertOne("friends.json", friendRequest);
    res.status(201).json({ message: "Friend request sent" });
  });

  app.post("/api/friends/accept/:requestId", authMiddleware, (req, res) => {
    const { requestId } = req.params;
    const userId = req.user.userId;

    const friendRequest = findOne("friends.json", (fr) => fr.id === requestId);
    if (!friendRequest) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    if (friendRequest.receiverId !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (friendRequest.status !== "pending") {
      return res.status(400).json({ message: "Request already processed" });
    }

    updateOne("friends.json", (fr) => fr.id === requestId, { status: "accepted" });

    const unlockedAchievements = [];
    
    [userId, friendRequest.senderId].forEach((uid) => {
      const existingFirst = findOne("achievements.json", 
        (a) => a.userId === uid && a.achievementId === "first_friend"
      );
      if (!existingFirst) {
        insertOne("achievements.json", {
          id: uuidv4(),
          userId: uid,
          achievementId: "first_friend",
          unlockedAt: new Date().toISOString(),
        });
        if (uid === userId) {
          const achievement = ACHIEVEMENTS_LIST.find(a => a.id === "first_friend");
          if (achievement) unlockedAchievements.push(achievement);
        }
      }

      const friendCount = findMany("friends.json", 
        (fr) => fr.status === "accepted" && (fr.senderId === uid || fr.receiverId === uid)
      ).length;
      
      if (friendCount >= 5) {
        const existingSocial = findOne("achievements.json", 
          (a) => a.userId === uid && a.achievementId === "social_butterfly"
        );
        if (!existingSocial) {
          insertOne("achievements.json", {
            id: uuidv4(),
            userId: uid,
            achievementId: "social_butterfly",
            unlockedAt: new Date().toISOString(),
          });
          if (uid === userId) {
            const achievement = ACHIEVEMENTS_LIST.find(a => a.id === "social_butterfly");
            if (achievement) unlockedAchievements.push(achievement);
          }
        }
      }
    });

    res.json({ message: "Friend request accepted", unlockedAchievements });
  });

  app.post("/api/friends/reject/:requestId", authMiddleware, (req, res) => {
    const { requestId } = req.params;
    const userId = req.user.userId;

    const friendRequest = findOne("friends.json", (fr) => fr.id === requestId);
    if (!friendRequest) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    if (friendRequest.receiverId !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    deleteOne("friends.json", (fr) => fr.id === requestId);
    res.json({ message: "Friend request rejected" });
  });

  app.delete("/api/friends/:friendId", authMiddleware, (req, res) => {
    const { friendId } = req.params;
    const userId = req.user.userId;

    const deleted = deleteOne("friends.json", (fr) =>
      fr.status === "accepted" &&
      ((fr.senderId === userId && fr.receiverId === friendId) ||
       (fr.senderId === friendId && fr.receiverId === userId))
    );

    if (!deleted) {
      return res.status(404).json({ message: "Friend not found" });
    }

    res.json({ message: "Friend removed" });
  });

  // ==================== MESSAGES ROUTES ====================

  app.get("/api/messages/:friendId", authMiddleware, (req, res) => {
    const { friendId } = req.params;
    const userId = req.user.userId;

    const messages = findMany("messages.json", (m) =>
      (m.fromId === userId && m.toId === friendId) ||
      (m.fromId === friendId && m.toId === userId)
    );

    messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    res.json(messages);
  });

  app.post("/api/messages", authMiddleware, (req, res) => {
    const { toId, text } = req.body;
    const userId = req.user.userId;

    if (!toId || !text) {
      return res.status(400).json({ message: "Recipient and message text are required" });
    }

    const areFriends = findOne("friends.json", (fr) =>
      fr.status === "accepted" &&
      ((fr.senderId === userId && fr.receiverId === toId) ||
       (fr.senderId === toId && fr.receiverId === userId))
    );

    if (!areFriends) {
      return res.status(403).json({ message: "You can only message friends" });
    }

    const message = {
      id: uuidv4(),
      fromId: userId,
      toId,
      text,
      timestamp: new Date().toISOString(),
    };

    insertOne("messages.json", message);

    const unlockedAchievements = [];
    const existingMessenger = findOne("achievements.json", 
      (a) => a.userId === userId && a.achievementId === "messenger"
    );
    if (!existingMessenger) {
      insertOne("achievements.json", {
        id: uuidv4(),
        userId,
        achievementId: "messenger",
        unlockedAt: new Date().toISOString(),
      });
      const achievement = ACHIEVEMENTS_LIST.find(a => a.id === "messenger");
      if (achievement) unlockedAchievements.push(achievement);
    }

    const messageCount = findMany("messages.json", (m) => m.fromId === userId).length;
    if (messageCount >= 50) {
      const existingChatMaster = findOne("achievements.json", 
        (a) => a.userId === userId && a.achievementId === "chat_master"
      );
      if (!existingChatMaster) {
        insertOne("achievements.json", {
          id: uuidv4(),
          userId,
          achievementId: "chat_master",
          unlockedAt: new Date().toISOString(),
        });
        const achievement = ACHIEVEMENTS_LIST.find(a => a.id === "chat_master");
        if (achievement) unlockedAchievements.push(achievement);
      }
    }

    res.status(201).json({ ...message, unlockedAchievements });
  });

  // ==================== ACHIEVEMENTS ROUTES ====================

  app.get("/api/achievements", authMiddleware, (req, res) => {
    const userId = req.user.userId;
    const userAchievements = findMany("achievements.json", (a) => a.userId === userId);
    
    const achievements = ACHIEVEMENTS_LIST.map((achievement) => {
      const unlocked = userAchievements.find((ua) => ua.achievementId === achievement.id);
      return {
        ...achievement,
        unlocked: !!unlocked,
        unlockedAt: unlocked?.unlockedAt || null,
      };
    });

    res.json(achievements);
  });

  // ==================== CLOUD SAVES ROUTES ====================

  app.get("/api/cloud", authMiddleware, (req, res) => {
    const userId = req.user.userId;
    const saves = findMany("cloud_saves.json", (s) => s.userId === userId);
    saves.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    res.json(saves);
  });

  app.post("/api/cloud", authMiddleware, (req, res) => {
    const { filename, data } = req.body;
    const userId = req.user.userId;

    if (!filename || !data) {
      return res.status(400).json({ message: "Filename and data are required" });
    }

    const save = {
      id: uuidv4(),
      userId,
      filename,
      data,
      uploadedAt: new Date().toISOString(),
    };

    insertOne("cloud_saves.json", save);
    res.status(201).json(save);
  });

  app.delete("/api/cloud/:saveId", authMiddleware, (req, res) => {
    const { saveId } = req.params;
    const userId = req.user.userId;

    const save = findOne("cloud_saves.json", (s) => s.id === saveId);
    if (!save) {
      return res.status(404).json({ message: "Save not found" });
    }

    if (save.userId !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    deleteOne("cloud_saves.json", (s) => s.id === saveId);
    res.json({ message: "Cloud save deleted" });
  });

  // ==================== EMAIL VERIFICATION ROUTES ====================

  app.get("/api/auth/verify", async (req, res) => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== "string") {
        return res.status(400).json({ message: "Verification token is required" });
      }

      const user = findOne("users.json", (u) => u.verificationToken === token);
      if (!user) {
        return res.status(400).json({ message: "Invalid verification token" });
      }

      if (user.verified) {
        return res.json({ message: "Email already verified" });
      }

      updateOne("users.json", (u) => u.id === user.id, { verified: true, verificationToken: undefined });
      res.json({ message: "Email verified successfully" });
    } catch (error) {
      console.error("Verification error:", error);
      res.status(500).json({ message: "Verification failed" });
    }
  });

  // ==================== WALLET ROUTES ====================

  app.get("/api/wallet", authMiddleware, (req, res) => {
    const user = findOne("users.json", (u) => u.id === req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const transactions = findMany("wallet_transactions.json", (t) => t.userId === req.user.userId);
    transactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({
      balance: user.walletBalance || 0,
      transactions,
      ownedGames: user.ownedGames || [],
    });
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

      const user = findOne("users.json", (u) => u.id === req.user.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const stripe = await getUncachableStripeClient();
      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

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

      const existingTransaction = findOne("wallet_transactions.json", 
        (t) => t.stripeSessionId === sessionId
      );
      if (existingTransaction) {
        return res.json({ message: "Payment already processed", balance: existingTransaction.amount });
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

      const user = findOne("users.json", (u) => u.id === req.user.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const newBalance = (user.walletBalance || 0) + amount;
      updateOne("users.json", (u) => u.id === user.id, { walletBalance: newBalance });

      const transaction = {
        id: uuidv4(),
        userId: user.id,
        type: "deposit",
        amount,
        description: `Added £${amount} to wallet`,
        stripeSessionId: sessionId,
        timestamp: new Date().toISOString(),
      };
      insertOne("wallet_transactions.json", transaction);

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

      const user = findOne("users.json", (u) => u.id === req.user.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

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
      
      updateOne("users.json", (u) => u.id === user.id, { 
        walletBalance: newBalance,
        ownedGames: newOwnedGames,
      });

      const discountText = discountApplied > 0 ? ` (${discountApplied}% Nexar+ discount)` : "";
      const transaction = {
        id: uuidv4(),
        userId: user.id,
        type: "purchase",
        amount: -finalPrice,
        description: `Purchased ${gameName}${discountText}`,
        gameId,
        timestamp: new Date().toISOString(),
      };
      insertOne("wallet_transactions.json", transaction);

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

      const user = findOne("users.json", (u) => u.id === req.user.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const hashedPin = await bcrypt.hash(pin, 10);
      const parentalControls = {
        ...getDefaultParentalControls(),
        enabled: true,
        parentPin: hashedPin,
      };

      updateOne("users.json", (u) => u.id === user.id, { parentalControls });
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

      const user = findOne("users.json", (u) => u.id === req.user.userId);
      if (!user || !user.parentalControls?.enabled) {
        return res.status(400).json({ message: "Parental controls not enabled" });
      }

      const validPin = await bcrypt.compare(pin, user.parentalControls.parentPin);
      if (!validPin) {
        return res.status(401).json({ message: "Invalid PIN" });
      }

      updateOne("users.json", (u) => u.id === user.id, { 
        parentalControls: getDefaultParentalControls() 
      });
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

      const user = findOne("users.json", (u) => u.id === req.user.userId);
      if (!user || !user.parentalControls?.enabled) {
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

      const user = findOne("users.json", (u) => u.id === req.user.userId);
      if (!user || !user.parentalControls?.enabled) {
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
      updateOne("users.json", (u) => u.id === user.id, { parentalControls: newParentalControls });
      
      res.json({ message: "Settings updated", parentalControls: newParentalControls });
    } catch (error) {
      console.error("Update parental settings error:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  app.get("/api/parental/status", authMiddleware, (req, res) => {
    try {
      const user = findOne("users.json", (u) => u.id === req.user.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const parentalControls = user.parentalControls || getDefaultParentalControls();
      
      const today = new Date().toISOString().split("T")[0];
      if (parentalControls.dailyPlaytimeLog.date !== today) {
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

  app.post("/api/parental/checkAccess", authMiddleware, (req, res) => {
    try {
      const { gameId, rating, gameRating } = req.body;
      const rawRating = gameRating || rating;
      const contentRating = rawRating ? (LEGACY_RATING_MAP[rawRating] || rawRating) : null;

      const user = findOne("users.json", (u) => u.id === req.user.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

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
        let minutesPlayed = parentalControls.dailyPlaytimeLog.minutesPlayed;
        if (parentalControls.dailyPlaytimeLog.date !== today) {
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

      const user = findOne("users.json", (u) => u.id === req.user.userId);
      if (!user || !user.parentalControls?.enabled) {
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

  app.post("/api/parental/logPlaytime", authMiddleware, (req, res) => {
    try {
      const { minutes } = req.body;

      if (typeof minutes !== "number" || minutes < 0) {
        return res.status(400).json({ message: "Invalid minutes" });
      }

      const user = findOne("users.json", (u) => u.id === req.user.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const parentalControls = user.parentalControls || getDefaultParentalControls();
      const today = new Date().toISOString().split("T")[0];

      if (parentalControls.dailyPlaytimeLog.date !== today) {
        parentalControls.dailyPlaytimeLog = { date: today, minutesPlayed: 0 };
      }

      parentalControls.dailyPlaytimeLog.minutesPlayed += minutes;
      updateOne("users.json", (u) => u.id === user.id, { parentalControls });

      res.json({ 
        minutesPlayed: parentalControls.dailyPlaytimeLog.minutesPlayed,
        limit: parentalControls.playtimeLimit,
      });
    } catch (error) {
      console.error("Log playtime error:", error);
      res.status(500).json({ message: "Failed to log playtime" });
    }
  });

  app.post("/api/parental/checkPurchase", authMiddleware, (req, res) => {
    try {
      const user = findOne("users.json", (u) => u.id === req.user.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

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

  app.get("/api/subscription/status", authMiddleware, (req, res) => {
    const user = findOne("users.json", (u) => u.id === req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      active: user.subscription?.active || false,
      hasActiveSubscription: user.subscription?.active || false,
      renewalDate: user.subscription?.renewalDate || "",
      stripeSubscriptionId: user.subscription?.stripeSubscriptionId || "",
    });
  });

  app.post("/api/subscription/create-checkout", authMiddleware, async (req, res) => {
    try {
      const user = findOne("users.json", (u) => u.id === req.user.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.subscription?.active) {
        return res.status(400).json({ message: "Already subscribed to Nexar+" });
      }

      const stripe = await getUncachableStripeClient();
      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

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
              description: 'Monthly subscription: Game trials, discounts, exclusive content & free games',
            },
            unit_amount: Math.round(NEXAR_PLUS_PRICE * 100),
            recurring: {
              interval: 'month',
            },
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

      const user = findOne("users.json", (u) => u.id === req.user.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.subscription?.active) {
        return res.json({ message: "Already subscribed", active: true });
      }

      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.metadata?.userId !== req.user.userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      if (session.payment_status !== 'paid') {
        return res.status(400).json({ message: "Payment not completed" });
      }

      const subscriptionId = session.subscription;
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);

      const renewalDate = new Date(subscription.current_period_end * 1000).toISOString();

      updateOne("users.json", (u) => u.id === user.id, {
        subscription: {
          active: true,
          renewalDate,
          stripeCustomerId: session.customer,
          stripeSubscriptionId: subscriptionId,
        }
      });

      res.json({ message: "Subscription activated", active: true, renewalDate });
    } catch (error) {
      console.error("Subscription verification error:", error);
      res.status(500).json({ message: "Failed to verify subscription" });
    }
  });

  app.post("/api/subscription/cancel", authMiddleware, async (req, res) => {
    try {
      const user = findOne("users.json", (u) => u.id === req.user.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.subscription?.active || !user.subscription?.stripeSubscriptionId) {
        return res.status(400).json({ message: "No active subscription" });
      }

      const stripe = await getUncachableStripeClient();
      await stripe.subscriptions.cancel(user.subscription.stripeSubscriptionId);

      updateOne("users.json", (u) => u.id === user.id, {
        subscription: {
          ...user.subscription,
          active: false,
        }
      });

      res.json({ message: "Subscription cancelled" });
    } catch (error) {
      console.error("Subscription cancel error:", error);
      res.status(500).json({ message: "Failed to cancel subscription" });
    }
  });

  // ==================== TRIAL ROUTES ====================

  app.get("/api/trial/status/:gameId", authMiddleware, (req, res) => {
    const { gameId } = req.params;
    const user = findOne("users.json", (u) => u.id === req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const gameData = GAME_CATALOG[gameId];
    if (!gameData || !gameData.trialEnabled) {
      return res.json({ trialAvailable: false });
    }

    if (!user.subscription?.active) {
      return res.json({ trialAvailable: false, requiresNexarPlus: true });
    }

    const trialUsage = user.trialUsage?.[gameId];
    if (!trialUsage) {
      return res.json({
        trialAvailable: true,
        minutesRemaining: gameData.trialDurationMinutes,
        totalMinutes: gameData.trialDurationMinutes,
      });
    }

    if (trialUsage.expired) {
      return res.json({ trialAvailable: false, expired: true });
    }

    const minutesRemaining = gameData.trialDurationMinutes - trialUsage.minutesPlayed;
    return res.json({
      trialAvailable: minutesRemaining > 0,
      minutesRemaining: Math.max(0, minutesRemaining),
      minutesPlayed: trialUsage.minutesPlayed,
      totalMinutes: gameData.trialDurationMinutes,
    });
  });

  app.post("/api/trial/log/:gameId", authMiddleware, (req, res) => {
    const { gameId } = req.params;
    const { minutes } = req.body;

    if (typeof minutes !== "number" || minutes < 0) {
      return res.status(400).json({ message: "Invalid minutes" });
    }

    const user = findOne("users.json", (u) => u.id === req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const gameData = GAME_CATALOG[gameId];
    if (!gameData || !gameData.trialEnabled) {
      return res.status(400).json({ message: "Trial not available for this game" });
    }

    const trialUsage = user.trialUsage || {};
    const currentUsage = trialUsage[gameId] || { minutesPlayed: 0, expired: false };
    
    currentUsage.minutesPlayed += minutes;
    if (currentUsage.minutesPlayed >= gameData.trialDurationMinutes) {
      currentUsage.expired = true;
    }

    trialUsage[gameId] = currentUsage;
    updateOne("users.json", (u) => u.id === user.id, { trialUsage });

    const minutesRemaining = Math.max(0, gameData.trialDurationMinutes - currentUsage.minutesPlayed);
    res.json({
      minutesPlayed: currentUsage.minutesPlayed,
      minutesRemaining,
      expired: currentUsage.expired,
    });
  });

  // ==================== GAME CATALOG ROUTE ====================

  app.get("/api/games/catalog", (req, res) => {
    res.json(GAME_CATALOG);
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  return app;
}

module.exports = { registerRoutes };
