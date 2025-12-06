import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  Wallet, 
  Plus, 
  CreditCard, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Loader2,
  DollarSign,
  Clock,
  Gamepad2
} from "lucide-react";

interface Transaction {
  id: string;
  type: "deposit" | "purchase" | "refund";
  amount: number;
  description: string;
  gameId?: string;
  timestamp: string;
}

interface WalletData {
  balance: number;
  transactions: Transaction[];
  ownedGames: string[];
}

export default function WalletPage() {
  const { user } = useAuth();
  const { get, post } = useApi();
  const { toast } = useToast();
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingFunds, setIsAddingFunds] = useState(false);
  const [amount, setAmount] = useState("10");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadWallet();
    checkPaymentSuccess();
  }, []);

  const loadWallet = async () => {
    try {
      const data = await get<WalletData>("/api/wallet");
      if (data) {
        setWalletData(data);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load wallet data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkPaymentSuccess = async () => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const sessionId = params.get("session_id");

    if (success === "true" && sessionId) {
      setIsProcessing(true);
      try {
        const result = await post<{ message: string; balance: number }>("/api/wallet/verify-payment", {
          sessionId,
        });
        if (result) {
          toast({
            title: "Payment Successful",
            description: "Funds have been added to your wallet!",
          });
          loadWallet();
        }
      } catch (error) {
        toast({
          title: "Verification Error",
          description: "There was an issue verifying your payment",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
        window.history.replaceState({}, "", "/wallet");
      }
    }

    if (params.get("canceled") === "true") {
      toast({
        title: "Payment Canceled",
        description: "The payment was canceled",
      });
      window.history.replaceState({}, "", "/wallet");
    }
  };

  const handleAddFunds = async () => {
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 5 || amountNum > 100) {
      toast({
        title: "Invalid Amount",
        description: "Please enter an amount between $5 and $100",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const result = await post<{ url: string; sessionId: string }>("/api/wallet/create-checkout", {
        amount: amountNum,
      });
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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
        <h1 className="text-3xl font-bold flex items-center gap-3 mb-6">
          <Wallet className="w-8 h-8 text-primary" />
          Wallet
        </h1>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="md:col-span-2 lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Balance
              </CardTitle>
              <CardDescription>Your current wallet balance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-foreground" data-testid="text-wallet-balance">
                ${(walletData?.balance || 0).toFixed(2)}
              </div>
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Gamepad2 className="w-4 h-4" />
                {walletData?.ownedGames?.length || 0} games owned
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Add Funds
              </CardTitle>
              <CardDescription>Add money to your wallet using Stripe</CardDescription>
            </CardHeader>
            <CardContent>
              {isAddingFunds ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (USD)</Label>
                    <Input
                      id="amount"
                      type="number"
                      min="5"
                      max="100"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Enter amount ($5 - $100)"
                      data-testid="input-amount"
                    />
                  </div>
                  <div className="flex gap-2">
                    {[5, 10, 25, 50].map((preset) => (
                      <Button
                        key={preset}
                        variant="outline"
                        size="sm"
                        onClick={() => setAmount(preset.toString())}
                        data-testid={`button-preset-${preset}`}
                      >
                        ${preset}
                      </Button>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleAddFunds}
                      disabled={isProcessing}
                      data-testid="button-checkout"
                    >
                      {isProcessing ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CreditCard className="w-4 h-4 mr-2" />
                      )}
                      Pay with Stripe
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsAddingFunds(false)}
                      data-testid="button-cancel-add-funds"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={() => setIsAddingFunds(true)}
                  data-testid="button-add-funds"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Funds
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Transaction History
            </CardTitle>
            <CardDescription>Your recent wallet transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {!walletData?.transactions?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                No transactions yet
              </div>
            ) : (
              <div className="space-y-3">
                {walletData.transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    data-testid={`transaction-${tx.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        tx.type === "deposit" 
                          ? "bg-green-500/10 text-green-500" 
                          : tx.type === "refund"
                          ? "bg-blue-500/10 text-blue-500"
                          : "bg-destructive/10 text-destructive"
                      }`}>
                        {tx.type === "deposit" ? (
                          <ArrowDownLeft className="w-5 h-5" />
                        ) : tx.type === "refund" ? (
                          <ArrowDownLeft className="w-5 h-5" />
                        ) : (
                          <ArrowUpRight className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{tx.description}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(tx.timestamp)}
                        </div>
                      </div>
                    </div>
                    <div className={`font-bold ${
                      tx.amount >= 0 ? "text-green-500" : "text-destructive"
                    }`}>
                      {tx.amount >= 0 ? "+" : ""}${Math.abs(tx.amount).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
