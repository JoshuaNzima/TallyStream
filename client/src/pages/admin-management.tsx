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
import { Users, UserCheck, Building, Vote, MapPin } from "lucide-react";

export default function AdminManagement() {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState("president");

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
        <TabsList className="grid w-full grid-cols-3">
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
      </Tabs>
    </div>
  );
}