import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { Check, X, Eye, CheckCircle, Image } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function VerificationInterface() {
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: pendingResults, isLoading } = useQuery({
    queryKey: ["/api/results", "pending"],
    queryFn: () => fetch("/api/results?status=pending", { credentials: "include" }).then(res => res.json()),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ resultId, status, flaggedReason }: { 
      resultId: string; 
      status: string; 
      flaggedReason?: string; 
    }) => {
      await apiRequest("PATCH", `/api/results/${resultId}/status`, { status, flaggedReason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/results"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: "Result status updated successfully",
      });
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
        description: "Failed to update result status",
        variant: "destructive",
      });
    },
  });

  // Only supervisors and admins can verify results
  if (user?.role !== 'supervisor' && user?.role !== 'admin') {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">You need supervisor or administrator privileges to verify results.</p>
      </div>
    );
  }

  const handleApprove = (resultId: string) => {
    updateStatusMutation.mutate({ resultId, status: "verified" });
  };

  const handleReject = (resultId: string) => {
    const reason = prompt("Please provide a reason for rejection:");
    if (reason) {
      updateStatusMutation.mutate({ resultId, status: "rejected", flaggedReason: reason });
    }
  };

  const handleFlag = (resultId: string) => {
    const reason = prompt("Please provide a reason for flagging:");
    if (reason) {
      updateStatusMutation.mutate({ resultId, status: "flagged", flaggedReason: reason });
    }
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="border-b">
        <CardTitle data-testid="text-verification-queue-title">Verification Queue</CardTitle>
        <p className="text-sm text-gray-600">Review and verify submitted results</p>
      </CardHeader>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="text-center py-8">Loading verification queue...</div>
        ) : pendingResults && pendingResults.length > 0 ? (
          <div className="space-y-4">
            {pendingResults.map((result: any) => (
              <div key={result.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-medium text-gray-900" data-testid={`verification-center-${result.id}`}>
                        {result.pollingCenter?.code || 'Unknown Center'}
                      </h4>
                      <Badge className="status-pending" data-testid={`verification-status-${result.id}`}>
                        Pending Review
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <p className="text-gray-600 mb-1">Submission Details:</p>
                        <div className="bg-gray-100 p-2 rounded">
                          <div data-testid={`verification-votes-${result.id}`}>
                            <p className="font-medium text-sm">Category: {result.category}</p>
                            {result.category === 'president' && result.presidentialVotes && (
                              <div className="mt-1">
                                {Object.entries(result.presidentialVotes).map(([candidateId, votes]: [string, any]) => (
                                  <span key={candidateId} className="text-xs mr-2">
                                    {candidateId}: {votes || 0}
                                  </span>
                                ))}
                              </div>
                            )}
                            {result.category === 'mp' && result.mpVotes && (
                              <div className="mt-1">
                                {Object.entries(result.mpVotes).map(([candidateId, votes]: [string, any]) => (
                                  <span key={candidateId} className="text-xs mr-2">
                                    {candidateId}: {votes || 0}
                                  </span>
                                ))}
                              </div>
                            )}
                            {result.category === 'councilor' && result.councilorVotes && (
                              <div className="mt-1">
                                {Object.entries(result.councilorVotes).map(([candidateId, votes]: [string, any]) => (
                                  <span key={candidateId} className="text-xs mr-2">
                                    {candidateId}: {votes || 0}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1" data-testid={`verification-submitter-${result.id}`}>
                            Submitted by {result.submitter?.firstName} {result.submitter?.lastName} - {formatDistanceToNow(new Date(result.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-600 mb-1">Total Votes:</p>
                        <div className="bg-gray-100 p-2 rounded">
                          <p data-testid={`verification-total-${result.id}`}>
                            Valid: {result.totalVotes - (result.invalidVotes || 0)}
                          </p>
                          <p data-testid={`verification-invalid-${result.id}`}>
                            Invalid: {result.invalidVotes || 0}
                          </p>
                          <p className="font-medium">
                            Total: {result.totalVotes || 0}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-green-700">Data Complete</span>
                      </div>
                      {result.files && result.files.length > 0 && (
                        <div className="flex items-center space-x-1">
                          <Image className="h-4 w-4 text-blue-500" />
                          <span className="text-sm text-blue-700">
                            {result.files.length} Photo{result.files.length !== 1 ? 's' : ''} Attached
                          </span>
                        </div>
                      )}
                      <Badge variant="outline" data-testid={`verification-channel-${result.id}`}>
                        {result.submissionChannel}
                      </Badge>
                    </div>

                    {result.comments && (
                      <div className="mt-2 text-sm text-gray-600" data-testid={`verification-comments-${result.id}`}>
                        <strong>Comments:</strong> {result.comments}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-shrink-0 ml-4">
                    <div className="flex flex-col space-y-2">
                      <Button 
                        onClick={() => handleApprove(result.id)}
                        disabled={updateStatusMutation.isPending}
                        className="bg-green-500 hover:bg-green-600 text-white text-sm"
                        data-testid={`button-approve-${result.id}`}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button 
                        onClick={() => handleReject(result.id)}
                        disabled={updateStatusMutation.isPending}
                        className="bg-red-500 hover:bg-red-600 text-white text-sm"
                        data-testid={`button-reject-${result.id}`}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                      <Button 
                        onClick={() => handleFlag(result.id)}
                        disabled={updateStatusMutation.isPending}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm"
                        data-testid={`button-flag-${result.id}`}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Flag
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No results pending verification
          </div>
        )}
      </CardContent>
    </Card>
  );
}
