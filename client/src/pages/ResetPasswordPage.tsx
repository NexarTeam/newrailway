import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Lock, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";
import NexarLogo from "@/components/nexar/NexarLogo";
import { apiRequest } from "@/lib/queryClient";

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const search = useSearch();
  
  const token = new URLSearchParams(search).get("token");

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing reset token. Please request a new password reset.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await apiRequest("POST", "/api/auth/resetPassword", { 
        token, 
        newPassword 
      });
      setIsSuccess(true);
      toast({
        title: "Password reset successful",
        description: "You can now log in with your new password.",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to reset password";
      setError(errorMessage);
      toast({
        title: "Reset failed",
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
            <h1 className="text-2xl font-bold text-[#EAEAEA] mt-4 uppercase tracking-wider">
              {isSuccess ? "Password Reset" : "New Password"}
            </h1>
            <p className="text-[#A3A3A3] text-sm mt-2 text-center">
              {isSuccess 
                ? "Your password has been updated"
                : "Enter your new password below"
              }
            </p>
          </div>

          {error && !isSuccess ? (
            <div className="space-y-6">
              <div className="bg-[#111111] border border-[#d00024]/30 rounded-lg p-6 text-center">
                <AlertCircle className="w-12 h-12 text-[#d00024] mx-auto mb-4" />
                <p className="text-[#EAEAEA] font-medium mb-2">
                  Reset Link Invalid
                </p>
                <p className="text-[#A3A3A3] text-sm">
                  {error}
                </p>
              </div>
              <Link href="/forgot-password" className="block">
                <Button
                  data-testid="button-request-new-reset"
                  className="w-full bg-[#d00024] hover:bg-[#b0001e] text-white font-semibold py-3 rounded-lg transition-all duration-200"
                >
                  Request New Reset Link
                </Button>
              </Link>
              <Link href="/login" className="block">
                <Button
                  variant="outline"
                  data-testid="button-back-to-login"
                  className="w-full border-[#333333] text-[#EAEAEA] hover:bg-[#2A2A2A]"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Button>
              </Link>
            </div>
          ) : isSuccess ? (
            <div className="space-y-6">
              <div className="bg-[#111111] border border-[#22c55e]/30 rounded-lg p-6 text-center">
                <CheckCircle className="w-12 h-12 text-[#22c55e] mx-auto mb-4" />
                <p className="text-[#EAEAEA] font-medium mb-2">
                  Password Updated
                </p>
                <p className="text-[#A3A3A3] text-sm">
                  Your password has been successfully reset. You can now log in with your new password.
                </p>
              </div>
              <Link href="/login" className="block">
                <Button
                  data-testid="button-go-to-login"
                  className="w-full bg-[#d00024] hover:bg-[#b0001e] text-white font-semibold py-3 rounded-lg transition-all duration-200 shadow-lg shadow-[#d00024]/20"
                >
                  Go to Login
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-[#EAEAEA]">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                    minLength={6}
                    disabled={isLoading}
                    data-testid="input-new-password"
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
                <p className="text-xs text-[#666666]">Minimum 6 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-[#EAEAEA]">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                    disabled={isLoading}
                    data-testid="input-confirm-password"
                    className="bg-[#111111] border-[#333333] text-[#EAEAEA] placeholder:text-[#666666] focus:border-[#d00024] focus:ring-[#d00024]/20 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666666] hover:text-[#EAEAEA] transition-colors"
                    data-testid="button-toggle-confirm-password"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading || !newPassword || !confirmPassword}
                data-testid="button-reset-password"
                className="w-full bg-[#d00024] hover:bg-[#b0001e] text-white font-semibold py-3 rounded-lg transition-all duration-200 shadow-lg shadow-[#d00024]/20"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <Lock className="w-5 h-5 mr-2" />
                )}
                {isLoading ? "Resetting..." : "Reset Password"}
              </Button>

              <div className="text-center">
                <Link
                  href="/login"
                  data-testid="link-back-to-login"
                  className="text-[#A3A3A3] hover:text-[#EAEAEA] text-sm transition-colors inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
