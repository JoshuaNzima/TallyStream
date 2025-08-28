import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, BarChart3, FileText, TrendingUp } from "lucide-react";

export default function Reports() {
  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
  });

  const { data: results } = useQuery({
    queryKey: ["/api/results"],
  });

  const handleExportCSV = () => {
    if (!results) return;

    const headers = ["Center", "Candidate", "Votes", "Created At"];
    const rows = results.map((r: any) => [
      r.pollingCenter?.name,
      r.candidate?.name,
      r.votes,
      r.createdAt,
    ]);

    const csvContent = [headers, ...rows].map((e) => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "results.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const handleExportPDF = () => {
    // TODO: Implement PDF export
    console.log("Exporting PDF...");
  };

  return (
    <div>
      <div className="mb-8">
        <h2
          className="text-2xl font-bold text-gray-900"
          data-testid="text-reports-title"
        >
          Reports & Analytics
        </h2>
        <p className="text-gray-600">
          Generate and export comprehensive election reports
        </p>
      </div>

      {/* Export Options */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Download className="h-5 w-5" />
            <span>Export Options</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button
              onClick={handleExportCSV}
              variant="outline"
              data-testid="button-export-csv"
            >
              <FileText className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button
              onClick={handleExportPDF}
              variant="outline"
              data-testid="button-export-pdf"
            >
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Reports */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Overall Summary</span>
              <BarChart3 className="h-5 w-5 text-primary-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Centers:</span>
                <span className="font-medium" data-testid="text-total-centers">
                  {stats?.totalCenters || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Results Received:</span>
                <span
                  className="font-medium"
                  data-testid="text-results-received"
                >
                  {stats?.resultsReceived || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Completion Rate:</span>
                <span
                  className="font-medium text-green-600"
                  data-testid="text-completion-rate"
                >
                  {stats?.completionRate?.toFixed(1) || 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Verification Status</span>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Verified:</span>
                <span
                  className="font-medium text-green-600"
                  data-testid="text-verified-count"
                >
                  {stats?.verified || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Flagged:</span>
                <span
                  className="font-medium text-red-600"
                  data-testid="text-flagged-count"
                >
                  {stats?.flagged || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">
                  Verification Rate:
                </span>
                <span
                  className="font-medium text-green-600"
                  data-testid="text-verification-rate"
                >
                  {stats?.verificationRate?.toFixed(1) || 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              Last 24 hours:{" "}
              {results?.filter((r) => {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                return new Date(r.createdAt) > yesterday;
              }).length || 0}{" "}
              new submissions
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
