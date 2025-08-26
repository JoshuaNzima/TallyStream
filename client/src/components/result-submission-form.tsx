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
  candidateAVotes: z.coerce.number().min(0, "Votes must be non-negative"),
  candidateBVotes: z.coerce.number().min(0, "Votes must be non-negative"),
  candidateCVotes: z.coerce.number().min(0, "Votes must be non-negative"),
  invalidVotes: z.coerce.number().min(0, "Invalid votes must be non-negative"),
  submissionChannel: z.enum(["whatsapp", "portal", "both"]),
  comments: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function ResultSubmissionForm() {
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);

  const { data: pollingCenters } = useQuery({
    queryKey: ["/api/polling-centers"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pollingCenterId: "",
      candidateAVotes: 0,
      candidateBVotes: 0,
      candidateCVotes: 0,
      invalidVotes: 0,
      submissionChannel: "portal",
      comments: "",
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const formData = new FormData();
      
      // Append form data
      Object.entries(data).forEach(([key, value]) => {
        formData.append(key, value.toString());
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="pollingCenterId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Polling Center</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-polling-center">
                          <SelectValue placeholder="Select polling center" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {pollingCenters?.map((center: any) => (
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
              
              <FormField
                control={form.control}
                name="submissionChannel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Submission Channel</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-submission-channel">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="portal">Portal Only</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp Only</SelectItem>
                        <SelectItem value="both">Both Channels</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="border rounded-lg p-4">
              <h4 className="text-md font-medium text-gray-900 mb-4">Candidate Results</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="candidateAVotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Candidate A Votes</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} data-testid="input-candidate-a-votes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="candidateBVotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Candidate B Votes</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} data-testid="input-candidate-b-votes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="candidateCVotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Candidate C Votes</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} data-testid="input-candidate-c-votes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="mt-4">
                <FormField
                  control={form.control}
                  name="invalidVotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invalid Votes</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" className="w-full md:w-1/3" {...field} data-testid="input-invalid-votes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FileUpload files={files} onFilesChange={setFiles} />

            <FormField
              control={form.control}
              name="comments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Comments</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any observations or issues during the voting process..."
                      {...field}
                      data-testid="textarea-comments"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
