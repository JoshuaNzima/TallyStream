import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { AlertTriangle, CheckCircle, XCircle, Eye, FileText, Calendar, User, Building } from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { formatDistanceToNow } from "date-fns";

export default function ReviewFlagged() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState<string>("flagged");
  const [reviewComment, setReviewComment] = useState<string>("");
  const [selectedResult, setSelectedResult] = useState<any>(null);

  const { data: flaggedResults, isLoading } = useQuery({
    queryKey: ["/api/results", selectedStatus],
    queryFn: () => fetch(`/api/results?status=${selectedStatus}`, { credentials: "include" }).then(res => res.json()),
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ resultId, action, comments }: { 
      resultId: string; 
      action: string; 
      comments?: string; 
    }) => {
      await apiRequest("PATCH", `/api/results/${resultId}/review`, { action, comments });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/results"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      setSelectedResult(null);
      setReviewComment("");
      toast({
        title: "Success",
        description: "Review completed successfully",
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
        description: "Failed to complete review",
        variant: "destructive",
      });
    },
  });

  // Only reviewers and admins can access this page
  if ((user?.role as any) !== 'reviewer' && (user?.role as any) !== 'admin') {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600">You need reviewer or administrator privileges to access flagged results.</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'flagged': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'verified': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleReview = (action: string) => {
    if (!selectedResult) return;
    
    reviewMutation.mutate({ 
      resultId: selectedResult.id, 
      action, 
      comments: reviewComment.trim() || undefined 
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900" data-testid="text-review-flagged-title">
            Review Flagged & Rejected Results
          </h2>
          <p className="text-gray-600">Analyze and take action on flagged or rejected vote submissions</p>
        </div>
        
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="flagged">Flagged Results</SelectItem>
            <SelectItem value="rejected">Rejected Results</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Results List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5" />
              <span>{selectedStatus === 'flagged' ? 'Flagged' : 'Rejected'} Results ({flaggedResults?.length || 0})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading results...</div>
            ) : flaggedResults && flaggedResults.length > 0 ? (
              <div className="space-y-3">
                {flaggedResults.map((result: any) => (
                  <div 
                    key={result.id} 
                    className={`border rounded-lg p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                      selectedResult?.id === result.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                    onClick={() => setSelectedResult(result)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <Badge className={getStatusColor(result.status)}>
                            {result.status}
                          </Badge>
                          <span className="text-sm font-medium text-gray-900">
                            {result.pollingCenter?.code || 'Unknown Center'}
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-600 space-y-1">
                          <div className="flex items-center space-x-2">
                            <Building className="h-4 w-4" />
                            <span>{result.pollingCenter?.name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4" />
                            <span>Submitted by: {result.submitter?.firstName} {result.submitter?.lastName}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDistanceToNow(new Date(result.createdAt), { addSuffix: true })}</span>
                          </div>
                        </div>
                        
                        {result.flaggedReason && (
                          <div className="mt-2 p-2 bg-yellow-50 border-l-4 border-yellow-400">
                            <p className="text-sm text-yellow-800"><strong>Reason:</strong> {result.flaggedReason}</p>
                          </div>
                        )}
                      </div>
                      
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                No {selectedStatus} results found
              </div>
            )}
          </CardContent>
        </Card>

        {/* Review Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5" />
              <span>Review Actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedResult ? (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Result Details</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>Polling Center:</strong> {selectedResult.pollingCenter?.name}</p>
                    <p><strong>Category:</strong> {selectedResult.category}</p>
                    <p><strong>Total Votes:</strong> {selectedResult.totalVotes}</p>
                    <p><strong>Invalid Votes:</strong> {selectedResult.invalidVotes}</p>
                    <p><strong>Submission Channel:</strong> {selectedResult.submissionChannel}</p>
                    {selectedResult.comments && (
                      <p><strong>Comments:</strong> {selectedResult.comments}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Review Comments
                  </label>
                  <Textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Add your review comments here..."
                    rows={3}
                  />
                </div>

                <div className="flex space-x-3">
                  <Button
                    onClick={() => handleReview('approve')}
                    disabled={reviewMutation.isPending}
                    className="flex-1"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => handleReview('reject')}
                    disabled={reviewMutation.isPending}
                    variant="destructive"
                    className="flex-1"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                </div>

                {selectedStatus === 'flagged' && (
                  <Button
                    onClick={() => handleReview('flag_for_further_review')}
                    disabled={reviewMutation.isPending}
                    variant="outline"
                    className="w-full"
                  >
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Flag for Further Review
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Eye className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                Select a result to review
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}