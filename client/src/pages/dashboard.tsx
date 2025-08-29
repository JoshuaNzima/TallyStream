import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, RefreshCw, Activity } from "lucide-react";
import { RealTimeAnalytics } from "@/components/real-time-analytics";
import PartyPerformanceChart from "@/components/party-performance-chart";
import { format } from "date-fns";

export default function Dashboard() {
  // Fetch polling centers for export functionality
  const { data: pollingCenters } = useQuery({
    queryKey: ["/api/polling-centers"],
  });

  const { data: results } = useQuery({
    queryKey: ["/api/results"],
  });

  const handleExportReport = () => {
    // Comprehensive report export functionality
    const data = {
      timestamp: new Date().toISOString(),
      pollingCenters: pollingCenters?.length || 0,
      totalResults: results?.length || 0,
      exportedBy: "Dashboard User",
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `election-report-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRefreshData = () => {
    window.location.reload();
  };

  return (
    <div className="space-y-8">
      {/* Enhanced Dashboard Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-bold text-gray-900"
            data-testid="text-dashboard-title"
          >
            Real-Time Election Center
          </h1>
          <p className="text-gray-600 mt-1">
            Live monitoring and analytics for election results
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={handleRefreshData}
            data-testid="button-refresh-data"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button
            onClick={handleExportReport}
            data-testid="button-export-report"
          >
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Real-Time Analytics Component */}
      <RealTimeAnalytics />
      
      {/* Recent Activities & Party Performance - Mobile Responsive Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Activities Section */}
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Recent Activities</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {results && results.length > 0 ? (
                results.slice(0, 8).map((result: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        result.status === 'verified' ? 'bg-green-500' : 
                        result.status === 'flagged' ? 'bg-red-500' : 'bg-yellow-500'
                      }`} />
                      <div>
                        <div className="text-sm font-medium">{result.pollingCenter?.name || 'Unknown Center'}</div>
                        <div className="text-xs text-gray-500">
                          {result.status === 'verified' ? 'Results verified' :
                           result.status === 'flagged' ? 'Results flagged' : 'Results submitted'}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {format(new Date(result.createdAt), "MMM dd, HH:mm")}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  No activities yet
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Party Performance Chart - Now in Grid */}
        <div>
          <PartyPerformanceChart />
        </div>
      </div>
    </div>
  );
}
