import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, AlertTriangle, Check } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface RecentSubmissionsProps {
  results?: any[];
}

export default function RecentSubmissions({ results }: RecentSubmissionsProps) {
  // Get the 5 most recent submissions
  const recentResults = results?.slice(0, 5) || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'flagged':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'verified':
        return <Check className="h-4 w-4 text-green-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending':
        return 'status-pending';
      case 'flagged':
        return 'status-flagged';
      case 'verified':
        return 'status-verified';
      case 'rejected':
        return 'status-rejected';
      default:
        return '';
    }
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="border-b">
        <CardTitle data-testid="text-recent-submissions-title">Recent Submissions</CardTitle>
        <p className="text-sm text-gray-600">Latest result submissions requiring review</p>
      </CardHeader>
      <CardContent className="p-6">
        {recentResults.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No recent submissions
          </div>
        ) : (
          <div className="space-y-4">
            {recentResults.map((result: any) => (
              <div key={result.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    {getStatusIcon(result.status)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900" data-testid={`submission-center-${result.id}`}>
                      {result.pollingCenter?.code || 'Unknown Center'}
                    </p>
                    <span className="text-xs text-gray-500" data-testid={`submission-time-${result.id}`}>
                      {formatDistanceToNow(new Date(result.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600" data-testid={`submission-submitter-${result.id}`}>
                    Submitted by {result.submitter?.firstName} {result.submitter?.lastName}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge className={getStatusBadgeClass(result.status)} data-testid={`submission-status-${result.id}`}>
                      {result.status.charAt(0).toUpperCase() + result.status.slice(1)}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {result.submissionChannel}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4">
          <Button
            variant="outline"
            className="w-full"
            data-testid="button-view-all-submissions"
          >
            View All Submissions
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
