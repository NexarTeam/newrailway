import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, Save, Loader2, Gamepad2, DollarSign, Tag, Image
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

const gameFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100),
  description: z.string().min(100, "Description must be at least 100 characters").max(5000),
  price: z.coerce.number().min(0, "Price cannot be negative").max(999.99, "Price cannot exceed $999.99"),
  genre: z.string().min(1, "Please select a genre"),
  tags: z.string().optional(),
  coverImage: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
});

type GameFormValues = z.infer<typeof gameFormSchema>;

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

const GENRES = [
  "Action",
  "Adventure",
  "RPG",
  "Strategy",
  "Simulation",
  "Sports",
  "Racing",
  "Puzzle",
  "Horror",
  "FPS",
  "Platformer",
  "Fighting",
  "Casual",
  "Indie",
];

export default function GameEditorPage({ 
  gameId, 
  onBack 
}: { 
  gameId?: string; 
  onBack: () => void;
}) {
  const { toast } = useToast();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!gameId;

  const { data: existingGame, isLoading: gameLoading } = useQuery<DeveloperGame>({
    queryKey: ["/api/developer/game", gameId],
    enabled: !!token && !!gameId,
  });

  const form = useForm<GameFormValues>({
    resolver: zodResolver(gameFormSchema),
    defaultValues: {
      title: "",
      description: "",
      price: 0,
      genre: "",
      tags: "",
      coverImage: "",
    },
  });

  useEffect(() => {
    if (existingGame) {
      form.reset({
        title: existingGame.title,
        description: existingGame.description,
        price: existingGame.price,
        genre: existingGame.genre,
        tags: existingGame.tags.join(", "),
        coverImage: existingGame.coverImage || "",
      });
    }
  }, [existingGame, form]);

  const createMutation = useMutation({
    mutationFn: async (data: GameFormValues) => {
      return apiRequest("POST", "/api/developer/game/create", {
        ...data,
        tags: data.tags ? data.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
      });
    },
    onSuccess: () => {
      toast({
        title: "Game Created",
        description: "Your game has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/developer/games"] });
      onBack();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Create Game",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: GameFormValues) => {
      return apiRequest("POST", "/api/developer/game/update", {
        gameId,
        ...data,
        tags: data.tags ? data.tags.split(",").map(t => t.trim()).filter(Boolean) : [],
      });
    },
    onSuccess: () => {
      toast({
        title: "Game Updated",
        description: "Your game has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/developer/games"] });
      queryClient.invalidateQueries({ queryKey: ["/api/developer/game", gameId] });
      onBack();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Update Game",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: GameFormValues) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (gameLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 max-w-4xl mx-auto"
      data-testid="page-game-editor"
    >
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-4"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Portal
        </Button>
        <h1 className="text-3xl font-bold mb-1 flex items-center gap-3">
          <Gamepad2 className="w-8 h-8 text-primary" />
          {isEditing ? "Edit Game" : "Create New Game"}
        </h1>
        <p className="text-muted-foreground">
          {isEditing 
            ? "Update your game's information and metadata."
            : "Fill in the details below to create a new game."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Game Details</CardTitle>
          <CardDescription>
            Provide information about your game for the Nexar Store listing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Game Title</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter your game's title" 
                        {...field}
                        data-testid="input-game-title"
                      />
                    </FormControl>
                    <FormDescription>
                      Choose a unique, memorable title for your game.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe your game, its features, and what makes it special..."
                        className="min-h-[150px]"
                        {...field}
                        data-testid="input-game-description"
                      />
                    </FormControl>
                    <FormDescription>
                      Minimum 100 characters. This will be shown on your store page.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4" />
                        Price (USD)
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          step="0.01"
                          min="0"
                          max="999.99"
                          placeholder="0.00"
                          {...field}
                          data-testid="input-game-price"
                        />
                      </FormControl>
                      <FormDescription>
                        Set to 0 for a free game.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="genre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Genre</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-genre">
                            <SelectValue placeholder="Select a genre" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {GENRES.map((genre) => (
                            <SelectItem key={genre} value={genre}>
                              {genre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Tag className="w-4 h-4" />
                      Tags
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="action, multiplayer, open-world"
                        {...field}
                        data-testid="input-game-tags"
                      />
                    </FormControl>
                    <FormDescription>
                      Comma-separated tags to help players find your game.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="coverImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Image className="w-4 h-4" />
                      Cover Image URL
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://example.com/cover.jpg"
                        {...field}
                        data-testid="input-game-cover"
                      />
                    </FormControl>
                    <FormDescription>
                      Link to your game's cover art (16:9 aspect ratio recommended).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.watch("coverImage") && (
                <div className="rounded-lg overflow-hidden border border-border">
                  <img 
                    src={form.watch("coverImage")} 
                    alt="Cover preview"
                    className="w-full h-48 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onBack}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-primary"
                  disabled={isPending}
                  data-testid="button-save-game"
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {isEditing ? "Save Changes" : "Create Game"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
