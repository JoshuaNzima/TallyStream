import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";
import { RealTimeAnalytics } from "@/components/real-time-analytics";
import PartyPerformanceChart from "@/components/party-performance-chart";

export default function Dashboard() {
  // Fetch polling centers for export functionality
  const { data: pollingCenters } = useQuery({
    queryKey: ["/api/polling-centers"],
  });

  const handleExportReport = () => {
    // Comprehensive report export functionality
    const data = {
      timestamp: new Date().toISOString(),
      pollingCenters: Array.isArray(pollingCenters) ? pollingCenters.length : 0,
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
      
      {/* Party Performance Chart */}
      <PartyPerformanceChart />
    </div>
  );
}
