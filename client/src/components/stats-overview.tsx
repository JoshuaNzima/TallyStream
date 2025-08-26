import { Card, CardContent } from "@/components/ui/card";
import { Building, CheckCircle, Shield, Flag } from "lucide-react";

interface StatsOverviewProps {
  stats?: {
    totalCenters: number;
    resultsReceived: number;
    verified: number;
    flagged: number;
    completionRate: number;
    verificationRate: number;
  };
}

export default function StatsOverview({ stats }: StatsOverviewProps) {
  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-16 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card className="border shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Polling Centers</p>
              <p className="text-2xl font-bold text-gray-900" data-testid="stat-total-centers">
                {stats.totalCenters.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-sm">
            <span className="text-green-600 font-medium">100%</span>
            <span className="text-gray-500 ml-1">registered</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Results Received</p>
              <p className="text-2xl font-bold text-gray-900" data-testid="stat-results-received">
                {stats.resultsReceived.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-sm">
            <span className="text-green-600 font-medium" data-testid="stat-completion-rate">
              {stats.completionRate.toFixed(1)}%
            </span>
            <span className="text-gray-500 ml-1">completion</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Verified Results</p>
              <p className="text-2xl font-bold text-gray-900" data-testid="stat-verified">
                {stats.verified.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-sm">
            <span className="text-green-600 font-medium" data-testid="stat-verification-rate">
              {stats.verificationRate.toFixed(1)}%
            </span>
            <span className="text-gray-500 ml-1">verified</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Flagged Items</p>
              <p className="text-2xl font-bold text-gray-900" data-testid="stat-flagged">
                {stats.flagged.toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <Flag className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-sm">
            <span className="text-red-600 font-medium">
              {stats.totalCenters > 0 ? ((stats.flagged / stats.totalCenters) * 100).toFixed(1) : 0}%
            </span>
            <span className="text-gray-500 ml-1">need review</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
