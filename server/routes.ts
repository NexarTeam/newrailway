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

interface User {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  avatarUrl: string;
  bio: string;
  createdAt: string;
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
      const user: User = {
        id: uuidv4(),
        email,
        username,
        passwordHash,
        avatarUrl: "",
        bio: "",
        createdAt: new Date().toISOString(),
      };

      insertOne("users.json", user);

      insertOne<UserAchievement>("achievements.json", {
        id: uuidv4(),
        userId: user.id,
        achievementId: "first_login",
        unlockedAt: new Date().toISOString(),
      });

      const token = generateToken({
        userId: user.id,
        email: user.email,
        username: user.username,
      });

      const firstLoginAchievement = ACHIEVEMENTS_LIST.find(a => a.id === "first_login");
      const { passwordHash: _, ...userWithoutPassword } = user;
      res.status(201).json({ 
        user: userWithoutPassword, 
        token,
        unlockedAchievements: firstLoginAchievement ? [firstLoginAchievement] : []
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

  return httpServer;
}
