import { useQuery } from "@tanstack/react-query";
import StatsOverview from "@/components/stats-overview";
import ResultsChart from "@/components/results-chart";
import RecentSubmissions from "@/components/recent-submissions";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useEffect } from "react";

export default function Dashboard() {
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ["/api/stats"],
  });

  const { data: results } = useQuery({
    queryKey: ["/api/results"],
  });

  // WebSocket for real-time updates
  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage) {
      const message = JSON.parse(lastMessage.data);
      if (message.type === "STATS_UPDATE" || message.type === "NEW_RESULT" || message.type === "RESULT_STATUS_CHANGED") {
        refetchStats();
      }
    }
  }, [lastMessage, refetchStats]);

  const handleExportReport = () => {
    // TODO: Implement report export functionality
    console.log("Exporting report...");
  };

  return (
    <div>
      {/* Dashboard Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900" data-testid="text-dashboard-title">
              Election Dashboard
            </h2>
            <p className="text-gray-600">Real-time election results monitoring</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="bg-white px-4 py-2 rounded-lg shadow-sm border">
              <div className="text-sm text-gray-500">Last Update</div>
              <div className="font-medium" data-testid="text-last-update">
                Just now
              </div>
            </div>
            <Button 
              onClick={handleExportReport}
              className="bg-primary-500 hover:bg-primary-600 text-white"
              data-testid="button-export-report"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <StatsOverview stats={stats} />

      {/* Charts and Recent Submissions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        <ResultsChart />
        <RecentSubmissions results={results} />
      </div>
    </div>
  );
}
