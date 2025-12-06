import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Mail, CheckCircle } from "lucide-react";
import NexarLogo from "@/components/nexar/NexarLogo";
import { apiRequest } from "@/lib/queryClient";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await apiRequest("POST", "/api/auth/requestPasswordReset", { email });
      setIsSubmitted(true);
    } catch (error) {
      toast({
        title: "Request sent",
        description: "If this email is registered, a reset link has been sent.",
      });
      setIsSubmitted(true);
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
            <h1 className="text-2xl font-bold text-[#EAEAEA] mt-4 uppercase tracking-wider">Reset Password</h1>
            <p className="text-[#A3A3A3] text-sm mt-2 text-center">
              {isSubmitted 
                ? "Check your email for the reset link"
                : "Enter your email to receive a password reset link"
              }
            </p>
          </div>

          {isSubmitted ? (
            <div className="space-y-6">
              <div className="bg-[#111111] border border-[#333333] rounded-lg p-6 text-center">
                <CheckCircle className="w-12 h-12 text-[#22c55e] mx-auto mb-4" />
                <p className="text-[#EAEAEA] font-medium mb-2">
                  Reset link sent
                </p>
                <p className="text-[#A3A3A3] text-sm">
                  If an account exists with this email, you will receive a password reset link shortly. The link expires in 15 minutes.
                </p>
              </div>
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
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#EAEAEA]">
                  Email Address
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

              <Button
                type="submit"
                disabled={isLoading || !email}
                data-testid="button-submit"
                className="w-full bg-[#d00024] hover:bg-[#b0001e] text-white font-semibold py-3 rounded-lg transition-all duration-200 shadow-lg shadow-[#d00024]/20"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <Mail className="w-5 h-5 mr-2" />
                )}
                {isLoading ? "Sending..." : "Send Reset Link"}
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
