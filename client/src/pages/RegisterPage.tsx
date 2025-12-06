import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, Eye, EyeOff, Mail, CheckCircle } from "lucide-react";
import NexarLogo from "@/components/nexar/NexarLogo";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const { register } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await register(email, username, password);
      if (result.requiresVerification) {
        setRegistrationComplete(true);
      } else {
        toast({ title: "Welcome to NexarOS!", description: result.message });
        setLocation("/login");
      }
    } catch (error) {
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Could not create account",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show verification required message after registration
  if (registrationComplete) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md"
        >
          <div className="bg-[#1A1A1A] rounded-2xl p-8 border border-[#2A2A2A] shadow-2xl text-center">
            <div className="flex flex-col items-center mb-6">
              <div className="w-16 h-16 rounded-full bg-[#d00024]/20 flex items-center justify-center mb-4">
                <Mail className="w-8 h-8 text-[#d00024]" />
              </div>
              <h1 className="text-2xl font-bold text-[#EAEAEA] uppercase tracking-wider">
                Check Your Email
              </h1>
            </div>
            
            <p className="text-[#A3A3A3] mb-6">
              We've sent a verification link to <span className="text-[#EAEAEA] font-medium">{email}</span>. 
              Please check your inbox and click the link to verify your account.
            </p>

            <div className="bg-[#111111] border border-[#333333] rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-[#A3A3A3] text-left">
                  Once verified, you'll be able to log in and access all NexarOS features.
                </p>
              </div>
            </div>

            <Link href="/login">
              <Button
                data-testid="button-go-to-login"
                className="w-full bg-[#d00024] hover:bg-[#b0001e] text-white font-semibold py-3 rounded-lg transition-all duration-200 shadow-lg shadow-[#d00024]/20"
              >
                Go to Login
              </Button>
            </Link>

            <p className="text-[#666666] text-sm mt-4">
              Didn't receive the email? Check your spam folder or try registering again.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

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
              Create NexarID
            </h1>
            <p className="text-[#A3A3A3] text-sm mt-2">
              Join the NexarOS gaming community
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
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
              <Label htmlFor="username" className="text-[#EAEAEA]">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="GamerTag"
                required
                disabled={isLoading}
                data-testid="input-username"
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
                  placeholder="At least 6 characters"
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-[#EAEAEA]">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
                disabled={isLoading}
                data-testid="input-confirm-password"
                className="bg-[#111111] border-[#333333] text-[#EAEAEA] placeholder:text-[#666666] focus:border-[#d00024] focus:ring-[#d00024]/20"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              data-testid="button-register"
              className="w-full bg-[#d00024] hover:bg-[#b0001e] text-white font-semibold py-3 rounded-lg transition-all duration-200 shadow-lg shadow-[#d00024]/20"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <UserPlus className="w-5 h-5 mr-2" />
              )}
              {isLoading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-[#A3A3A3] text-sm">
              Already have an account?{" "}
              <Link
                href="/login"
                data-testid="link-login"
                className="text-[#d00024] hover:text-[#ff1a3a] font-medium transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
