import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import { Check, X, Eye, CheckCircle, Image, FileText, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function VerificationInterface() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const { data: pendingResults, isLoading } = useQuery({
    queryKey: ["/api/results", "pending"],
    queryFn: () => fetch("/api/results?status=pending", { credentials: "include" }).then(res => res.json()),
  });

  const { data: candidates } = useQuery({
    queryKey: ["/api/candidates"],
  });

  const { data: politicalParties } = useQuery({
    queryKey: ["/api/political-parties"],
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

  const getSelectedResult = () => {
    return pendingResults?.find((r: any) => r.id === selectedResultId);
  };

  const getCandidateDetails = (candidateId: string) => {
    const candidate = (candidates as any[])?.find((c: any) => c.id === candidateId);
    if (!candidate) return { name: candidateId, party: 'Unknown', constituency: null };
    
    const party = (politicalParties as any[])?.find((p: any) => p.id === candidate.partyId || p.name === candidate.party);
    return {
      name: candidate.name,
      party: party?.name || candidate.party,
      partyColor: party?.color || '#6B7280',
      partyAbbreviation: party?.abbreviation,
      constituency: candidate.constituency
    };
  };

  const getDetailedVoteBreakdown = (result: any) => {
    const breakdown: Array<{candidateId: string, name: string, party: string, partyColor: string, votes: number, constituency?: string}> = [];
    
    const voteData = result.category === 'president' ? result.presidentialVotes :
                     result.category === 'mp' ? result.mpVotes : result.councilorVotes;
    
    if (voteData) {
      Object.entries(voteData).forEach(([candidateId, votes]: [string, any]) => {
        const candidateDetails = getCandidateDetails(candidateId);
        breakdown.push({
          candidateId,
          name: candidateDetails.name,
          party: candidateDetails.party,
          partyColor: candidateDetails.partyColor,
          votes: Number(votes) || 0,
          constituency: candidateDetails.constituency
        });
      });
    }
    
    return breakdown.sort((a, b) => b.votes - a.votes);
  };

  return (
    <>
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
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-3">
                        <div className="md:col-span-2">
                          <p className="text-gray-600 mb-1">Submission Summary:</p>
                          <div className="bg-gray-100 p-3 rounded">
                            <div data-testid={`verification-votes-${result.id}`}>
                              <div className="flex items-center gap-2 mb-2">
                                <Users className="h-4 w-4 text-blue-600" />
                                <span className="font-medium capitalize">
                                  {result.category === 'president' ? 'Presidential' : 
                                   result.category === 'mp' ? 'Members of Parliament' : 'Councilor'} Race
                                </span>
                              </div>
                              
                              <div className="space-y-1">
                                {(() => {
                                  const breakdown = getDetailedVoteBreakdown(result);
                                  const topCandidates = breakdown.slice(0, 3);
                                  const remainingCount = breakdown.length - 3;
                                  
                                  return (
                                    <div>
                                      {topCandidates.map((candidate) => (
                                        <div key={candidate.candidateId} className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <div 
                                              className="w-3 h-3 rounded-full" 
                                              style={{ backgroundColor: candidate.partyColor }}
                                            />
                                            <span className="text-sm font-medium">{candidate.name}</span>
                                            <span className="text-xs text-gray-500">({candidate.party})</span>
                                          </div>
                                          <span className="font-medium">{candidate.votes.toLocaleString()}</span>
                                        </div>
                                      ))}
                                      {remainingCount > 0 && (
                                        <div className="text-xs text-gray-500 mt-1">
                                          +{remainingCount} more candidate{remainingCount !== 1 ? 's' : ''}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                            <div className="border-t pt-2 mt-2">
                              <p className="text-xs text-gray-500" data-testid={`verification-submitter-${result.id}`}>
                                Submitted by {result.submitter?.firstName} {result.submitter?.lastName} • {formatDistanceToNow(new Date(result.createdAt), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-gray-600 mb-1">Vote Summary:</p>
                          <div className="bg-blue-50 p-3 rounded border border-blue-200">
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Valid Votes:</span>
                                <span className="font-medium" data-testid={`verification-total-${result.id}`}>
                                  {result.totalVotes - (result.invalidVotes || 0)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Invalid Votes:</span>
                                <span className="font-medium" data-testid={`verification-invalid-${result.id}`}>
                                  {result.invalidVotes || 0}
                                </span>
                              </div>
                              <div className="border-t pt-2">
                                <div className="flex justify-between">
                                  <span className="font-medium text-gray-800">Total Votes:</span>
                                  <span className="font-bold text-lg text-blue-600">
                                    {result.totalVotes || 0}
                                  </span>
                                </div>
                              </div>
                            </div>
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
                          onClick={() => {
                            setSelectedResultId(result.id);
                            setShowDetailModal(true);
                          }}
                          variant="outline"
                          className="text-blue-600 border-blue-200 hover:bg-blue-50 text-sm"
                          data-testid={`button-view-details-${result.id}`}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
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
                          <FileText className="h-4 w-4 mr-1" />
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
      
      {/* Detailed Result Review Modal */}
      <AlertDialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <AlertDialogContent className="max-w-4xl max-h-[90vh]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Detailed Result Review
            </AlertDialogTitle>
            <AlertDialogDescription>
              Review all submission details before making a decision on verification.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-6 py-4">
              {(() => {
                const selectedResult = getSelectedResult();
                if (!selectedResult) return null;
                
                const breakdown = getDetailedVoteBreakdown(selectedResult);
                const categoryLabel = selectedResult.category === 'president' ? 'Presidential' :
                                    selectedResult.category === 'mp' ? 'Members of Parliament' : 'Councilor';
                
                return (
                  <div className="space-y-6">
                    {/* Polling Center & Basic Info */}
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2">Polling Center</h4>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="font-medium">{selectedResult.pollingCenter?.code} - {selectedResult.pollingCenter?.name}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            {selectedResult.pollingCenter?.constituency}, {selectedResult.pollingCenter?.district}
                          </p>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2">Election Details</h4>
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                          <p className="font-medium text-blue-800">{categoryLabel}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            Submitted via {selectedResult.submissionChannel}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Detailed Vote Breakdown */}
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-3">Complete Vote Breakdown</h4>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[40%]">Candidate</TableHead>
                              <TableHead className="w-[25%]">Party</TableHead>
                              {selectedResult.category !== 'president' && (
                                <TableHead className="w-[20%]">Constituency</TableHead>
                              )}
                              <TableHead className="w-[15%] text-right">Votes</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {breakdown.map((candidate, index) => (
                              <TableRow key={candidate.candidateId} className={index < 3 ? 'bg-blue-50' : ''}>
                                <TableCell className="font-medium">{candidate.name}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div 
                                      className="w-3 h-3 rounded-full" 
                                      style={{ backgroundColor: candidate.partyColor }}
                                    />
                                    <span className="text-sm">{candidate.party}</span>
                                  </div>
                                </TableCell>
                                {selectedResult.category !== 'president' && (
                                  <TableCell className="text-sm text-gray-600">
                                    {candidate.constituency || 'N/A'}
                                  </TableCell>
                                )}
                                <TableCell className="text-right font-medium">
                                  {candidate.votes.toLocaleString()}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                    
                    {/* Vote Summary */}
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-3">Vote Summary</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <p className="text-sm text-green-700">Valid Votes</p>
                          <p className="text-2xl font-bold text-green-800">
                            {(selectedResult.totalVotes - (selectedResult.invalidVotes || 0)).toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                          <p className="text-sm text-red-700">Invalid Votes</p>
                          <p className="text-2xl font-bold text-red-800">
                            {(selectedResult.invalidVotes || 0).toLocaleString()}
                          </p>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <p className="text-sm text-blue-700">Total Votes</p>
                          <p className="text-2xl font-bold text-blue-800">
                            {selectedResult.totalVotes.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Submission Details */}
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-3">Submission Information</h4>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Submitted by:</span>
                            <p className="font-medium">{selectedResult.submitter?.firstName} {selectedResult.submitter?.lastName}</p>
                            <p className="text-gray-500">{selectedResult.submitter?.email}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Submission time:</span>
                            <p className="font-medium">
                              {new Date(selectedResult.createdAt).toLocaleDateString()} at {new Date(selectedResult.createdAt).toLocaleTimeString()}
                            </p>
                            <p className="text-gray-500">{formatDistanceToNow(new Date(selectedResult.createdAt), { addSuffix: true })}</p>
                          </div>
                        </div>
                        
                        {selectedResult.comments && (
                          <div className="mt-4 pt-3 border-t">
                            <span className="text-gray-600 text-sm">Comments:</span>
                            <p className="mt-1 text-sm bg-white p-2 rounded border">{selectedResult.comments}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Attached Files */}
                    {selectedResult.files && selectedResult.files.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-3">Verification Documents</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {selectedResult.files.map((file: string, index: number) => (
                            <div key={index} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                              <Image className="h-4 w-4 text-gray-500" />
                              <span className="text-sm text-gray-700">Document {index + 1}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </ScrollArea>
          
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel>Close</AlertDialogCancel>
            {selectedResultId && (
              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    handleApprove(selectedResultId);
                    setShowDetailModal(false);
                  }}
                  disabled={updateStatusMutation.isPending}
                  className="bg-green-500 hover:bg-green-600"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button 
                  onClick={() => {
                    handleReject(selectedResultId);
                    setShowDetailModal(false);
                  }}
                  disabled={updateStatusMutation.isPending}
                  className="bg-red-500 hover:bg-red-600"
                >
                  <X className="h-4 w-4 mr-1" />
                  Reject
                </Button>
                <Button 
                  onClick={() => {
                    handleFlag(selectedResultId);
                    setShowDetailModal(false);
                  }}
                  disabled={updateStatusMutation.isPending}
                  className="bg-yellow-500 hover:bg-yellow-600"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  Flag
                </Button>
              </div>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}