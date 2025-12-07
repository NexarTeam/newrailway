import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2, Mail } from "lucide-react";
import { API_BASE_URL } from "@/lib/queryClient";

export default function VerifyEmailPage() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "no-token">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      setStatus("no-token");
      return;
    }

    verifyEmail(token);
  }, []);

  const verifyEmail = async (token: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify?token=${token}`);
      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage(data.message || "Email verified successfully!");
      } else {
        setStatus("error");
        setMessage(data.message || "Verification failed");
      }
    } catch (error) {
      setStatus("error");
      setMessage("An error occurred during verification");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {status === "loading" && (
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
                </div>
              )}
              {status === "success" && (
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              )}
              {status === "error" && (
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <XCircle className="w-8 h-8 text-destructive" />
                </div>
              )}
              {status === "no-token" && (
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <Mail className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
            </div>
            <CardTitle>
              {status === "loading" && "Verifying Email..."}
              {status === "success" && "Email Verified!"}
              {status === "error" && "Verification Failed"}
              {status === "no-token" && "No Verification Token"}
            </CardTitle>
            <CardDescription className="mt-2">
              {status === "loading" && "Please wait while we verify your email address."}
              {status === "success" && message}
              {status === "error" && message}
              {status === "no-token" && "Please use the verification link sent to your email."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {status === "success" && (
              <Button
                data-testid="button-go-to-profile"
                onClick={() => setLocation("/profile")}
              >
                Go to Profile
              </Button>
            )}
            {(status === "error" || status === "no-token") && (
              <Button
                data-testid="button-go-home"
                onClick={() => setLocation("/")}
              >
                Go to Home
              </Button>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
