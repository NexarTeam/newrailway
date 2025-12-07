import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Code, Globe, Mail, Building2, FileText, Loader2, CheckCircle, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

const applyFormSchema = z.object({
  studioName: z.string().min(2, "Studio name must be at least 2 characters").max(100),
  contactEmail: z.string().email("Please enter a valid email"),
  website: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  description: z.string().min(50, "Please provide at least 50 characters describing your studio").max(1000),
});

type ApplyFormValues = z.infer<typeof applyFormSchema>;

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

export default function DeveloperApplyPage() {
  const { toast } = useToast();
  const { token, user } = useAuth();
  const queryClient = useQueryClient();

  const { data: status, isLoading: statusLoading } = useQuery<DeveloperStatus>({
    queryKey: ["/api/developer/status"],
    enabled: !!token,
  });

  const form = useForm<ApplyFormValues>({
    resolver: zodResolver(applyFormSchema),
    defaultValues: {
      studioName: "",
      contactEmail: user?.email || "",
      website: "",
      description: "",
    },
  });

  const applyMutation = useMutation({
    mutationFn: async (data: ApplyFormValues) => {
      return apiRequest("POST", "/api/developer/apply", data);
    },
    onSuccess: () => {
      toast({
        title: "Application Submitted",
        description: "Your developer application has been submitted for review.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/developer/status"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Application Failed",
        description: error.message || "Failed to submit application",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ApplyFormValues) => {
    applyMutation.mutate(data);
  };

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status?.status === "pending") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 max-w-2xl mx-auto"
        data-testid="page-developer-apply"
      >
        <Card className="border-yellow-500/50">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
            <CardTitle className="text-2xl">Application Pending</CardTitle>
            <CardDescription>
              Your developer application is being reviewed by our team.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              We typically review applications within 2-3 business days.
              You will receive a notification once your application has been processed.
            </p>
            <div className="bg-card rounded-lg p-4 text-left">
              <h4 className="font-medium mb-2">Application Details</h4>
              <p className="text-sm text-muted-foreground">
                Studio: {status.developerProfile?.studioName}
              </p>
              <p className="text-sm text-muted-foreground">
                Email: {status.developerProfile?.contactEmail}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (status?.status === "approved") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 max-w-2xl mx-auto"
        data-testid="page-developer-apply"
      >
        <Card className="border-green-500/50">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <CardTitle className="text-2xl">You're a Developer!</CardTitle>
            <CardDescription>
              Your developer application has been approved.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-6">
              You now have access to the Developer Portal where you can create and manage your games.
            </p>
            <Button className="bg-primary" data-testid="button-go-to-portal">
              Go to Developer Portal
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (status?.status === "rejected") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 max-w-2xl mx-auto"
        data-testid="page-developer-apply"
      >
        <Card className="border-destructive/50">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mb-4">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Application Not Approved</CardTitle>
            <CardDescription>
              Unfortunately, your developer application was not approved at this time.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-6">
              You may reapply after addressing any concerns. Contact support for more information.
            </p>
            <Button 
              variant="outline" 
              onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/developer/status"] })}
              data-testid="button-reapply"
            >
              Apply Again
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 max-w-4xl mx-auto"
      data-testid="page-developer-apply"
    >
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Code className="w-8 h-8 text-primary" />
          Nexar Developer Programme
        </h1>
        <p className="text-muted-foreground text-lg">
          Join our developer community and publish your games on the Nexar Store.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <Building2 className="w-10 h-10 text-primary mb-2" />
            <CardTitle className="text-lg">Register Your Studio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Create your developer profile and showcase your studio to millions of players.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <FileText className="w-10 h-10 text-primary mb-2" />
            <CardTitle className="text-lg">Publish Games</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Upload your games with full control over pricing, updates, and metadata.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <Globe className="w-10 h-10 text-primary mb-2" />
            <CardTitle className="text-lg">Reach Players</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Get discovered by our growing community of gamers worldwide.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Developer Application</CardTitle>
          <CardDescription>
            Fill out the form below to apply for the Nexar Developer Programme.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="studioName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Studio Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter your studio or company name" 
                        {...field} 
                        data-testid="input-studio-name"
                      />
                    </FormControl>
                    <FormDescription>
                      This will be displayed on your games in the store.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="developer@example.com" 
                        {...field} 
                        data-testid="input-contact-email"
                      />
                    </FormControl>
                    <FormDescription>
                      We'll use this email for developer communications.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://yourstudio.com" 
                        {...field} 
                        data-testid="input-website"
                      />
                    </FormControl>
                    <FormDescription>
                      Your studio's website or portfolio.
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
                    <FormLabel>About Your Studio</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Tell us about your studio, your experience, and what kind of games you plan to publish..."
                        className="min-h-[120px]"
                        {...field} 
                        data-testid="input-description"
                      />
                    </FormControl>
                    <FormDescription>
                      Minimum 50 characters. Tell us about your experience and plans.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full bg-primary"
                disabled={applyMutation.isPending}
                data-testid="button-submit-application"
              >
                {applyMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                Submit Application
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
