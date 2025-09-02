import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImportExportControls } from '@/components/import-export-controls';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, MapPin, Users, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Centre {
  id: string;
  name: string;
  registeredVoters: number;
}

interface Ward {
  id: string;
  name: string;
  centres: Centre[];
}

interface Constituency {
  id: string;
  name: string;
  wards: Ward[];
}

function HierarchicalLocationView() {
  const [expandedConstituencies, setExpandedConstituencies] = useState<Set<string>>(new Set());
  const [expandedWards, setExpandedWards] = useState<Set<string>>(new Set());

  const { data: constituencies, isLoading } = useQuery({
    queryKey: ['/api/constituencies/hierarchy'],
    queryFn: async () => {
      const response = await fetch('/api/constituencies/hierarchy');
      if (!response.ok) {
        throw new Error('Failed to fetch constituencies');
      }
      return response.json() as Promise<Constituency[]>;
    },
  });

  const toggleConstituency = (constituencyId: string) => {
    const newExpanded = new Set(expandedConstituencies);
    if (newExpanded.has(constituencyId)) {
      newExpanded.delete(constituencyId);
    } else {
      newExpanded.add(constituencyId);
    }
    setExpandedConstituencies(newExpanded);
  };

  const toggleWard = (wardId: string) => {
    const newExpanded = new Set(expandedWards);
    if (newExpanded.has(wardId)) {
      newExpanded.delete(wardId);
    } else {
      newExpanded.add(wardId);
    }
    setExpandedWards(newExpanded);
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading locations...</div>;
  }

  if (!constituencies || constituencies.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No constituencies found. Import data to get started.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {constituencies.map((constituency) => (
        <Card key={constituency.id} data-testid={`card-constituency-${constituency.id}`}>
          <Collapsible
            open={expandedConstituencies.has(constituency.id)}
            onOpenChange={() => toggleConstituency(constituency.id)}
          >
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      {expandedConstituencies.has(constituency.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                    <Building className="h-5 w-5 text-blue-600" />
                    <div>
                      <CardTitle className="text-lg">{constituency.id} - {constituency.name}</CardTitle>
                      <CardDescription>
                        {constituency.wards?.length || 0} wards
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary" data-testid={`badge-constituency-wards-${constituency.id}`}>
                    Constituency
                  </Badge>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <CardContent className="pt-0">
                {constituency.wards && constituency.wards.length > 0 ? (
                  <div className="space-y-3 ml-6">
                    {constituency.wards.map((ward) => (
                      <Card key={ward.id} className="border-l-4 border-l-green-500" data-testid={`card-ward-${ward.id}`}>
                        <Collapsible
                          open={expandedWards.has(ward.id)}
                          onOpenChange={() => toggleWard(ward.id)}
                        >
                          <CollapsibleTrigger asChild>
                            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                    {expandedWards.has(ward.id) ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </Button>
                                  <MapPin className="h-4 w-4 text-green-600" />
                                  <div>
                                    <CardTitle className="text-base">{ward.id} - {ward.name}</CardTitle>
                                    <CardDescription className="text-sm">
                                      {ward.centres?.length || 0} centres
                                    </CardDescription>
                                  </div>
                                </div>
                                <Badge variant="outline" data-testid={`badge-ward-centres-${ward.id}`}>
                                  Ward
                                </Badge>
                              </div>
                            </CardHeader>
                          </CollapsibleTrigger>
                          
                          <CollapsibleContent>
                            <CardContent className="pt-0">
                              {ward.centres && ward.centres.length > 0 ? (
                                <div className="space-y-2 ml-6">
                                  {ward.centres.map((centre) => (
                                    <div 
                                      key={centre.id} 
                                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border"
                                      data-testid={`item-centre-${centre.id}`}
                                    >
                                      <div className="flex items-center gap-3">
                                        <Users className="h-4 w-4 text-orange-600" />
                                        <div>
                                          <div className="font-medium text-sm">{centre.id} - {centre.name}</div>
                                          <div className="text-xs text-muted-foreground">
                                            {centre.registeredVoters.toLocaleString()} registered voters
                                          </div>
                                        </div>
                                      </div>
                                      <Badge variant="secondary" data-testid={`badge-centre-voters-${centre.id}`}>
                                        Centre
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground ml-6">
                                  No centres in this ward
                                </div>
                              )}
                            </CardContent>
                          </CollapsibleContent>
                        </Collapsible>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground ml-6">
                    No wards in this constituency
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      ))}
    </div>
  );
}

export default function DataManagement() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Data Management</h1>
        <p className="text-muted-foreground">
          Import election data and export reports for analysis
        </p>
      </div>

      <Tabs defaultValue="import-export" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="import-export" data-testid="tab-import-export">Import & Export</TabsTrigger>
          <TabsTrigger value="location-hierarchy" data-testid="tab-location-hierarchy">Location Structure</TabsTrigger>
        </TabsList>

        <TabsContent value="import-export" className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold mb-4">Import & Export Data</h2>
            <ImportExportControls />
          </div>
        </TabsContent>

        <TabsContent value="location-hierarchy" className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold mb-4">Location Hierarchy</h2>
            <p className="text-muted-foreground mb-6">
              View the hierarchical structure of constituencies, wards, and centres
            </p>
            <HierarchicalLocationView />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}