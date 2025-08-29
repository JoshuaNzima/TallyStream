import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Users, Shield } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPoliticalPartySchema } from "@shared/schema";
import type { PoliticalParty } from "@shared/schema";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

const formSchema = insertPoliticalPartySchema.extend({
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: "Please enter a valid hex color code",
  }).optional(),
});

export function PoliticalPartiesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      abbreviation: "",
      color: "#3B82F6",
      description: "",
    },
  });

  const { data: parties, isLoading } = useQuery({
    queryKey: ["/api/political-parties"],
  });

  const createPartyMutation = useMutation({
    mutationFn: async (partyData: z.infer<typeof formSchema>) => {
      const response = await fetch("/api/political-parties", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(partyData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create political party");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/political-parties"] });
      form.reset();
      setIsDialogOpen(false);
      toast({
        title: "Success",
        description: "Political party created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createPartyMutation.mutate(values);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Political Parties</h1>
            <p className="text-muted-foreground">
              Manage political parties for election consistency
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} data-testid={`party-skeleton-${i}`}>
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-muted animate-pulse rounded mb-2" />
                <div className="h-3 bg-muted animate-pulse rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Political Parties</h1>
          <p className="text-muted-foreground">
            Manage political parties for election consistency
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-party">
              <Plus className="h-4 w-4 mr-2" />
              Add Party
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-add-party">
            <DialogHeader>
              <DialogTitle>Add Political Party</DialogTitle>
              <DialogDescription>
                Create a new political party for consistent candidate management
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Party Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Democratic Progressive Party"
                          {...field}
                          data-testid="input-party-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="abbreviation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Abbreviation</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., DPP"
                          {...field}
                          data-testid="input-party-abbreviation"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand Color</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Input
                            type="color"
                            className="w-16 h-10 p-1 border rounded"
                            {...field}
                            data-testid="input-party-color"
                          />
                          <Input
                            placeholder="#3B82F6"
                            value={field.value}
                            onChange={field.onChange}
                            className="flex-1"
                            data-testid="input-party-color-text"
                          />
                        </div>
                      </FormControl>
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
                          placeholder="Brief description of the political party..."
                          {...field}
                          data-testid="textarea-party-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    data-testid="button-cancel-party"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createPartyMutation.isPending}
                    data-testid="button-save-party"
                  >
                    {createPartyMutation.isPending ? "Creating..." : "Create Party"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(parties || []).map((party: PoliticalParty) => (
          <Card key={party.id} data-testid={`card-party-${party.id}`}>
            <CardHeader className="space-y-0 pb-2">
              <CardTitle className="flex items-center justify-between">
                <span className="truncate">{party.name}</span>
                {party.abbreviation && (
                  <Badge
                    style={{ backgroundColor: party.color || "#6B7280" }}
                    className="text-white"
                    data-testid={`badge-abbreviation-${party.id}`}
                  >
                    {party.abbreviation}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {party.description && (
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {party.description}
                </p>
              )}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>Active</span>
                </div>
                {party.color && (
                  <div className="flex items-center gap-1">
                    <div
                      className="w-4 h-4 rounded-full border"
                      style={{ backgroundColor: party.color }}
                    />
                    <span>{party.color}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {parties && parties.length === 0 && (
        <Card data-testid="empty-parties">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              No Political Parties
            </CardTitle>
            <CardDescription>
              Get started by creating your first political party. This will help maintain
              consistency when adding candidates and submitting results.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-first-party">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Party
                </Button>
              </DialogTrigger>
            </Dialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
}