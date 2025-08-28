import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Users, UserCheck, Building, Vote, MapPin, Database, Archive, Trash2, AlertTriangle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export default function AdminManagement() {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState("president");
  const [cleanupOptions, setCleanupOptions] = useState({
    users: false,
    candidates: false,
    pollingCenters: false,
    results: false,
    keepAdmin: true,
  });

  // Fetch pending users
  const { data: pendingUsers } = useQuery({
    queryKey: ["/api/admin/pending-users"],
  });

  // Fetch candidates
  const { data: candidates } = useQuery({
    queryKey: ["/api/candidates"],
  });

  // Fetch polling centers
  const { data: pollingCenters } = useQuery({
    queryKey: ["/api/polling-centers"],
  });

  // Approve user mutation
  const approveUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("POST", `/api/admin/approve-user/${userId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "User approved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pending-users"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to approve user",
        variant: "destructive",
      });
    },
  });

  // Add candidate mutation
  const addCandidateMutation = useMutation({
    mutationFn: async (candidateData: any) => {
      const res = await apiRequest("POST", "/api/candidates", candidateData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Candidate added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add candidate",
        variant: "destructive",
      });
    },
  });

  // Add polling center mutation
  const addPollingCenterMutation = useMutation({
    mutationFn: async (centerData: any) => {
      const res = await apiRequest("POST", "/api/polling-centers", centerData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Polling center added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/polling-centers"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add polling center",
        variant: "destructive",
      });
    },
  });

  // Archive results mutation
  const archiveResultsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/archive-results");
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `${data.archivedCount} results archived successfully`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to archive results",
        variant: "destructive",
      });
    },
  });

  // Clean database mutation
  const cleanDatabaseMutation = useMutation({
    mutationFn: async (options: any) => {
      const res = await apiRequest("POST", "/api/admin/clean-database", options);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Database cleanup completed successfully",
      });
      // Reset form
      setCleanupOptions({
        users: false,
        candidates: false,
        pollingCenters: false,
        results: false,
        keepAdmin: true,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clean database",
        variant: "destructive",
      });
    },
  });

  const handleApproveUser = (userId: string) => {
    approveUserMutation.mutate(userId);
  };

  const handleAddCandidate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    const candidateData = {
      name: formData.get('candidateName'),
      party: formData.get('candidateParty'),
      category: selectedCategory,
      constituency: formData.get('candidateConstituency'),
    };

    addCandidateMutation.mutate(candidateData);
    event.currentTarget.reset();
  };

  const handleAddPollingCenter = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    const centerData = {
      code: formData.get('centerCode'),
      name: formData.get('centerName'),
      constituency: formData.get('centerConstituency'),
      district: formData.get('centerDistrict'),
      state: formData.get('centerState'),
      registeredVoters: parseInt(formData.get('registeredVoters') as string),
    };

    addPollingCenterMutation.mutate(centerData);
    event.currentTarget.reset();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900" data-testid="text-admin-management-title">
          Admin Management
        </h1>
        <p className="text-gray-600">
          Manage user approvals, candidates, parties, and polling centers
        </p>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users" data-testid="tab-users">
            <Users className="w-4 h-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="candidates" data-testid="tab-candidates">
            <Vote className="w-4 h-4 mr-2" />
            Candidates
          </TabsTrigger>
          <TabsTrigger value="centers" data-testid="tab-centers">
            <Building className="w-4 h-4 mr-2" />
            Polling Centers
          </TabsTrigger>
          <TabsTrigger value="database" data-testid="tab-database">
            <Database className="w-4 h-4 mr-2" />
            Database
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                Pending User Approvals
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!pendingUsers || pendingUsers.length === 0 ? (
                <p className="text-gray-500" data-testid="text-no-pending-users">
                  No pending user approvals
                </p>
              ) : (
                <div className="space-y-3">
                  {pendingUsers && Array.isArray(pendingUsers) && pendingUsers.map((user: any) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium" data-testid={`text-user-name-${user.id}`}>
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-sm text-gray-600" data-testid={`text-user-contact-${user.id}`}>
                          {user.email || user.phone}
                        </p>
                        <Badge variant="outline" className="mt-1">
                          {user.role}
                        </Badge>
                      </div>
                      <Button
                        onClick={() => handleApproveUser(user.id)}
                        disabled={approveUserMutation.isPending}
                        data-testid={`button-approve-${user.id}`}
                      >
                        {approveUserMutation.isPending ? "Approving..." : "Approve"}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="candidates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Add New Candidate</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddCandidate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    name="candidateName"
                    placeholder="Candidate Name"
                    required
                    data-testid="input-candidate-name"
                  />
                  <Input
                    name="candidateParty"
                    placeholder="Party Name"
                    required
                    data-testid="input-candidate-party"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger data-testid="select-candidate-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="president">Presidential</SelectItem>
                      <SelectItem value="mp">Member of Parliament</SelectItem>
                      <SelectItem value="councilor">Councilor</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {(selectedCategory === "mp" || selectedCategory === "councilor") && (
                    <Input
                      name="candidateConstituency"
                      placeholder="Constituency/Ward"
                      required
                      data-testid="input-candidate-constituency"
                    />
                  )}
                </div>

                <Button type="submit" disabled={addCandidateMutation.isPending} data-testid="button-add-candidate">
                  {addCandidateMutation.isPending ? "Adding..." : "Add Candidate"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current Candidates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {candidates && Array.isArray(candidates) && candidates.map((candidate: any) => (
                  <div key={candidate.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">{candidate.name}</p>
                      <p className="text-sm text-gray-600">{candidate.party}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="secondary">{candidate.category}</Badge>
                        {candidate.constituency && (
                          <Badge variant="outline">{candidate.constituency}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="centers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Add New Polling Center
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddPollingCenter} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    name="centerCode"
                    placeholder="Center Code (e.g., PC004)"
                    required
                    data-testid="input-center-code"
                  />
                  <Input
                    name="centerName"
                    placeholder="Center Name"
                    required
                    data-testid="input-center-name"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    name="centerConstituency"
                    placeholder="Constituency"
                    required
                    data-testid="input-center-constituency"
                  />
                  <Input
                    name="centerDistrict"
                    placeholder="District"
                    required
                    data-testid="input-center-district"
                  />
                  <Input
                    name="centerState"
                    placeholder="Region"
                    required
                    data-testid="input-center-region"
                  />
                </div>

                <Input
                  name="registeredVoters"
                  type="number"
                  placeholder="Registered Voters"
                  required
                  data-testid="input-registered-voters"
                />

                <Button type="submit" disabled={addPollingCenterMutation.isPending} data-testid="button-add-center">
                  {addPollingCenterMutation.isPending ? "Adding..." : "Add Polling Center"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current Polling Centers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pollingCenters && Array.isArray(pollingCenters) && pollingCenters.map((center: any) => (
                  <div key={center.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">{center.code} - {center.name}</p>
                      <p className="text-sm text-gray-600">
                        {center.constituency}, {center.district}, {center.state}
                      </p>
                      <p className="text-sm text-blue-600">
                        {center.registeredVoters} registered voters
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Archive className="w-5 h-5" />
                Archive Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">
                  Archive old results (older than 1 year) to improve system performance.
                </p>
                <Button
                  onClick={() => archiveResultsMutation.mutate()}
                  disabled={archiveResultsMutation.isPending}
                  data-testid="button-archive-results"
                >
                  <Archive className="w-4 h-4 mr-2" />
                  {archiveResultsMutation.isPending ? "Archiving..." : "Archive Old Results"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Clean Database
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="font-medium text-yellow-800">Warning</p>
                    <p className="text-sm text-yellow-700">
                      This action will permanently delete selected data. Use for preparing fresh elections.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="font-medium">Select data to clean:</p>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="clean-users"
                      checked={cleanupOptions.users}
                      onCheckedChange={(checked) =>
                        setCleanupOptions(prev => ({ ...prev, users: checked as boolean }))
                      }
                      data-testid="checkbox-clean-users"
                    />
                    <label htmlFor="clean-users" className="text-sm font-medium">
                      Users (agents, supervisors)
                    </label>
                  </div>

                  {cleanupOptions.users && (
                    <div className="ml-6 flex items-center space-x-2">
                      <Checkbox
                        id="keep-admin"
                        checked={cleanupOptions.keepAdmin}
                        onCheckedChange={(checked) =>
                          setCleanupOptions(prev => ({ ...prev, keepAdmin: checked as boolean }))
                        }
                        data-testid="checkbox-keep-admin"
                      />
                      <label htmlFor="keep-admin" className="text-sm">
                        Keep admin users
                      </label>
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="clean-candidates"
                      checked={cleanupOptions.candidates}
                      onCheckedChange={(checked) =>
                        setCleanupOptions(prev => ({ ...prev, candidates: checked as boolean }))
                      }
                      data-testid="checkbox-clean-candidates"
                    />
                    <label htmlFor="clean-candidates" className="text-sm font-medium">
                      Candidates
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="clean-centers"
                      checked={cleanupOptions.pollingCenters}
                      onCheckedChange={(checked) =>
                        setCleanupOptions(prev => ({ ...prev, pollingCenters: checked as boolean }))
                      }
                      data-testid="checkbox-clean-centers"
                    />
                    <label htmlFor="clean-centers" className="text-sm font-medium">
                      Polling Centers
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="clean-results"
                      checked={cleanupOptions.results}
                      onCheckedChange={(checked) =>
                        setCleanupOptions(prev => ({ ...prev, results: checked as boolean }))
                      }
                      data-testid="checkbox-clean-results"
                    />
                    <label htmlFor="clean-results" className="text-sm font-medium">
                      Results & Files
                    </label>
                  </div>
                </div>

                <Button
                  variant="destructive"
                  onClick={() => {
                    const selectedOptions = Object.entries(cleanupOptions)
                      .filter(([key, value]) => value && key !== 'keepAdmin')
                      .map(([key]) => key);
                    
                    if (selectedOptions.length === 0) {
                      toast({
                        title: "No options selected",
                        description: "Please select at least one option to clean",
                        variant: "destructive",
                      });
                      return;
                    }

                    if (window.confirm('Are you sure you want to clean the selected data? This action cannot be undone.')) {
                      cleanDatabaseMutation.mutate(cleanupOptions);
                    }
                  }}
                  disabled={cleanDatabaseMutation.isPending}
                  data-testid="button-clean-database"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {cleanDatabaseMutation.isPending ? "Cleaning..." : "Clean Database"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}