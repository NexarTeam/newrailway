import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Crown,
  Check,
  Loader2,
  Gamepad2,
  Percent,
  Palette,
  Clock,
  Calendar,
  AlertCircle
} from "lucide-react";

interface SubscriptionStatus {
  active: boolean;
  renewalDate?: string;
  price: number;
  currency: string;
}

export default function NexarPlusPage() {
  const { user } = useAuth();
  const { get, post } = useApi();
  const { toast } = useToast();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    loadSubscription();
    checkPaymentSuccess();
  }, []);

  const loadSubscription = async () => {
    try {
      const data = await get<SubscriptionStatus>("/api/subscription/status");
      if (data) {
        setSubscription(data);
      }
    } catch (error) {
      console.error("Failed to load subscription status");
    } finally {
      setIsLoading(false);
    }
  };

  const checkPaymentSuccess = async () => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("subscription_success");
    const sessionId = params.get("session_id");

    if (success === "true" && sessionId) {
      setIsProcessing(true);
      try {
        const result = await post<{ message: string; active: boolean }>("/api/subscription/verify", {
          sessionId,
        });
        if (result?.active) {
          toast({
            title: "Welcome to Nexar+!",
            description: "Your subscription is now active. Enjoy your benefits!",
          });
          loadSubscription();
        }
      } catch (error) {
        toast({
          title: "Verification Error",
          description: "There was an issue verifying your subscription",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
        window.history.replaceState({}, "", window.location.pathname);
      }
    }

    if (params.get("canceled") === "true") {
      toast({
        title: "Subscription Canceled",
        description: "You can subscribe anytime to get Nexar+ benefits",
      });
      window.history.replaceState({}, "", window.location.pathname);
    }
  };

  const handleSubscribe = async () => {
    setIsProcessing(true);
    try {
      const result = await post<{ url: string }>("/api/subscription/create-checkout", {});
      if (result?.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create checkout session",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      const result = await post<{ message: string }>("/api/subscription/cancel", {});
      if (result) {
        toast({
          title: "Subscription Cancelled",
          description: "Your subscription will remain active until the end of the billing period",
        });
        loadSubscription();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel subscription",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const benefits = [
    {
      icon: Clock,
      title: "Game Trials",
      description: "Try select games for 2 hours before you buy",
    },
    {
      icon: Percent,
      title: "Exclusive Discounts",
      description: "Up to 25% off on select game purchases",
    },
    {
      icon: Gamepad2,
      title: "Free Games",
      description: "Access to the Nexar+ Collection at no extra cost",
    },
    {
      icon: Palette,
      title: "Premium Themes",
      description: "Unlock exclusive console themes and customisation",
    },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <Crown className="w-8 h-8 text-[#d00024]" />
          <h1 className="text-3xl font-bold">Nexar+</h1>
          {subscription?.active && (
            <Badge className="bg-[#d00024] text-white">Active</Badge>
          )}
        </div>

        {subscription?.active ? (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-500" />
                You're a Nexar+ Member
              </CardTitle>
              <CardDescription>
                Thank you for being a subscriber! Enjoy all your benefits.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>
                  Next renewal: {subscription.renewalDate ? formatDate(subscription.renewalDate) : "N/A"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Crown className="w-4 h-4" />
                <span>£{subscription.price?.toFixed(2) || "4.99"}/month</span>
              </div>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isCancelling}
                className="mt-4"
                data-testid="button-cancel-subscription"
              >
                {isCancelling ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <AlertCircle className="w-4 h-4 mr-2" />
                )}
                Cancel Subscription
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6 border-[#d00024]/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-[#d00024]" />
                Subscribe to Nexar+
              </CardTitle>
              <CardDescription>
                Get the most out of your gaming experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-4xl font-bold">
                £4.99<span className="text-lg font-normal text-muted-foreground">/month</span>
              </div>
              <Button
                onClick={handleSubscribe}
                disabled={isProcessing}
                className="bg-[#d00024]"
                data-testid="button-subscribe"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Crown className="w-4 h-4 mr-2" />
                )}
                Subscribe Now
              </Button>
            </CardContent>
          </Card>
        )}

        <h2 className="text-xl font-semibold mb-4">Member Benefits</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {benefits.map((benefit, index) => (
            <Card key={index} className="hover-elevate">
              <CardContent className="flex items-start gap-4 p-4">
                <div className="w-10 h-10 rounded-full bg-[#d00024]/10 flex items-center justify-center flex-shrink-0">
                  <benefit.icon className="w-5 h-5 text-[#d00024]" />
                </div>
                <div>
                  <h3 className="font-semibold">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
