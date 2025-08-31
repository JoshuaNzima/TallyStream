import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import FileUpload from "./file-upload";
import { NotebookPen, Save } from "lucide-react";

const formSchema = z.object({
  pollingCenterId: z.string().min(1, "Polling center is required"),
  category: z.enum(["president", "mp", "councilor"]),
  presidentialVotes: z.record(z.coerce.number().min(0)).optional(),
  mpVotes: z.record(z.coerce.number().min(0)).optional(),
  councilorVotes: z.record(z.coerce.number().min(0)).optional(),
  invalidVotes: z.coerce.number().min(0, "Invalid votes must be non-negative"),
  comments: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function ResultSubmissionForm() {
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);

  const { data: pollingCenters } = useQuery({
    queryKey: ["/api/polling-centers"],
  });

  const { data: candidates } = useQuery({
    queryKey: ["/api/candidates"],
  });

  const { data: politicalParties } = useQuery({
    queryKey: ["/api/political-parties"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pollingCenterId: "",
      category: "president",
      presidentialVotes: {},
      mpVotes: {},
      councilorVotes: {},
      invalidVotes: 0,
      comments: "",
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const formData = new FormData();
      
      // Append form data
      Object.entries(data).forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, value.toString());
        }
      });
      
      // Append files
      files.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch('/api/results', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`${response.status}: ${text}`);
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Results submitted successfully",
      });
      form.reset();
      setFiles([]);
      queryClient.invalidateQueries({ queryKey: ["/api/results"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to submit results",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    submitMutation.mutate(data);
  };

  const handleSaveDraft = () => {
    // TODO: Implement save draft functionality
    toast({
      title: "Draft Saved",
      description: "Your progress has been saved as a draft",
    });
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="border-b">
        <CardTitle data-testid="text-submission-form-title">Submit New Results</CardTitle>
        <p className="text-sm text-gray-600">Enter polling center results and upload verification documents</p>
      </CardHeader>
      <CardContent className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="border rounded-lg p-6 bg-gradient-to-r from-green-50 to-emerald-50 mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="bg-green-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
                Polling Center Selection
              </h4>
              <FormField
                control={form.control}
                name="pollingCenterId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Polling Center</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12" data-testid="select-polling-center">
                          <SelectValue placeholder="Select polling center" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {pollingCenters && Array.isArray(pollingCenters) && pollingCenters.map((center: any) => (
                          <SelectItem key={center.id} value={center.id}>
                            {center.code} - {center.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="border rounded-lg p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
              <h4 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
                Election Results Entry
              </h4>
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem className="mb-6">
                    <FormLabel className="text-base font-medium">Election Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} data-testid="select-category">
                      <FormControl>
                        <SelectTrigger className="h-12">
                          <SelectValue placeholder="Select election category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="president">Presidential</SelectItem>
                        <SelectItem value="mp">Members of Parliament (MP)</SelectItem>
                        <SelectItem value="councilor">Councilors</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Candidate Votes Section */}
              <div className="space-y-6">
                <h5 className="text-base font-medium text-gray-800">Candidate Votes</h5>
                
                {/* Presidential Candidates */}
                {form.watch("category") === "president" && (
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-gray-700">Presidential Candidates</h5>
                    {candidates && Array.isArray(candidates) && candidates.filter((c: any) => c.category === "president").map((candidate: any) => (
                      <FormField
                        key={candidate.id}
                        control={form.control}
                        name={`presidentialVotes.${candidate.id}`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm flex items-center gap-2">
                              <span>{candidate.name}</span>
                              {(() => {
                                const party = politicalParties?.find((p: any) => p.id === candidate.partyId || p.name === candidate.party);
                                return party ? (
                                  <span className="flex items-center gap-1">
                                    <div 
                                      className="w-3 h-3 rounded-full" 
                                      style={{ backgroundColor: party.color || "#6B7280" }}
                                    />
                                    <span className="text-xs font-medium">
                                      {party.abbreviation || party.name}
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-500">({candidate.party})</span>
                                );
                              })()}
                            </FormLabel>
                            <FormControl>
                              <Input type="number" min="0" {...field} data-testid={`input-votes-${candidate.id}`} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                )}

                {/* MP Candidates */}
                {form.watch("category") === "mp" && (
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-gray-700">MP Candidates</h5>
                    {candidates && Array.isArray(candidates) && candidates.filter((c: any) => c.category === "mp").map((candidate: any) => (
                      <FormField
                        key={candidate.id}
                        control={form.control}
                        name={`mpVotes.${candidate.id}`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm flex items-center gap-2">
                              <span>{candidate.name}</span>
                              {(() => {
                                const party = politicalParties?.find((p: any) => p.id === candidate.partyId || p.name === candidate.party);
                                return party ? (
                                  <span className="flex items-center gap-1">
                                    <div 
                                      className="w-3 h-3 rounded-full" 
                                      style={{ backgroundColor: party.color || "#6B7280" }}
                                    />
                                    <span className="text-xs font-medium">
                                      {party.abbreviation || party.name}
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-500">({candidate.party})</span>
                                );
                              })()}
                              <span className="text-xs text-gray-500">- {candidate.constituency}</span>
                            </FormLabel>
                            <FormControl>
                              <Input type="number" min="0" {...field} data-testid={`input-votes-${candidate.id}`} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                )}

                {/* Councilor Candidates */}
                {form.watch("category") === "councilor" && (
                  <div className="space-y-3">
                    <h5 className="text-sm font-medium text-gray-700">Councilor Candidates</h5>
                    {candidates && Array.isArray(candidates) && candidates.filter((c: any) => c.category === "councilor").map((candidate: any) => (
                      <FormField
                        key={candidate.id}
                        control={form.control}
                        name={`councilorVotes.${candidate.id}`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm flex items-center gap-2">
                              <span>{candidate.name}</span>
                              {(() => {
                                const party = politicalParties?.find((p: any) => p.id === candidate.partyId || p.name === candidate.party);
                                return party ? (
                                  <span className="flex items-center gap-1">
                                    <div 
                                      className="w-3 h-3 rounded-full" 
                                      style={{ backgroundColor: party.color || "#6B7280" }}
                                    />
                                    <span className="text-xs font-medium">
                                      {party.abbreviation || party.name}
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-500">({candidate.party})</span>
                                );
                              })()}
                              <span className="text-xs text-gray-500">- {candidate.constituency}</span>
                            </FormLabel>
                            <FormControl>
                              <Input type="number" min="0" {...field} data-testid={`input-votes-${candidate.id}`} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                )}
              </div>
              
              <div className="mt-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
                <FormField
                  control={form.control}
                  name="invalidVotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-medium text-orange-800">Invalid Votes</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" className="w-full md:w-1/3 h-12 border-orange-300 focus:border-orange-500" {...field} data-testid="input-invalid-votes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="border rounded-lg p-6 bg-gradient-to-r from-purple-50 to-pink-50">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">3</span>
                Documentation & Verification
              </h4>
              <FileUpload files={files} onFilesChange={setFiles} />
            </div>

            <div className="border rounded-lg p-6 bg-gradient-to-r from-gray-50 to-slate-50">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="bg-gray-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">4</span>
                Additional Information
              </h4>
              <FormField
                control={form.control}
                name="comments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-medium">Additional Comments</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any observations or issues during the voting process..."
                        className="min-h-[100px]"
                        {...field}
                        data-testid="textarea-comments"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex items-center space-x-4">
              <Button 
                type="submit" 
                disabled={submitMutation.isPending}
                className="bg-primary-500 hover:bg-primary-600"
                data-testid="button-submit-results"
              >
                <NotebookPen className="h-4 w-4 mr-2" />
                {submitMutation.isPending ? "Submitting..." : "Submit Results"}
              </Button>
              <Button 
                type="button" 
                variant="outline"
                onClick={handleSaveDraft}
                data-testid="button-save-draft"
              >
                <Save className="h-4 w-4 mr-2" />
                Save as Draft
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
