import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LogIn, Eye, EyeOff, Mail, RefreshCw } from "lucide-react";
import NexarLogo from "@/components/nexar/NexarLogo";
import { apiRequest } from "@/lib/queryClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showVerificationMessage, setShowVerificationMessage] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleResendVerification = async () => {
    setIsResending(true);
    try {
      await apiRequest("POST", "/api/auth/resend-verification", { email });
      toast({
        title: "Verification email sent",
        description: "Please check your inbox for the verification link.",
      });
    } catch (error) {
      toast({
        title: "Failed to send email",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setShowVerificationMessage(false);

    try {
      await login(email, password);
      toast({ title: "Welcome back!", description: "You have been logged in successfully." });
      setLocation("/");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Invalid credentials";
      
      // Always show verification help on login failure (we can't distinguish the reason for security)
      setShowVerificationMessage(true);
      
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <div className="bg-[#1A1A1A] rounded-2xl p-8 border border-[#2A2A2A] shadow-2xl">
          <div className="flex flex-col items-center mb-8">
            <NexarLogo size="lg" />
            <h1 className="text-2xl font-bold text-[#EAEAEA] mt-4 uppercase tracking-wider">Nexar ID Login</h1>
            <p className="text-[#A3A3A3] text-sm mt-2">
              Sign in to your NexarOS account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#EAEAEA]">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={isLoading}
                data-testid="input-email"
                className="bg-[#111111] border-[#333333] text-[#EAEAEA] placeholder:text-[#666666] focus:border-[#d00024] focus:ring-[#d00024]/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#EAEAEA]">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  disabled={isLoading}
                  data-testid="input-password"
                  className="bg-[#111111] border-[#333333] text-[#EAEAEA] placeholder:text-[#666666] focus:border-[#d00024] focus:ring-[#d00024]/20 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666666] hover:text-[#EAEAEA] transition-colors"
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              data-testid="button-login"
              className="w-full bg-[#d00024] hover:bg-[#b0001e] text-white font-semibold py-3 rounded-lg transition-all duration-200 shadow-lg shadow-[#d00024]/20"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <LogIn className="w-5 h-5 mr-2" />
              )}
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>

            {showVerificationMessage && (
              <div className="bg-[#111111] border border-[#333333] rounded-lg p-4 mt-4">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-[#666666] mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-[#A3A3A3]">
                      Need to verify your email? Check your inbox or request a new verification link.
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleResendVerification}
                      disabled={isResending || !email}
                      data-testid="button-resend-verification"
                      className="mt-2 text-[#d00024] hover:text-[#ff1a3a] p-0 h-auto"
                    >
                      {isResending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-1" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-1" />
                      )}
                      {isResending ? "Sending..." : "Resend verification email"}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </form>

          <div className="mt-6 space-y-3 text-center">
            <Link
              href="/forgot-password"
              data-testid="link-forgot-password"
              className="text-[#A3A3A3] hover:text-[#EAEAEA] text-sm transition-colors block"
            >
              Forgot Password?
            </Link>
            <p className="text-[#A3A3A3] text-sm">
              Don't have an account?{" "}
              <Link
                href="/register"
                data-testid="link-register"
                className="text-[#d00024] hover:text-[#ff1a3a] font-medium transition-colors"
              >
                Create one
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
