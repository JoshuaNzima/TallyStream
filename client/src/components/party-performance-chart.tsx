import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, Vote, Award } from "lucide-react";

interface PartyPerformance {
  party: string;
  totalVotes: number;
  percentage: number;
  candidates: number;
  category: 'president' | 'mp' | 'councilor';
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316', '#06B6D4', '#84CC16'];

export default function PartyPerformanceChart() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar');

  const { data: partyData, isLoading } = useQuery({
    queryKey: ["/api/party-performance", selectedCategory],
    queryFn: () => {
      const params = selectedCategory !== 'all' ? `?category=${selectedCategory}` : '';
      return fetch(`/api/party-performance${params}`, { credentials: "include" }).then(res => res.json());
    },
  });

  if (isLoading) {
    return (
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Party Performance</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="text-center">Loading party performance data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!partyData || partyData.length === 0) {
    return (
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Party Performance</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <Vote className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              No verified results available yet
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalVotes = partyData.reduce((sum: number, party: PartyPerformance) => sum + party.totalVotes, 0);
  const leadingParty = partyData[0];

  return (
    <Card className="border shadow-sm">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Party Performance</span>
          </CardTitle>
          
          <div className="flex space-x-2">
            <Select value={chartType} onValueChange={(value: 'bar' | 'pie') => setChartType(value)}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bar">Bar</SelectItem>
                <SelectItem value="pie">Pie</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="president">Presidential</SelectItem>
                <SelectItem value="mp">MP</SelectItem>
                <SelectItem value="councilor">Councilor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Performance Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center space-x-2">
              <Award className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Leading Party</span>
            </div>
            <div className="mt-1">
              <div className="font-bold text-blue-900">{leadingParty?.party || 'N/A'}</div>
              <div className="text-sm text-blue-700">
                {leadingParty?.totalVotes.toLocaleString() || 0} votes ({leadingParty?.percentage.toFixed(1) || 0}%)
              </div>
            </div>
          </div>

          <div className="bg-green-50 p-3 rounded-lg">
            <div className="flex items-center space-x-2">
              <Vote className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-900">Total Votes</span>
            </div>
            <div className="mt-1">
              <div className="font-bold text-green-900">{totalVotes.toLocaleString()}</div>
              <div className="text-sm text-green-700">
                Across {partyData.length} parties
              </div>
            </div>
          </div>

          <div className="bg-purple-50 p-3 rounded-lg">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">Active Parties</span>
            </div>
            <div className="mt-1">
              <div className="font-bold text-purple-900">{partyData.length}</div>
              <div className="text-sm text-purple-700">
                With verified results
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="h-80">
          {chartType === 'bar' ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={partyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="party" 
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip 
                  formatter={[
                    (value: number, name: string) => [value.toLocaleString(), 'Votes'],
                  ]}
                  labelFormatter={(label) => `Party: ${label}`}
                />
                <Bar 
                  dataKey="totalVotes" 
                  fill="#3B82F6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={partyData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ party, percentage }) => `${party}: ${percentage.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="totalVotes"
                >
                  {partyData.map((entry: PartyPerformance, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [value.toLocaleString(), 'Votes']} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Party Details */}
        <div className="mt-6 space-y-3">
          <h4 className="font-medium text-gray-900">Party Breakdown</h4>
          <div className="grid gap-2 max-h-40 overflow-y-auto">
            {partyData.map((party: PartyPerformance, index: number) => (
              <div key={party.party} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <div>
                    <div className="font-medium">{party.party}</div>
                    <div className="text-xs text-gray-500">
                      {party.candidates} candidates • {party.category}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{party.totalVotes.toLocaleString()}</div>
                  <Badge variant="secondary" className="text-xs">
                    {party.percentage.toFixed(1)}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}