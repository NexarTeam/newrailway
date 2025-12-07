import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
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
  avatarUrl: string;
  bio: string;
  createdAt: string;
  role?: "user" | "developer" | "admin";
  developerProfile?: DeveloperProfile;
}

interface RegisterResult {
  requiresVerification: boolean;
  message: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<RegisterResult>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  const fetchUser = useCallback(async (authToken: string) => {
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    const storedToken = localStorage.getItem("nexar_token");
    if (storedToken) {
      setToken(storedToken);
      fetchUser(storedToken).then((success) => {
        if (!success) {
          localStorage.removeItem("nexar_token");
          setToken(null);
        }
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || "Login failed");
    }

    const data = await res.json();
    localStorage.setItem("nexar_token", data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const register = async (email: string, username: string, password: string): Promise<{ requiresVerification: boolean; message: string }> => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, username, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || "Registration failed");
    }

    const data = await res.json();
    // Registration now requires email verification before login
    return { 
      requiresVerification: data.requiresVerification || false,
      message: data.message || "Account created"
    };
  };

  const logout = () => {
    localStorage.removeItem("nexar_token");
    setToken(null);
    setUser(null);
    setLocation("/login");
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
