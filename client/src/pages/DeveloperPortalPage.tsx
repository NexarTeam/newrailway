import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Code, Plus, Gamepad2, FileText, BarChart3, Loader2, 
  Edit, Send, Eye, Clock, CheckCircle, XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

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

interface DeveloperStatus {
  isDeveloper: boolean;
  status: "none" | "pending" | "approved" | "rejected";
  developerProfile?: {
    studioName: string;
    website: string;
    description: string;
    contactEmail: string;
    status: string;
  };
}

export default function DeveloperPortalPage({ onNavigateToEditor }: { onNavigateToEditor?: (gameId?: string) => void }) {
  const { toast } = useToast();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("games");

  const { data: status, isLoading: statusLoading } = useQuery<DeveloperStatus>({
    queryKey: ["/api/developer/status"],
    enabled: !!token,
  });

  const { data: games, isLoading: gamesLoading } = useQuery<DeveloperGame[]>({
    queryKey: ["/api/developer/games"],
    enabled: !!token && status?.status === "approved",
  });

  const submitForReviewMutation = useMutation({
    mutationFn: async (gameId: string) => {
      return apiRequest("POST", "/api/developer/game/submitForReview", { gameId });
    },
    onSuccess: () => {
      toast({
        title: "Submitted for Review",
        description: "Your game has been submitted for review.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/developer/games"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }


  const getStatusBadge = (gameStatus: DeveloperGame["status"]) => {
    switch (gameStatus) {
      case "draft":
        return <Badge variant="secondary"><Edit className="w-3 h-3 mr-1" />Draft</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/50"><Clock className="w-3 h-3 mr-1" />Pending Review</Badge>;
      case "approved":
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/50"><CheckCircle className="w-3 h-3 mr-1" />Published</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6"
      data-testid="page-developer-portal"
    >
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1 flex items-center gap-3">
            <Code className="w-8 h-8 text-primary" />
            Developer Portal
          </h1>
          <p className="text-muted-foreground">
            Welcome back, {status?.developerProfile?.studioName}
          </p>
        </div>
        <Button 
          className="bg-primary"
          onClick={() => onNavigateToEditor?.()}
          data-testid="button-create-game"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create New Game
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="games" data-testid="tab-games">
            <Gamepad2 className="w-4 h-4 mr-2" />
            My Games
          </TabsTrigger>
          <TabsTrigger value="docs" data-testid="tab-docs">
            <FileText className="w-4 h-4 mr-2" />
            Documentation
          </TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="games">
          {gamesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : !games || games.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Gamepad2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No Games Yet</h3>
                <p className="text-muted-foreground mb-6">
                  Start by creating your first game to publish on the Nexar Store.
                </p>
                <Button 
                  className="bg-primary"
                  onClick={() => onNavigateToEditor?.()}
                  data-testid="button-create-first-game"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Game
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {games.map((game) => (
                <Card key={game.gameId} data-testid={`game-card-${game.gameId}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-16 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                        {game.coverImage ? (
                          <img src={game.coverImage} alt={game.title} className="w-full h-full object-cover" />
                        ) : (
                          <Gamepad2 className="w-8 h-8 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold truncate">{game.title}</h3>
                          {getStatusBadge(game.status)}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{game.description}</p>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="text-sm text-muted-foreground">{game.genre}</span>
                          <span className="text-sm font-medium text-primary">
                            {game.price === 0 ? "Free" : `$${game.price.toFixed(2)}`}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onNavigateToEditor?.(game.gameId)}
                          data-testid={`button-edit-${game.gameId}`}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        {game.status === "draft" && (
                          <Button
                            size="sm"
                            className="bg-primary"
                            onClick={() => submitForReviewMutation.mutate(game.gameId)}
                            disabled={submitForReviewMutation.isPending}
                            data-testid={`button-submit-${game.gameId}`}
                          >
                            <Send className="w-4 h-4 mr-1" />
                            Submit
                          </Button>
                        )}
                        {game.status === "approved" && (
                          <Button
                            variant="outline"
                            size="sm"
                            data-testid={`button-view-${game.gameId}`}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View in Store
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="docs">
          <Card>
            <CardHeader>
              <CardTitle>Developer Documentation</CardTitle>
              <CardDescription>
                Everything you need to know about publishing games on Nexar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Getting Started</h3>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Create a new game using the "Create New Game" button</li>
                  <li>Fill in your game's metadata including title, description, and price</li>
                  <li>Upload cover art and screenshots</li>
                  <li>Submit your game for review</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Game Requirements</h3>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Title must be unique and between 3-100 characters</li>
                  <li>Description should be at least 100 characters</li>
                  <li>Cover image should be 16:9 aspect ratio, minimum 1280x720</li>
                  <li>All games must comply with our content guidelines</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Review Process</h3>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Reviews typically take 2-5 business days</li>
                  <li>You will be notified of the result via email</li>
                  <li>Rejected games can be resubmitted after making requested changes</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Revenue & Payments</h3>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Developers receive 70% of all sales revenue</li>
                  <li>Payments are processed monthly</li>
                  <li>Minimum payout threshold is $100</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardContent className="py-12 text-center">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Analytics Coming Soon</h3>
              <p className="text-muted-foreground">
                Detailed analytics for your games will be available here once you have published games.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
