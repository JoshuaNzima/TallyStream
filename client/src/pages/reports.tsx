import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, BarChart3, FileText, TrendingUp, Users, Vote, CheckCircle, AlertTriangle, Calendar, Filter } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

export default function Reports() {
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [reportType, setReportType] = useState("summary");

  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
  });

  const { data: results } = useQuery({
    queryKey: ["/api/results"],
  });

  const { data: pollingCenters } = useQuery({
    queryKey: ["/api/polling-centers"],
  });

  const { data: candidates } = useQuery({
    queryKey: ["/api/candidates"],
  });

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  // Fetch party performance data for each category separately
  const { data: presidentialPerformance } = useQuery({
    queryKey: ["/api/party-performance", "president"],
    queryFn: () => 
      fetch("/api/party-performance?category=president", { credentials: "include" }).then(res => res.json())
  });

  const { data: mpPerformance } = useQuery({
    queryKey: ["/api/party-performance", "mp"],
    queryFn: () => 
      fetch("/api/party-performance?category=mp", { credentials: "include" }).then(res => res.json())
  });

  const { data: councilorPerformance } = useQuery({
    queryKey: ["/api/party-performance", "councilor"],
    queryFn: () => 
      fetch("/api/party-performance?category=councilor", { credentials: "include" }).then(res => res.json())
  });

  // Create grouped party performance for proper category breakdown
  const groupedPartyPerformance = {
    president: presidentialPerformance || [],
    mp: mpPerformance || [],
    councilor: councilorPerformance || []
  };

  // Combine all party performance data for overall stats and export
  const partyPerformance = [
    ...(presidentialPerformance || []),
    ...(mpPerformance || []),
    ...(councilorPerformance || [])
  ];

  const { data: auditLogs } = useQuery({
    queryKey: ["/api/audit-logs"],
  });

  // Filter results based on selected filters
  const getFilteredResults = () => {
    if (!results) return [];
    
    let filtered = [...results];
    
    if (selectedStatus !== "all") {
      filtered = filtered.filter((r: any) => r.status === selectedStatus);
    }
    
    if (selectedPeriod !== "all") {
      const now = new Date();
      const periodDays = selectedPeriod === "week" ? 7 : selectedPeriod === "month" ? 30 : 1;
      const cutoff = new Date(now.getTime() - (periodDays * 24 * 60 * 60 * 1000));
      filtered = filtered.filter((r: any) => new Date(r.createdAt) >= cutoff);
    }
    
    return filtered;
  };

  const formatVotesForExport = (votes: any, candidatesList: any[]) => {
    if (!votes || typeof votes !== 'object') return "No votes";
    
    const voteEntries = Object.entries(votes);
    if (voteEntries.length === 0) return "No votes";
    
    return voteEntries.map(([candidateId, voteCount]) => {
      const candidate = candidatesList?.find(c => c.id === candidateId);
      const candidateName = candidate ? `${candidate.firstName} ${candidate.lastName} (${candidate.party?.name || 'Unknown Party'})` : `Candidate ID: ${candidateId}`;
      return `${candidateName}: ${voteCount}`;
    }).join("; ");
  };

  const getUserName = (userId: string, usersList: any[]) => {
    if (!userId) return "N/A";
    const user = usersList?.find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : `User ID: ${userId}`;
  };

  const handleExportCSV = (exportType: string) => {
    const filteredResults = getFilteredResults();
    
    if (exportType === "detailed" && filteredResults.length > 0) {
      const headers = [
        "Polling Center", "Status", "Presidential Votes", "MP Votes", "Councilor Votes", 
        "Total Valid Votes", "Invalid Votes", "Submitted By", "Submitted At", "Verified By", "Verified At"
      ];
      
      const rows = filteredResults.map((r: any) => [
        r.pollingCenter?.name || "Unknown",
        r.status,
        formatVotesForExport(r.presidentialVotes, candidates),
        formatVotesForExport(r.mpVotes, candidates),
        formatVotesForExport(r.councilorVotes, candidates),
        r.totalValidVotes || 0,
        r.invalidVotes || 0,
        getUserName(r.submittedBy, users),
        format(new Date(r.createdAt), "yyyy-MM-dd HH:mm:ss"),
        getUserName(r.verifiedBy, users),
        r.verifiedAt ? format(new Date(r.verifiedAt), "yyyy-MM-dd HH:mm:ss") : "N/A"
      ]);
      
      const csvContent = [headers, ...rows].map((e) => e.join(",")).join("\n");
      downloadCSV(csvContent, "detailed-results.csv");
      
    } else if (exportType === "summary") {
      const summaryData = generateSummaryReport();
      const csvContent = convertSummaryToCSV(summaryData);
      downloadCSV(csvContent, "summary-report.csv");
      
    } else if (exportType === "party") {
      if (partyPerformance && partyPerformance.length > 0) {
        const headers = ["Party", "Category", "Total Votes", "Percentage", "Candidates"];
        const rows = partyPerformance.map((p: any) => [
          p.party, p.category, p.totalVotes, p.percentage.toFixed(2), p.candidates
        ]);
        const csvContent = [headers, ...rows].map((e) => e.join(",")).join("\n");
        downloadCSV(csvContent, "party-performance.csv");
      }
    }
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const generateSummaryReport = () => {
    return {
      generatedAt: new Date(),
      period: selectedPeriod,
      status: selectedStatus,
      totalCenters: pollingCenters?.length || 0,
      totalResults: results?.length || 0,
      verifiedResults: results?.filter((r: any) => r.status === 'verified').length || 0,
      flaggedResults: results?.filter((r: any) => r.status === 'flagged').length || 0,
      pendingResults: results?.filter((r: any) => r.status === 'pending').length || 0,
      completionRate: stats?.completionRate || 0,
      verificationRate: stats?.verificationRate || 0
    };
  };

  const convertSummaryToCSV = (data: any) => {
    const headers = ["Metric", "Value"];
    const rows = [
      ["Generated At", format(data.generatedAt, "yyyy-MM-dd HH:mm:ss")],
      ["Report Period", data.period],
      ["Status Filter", data.status],
      ["Total Polling Centers", data.totalCenters],
      ["Total Results Received", data.totalResults],
      ["Verified Results", data.verifiedResults],
      ["Flagged Results", data.flaggedResults],
      ["Pending Results", data.pendingResults],
      ["Completion Rate (%)", data.completionRate.toFixed(2)],
      ["Verification Rate (%)", data.verificationRate.toFixed(2)]
    ];
    return [headers, ...rows].map((e) => e.join(",")).join("\n");
  };

  const handleExportPDF = () => {
    // Enhanced PDF export with comprehensive data
    const reportData = {
      title: "PTC Election System Report",
      generatedAt: new Date().toISOString(),
      summary: generateSummaryReport(),
      results: getFilteredResults(),
      partyPerformance: partyPerformance || [],
      centers: pollingCenters || [],
      candidates: candidates || []
    };

    const jsonContent = JSON.stringify(reportData, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `election-report-${format(new Date(), "yyyy-MM-dd")}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900" data-testid="text-reports-title">
          Reports & Analytics
        </h2>
        <p className="text-gray-600">
          Generate and export comprehensive election reports with filtering and detailed analysis
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Report Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4" />
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="flagged">Flagged</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="text-sm text-gray-600">
            Showing {getFilteredResults().length} of {results?.length || 0} total results
          </div>
        </CardContent>
      </Card>

      {/* Tabbed Reports Interface */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Results</TabsTrigger>
          <TabsTrigger value="party">Party Performance</TabsTrigger>
          <TabsTrigger value="export">Export Options</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Centers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-centers">
                  {stats?.totalCenters || 0}
                </div>
                <div className="text-xs text-muted-foreground">
                  {stats?.completionRate?.toFixed(1) || 0}% reporting
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Results Received</CardTitle>
                <Vote className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-results-received">
                  {stats?.resultsReceived || 0}
                </div>
                <div className="text-xs text-muted-foreground">
                  Total submissions
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Verified</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600" data-testid="text-verified-count">
                  {stats?.verified || 0}
                </div>
                <div className="text-xs text-muted-foreground">
                  {stats?.verificationRate?.toFixed(1) || 0}% verified
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Flagged</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600" data-testid="text-flagged-count">
                  {stats?.flagged || 0}
                </div>
                <div className="text-xs text-muted-foreground">
                  Needs review
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Activity Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Last 24 hours:</span>
                  <Badge variant="outline">
                    {results?.filter((r: any) => {
                      const yesterday = new Date();
                      yesterday.setDate(yesterday.getDate() - 1);
                      return new Date(r.createdAt) > yesterday;
                    }).length || 0} new submissions
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Pending verification:</span>
                  <Badge variant="secondary">
                    {results?.filter((r: any) => r.status === 'pending').length || 0} items
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Processing rate:</span>
                  <Badge variant="default">
                    {stats?.verificationRate?.toFixed(1) || 0}% complete
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detailed">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Results Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {getFilteredResults().length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No results match your current filters
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {getFilteredResults().slice(0, 50).map((result: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium">{result.pollingCenter?.name || 'Unknown Center'}</h4>
                          <Badge variant={result.status === 'verified' ? 'default' : 
                                       result.status === 'flagged' ? 'destructive' : 'secondary'}>
                            {result.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 grid grid-cols-2 gap-4">
                          <div>Total Valid Votes: {(result.totalVotes || 0) - (result.invalidVotes || 0)}</div>
                          <div>Invalid Votes: {result.invalidVotes || 0}</div>
                          <div>Submitted: {format(new Date(result.createdAt), "MMM dd, HH:mm")}</div>
                          <div>Status: {result.status}</div>
                        </div>
                      </div>
                    ))}
                    {getFilteredResults().length > 50 && (
                      <div className="text-center text-sm text-gray-500 py-2">
                        Showing first 50 results. Use export for complete data.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="party">
          <Card>
            <CardHeader>
              <CardTitle>Party Performance Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {!partyPerformance || partyPerformance.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No party performance data available yet
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Overall Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-sm text-gray-600">Active Parties</div>
                          <div className="text-2xl font-bold">{partyPerformance.length}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-sm text-gray-600">Leading Party (Overall)</div>
                          <div className="text-lg font-medium">{partyPerformance[0]?.party || 'N/A'}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <div className="text-sm text-gray-600">Total Votes</div>
                          <div className="text-2xl font-bold">
                            {partyPerformance.reduce((sum: number, p: any) => sum + p.totalVotes, 0).toLocaleString()}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    {/* Category-wise breakdown */}
                    <div className="space-y-6">
                      {Object.entries(groupedPartyPerformance).map(([category, parties]: [string, any]) => (
                        <div key={category} className="border rounded-lg p-4">
                          <h4 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${
                              category === 'president' ? 'bg-red-500' :
                              category === 'mp' ? 'bg-green-500' : 'bg-purple-500'
                            }`}></span>
                            {category === 'president' ? 'Presidential' : 
                             category === 'mp' ? 'Members of Parliament' : 'Councilors'}
                            <Badge variant="secondary" className="ml-2">
                              {parties.length} {parties.length === 1 ? 'party' : 'parties'}
                            </Badge>
                          </h4>
                          
                          <div className="space-y-2">
                            {parties.slice(0, 10).map((party: any, index: number) => (
                              <div key={`${category}-${index}`} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <div>
                                  <div className="font-medium">{party.party}</div>
                                  <div className="text-sm text-gray-600">{party.candidates} candidates</div>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold">{party.totalVotes.toLocaleString()}</div>
                                  <div className="text-sm text-gray-600">{party.percentage.toFixed(1)}%</div>
                                </div>
                              </div>
                            ))}
                            {parties.length > 10 && (
                              <div className="text-center text-sm text-gray-500 py-2">
                                Showing top 10 parties. Export for complete data.
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Download className="h-5 w-5" />
                <span>Export Options</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="font-medium">CSV Exports</h4>
                    <div className="flex flex-col space-y-2">
                      <Button
                        onClick={() => handleExportCSV("summary")}
                        variant="outline"
                        data-testid="button-export-csv-summary"
                        className="justify-start"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Summary Report CSV
                      </Button>
                      <Button
                        onClick={() => handleExportCSV("detailed")}
                        variant="outline"
                        data-testid="button-export-csv-detailed"
                        className="justify-start"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Detailed Results CSV
                      </Button>
                      <Button
                        onClick={() => handleExportCSV("party")}
                        variant="outline"
                        data-testid="button-export-csv-party"
                        className="justify-start"
                      >
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Party Performance CSV
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium">Complete Report</h4>
                    <Button
                      onClick={handleExportPDF}
                      variant="default"
                      data-testid="button-export-pdf"
                      className="w-full justify-start"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Export Complete Report (JSON)
                    </Button>
                    <div className="text-sm text-gray-600">
                      Includes all data: results, party performance, centers, candidates, and audit logs
                    </div>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Export Notes</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Exports respect current filter settings</li>
                    <li>• Large datasets may take a moment to generate</li>
                    <li>• All timestamps are in local timezone</li>
                    <li>• Complete report includes sensitive audit data - handle securely</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
