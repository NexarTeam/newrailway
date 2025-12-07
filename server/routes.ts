import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  generateToken,
  authMiddleware,
  AuthenticatedRequest,
} from "./middleware/auth";
import {
  readJson,
  writeJson,
  findOne,
  findMany,
  insertOne,
  updateOne,
  deleteOne,
} from "./utils/fileDb";
import { sendVerificationEmail, sendPasswordResetEmail } from "./utils/email";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";

// System configuration
interface SystemConfig {
  version: string;
  edition: string;
  systemId: string | null;
}

function getSystemConfig(): SystemConfig {
  const configPath = path.join(process.cwd(), "shared/config.json");
  try {
    const data = fs.readFileSync(configPath, "utf-8");
    return JSON.parse(data);
  } catch {
    return { version: "1.0.0", edition: "PC", systemId: null };
  }
}

function saveSystemConfig(config: SystemConfig): void {
  const configPath = path.join(process.cwd(), "shared/config.json");
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function generateSystemId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const segment1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  const segment2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `NXR-PC-${segment1}-${segment2}`;
}

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), "server/uploads/avatars");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req: AuthenticatedRequest, file, cb) => {
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

interface ParentalControls {
  enabled: boolean;
  parentPin: string;
  playtimeLimit: number | null;
  canMakePurchases: boolean;
  restrictedRatings: string[];
  requiresParentApproval: boolean;
  dailyPlaytimeLog: {
    date: string;
    minutesPlayed: number;
  };
}

interface Subscription {
  active: boolean;
  renewalDate: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
}

interface TrialUsage {
  [gameId: string]: {
    minutesPlayed: number;
    expired: boolean;
  };
}

interface DeveloperProfile {
  studioName: string;
  website: string;
  description: string;
  contactEmail: string;
  status: "none" | "pending" | "approved" | "rejected";
}

interface User {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  avatarUrl: string;
  bio: string;
  createdAt: string;
  verified: boolean;
  verificationToken: string;
  walletBalance: number;
  ownedGames: string[];
  passwordResetToken?: string;
  passwordResetTokenExpiry?: number;
  parentalControls?: ParentalControls;
  subscription?: Subscription;
  trialUsage?: TrialUsage;
  role: "user" | "developer" | "admin";
  developerProfile?: DeveloperProfile;
}

interface DeveloperGame {
  gameId: string;
  developerId: string;
  title: string;
  description: string;
  price: number;
  genre: string;
  tags: string[];
  status: "draft" | "pending" | "approved" | "rejected";
  versions: string[];
  createdAt: string;
  updatedAt: string;
  coverImage?: string;
}

interface WalletTransaction {
  id: string;
  userId: string;
  type: "deposit" | "purchase" | "refund";
  amount: number;
  description: string;
  gameId?: string;
  stripeSessionId?: string;
  timestamp: string;
}

interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

interface Message {
  id: string;
  fromId: string;
  toId: string;
  text: string;
  timestamp: string;
}

interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  unlockedAt: string;
}

interface CloudSave {
  id: string;
  userId: string;
  filename: string;
  data: string;
  uploadedAt: string;
}

const ACHIEVEMENTS_LIST = [
  { id: "first_login", name: "First Login", description: "Log in for the first time", icon: "trophy" },
  { id: "profile_complete", name: "Profile Complete", description: "Complete your profile with avatar and bio", icon: "user" },
  { id: "first_friend", name: "First Friend", description: "Add your first friend", icon: "users" },
  { id: "messenger", name: "Messenger", description: "Send your first message", icon: "message-circle" },
  { id: "social_butterfly", name: "Social Butterfly", description: "Have 5 friends", icon: "heart" },
  { id: "chat_master", name: "Chat Master", description: "Send 50 messages", icon: "messages-square" },
  { id: "developer", name: "Developer", description: "Have a game approved for the Nexar Store", icon: "code" },
];

interface GameCatalogEntry {
  price: number;
  name: string;
  trialEnabled?: boolean;
  trialDurationMinutes?: number;
  nexarPlusDiscount?: number;
  inNexarPlusCollection?: boolean;
}

const GAME_CATALOG: Record<string, GameCatalogEntry> = {
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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Serve uploaded avatars statically
  app.use("/uploads/avatars", (req, res, next) => {
    const avatarPath = path.join(process.cwd(), "server/uploads/avatars", req.path);
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

      const existingEmail = findOne<User>("users.json", (u) => u.email === email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already in use" });
      }

      const existingUsername = findOne<User>("users.json", (u) => u.username === username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already taken" });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const verificationToken = uuidv4();
      const user: User = {
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
        role: "user",
      };

      insertOne("users.json", user);

      insertOne<UserAchievement>("achievements.json", {
        id: uuidv4(),
        userId: user.id,
        achievementId: "first_login",
        unlockedAt: new Date().toISOString(),
      });

      // Send verification email - don't log in user until verified
      sendVerificationEmail(email, username, verificationToken).catch(err => {
        console.error("Failed to send verification email:", err);
      });

      // Don't return token - user must verify email first
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

      const user = findOne<User>("users.json", (u) => u.email === email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Check if user is verified - use same error message as invalid credentials to prevent enumeration
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

  // Resend verification email endpoint
  app.post("/api/auth/resend-verification", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = findOne<User>("users.json", (u) => u.email === email);
      if (!user) {
        // Don't reveal if email exists or not for security
        return res.json({ message: "If an account exists with this email, a verification link has been sent." });
      }

      if (user.verified) {
        // Return same generic message to prevent account enumeration
        return res.json({ message: "If an account exists with this email, a verification link has been sent." });
      }

      // Generate a new verification token
      const newToken = uuidv4();
      updateOne<User>("users.json", (u) => u.id === user.id, { verificationToken: newToken });

      await sendVerificationEmail(email, user.username, newToken);
      
      res.json({ message: "If an account exists with this email, a verification link has been sent." });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({ message: "Failed to send verification email" });
    }
  });

  // Password reset request - always returns success for security
  app.post("/api/auth/requestPasswordReset", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const user = findOne<User>("users.json", (u) => u.email.toLowerCase() === normalizedEmail);
      
      // Always return success to prevent email enumeration
      if (!user || !user.verified) {
        return res.json({ success: true });
      }

      // Generate secure reset token
      const resetToken = uuidv4();
      const resetTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes

      // Update user with reset token
      updateOne<User>("users.json", (u) => u.id === user.id, {
        passwordResetToken: resetToken,
        passwordResetTokenExpiry: resetTokenExpiry,
      });

      // Send password reset email
      await sendPasswordResetEmail(user.email, user.username, resetToken);

      res.json({ success: true });
    } catch (error) {
      console.error("Password reset request error:", error);
      // Still return success to prevent enumeration
      res.json({ success: true });
    }
  });

  // Reset password with token
  app.post("/api/auth/resetPassword", async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      // Find user with this reset token
      const user = findOne<User>("users.json", (u) => u.passwordResetToken === token);
      
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Check if token is expired
      if (!user.passwordResetTokenExpiry || Date.now() > user.passwordResetTokenExpiry) {
        // Clear the expired token
        updateOne<User>("users.json", (u) => u.id === user.id, {
          passwordResetToken: "",
          passwordResetTokenExpiry: 0,
        });
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Hash the new password
      const passwordHash = await bcrypt.hash(newPassword, 10);

      // Update password and clear reset token
      updateOne<User>("users.json", (u) => u.id === user.id, {
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

  app.get("/api/auth/me", authMiddleware, (req: AuthenticatedRequest, res) => {
    const user = findOne<User>("users.json", (u) => u.id === req.user!.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const { passwordHash: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  app.patch("/api/auth/profile", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const { avatarUrl, bio, username } = req.body;
      const updates: Partial<User> = {};

      if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
      if (bio !== undefined) updates.bio = bio;
      if (username !== undefined) {
        const existing = findOne<User>("users.json", (u) => u.username === username && u.id !== req.user!.userId);
        if (existing) {
          return res.status(400).json({ message: "Username already taken" });
        }
        updates.username = username;
      }

      const updated = updateOne<User>("users.json", (u) => u.id === req.user!.userId, updates);
      if (!updated) {
        return res.status(404).json({ message: "User not found" });
      }

      const unlockedAchievements: typeof ACHIEVEMENTS_LIST = [];
      if (updated.avatarUrl && updated.bio) {
        const existing = findOne<UserAchievement>("achievements.json", 
          (a) => a.userId === req.user!.userId && a.achievementId === "profile_complete"
        );
        if (!existing) {
          insertOne<UserAchievement>("achievements.json", {
            id: uuidv4(),
            userId: req.user!.userId,
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

  app.post("/api/auth/avatar", authMiddleware, uploadAvatar.single("avatar"), async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const avatarUrl = `/uploads/avatars/${req.file.filename}`;
      
      const updated = updateOne<User>("users.json", (u) => u.id === req.user!.userId, { avatarUrl });
      if (!updated) {
        return res.status(404).json({ message: "User not found" });
      }

      const unlockedAchievements: typeof ACHIEVEMENTS_LIST = [];
      if (updated.avatarUrl && updated.bio) {
        const existing = findOne<UserAchievement>("achievements.json", 
          (a) => a.userId === req.user!.userId && a.achievementId === "profile_complete"
        );
        if (!existing) {
          insertOne<UserAchievement>("achievements.json", {
            id: uuidv4(),
            userId: req.user!.userId,
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

  app.get("/api/friends", authMiddleware, (req: AuthenticatedRequest, res) => {
    const userId = req.user!.userId;
    const friendRequests = findMany<FriendRequest>("friends.json", 
      (fr) => fr.status === "accepted" && (fr.senderId === userId || fr.receiverId === userId)
    );

    const friendIds = friendRequests.map((fr) => 
      fr.senderId === userId ? fr.receiverId : fr.senderId
    );

    const friends = friendIds.map((id) => {
      const user = findOne<User>("users.json", (u) => u.id === id);
      if (!user) return null;
      const { passwordHash: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }).filter(Boolean);

    res.json(friends);
  });

  app.get("/api/friends/requests", authMiddleware, (req: AuthenticatedRequest, res) => {
    const userId = req.user!.userId;
    const pending = findMany<FriendRequest>("friends.json",
      (fr) => fr.receiverId === userId && fr.status === "pending"
    );

    const requestsWithUsers = pending.map((fr) => {
      const sender = findOne<User>("users.json", (u) => u.id === fr.senderId);
      if (!sender) return null;
      const { passwordHash: _, ...senderWithoutPassword } = sender;
      return { ...fr, sender: senderWithoutPassword };
    }).filter(Boolean);

    res.json(requestsWithUsers);
  });

  app.get("/api/friends/sent", authMiddleware, (req: AuthenticatedRequest, res) => {
    const userId = req.user!.userId;
    const sent = findMany<FriendRequest>("friends.json",
      (fr) => fr.senderId === userId && fr.status === "pending"
    );

    const requestsWithUsers = sent.map((fr) => {
      const receiver = findOne<User>("users.json", (u) => u.id === fr.receiverId);
      if (!receiver) return null;
      const { passwordHash: _, ...receiverWithoutPassword } = receiver;
      return { ...fr, receiver: receiverWithoutPassword };
    }).filter(Boolean);

    res.json(requestsWithUsers);
  });

  app.post("/api/friends/request", authMiddleware, (req: AuthenticatedRequest, res) => {
    const { username } = req.body;
    const userId = req.user!.userId;

    if (!username) {
      return res.status(400).json({ message: "Username is required" });
    }

    const targetUser = findOne<User>("users.json", (u) => u.username === username);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (targetUser.id === userId) {
      return res.status(400).json({ message: "Cannot send friend request to yourself" });
    }

    const existingRequest = findOne<FriendRequest>("friends.json", (fr) =>
      (fr.senderId === userId && fr.receiverId === targetUser.id) ||
      (fr.senderId === targetUser.id && fr.receiverId === userId)
    );

    if (existingRequest) {
      if (existingRequest.status === "accepted") {
        return res.status(400).json({ message: "Already friends" });
      }
      return res.status(400).json({ message: "Friend request already exists" });
    }

    const friendRequest: FriendRequest = {
      id: uuidv4(),
      senderId: userId,
      receiverId: targetUser.id,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    insertOne("friends.json", friendRequest);
    res.status(201).json({ message: "Friend request sent" });
  });

  app.post("/api/friends/accept/:requestId", authMiddleware, (req: AuthenticatedRequest, res) => {
    const { requestId } = req.params;
    const userId = req.user!.userId;

    const friendRequest = findOne<FriendRequest>("friends.json", (fr) => fr.id === requestId);
    if (!friendRequest) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    if (friendRequest.receiverId !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (friendRequest.status !== "pending") {
      return res.status(400).json({ message: "Request already processed" });
    }

    updateOne<FriendRequest>("friends.json", (fr) => fr.id === requestId, { status: "accepted" });

    const unlockedAchievements: typeof ACHIEVEMENTS_LIST = [];
    
    [userId, friendRequest.senderId].forEach((uid) => {
      const friendCount = findMany<FriendRequest>("friends.json",
        (fr) => fr.status === "accepted" && (fr.senderId === uid || fr.receiverId === uid)
      ).length;

      if (friendCount === 1) {
        const existing = findOne<UserAchievement>("achievements.json",
          (a) => a.userId === uid && a.achievementId === "first_friend"
        );
        if (!existing) {
          insertOne<UserAchievement>("achievements.json", {
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
      }

      if (friendCount >= 5) {
        const existing = findOne<UserAchievement>("achievements.json",
          (a) => a.userId === uid && a.achievementId === "social_butterfly"
        );
        if (!existing) {
          insertOne<UserAchievement>("achievements.json", {
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

  app.post("/api/friends/reject/:requestId", authMiddleware, (req: AuthenticatedRequest, res) => {
    const { requestId } = req.params;
    const userId = req.user!.userId;

    const friendRequest = findOne<FriendRequest>("friends.json", (fr) => fr.id === requestId);
    if (!friendRequest) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    if (friendRequest.receiverId !== userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    updateOne<FriendRequest>("friends.json", (fr) => fr.id === requestId, { status: "rejected" });
    res.json({ message: "Friend request rejected" });
  });

  app.delete("/api/friends/:friendId", authMiddleware, (req: AuthenticatedRequest, res) => {
    const { friendId } = req.params;
    const userId = req.user!.userId;

    const deleted = deleteOne<FriendRequest>("friends.json", (fr) =>
      fr.status === "accepted" &&
      ((fr.senderId === userId && fr.receiverId === friendId) ||
       (fr.senderId === friendId && fr.receiverId === userId))
    );

    if (!deleted) {
      return res.status(404).json({ message: "Friend not found" });
    }

    res.json({ message: "Friend removed" });
  });

  app.get("/api/users/search", authMiddleware, (req: AuthenticatedRequest, res) => {
    const { q } = req.query;
    if (!q || typeof q !== "string") {
      return res.status(400).json({ message: "Search query required" });
    }

    const users = findMany<User>("users.json", (u) =>
      u.username.toLowerCase().includes(q.toLowerCase()) && u.id !== req.user!.userId
    );

    const results = users.map((u) => {
      const { passwordHash: _, ...userWithoutPassword } = u;
      return userWithoutPassword;
    });

    res.json(results);
  });

  // ==================== MESSAGES ROUTES ====================

  app.get("/api/messages/conversations", authMiddleware, (req: AuthenticatedRequest, res) => {
    const userId = req.user!.userId;
    const messages = readJson<Message>("messages.json");

    const conversationPartners = new Set<string>();
    messages.forEach((msg) => {
      if (msg.fromId === userId) conversationPartners.add(msg.toId);
      if (msg.toId === userId) conversationPartners.add(msg.fromId);
    });

    const conversations = Array.from(conversationPartners).map((partnerId) => {
      const partner = findOne<User>("users.json", (u) => u.id === partnerId);
      if (!partner) return null;

      const partnerMessages = messages.filter(
        (m) => (m.fromId === userId && m.toId === partnerId) || (m.fromId === partnerId && m.toId === userId)
      );
      const lastMessage = partnerMessages.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0];

      const { passwordHash: _, ...partnerWithoutPassword } = partner;
      return {
        partner: partnerWithoutPassword,
        lastMessage,
        unreadCount: 0,
      };
    }).filter(Boolean);

    conversations.sort((a: any, b: any) => 
      new Date(b.lastMessage?.timestamp || 0).getTime() - new Date(a.lastMessage?.timestamp || 0).getTime()
    );

    res.json(conversations);
  });

  app.get("/api/messages/:partnerId", authMiddleware, (req: AuthenticatedRequest, res) => {
    const userId = req.user!.userId;
    const { partnerId } = req.params;

    const messages = findMany<Message>("messages.json", (m) =>
      (m.fromId === userId && m.toId === partnerId) || (m.fromId === partnerId && m.toId === userId)
    );

    messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    res.json(messages);
  });

  app.post("/api/messages", authMiddleware, (req: AuthenticatedRequest, res) => {
    const userId = req.user!.userId;
    const { toId, text } = req.body;

    if (!toId || !text) {
      return res.status(400).json({ message: "Recipient and message text required" });
    }

    const recipient = findOne<User>("users.json", (u) => u.id === toId);
    if (!recipient) {
      return res.status(404).json({ message: "Recipient not found" });
    }

    const message: Message = {
      id: uuidv4(),
      fromId: userId,
      toId,
      text,
      timestamp: new Date().toISOString(),
    };

    insertOne("messages.json", message);

    const unlockedAchievements: typeof ACHIEVEMENTS_LIST = [];
    const userMessages = findMany<Message>("messages.json", (m) => m.fromId === userId);
    if (userMessages.length === 1) {
      const existing = findOne<UserAchievement>("achievements.json",
        (a) => a.userId === userId && a.achievementId === "messenger"
      );
      if (!existing) {
        insertOne<UserAchievement>("achievements.json", {
          id: uuidv4(),
          userId,
          achievementId: "messenger",
          unlockedAt: new Date().toISOString(),
        });
        const achievement = ACHIEVEMENTS_LIST.find(a => a.id === "messenger");
        if (achievement) unlockedAchievements.push(achievement);
      }
    }

    if (userMessages.length >= 50) {
      const existing = findOne<UserAchievement>("achievements.json",
        (a) => a.userId === userId && a.achievementId === "chat_master"
      );
      if (!existing) {
        insertOne<UserAchievement>("achievements.json", {
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

  app.get("/api/achievements", authMiddleware, (req: AuthenticatedRequest, res) => {
    const userId = req.user!.userId;
    const userAchievements = findMany<UserAchievement>("achievements.json", (a) => a.userId === userId);

    const achievementsWithDetails = ACHIEVEMENTS_LIST.map((achievement) => {
      const unlocked = userAchievements.find((ua) => ua.achievementId === achievement.id);
      return {
        ...achievement,
        unlocked: !!unlocked,
        unlockedAt: unlocked?.unlockedAt || null,
      };
    });

    res.json(achievementsWithDetails);
  });

  // ==================== CLOUD SAVES ROUTES ====================

  app.get("/api/cloud", authMiddleware, (req: AuthenticatedRequest, res) => {
    const userId = req.user!.userId;
    const saves = findMany<CloudSave>("cloud_saves.json", (s) => s.userId === userId);
    saves.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    
    const savesWithoutData = saves.map(({ data, ...save }) => save);
    res.json(savesWithoutData);
  });

  app.get("/api/cloud/:saveId", authMiddleware, (req: AuthenticatedRequest, res) => {
    const userId = req.user!.userId;
    const { saveId } = req.params;

    const save = findOne<CloudSave>("cloud_saves.json", (s) => s.id === saveId && s.userId === userId);
    if (!save) {
      return res.status(404).json({ message: "Cloud save not found" });
    }

    res.json(save);
  });

  app.post("/api/cloud", authMiddleware, (req: AuthenticatedRequest, res) => {
    const userId = req.user!.userId;
    const { filename, data } = req.body;

    if (!filename || !data) {
      return res.status(400).json({ message: "Filename and data are required" });
    }

    const cloudSave: CloudSave = {
      id: uuidv4(),
      userId,
      filename,
      data,
      uploadedAt: new Date().toISOString(),
    };

    insertOne("cloud_saves.json", cloudSave);

    const { data: _, ...saveWithoutData } = cloudSave;
    res.status(201).json(saveWithoutData);
  });

  app.patch("/api/cloud/:saveId", authMiddleware, (req: AuthenticatedRequest, res) => {
    const userId = req.user!.userId;
    const { saveId } = req.params;
    const { filename, data } = req.body;

    const existing = findOne<CloudSave>("cloud_saves.json", (s) => s.id === saveId && s.userId === userId);
    if (!existing) {
      return res.status(404).json({ message: "Cloud save not found" });
    }

    const updates: Partial<CloudSave> = { uploadedAt: new Date().toISOString() };
    if (filename) updates.filename = filename;
    if (data) updates.data = data;

    const updated = updateOne<CloudSave>("cloud_saves.json", (s) => s.id === saveId, updates);
    if (!updated) {
      return res.status(500).json({ message: "Update failed" });
    }

    const { data: _, ...saveWithoutData } = updated;
    res.json(saveWithoutData);
  });

  app.delete("/api/cloud/:saveId", authMiddleware, (req: AuthenticatedRequest, res) => {
    const userId = req.user!.userId;
    const { saveId } = req.params;

    const deleted = deleteOne<CloudSave>("cloud_saves.json", (s) => s.id === saveId && s.userId === userId);
    if (!deleted) {
      return res.status(404).json({ message: "Cloud save not found" });
    }

    res.json({ message: "Cloud save deleted" });
  });

  // ==================== EMAIL VERIFICATION ROUTES ====================

  app.get("/api/auth/verify", async (req, res) => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== "string") {
        return res.status(400).json({ message: "Verification token is required" });
      }

      const user = findOne<User>("users.json", (u) => u.verificationToken === token);
      if (!user) {
        return res.status(400).json({ message: "Invalid verification token" });
      }

      if (user.verified) {
        return res.json({ message: "Email already verified" });
      }

      updateOne<User>("users.json", (u) => u.id === user.id, { verified: true, verificationToken: undefined });
      res.json({ message: "Email verified successfully" });
    } catch (error) {
      console.error("Verification error:", error);
      res.status(500).json({ message: "Verification failed" });
    }
  });

  app.post("/api/auth/resend-verification", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const user = findOne<User>("users.json", (u) => u.id === req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.verified) {
        return res.status(400).json({ message: "Email already verified" });
      }

      const newToken = uuidv4();
      updateOne<User>("users.json", (u) => u.id === user.id, { verificationToken: newToken });

      const sent = await sendVerificationEmail(user.email, user.username, newToken);
      if (!sent) {
        return res.status(500).json({ message: "Failed to send verification email" });
      }

      res.json({ message: "Verification email sent" });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({ message: "Failed to send verification email" });
    }
  });

  // ==================== WALLET ROUTES ====================

  app.get("/api/wallet", authMiddleware, (req: AuthenticatedRequest, res) => {
    const user = findOne<User>("users.json", (u) => u.id === req.user!.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const transactions = findMany<WalletTransaction>("wallet_transactions.json", (t) => t.userId === req.user!.userId);
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

  app.post("/api/wallet/create-checkout", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const { amount } = req.body;
      
      if (!amount || amount < 5 || amount > 100) {
        return res.status(400).json({ message: "Amount must be between £5 and £100" });
      }

      const user = findOne<User>("users.json", (u) => u.id === req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const stripe = await getUncachableStripeClient();
      
      const baseUrl = process.env.REPLIT_DOMAINS?.split(',')[0] 
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

  app.post("/api/wallet/verify-payment", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const { sessionId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID is required" });
      }

      const existingTransaction = findOne<WalletTransaction>("wallet_transactions.json", 
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

      if (session.metadata?.userId !== req.user!.userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const amount = parseInt(session.metadata?.amount || '0');
      if (amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      const user = findOne<User>("users.json", (u) => u.id === req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const newBalance = (user.walletBalance || 0) + amount;
      updateOne<User>("users.json", (u) => u.id === user.id, { walletBalance: newBalance });

      const transaction: WalletTransaction = {
        id: uuidv4(),
        userId: user.id,
        type: "deposit",
        amount,
        description: `Added $${amount} to wallet`,
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

  app.post("/api/wallet/purchase-game", authMiddleware, async (req: AuthenticatedRequest, res) => {
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

      const user = findOne<User>("users.json", (u) => u.id === req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if ((user.ownedGames || []).includes(gameId)) {
        return res.status(400).json({ message: "You already own this game" });
      }

      // Calculate price with Nexar+ discount if applicable
      let finalPrice = gameData.price;
      let discountApplied = 0;
      
      if (user.subscription?.active && gameData.nexarPlusDiscount) {
        discountApplied = gameData.nexarPlusDiscount;
        finalPrice = gameData.price * (1 - discountApplied / 100);
        finalPrice = Math.round(finalPrice * 100) / 100; // Round to 2 decimal places
      }

      if ((user.walletBalance || 0) < finalPrice) {
        return res.status(400).json({ message: "Insufficient wallet balance" });
      }

      const newBalance = (user.walletBalance || 0) - finalPrice;
      const newOwnedGames = [...(user.ownedGames || []), gameId];
      
      updateOne<User>("users.json", (u) => u.id === user.id, { 
        walletBalance: newBalance,
        ownedGames: newOwnedGames,
      });

      const discountText = discountApplied > 0 ? ` (${discountApplied}% Nexar+ discount)` : "";
      const transaction: WalletTransaction = {
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

  const getDefaultParentalControls = (): ParentalControls => ({
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

  app.post("/api/parental/enable", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const { pin } = req.body;

      if (!pin || typeof pin !== "string" || pin.length < 4 || pin.length > 8 || !/^\d+$/.test(pin)) {
        return res.status(400).json({ message: "PIN must be 4-8 digits" });
      }

      const user = findOne<User>("users.json", (u) => u.id === req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const hashedPin = await bcrypt.hash(pin, 10);
      const parentalControls: ParentalControls = {
        ...getDefaultParentalControls(),
        enabled: true,
        parentPin: hashedPin,
      };

      updateOne<User>("users.json", (u) => u.id === user.id, { parentalControls });
      res.json({ message: "Parental controls enabled" });
    } catch (error) {
      console.error("Enable parental controls error:", error);
      res.status(500).json({ message: "Failed to enable parental controls" });
    }
  });

  app.post("/api/parental/disable", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const { pin } = req.body;

      if (!pin) {
        return res.status(400).json({ message: "PIN is required" });
      }

      const user = findOne<User>("users.json", (u) => u.id === req.user!.userId);
      if (!user || !user.parentalControls?.enabled) {
        return res.status(400).json({ message: "Parental controls not enabled" });
      }

      const validPin = await bcrypt.compare(pin, user.parentalControls.parentPin);
      if (!validPin) {
        return res.status(401).json({ message: "Invalid PIN" });
      }

      updateOne<User>("users.json", (u) => u.id === user.id, { 
        parentalControls: getDefaultParentalControls() 
      });
      res.json({ message: "Parental controls disabled" });
    } catch (error) {
      console.error("Disable parental controls error:", error);
      res.status(500).json({ message: "Failed to disable parental controls" });
    }
  });

  app.post("/api/parental/verifyPin", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const { pin } = req.body;

      if (!pin) {
        return res.status(400).json({ valid: false });
      }

      const user = findOne<User>("users.json", (u) => u.id === req.user!.userId);
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
  
  const LEGACY_RATING_MAP: Record<string, string> = {
    "Mature": "M",
    "Teen": "T",
    "Everyone": "E",
    "7+": "E",
    "12+": "T",
    "16+": "M",
  };

  const normalizeRatings = (ratings: string[]): string[] => {
    const normalized = ratings.map(r => LEGACY_RATING_MAP[r] || r);
    return [...new Set(normalized.filter(r => VALID_CONTENT_RATINGS.includes(r)))];
  };

  app.post("/api/parental/updateSettings", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const { pin, playtimeLimit, canMakePurchases, restrictedRatings, requiresParentApproval } = req.body;

      if (!pin) {
        return res.status(400).json({ message: "PIN is required" });
      }

      const user = findOne<User>("users.json", (u) => u.id === req.user!.userId);
      if (!user || !user.parentalControls?.enabled) {
        return res.status(400).json({ message: "Parental controls not enabled" });
      }

      const validPin = await bcrypt.compare(pin, user.parentalControls.parentPin);
      if (!validPin) {
        return res.status(401).json({ message: "Invalid PIN" });
      }

      const updates: Partial<ParentalControls> = {};
      if (playtimeLimit !== undefined) updates.playtimeLimit = playtimeLimit;
      if (canMakePurchases !== undefined) updates.canMakePurchases = canMakePurchases;
      if (restrictedRatings !== undefined) {
        updates.restrictedRatings = normalizeRatings(restrictedRatings);
      }
      if (requiresParentApproval !== undefined) updates.requiresParentApproval = requiresParentApproval;

      const newParentalControls = { ...user.parentalControls, ...updates };
      updateOne<User>("users.json", (u) => u.id === user.id, { parentalControls: newParentalControls });
      
      res.json({ message: "Settings updated", parentalControls: newParentalControls });
    } catch (error) {
      console.error("Update parental settings error:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  app.get("/api/parental/status", authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const user = findOne<User>("users.json", (u) => u.id === req.user!.userId);
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

  app.post("/api/parental/checkAccess", authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const { gameId, rating, gameRating } = req.body;
      const rawRating = gameRating || rating;
      const contentRating = rawRating ? (LEGACY_RATING_MAP[rawRating] || rawRating) : null;

      const user = findOne<User>("users.json", (u) => u.id === req.user!.userId);
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

  app.post("/api/parental/override", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const { pin } = req.body;

      if (!pin) {
        return res.status(400).json({ message: "PIN is required" });
      }

      const user = findOne<User>("users.json", (u) => u.id === req.user!.userId);
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

  app.post("/api/parental/logPlaytime", authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const { minutes } = req.body;

      if (typeof minutes !== "number" || minutes < 0) {
        return res.status(400).json({ message: "Invalid minutes" });
      }

      const user = findOne<User>("users.json", (u) => u.id === req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const parentalControls = user.parentalControls || getDefaultParentalControls();
      const today = new Date().toISOString().split("T")[0];

      if (parentalControls.dailyPlaytimeLog.date !== today) {
        parentalControls.dailyPlaytimeLog = { date: today, minutesPlayed: 0 };
      }

      parentalControls.dailyPlaytimeLog.minutesPlayed += minutes;
      updateOne<User>("users.json", (u) => u.id === user.id, { parentalControls });

      res.json({ 
        minutesPlayed: parentalControls.dailyPlaytimeLog.minutesPlayed,
        limit: parentalControls.playtimeLimit,
      });
    } catch (error) {
      console.error("Log playtime error:", error);
      res.status(500).json({ message: "Failed to log playtime" });
    }
  });

  app.post("/api/parental/checkPurchase", authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const user = findOne<User>("users.json", (u) => u.id === req.user!.userId);
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

  // Get subscription status
  app.get("/api/subscription/status", authMiddleware, (req: AuthenticatedRequest, res) => {
    const user = findOne<User>("users.json", (u) => u.id === req.user!.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      active: user.subscription?.active || false,
      renewalDate: user.subscription?.renewalDate || "",
      stripeSubscriptionId: user.subscription?.stripeSubscriptionId || "",
    });
  });

  // Create Stripe subscription checkout session
  app.post("/api/subscription/create-checkout", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const user = findOne<User>("users.json", (u) => u.id === req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.subscription?.active) {
        return res.status(400).json({ message: "Already subscribed to Nexar+" });
      }

      const stripe = await getUncachableStripeClient();
      
      const baseUrl = process.env.REPLIT_DOMAINS?.split(',')[0] 
        ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
        : 'http://localhost:5000';

      // Create or get Stripe customer
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

  // Verify subscription after checkout
  app.post("/api/subscription/verify", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const { sessionId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID is required" });
      }

      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['subscription'],
      });

      if (session.metadata?.userId !== req.user!.userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      if (session.payment_status !== 'paid') {
        return res.status(400).json({ message: "Payment not completed" });
      }

      const subscription = session.subscription as any;
      if (!subscription) {
        return res.status(400).json({ message: "Subscription not found" });
      }

      const renewalDate = new Date(subscription.current_period_end * 1000).toISOString();

      updateOne<User>("users.json", (u) => u.id === req.user!.userId, {
        subscription: {
          active: true,
          renewalDate,
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: subscription.id,
        },
      });

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

  // Cancel subscription
  app.post("/api/subscription/cancel", authMiddleware, async (req: AuthenticatedRequest, res) => {
    try {
      const user = findOne<User>("users.json", (u) => u.id === req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!user.subscription?.active || !user.subscription.stripeSubscriptionId) {
        return res.status(400).json({ message: "No active subscription to cancel" });
      }

      const stripe = await getUncachableStripeClient();
      await stripe.subscriptions.cancel(user.subscription.stripeSubscriptionId);

      updateOne<User>("users.json", (u) => u.id === req.user!.userId, {
        subscription: {
          ...user.subscription,
          active: false,
        },
      });

      res.json({ success: true, message: "Subscription cancelled successfully" });
    } catch (error) {
      console.error("Cancel subscription error:", error);
      res.status(500).json({ message: "Failed to cancel subscription" });
    }
  });

  // ==================== GAME TRIAL ROUTES ====================

  // Get game metadata (for frontend)
  app.get("/api/games/metadata", (req, res) => {
    res.json(GAME_CATALOG);
  });

  // Check trial access
  app.post("/api/games/trial/check", authMiddleware, (req: AuthenticatedRequest, res) => {
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

      const user = findOne<User>("users.json", (u) => u.id === req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

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

  // Update trial usage
  app.post("/api/games/trial/update", authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const { gameId, minutesPlayed } = req.body;
      
      if (!gameId || typeof minutesPlayed !== "number") {
        return res.status(400).json({ message: "Game ID and minutes played are required" });
      }

      const game = GAME_CATALOG[gameId];
      if (!game || !game.trialEnabled) {
        return res.status(400).json({ message: "Trial not available for this game" });
      }

      const user = findOne<User>("users.json", (u) => u.id === req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const currentUsage = user.trialUsage?.[gameId] || { minutesPlayed: 0, expired: false };
      const newMinutesPlayed = currentUsage.minutesPlayed + minutesPlayed;
      const trialDuration = game.trialDurationMinutes || 120;
      const expired = newMinutesPlayed >= trialDuration;

      const updatedTrialUsage = {
        ...user.trialUsage,
        [gameId]: {
          minutesPlayed: newMinutesPlayed,
          expired,
        },
      };

      updateOne<User>("users.json", (u) => u.id === req.user!.userId, {
        trialUsage: updatedTrialUsage,
      });

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

  // Check Nexar+ collection access
  app.post("/api/games/nexarplus/check", authMiddleware, (req: AuthenticatedRequest, res) => {
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

      const user = findOne<User>("users.json", (u) => u.id === req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

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

  // Get discounted price for a game
  app.get("/api/games/:gameId/price", authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const { gameId } = req.params;
      
      const game = GAME_CATALOG[gameId];
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }

      const user = findOne<User>("users.json", (u) => u.id === req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

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

  // Apply as developer
  app.post("/api/developer/apply", authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const { studioName, contactEmail, website, description } = req.body;

      if (!studioName || !contactEmail || !description) {
        return res.status(400).json({ message: "Studio name, contact email, and description are required" });
      }

      const user = findOne<User>("users.json", (u) => u.id === req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.developerProfile?.status === "pending") {
        return res.status(400).json({ message: "You already have a pending application" });
      }

      if (user.developerProfile?.status === "approved") {
        return res.status(400).json({ message: "You are already an approved developer" });
      }

      const developerProfile: DeveloperProfile = {
        studioName,
        contactEmail,
        website: website || "",
        description,
        status: "pending",
      };

      updateOne<User>("users.json", (u) => u.id === req.user!.userId, {
        developerProfile,
      });

      res.json({ success: true, message: "Application submitted successfully" });
    } catch (error) {
      console.error("Developer apply error:", error);
      res.status(500).json({ message: "Failed to submit application" });
    }
  });

  // Get developer status
  app.get("/api/developer/status", authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const user = findOne<User>("users.json", (u) => u.id === req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        role: user.role || "user",
        developerProfile: user.developerProfile || null,
      });
    } catch (error) {
      console.error("Developer status error:", error);
      res.status(500).json({ message: "Failed to get developer status" });
    }
  });

  // Admin: Get all developer applications
  app.get("/api/admin/developer/applications", authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const adminUser = findOne<User>("users.json", (u) => u.id === req.user!.userId);
      if (!adminUser || adminUser.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const applications = findMany<User>("users.json", (u) => 
        u.developerProfile?.status === "pending"
      ).map(u => ({
        userId: u.id,
        username: u.username,
        email: u.email,
        developerProfile: u.developerProfile,
        createdAt: u.createdAt,
      }));

      res.json(applications);
    } catch (error) {
      console.error("Get applications error:", error);
      res.status(500).json({ message: "Failed to get applications" });
    }
  });

  // Admin: Approve developer
  app.post("/api/admin/developer/approve", authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const { userId } = req.body;

      const adminUser = findOne<User>("users.json", (u) => u.id === req.user!.userId);
      if (!adminUser || adminUser.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const targetUser = findOne<User>("users.json", (u) => u.id === userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!targetUser.developerProfile) {
        return res.status(400).json({ message: "User has no developer application" });
      }

      updateOne<User>("users.json", (u) => u.id === userId, {
        role: "developer",
        developerProfile: {
          ...targetUser.developerProfile,
          status: "approved",
        },
      });

      res.json({ success: true, message: "Developer approved" });
    } catch (error) {
      console.error("Approve developer error:", error);
      res.status(500).json({ message: "Failed to approve developer" });
    }
  });

  // Admin: Reject developer
  app.post("/api/admin/developer/reject", authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const { userId } = req.body;

      const adminUser = findOne<User>("users.json", (u) => u.id === req.user!.userId);
      if (!adminUser || adminUser.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const targetUser = findOne<User>("users.json", (u) => u.id === userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!targetUser.developerProfile) {
        return res.status(400).json({ message: "User has no developer application" });
      }

      updateOne<User>("users.json", (u) => u.id === userId, {
        developerProfile: {
          ...targetUser.developerProfile,
          status: "rejected",
        },
      });

      res.json({ success: true, message: "Developer rejected" });
    } catch (error) {
      console.error("Reject developer error:", error);
      res.status(500).json({ message: "Failed to reject developer" });
    }
  });

  // ========================================
  // DEVELOPER GAME ROUTES
  // ========================================

  // Create a new game
  app.post("/api/developer/game/create", authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const { title, description, price, genre, tags, coverImage } = req.body;

      const user = findOne<User>("users.json", (u) => u.id === req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.role !== "developer" || user.developerProfile?.status !== "approved") {
        return res.status(403).json({ message: "Only approved developers can create games" });
      }

      if (!title || !description || typeof price !== "number" || !genre) {
        return res.status(400).json({ message: "Title, description, price, and genre are required" });
      }

      const game: DeveloperGame = {
        gameId: uuidv4(),
        developerId: user.id,
        title,
        description,
        price,
        genre,
        tags: tags || [],
        status: "draft",
        versions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        coverImage: coverImage || "",
      };

      insertOne("developerGames.json", game);

      res.json({ success: true, game });
    } catch (error) {
      console.error("Create game error:", error);
      res.status(500).json({ message: "Failed to create game" });
    }
  });

  // Update a game
  app.post("/api/developer/game/update", authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const { gameId, title, description, price, genre, tags, coverImage } = req.body;

      if (!gameId) {
        return res.status(400).json({ message: "Game ID is required" });
      }

      const user = findOne<User>("users.json", (u) => u.id === req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const game = findOne<DeveloperGame>("developerGames.json", (g) => g.gameId === gameId);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }

      if (game.developerId !== user.id) {
        return res.status(403).json({ message: "You can only edit your own games" });
      }

      const updates: Partial<DeveloperGame> = {
        updatedAt: new Date().toISOString(),
      };

      if (title) updates.title = title;
      if (description) updates.description = description;
      if (typeof price === "number") updates.price = price;
      if (genre) updates.genre = genre;
      if (tags) updates.tags = tags;
      if (coverImage !== undefined) updates.coverImage = coverImage;

      const updatedGame = updateOne<DeveloperGame>("developerGames.json", (g) => g.gameId === gameId, updates);

      res.json({ success: true, game: updatedGame });
    } catch (error) {
      console.error("Update game error:", error);
      res.status(500).json({ message: "Failed to update game" });
    }
  });

  // Submit game for review
  app.post("/api/developer/game/submitForReview", authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const { gameId } = req.body;

      if (!gameId) {
        return res.status(400).json({ message: "Game ID is required" });
      }

      const user = findOne<User>("users.json", (u) => u.id === req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const game = findOne<DeveloperGame>("developerGames.json", (g) => g.gameId === gameId);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }

      if (game.developerId !== user.id) {
        return res.status(403).json({ message: "You can only submit your own games" });
      }

      if (game.status !== "draft" && game.status !== "rejected") {
        return res.status(400).json({ message: "Only draft or rejected games can be submitted for review" });
      }

      updateOne<DeveloperGame>("developerGames.json", (g) => g.gameId === gameId, {
        status: "pending",
        updatedAt: new Date().toISOString(),
      });

      res.json({ success: true, message: "Game submitted for review" });
    } catch (error) {
      console.error("Submit for review error:", error);
      res.status(500).json({ message: "Failed to submit for review" });
    }
  });

  // Get developer's games
  app.get("/api/developer/games", authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const user = findOne<User>("users.json", (u) => u.id === req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.role !== "developer" || user.developerProfile?.status !== "approved") {
        return res.status(403).json({ message: "Only approved developers can view their games" });
      }

      const games = findMany<DeveloperGame>("developerGames.json", (g) => g.developerId === user.id);

      res.json(games);
    } catch (error) {
      console.error("Get developer games error:", error);
      res.status(500).json({ message: "Failed to get games" });
    }
  });

  // Get single game for editing
  app.get("/api/developer/game/:gameId", authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const { gameId } = req.params;

      const user = findOne<User>("users.json", (u) => u.id === req.user!.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const game = findOne<DeveloperGame>("developerGames.json", (g) => g.gameId === gameId);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }

      if (game.developerId !== user.id) {
        return res.status(403).json({ message: "You can only view your own games" });
      }

      res.json(game);
    } catch (error) {
      console.error("Get game error:", error);
      res.status(500).json({ message: "Failed to get game" });
    }
  });

  // Admin: Get all pending games
  app.get("/api/admin/games/pending", authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const adminUser = findOne<User>("users.json", (u) => u.id === req.user!.userId);
      if (!adminUser || adminUser.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const pendingGames = findMany<DeveloperGame>("developerGames.json", (g) => g.status === "pending");

      const gamesWithDeveloper = pendingGames.map(game => {
        const developer = findOne<User>("users.json", (u) => u.id === game.developerId);
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

  // Admin: Approve game
  app.post("/api/admin/game/approve", authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const { gameId } = req.body;

      const adminUser = findOne<User>("users.json", (u) => u.id === req.user!.userId);
      if (!adminUser || adminUser.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      if (!gameId) {
        return res.status(400).json({ message: "Game ID is required" });
      }

      const game = findOne<DeveloperGame>("developerGames.json", (g) => g.gameId === gameId);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }

      updateOne<DeveloperGame>("developerGames.json", (g) => g.gameId === gameId, {
        status: "approved",
        updatedAt: new Date().toISOString(),
      });

      // Award developer achievement if this is their first approved game
      const developer = findOne<User>("users.json", (u) => u.id === game.developerId);
      if (developer) {
        const existingAchievement = findOne<UserAchievement>("achievements.json", 
          (a) => a.userId === developer.id && a.achievementId === "developer"
        );
        if (!existingAchievement) {
          insertOne<UserAchievement>("achievements.json", {
            id: uuidv4(),
            userId: developer.id,
            achievementId: "developer",
            unlockedAt: new Date().toISOString(),
          });
        }
      }

      res.json({ success: true, message: "Game approved" });
    } catch (error) {
      console.error("Approve game error:", error);
      res.status(500).json({ message: "Failed to approve game" });
    }
  });

  // Admin: Reject game
  app.post("/api/admin/game/reject", authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const { gameId, reason } = req.body;

      const adminUser = findOne<User>("users.json", (u) => u.id === req.user!.userId);
      if (!adminUser || adminUser.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      if (!gameId) {
        return res.status(400).json({ message: "Game ID is required" });
      }

      const game = findOne<DeveloperGame>("developerGames.json", (g) => g.gameId === gameId);
      if (!game) {
        return res.status(404).json({ message: "Game not found" });
      }

      updateOne<DeveloperGame>("developerGames.json", (g) => g.gameId === gameId, {
        status: "rejected",
        updatedAt: new Date().toISOString(),
      });

      res.json({ success: true, message: "Game rejected" });
    } catch (error) {
      console.error("Reject game error:", error);
      res.status(500).json({ message: "Failed to reject game" });
    }
  });

  // Get approved developer games for store
  app.get("/api/store/developer-games", (req, res) => {
    try {
      const approvedGames = findMany<DeveloperGame>("developerGames.json", (g) => g.status === "approved");

      const gamesWithDeveloper = approvedGames.map(game => {
        const developer = findOne<User>("users.json", (u) => u.id === game.developerId);
        return {
          ...game,
          developerName: developer?.developerProfile?.studioName || developer?.username || "Unknown",
        };
      });

      res.json(gamesWithDeveloper);
    } catch (error) {
      console.error("Get store developer games error:", error);
      res.status(500).json({ message: "Failed to get developer games" });
    }
  });

  // Admin: Set user as admin (for initial setup)
  app.post("/api/admin/make-admin", authMiddleware, (req: AuthenticatedRequest, res) => {
    try {
      const { secretKey, targetUserId } = req.body;

      // Simple secret key check for initial admin setup
      if (secretKey !== "nexaros-admin-setup-2024") {
        return res.status(403).json({ message: "Invalid secret key" });
      }

      const userId = targetUserId || req.user!.userId;
      const user = findOne<User>("users.json", (u) => u.id === userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      updateOne<User>("users.json", (u) => u.id === userId, {
        role: "admin",
      });

      res.json({ success: true, message: "User is now an admin" });
    } catch (error) {
      console.error("Make admin error:", error);
      res.status(500).json({ message: "Failed to make admin" });
    }
  });

  return httpServer;
}
