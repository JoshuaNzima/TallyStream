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
import { Plus, Users, Shield, Edit, Trash2, ToggleLeft, ToggleRight, Eye, Upload, Image } from "lucide-react";
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
  logoUrl: z.string().optional(),
});

export function PoliticalPartiesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingParty, setEditingParty] = useState<PoliticalParty | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      abbreviation: "",
      color: "#3B82F6",
      description: "",
      logoUrl: "",
    },
  });

  const { data: parties, isLoading } = useQuery({
    queryKey: ["/api/political-parties"],
  });

  const { data: candidates } = useQuery({
    queryKey: ["/api/candidates"],
  });

  const getCandidateCount = (partyId: string, partyName: string) => {
    if (!candidates) return 0;
    return (candidates as any[]).filter((candidate: any) => 
      candidate.partyId === partyId || candidate.party === partyName
    ).length;
  };

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

  const updatePartyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: z.infer<typeof formSchema> }) => {
      const response = await fetch(`/api/political-parties/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update political party");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/political-parties"] });
      form.reset();
      setIsDialogOpen(false);
      setEditingParty(null);
      toast({
        title: "Success",
        description: "Political party updated successfully",
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

  const deactivatePartyMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/political-parties/${id}/deactivate`, {
        method: "PUT",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to deactivate political party");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/political-parties"] });
      toast({
        title: "Success",
        description: "Political party deactivated successfully",
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

  const reactivatePartyMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/political-parties/${id}/reactivate`, {
        method: "PUT",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to reactivate political party");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/political-parties"] });
      toast({
        title: "Success",
        description: "Political party reactivated successfully",
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

  const deletePartyMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/political-parties/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete political party");
      }

      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/political-parties"] });
      toast({
        title: "Success",
        description: "Political party deleted successfully",
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
    if (editingParty) {
      updatePartyMutation.mutate({ id: editingParty.id, data: values });
    } else {
      createPartyMutation.mutate(values);
    }
  };

  const handleEdit = (party: PoliticalParty) => {
    setEditingParty(party);
    form.reset({
      name: party.name,
      abbreviation: party.abbreviation || "",
      color: party.color || "#3B82F6",
      description: party.description || "",
      logoUrl: (party as any).logoUrl || "",
    });
    setIsDialogOpen(true);
  };

  const handleDeactivate = (party: PoliticalParty) => {
    if (confirm(`Are you sure you want to deactivate "${party.name}"? This will prevent it from being used in new submissions.`)) {
      deactivatePartyMutation.mutate(party.id);
    }
  };

  const handleReactivate = (party: PoliticalParty) => {
    reactivatePartyMutation.mutate(party.id);
  };

  const handleDelete = (party: PoliticalParty) => {
    if (confirm(`Are you sure you want to permanently delete "${party.name}"? This action cannot be undone and will only work if no candidates are using this party.`)) {
      deletePartyMutation.mutate(party.id);
    }
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
              <DialogTitle>{editingParty ? "Edit Political Party" : "Add Political Party"}</DialogTitle>
              <DialogDescription>
                {editingParty ? "Update the political party information" : "Create a new political party for consistent candidate management"}
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
                          value={field.value || ""}
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
                          value={field.value || ""}
                          data-testid="textarea-party-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="logoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Party Logo (Optional)</FormLabel>
                      <FormControl>
                        <div className="space-y-3">
                          <Input
                            placeholder="https://example.com/logo.png or leave blank"
                            {...field}
                            data-testid="input-party-logo"
                          />
                          {field.value ? (
                            <div className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50">
                              <img 
                                src={field.value} 
                                alt="Party logo preview" 
                                className="w-12 h-12 object-contain rounded"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/api/placeholder/64/64';
                                }}
                              />
                              <div className="text-sm text-gray-600">
                                Logo preview
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 p-3 border-2 border-dashed rounded-lg text-center">
                              <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                                <Image className="h-6 w-6 text-gray-400" />
                              </div>
                              <div className="text-sm text-gray-500">
                                No logo - will use default placeholder
                              </div>
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsDialogOpen(false);
                      setEditingParty(null);
                      form.reset();
                    }}
                    data-testid="button-cancel-party"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createPartyMutation.isPending || updatePartyMutation.isPending}
                    data-testid="button-save-party"
                  >
                    {editingParty 
                      ? (updatePartyMutation.isPending ? "Updating..." : "Update Party")
                      : (createPartyMutation.isPending ? "Creating..." : "Create Party")
                    }
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {((parties as any[]) || []).map((party: PoliticalParty) => (
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
              {/* Party Logo */}
              <div className="flex items-center gap-3 mb-3">
                {(party as any).logoUrl ? (
                  <img 
                    src={(party as any).logoUrl} 
                    alt={`${party.name} logo`}
                    className="w-10 h-10 object-contain rounded border"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/api/placeholder/40/40';
                    }}
                  />
                ) : (
                  <div className="w-10 h-10 bg-gray-100 rounded border flex items-center justify-center">
                    <Image className="h-5 w-5 text-gray-400" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">
                      {getCandidateCount(party.id, party.name)} candidate{getCandidateCount(party.id, party.name) !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: party.color || '#6B7280' }}
                    />
                    <span className={party.isActive ? "text-green-600" : "text-red-600"}>
                      {party.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // View party candidates details - will implement navigation to candidates filtered by party
                    const candidateCount = getCandidateCount(party.id, party.name);
                    toast({
                      title: `${party.name} Details`,
                      description: `This party has ${candidateCount} registered candidate${candidateCount !== 1 ? 's' : ''}.`,
                    });
                  }}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  data-testid={`button-view-details-${party.id}`}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View Details
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(party)}
                  data-testid={`button-edit-${party.id}`}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                
                {party.isActive ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeactivate(party)}
                    disabled={deactivatePartyMutation.isPending}
                    data-testid={`button-deactivate-${party.id}`}
                  >
                    <ToggleLeft className="h-3 w-3 mr-1" />
                    Disable
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReactivate(party)}
                    disabled={reactivatePartyMutation.isPending}
                    data-testid={`button-reactivate-${party.id}`}
                  >
                    <ToggleRight className="h-3 w-3 mr-1" />
                    Enable
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(party)}
                  disabled={deletePartyMutation.isPending}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  data-testid={`button-delete-${party.id}`}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(parties as any[]) && (parties as any[]).length === 0 && (
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