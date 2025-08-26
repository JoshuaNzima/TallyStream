import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

export default function ResultsChart() {
  const { data: results } = useQuery({
    queryKey: ["/api/results"],
  });

  // Calculate candidate totals from all verified results
  const calculateTotals = () => {
    if (!results) return { candidateA: 0, candidateB: 0, candidateC: 0, total: 0 };

    const verifiedResults = results.filter((r: any) => r.status === 'verified');
    
    const totals = verifiedResults.reduce(
      (acc: any, result: any) => ({
        candidateA: acc.candidateA + result.candidateAVotes,
        candidateB: acc.candidateB + result.candidateBVotes,
        candidateC: acc.candidateC + result.candidateCVotes,
      }),
      { candidateA: 0, candidateB: 0, candidateC: 0 }
    );

    const total = totals.candidateA + totals.candidateB + totals.candidateC;

    return {
      ...totals,
      total,
      candidateAPercentage: total > 0 ? (totals.candidateA / total) * 100 : 0,
      candidateBPercentage: total > 0 ? (totals.candidateB / total) * 100 : 0,
      candidateCPercentage: total > 0 ? (totals.candidateC / total) * 100 : 0,
    };
  };

  const totals = calculateTotals();

  return (
    <Card className="border shadow-sm">
      <CardHeader className="border-b">
        <CardTitle data-testid="text-results-chart-title">National Results</CardTitle>
        <p className="text-sm text-gray-600">Current leading candidates (verified results only)</p>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
              <span className="font-medium">Candidate A</span>
            </div>
            <div className="text-right">
              <div className="font-bold text-lg" data-testid="votes-candidate-a">
                {totals.candidateA.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500" data-testid="percentage-candidate-a">
                {totals.candidateAPercentage.toFixed(1)}%
              </div>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${totals.candidateAPercentage}%` }}
            ></div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span className="font-medium">Candidate B</span>
            </div>
            <div className="text-right">
              <div className="font-bold text-lg" data-testid="votes-candidate-b">
                {totals.candidateB.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500" data-testid="percentage-candidate-b">
                {totals.candidateBPercentage.toFixed(1)}%
              </div>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${totals.candidateBPercentage}%` }}
            ></div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
              <span className="font-medium">Candidate C</span>
            </div>
            <div className="text-right">
              <div className="font-bold text-lg" data-testid="votes-candidate-c">
                {totals.candidateC.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500" data-testid="percentage-candidate-c">
                {totals.candidateCPercentage.toFixed(1)}%
              </div>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-yellow-500 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${totals.candidateCPercentage}%` }}
            ></div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total Verified Votes:</span>
            <span className="font-semibold" data-testid="total-verified-votes">
              {totals.total.toLocaleString()}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
