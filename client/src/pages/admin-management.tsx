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
import { Users, UserCheck, Building, Vote, MapPin, Database, Archive, Trash2, AlertTriangle, Zap, Key, MessageSquare, Shield, Edit, ToggleLeft, ToggleRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AdminManagement() {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState("president");
  const [editingCenter, setEditingCenter] = useState<any>(null);
  const [configuringProvider, setConfiguringProvider] = useState<{ type: string; id: string; name: string; currentConfig?: any } | null>(null);
  const [providerConfig, setProviderConfig] = useState({
    apiKey: '',
    accountSid: '',
    authToken: '',
    phoneNumber: '',
    shortCode: '',
    clientId: '',
    clientSecret: '',
    webhookUrl: '',
    description: ''
  });
  const [cleanupOptions, setCleanupOptions] = useState({
    users: false,
    candidates: false,
    pollingCenters: false,
    results: false,
    ussdSessions: false,
    ussdProviders: false,
    userSessions: false,
    keepAdmin: true,
  });

  // API settings state
  const [apiSettings, setApiSettings] = useState({
    twoFaEnabled: false,
    twoFaProvider: 'authenticator', // authenticator, twilio, google
    whatsappEnabled: false,
    passwordResetEnabled: true,
    whatsappToken: '',
    whatsappPhoneNumberId: '',
    whatsappWebhookVerifyToken: '',
    twilioAccountSid: '',
    twilioAuthToken: '',
    twilioPhoneNumber: '',
    googleClientId: '',
    googleClientSecret: '',
    emailProvider: 'smtp',
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    // USSD Integration settings
    ussdEnabled: false,
    ussdProviders: {
      twilio: { enabled: false, accountSid: '', authToken: '', phoneNumber: '' },
      tnm: { enabled: false, apiKey: '', shortCode: '', serviceCode: '' },
      airtel: { enabled: false, clientId: '', clientSecret: '', shortCode: '' }
    }
  });


  // Fetch candidates
  const { data: candidates } = useQuery({
    queryKey: ["/api/candidates"],
  });

  const { data: politicalParties } = useQuery({
    queryKey: ["/api/political-parties"],
  });

  // Fetch polling centers
  const { data: pollingCenters } = useQuery({
    queryKey: ["/api/polling-centers"],
  });

  // Fetch constituencies for dropdown
  const { data: constituencies } = useQuery({
    queryKey: ["/api/constituencies"],
  });

  // Fetch USSD providers
  const { data: ussdProviders } = useQuery({
    queryKey: ["/api/ussd-providers"],
  });

  // Fetch WhatsApp providers
  const { data: whatsappProviders } = useQuery({
    queryKey: ["/api/whatsapp-providers"],
  });

  // Fetch wards for councilor dropdown
  const { data: wards } = useQuery({
    queryKey: ["/api/wards"],
  });

  // Toggle USSD provider mutation
  const toggleUssdProviderMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await apiRequest("PUT", `/api/ussd-providers/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "USSD provider updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ussd-providers"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update USSD provider",
        variant: "destructive",
      });
    },
  });

  // Toggle WhatsApp provider mutation
  const toggleWhatsappProviderMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await apiRequest("PUT", `/api/whatsapp-providers/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success", 
        description: "WhatsApp provider updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-providers"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update WhatsApp provider",
        variant: "destructive",
      });
    },
  });

  // Save provider configuration mutation
  const saveProviderConfigMutation = useMutation({
    mutationFn: async ({ id, type, configuration }: { id: string; type: string; configuration: any }) => {
      const endpoint = type === 'whatsapp' ? `/api/whatsapp-providers/${id}` : `/api/ussd-providers/${id}`;
      const res = await apiRequest("PUT", endpoint, { configuration });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Provider configuration saved successfully",
      });
      setConfiguringProvider(null);
      queryClient.invalidateQueries({ queryKey: ["/api/ussd-providers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp-providers"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save provider configuration",
        variant: "destructive",
      });
    },
  });

  // Toggle candidate active status
  const toggleCandidateMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const endpoint = isActive ? `/api/candidates/${id}/deactivate` : `/api/candidates/${id}/reactivate`;
      const res = await apiRequest("PUT", endpoint);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Candidate status updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update candidate status",
        variant: "destructive",
      });
    },
  });

  // Toggle polling center active status
  const togglePollingCenterMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const endpoint = isActive ? `/api/polling-centers/${id}/deactivate` : `/api/polling-centers/${id}/reactivate`;
      const res = await apiRequest("PUT", endpoint);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Polling center status updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/polling-centers"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update polling center status",
        variant: "destructive",
      });
    },
  });

  // Update polling center
  const updatePollingCenterMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; constituency: string; district: string; state: string; registeredVoters: number }) => {
      const res = await apiRequest("PUT", `/api/polling-centers/${data.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Polling center updated successfully",
      });
      setEditingCenter(null);
      queryClient.invalidateQueries({ queryKey: ["/api/polling-centers"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update polling center",
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

  // Save API settings mutation
  const saveApiSettingsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/api-settings", apiSettings);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings saved",
        description: "API integration settings have been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save API settings",
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

  // Bulk upload polling centers mutation
  const bulkUploadPollingCentersMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/admin/bulk-upload/polling-centers', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to upload');
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      const { created, errors } = data;
      let description = `Successfully uploaded ${created} polling centers.`;
      
      if (errors.length > 0) {
        description += ` ${errors.length} rows had errors. Check console for details.`;
        console.error('Upload errors:', errors);
      }
      
      toast({
        title: "Upload Complete",
        description,
        variant: errors.length > 0 ? "destructive" : "default",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/polling-centers"] });
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload polling centers",
        variant: "destructive",
      });
    },
  });

  // Bulk upload candidates mutation
  const bulkUploadCandidatesMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/admin/bulk-upload/candidates', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to upload');
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      const { created, errors } = data;
      let description = `Successfully uploaded ${created} candidates.`;
      
      if (errors.length > 0) {
        description += ` ${errors.length} rows had errors. Check console for details.`;
        console.error('Upload errors:', errors);
      }
      
      toast({
        title: "Upload Complete",
        description,
        variant: errors.length > 0 ? "destructive" : "default",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/candidates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/political-parties"] });
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload candidates",
        variant: "destructive",
      });
    },
  });


  const handleAddCandidate = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    const name = formData.get('candidateName') as string;
    const abbreviation = formData.get('candidateAbbreviation') as string;
    
    // Auto-generate abbreviation if not provided
    const finalAbbreviation = abbreviation || 
      name.split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .join('');
    
    const candidateData = {
      name,
      party: formData.get('candidateParty'),
      category: selectedCategory,
      constituency: formData.get('candidateConstituency'),
      abbreviation: finalAbbreviation,
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

  const handleBulkUploadPollingCenters = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const file = formData.get('pollingCentersFile') as File;
    
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to upload",
        variant: "destructive",
      });
      return;
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please select a CSV file",
        variant: "destructive",
      });
      return;
    }

    bulkUploadPollingCentersMutation.mutate(file);
    event.currentTarget.reset();
  };

  const handleBulkUploadCandidates = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const file = formData.get('candidatesFile') as File;
    
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to upload",
        variant: "destructive",
      });
      return;
    }

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please select a CSV file",
        variant: "destructive",
      });
      return;
    }

    bulkUploadCandidatesMutation.mutate(file);
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
        <TabsList className="grid w-full grid-cols-5">
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
          <TabsTrigger value="api" data-testid="tab-api">
            <Zap className="w-4 h-4 mr-2" />
            API & Integrations
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
                <Users className="w-5 h-5" />
                User Management Tools
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                User approval and management has been moved to the User Management page for better organization.
              </p>
              <Button
                onClick={() => window.location.href = '/user-management'}
                className="w-full"
                data-testid="button-goto-user-management"
              >
                <Users className="h-4 w-4 mr-2" />
                Go to User Management
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="candidates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Add New Candidate</CardTitle>
              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Download CSV template
                    window.open('/api/template/candidates-csv', '_blank');
                  }}
                  data-testid="button-download-candidate-template"
                >
                  <Database className="h-4 w-4 mr-2" />
                  Download CSV Template
                </Button>
              </div>
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
                  <Select name="candidateParty" required>
                    <SelectTrigger data-testid="select-candidate-party">
                      <SelectValue placeholder="Select political party" />
                    </SelectTrigger>
                    <SelectContent>
                      {politicalParties && Array.isArray(politicalParties) && politicalParties
                        .filter((party: any) => party.isActive)
                        .map((party: any) => (
                          <SelectItem key={party.id} value={party.name}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: party.color || '#6B7280' }}
                              />
                              <span>{party.name}</span>
                              {party.abbreviation && (
                                <span className="text-gray-500">({party.abbreviation})</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    name="candidateAbbreviation"
                    placeholder="Abbreviation (optional - auto-generated from name if empty)"
                    data-testid="input-candidate-abbreviation"
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
                  
                  {selectedCategory === "mp" && (
                    <Select name="candidateConstituency" required>
                      <SelectTrigger data-testid="select-candidate-constituency">
                        <SelectValue placeholder="Select Constituency" />
                      </SelectTrigger>
                      <SelectContent>
                        {constituencies && Array.isArray(constituencies) && constituencies
                          .filter((constituency: any) => constituency.isActive)
                          .map((constituency: any) => (
                            <SelectItem key={constituency.id} value={constituency.name}>
                              {constituency.name} ({constituency.district})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                  
                  {selectedCategory === "councilor" && (
                    <Select name="candidateConstituency" required>
                      <SelectTrigger data-testid="select-candidate-ward">
                        <SelectValue placeholder="Select Ward" />
                      </SelectTrigger>
                      <SelectContent>
                        {wards && Array.isArray(wards) && wards
                          .filter((ward: any) => ward.isActive)
                          .map((ward: any) => (
                            <SelectItem key={ward.id} value={ward.name}>
                              {ward.name} ({ward.id})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
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
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Bulk Upload Candidates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">CSV Format Requirements:</h4>
                  <p className="text-sm text-green-800 mb-2">
                    Your CSV file must include these columns (case-insensitive):
                  </p>
                  <div className="text-sm text-green-700 font-mono bg-green-100 p-2 rounded mb-2">
                    name,party,category,constituency,abbreviation
                  </div>
                  <div className="text-xs text-green-600 space-y-1">
                    <p><strong>Required:</strong> name, party, category</p>
                    <p><strong>Optional:</strong> constituency (for mp/councilor), abbreviation</p>
                    <p><strong>Categories:</strong> president, mp, councilor</p>
                    <p><strong>Example:</strong> John Doe,Democratic Progressive Party,president,,JD</p>
                  </div>
                </div>
                
                <form onSubmit={handleBulkUploadCandidates} className="space-y-4">
                  <div>
                    <Input
                      type="file"
                      accept=".csv"
                      name="candidatesFile"
                      required
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    disabled={bulkUploadCandidatesMutation.isPending}
                    className="w-full"
                  >
                    {bulkUploadCandidatesMutation.isPending ? "Uploading..." : "Upload Candidates"}
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current Candidates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {candidates && Array.isArray(candidates) && candidates.map((candidate: any) => {
                  const party = politicalParties?.find((p: any) => p.id === candidate.partyId || p.name === candidate.party);
                  return (
                    <div key={candidate.id} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{candidate.name}</p>
                          {!candidate.isActive && (
                            <Badge variant="outline" className="text-red-600 border-red-300">
                              Disabled
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {party && (
                            <div className="flex items-center gap-1">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: party.color || '#6B7280' }}
                              />
                              <span className="text-sm text-gray-600">{party.name}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="secondary">{candidate.category}</Badge>
                          {candidate.constituency && (
                            <Badge variant="outline">{candidate.constituency}</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            toast({
                              title: "Edit Candidate",
                              description: `Edit functionality for ${candidate.name} will be implemented.`,
                            });
                          }}
                          data-testid={`button-edit-candidate-${candidate.id}`}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Are you sure you want to ${candidate.isActive ? 'disable' : 'enable'} ${candidate.name}?`)) {
                              toggleCandidateMutation.mutate({ id: candidate.id, isActive: candidate.isActive });
                            }
                          }}
                          disabled={toggleCandidateMutation.isPending}
                          className={candidate.isActive ? "text-orange-600 hover:text-orange-700" : "text-green-600 hover:text-green-700"}
                          data-testid={`button-toggle-candidate-${candidate.id}`}
                        >
                          {candidate.isActive ? (
                            <>
                              <ToggleLeft className="h-3 w-3 mr-1" />
                              Disable
                            </>
                          ) : (
                            <>
                              <ToggleRight className="h-3 w-3 mr-1" />
                              Enable
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Are you sure you want to permanently delete ${candidate.name}? This action cannot be undone.`)) {
                              toast({
                                title: "Candidate Deleted",
                                description: `${candidate.name} has been permanently removed.`,
                                variant: "destructive",
                              });
                            }
                          }}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                          data-testid={`button-delete-candidate-${candidate.id}`}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  );
                })}
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
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                Bulk Upload Polling Centers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">CSV Format Requirements:</h4>
                  <p className="text-sm text-blue-800 mb-2">
                    Your CSV file must include these columns (case-insensitive):
                  </p>
                  <div className="text-sm text-blue-700 font-mono bg-blue-100 p-2 rounded">
                    code,name,constituency,district,state,registeredvoters
                  </div>
                  <p className="text-xs text-blue-600 mt-2">
                    Example: PC001,Primary School,Lilongwe Central,Lilongwe,Central,1500
                  </p>
                </div>
                
                <form onSubmit={handleBulkUploadPollingCenters} className="space-y-4">
                  <div>
                    <Input
                      type="file"
                      accept=".csv"
                      name="pollingCentersFile"
                      required
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    disabled={bulkUploadPollingCentersMutation.isPending}
                    className="w-full"
                  >
                    {bulkUploadPollingCentersMutation.isPending ? "Uploading..." : "Upload Polling Centers"}
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current Polling Centers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pollingCenters && Array.isArray(pollingCenters) && pollingCenters.map((center: any) => (
                  <div key={center.id} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{center.code} - {center.name}</p>
                        {!center.isActive && (
                          <Badge variant="outline" className="text-red-600 border-red-300">
                            Disabled
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {center.constituency}, {center.district}, {center.state}
                      </p>
                      <p className="text-sm text-blue-600 mt-1">
                        {center.registeredVoters.toLocaleString()} registered voters
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingCenter(center)}
                        data-testid={`button-edit-center-${center.id}`}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Are you sure you want to ${center.isActive ? 'disable' : 'enable'} polling center ${center.code}?`)) {
                            togglePollingCenterMutation.mutate({ id: center.id, isActive: center.isActive });
                          }
                        }}
                        disabled={togglePollingCenterMutation.isPending}
                        className={center.isActive ? "text-orange-600 hover:text-orange-700" : "text-green-600 hover:text-green-700"}
                        data-testid={`button-toggle-center-${center.id}`}
                      >
                        {center.isActive ? (
                          <>
                            <ToggleLeft className="h-3 w-3 mr-1" />
                            Disable
                          </>
                        ) : (
                          <>
                            <ToggleRight className="h-3 w-3 mr-1" />
                            Enable
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Are you sure you want to permanently delete polling center ${center.code} - ${center.name}? This action cannot be undone.`)) {
                            toast({
                              title: "Polling Center Deleted",
                              description: `${center.code} - ${center.name} has been permanently removed.`,
                              variant: "destructive",
                            });
                          }
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        data-testid={`button-delete-center-${center.id}`}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Edit Polling Center Modal */}
          {editingCenter && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold mb-4">Edit Polling Center</h3>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    updatePollingCenterMutation.mutate({
                      id: editingCenter.id,
                      name: formData.get("name") as string,
                      constituency: formData.get("constituency") as string,
                      district: formData.get("district") as string,
                      state: formData.get("state") as string,
                      registeredVoters: parseInt(formData.get("registeredVoters") as string),
                    });
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium mb-1">Name</label>
                    <input
                      type="text"
                      name="name"
                      defaultValue={editingCenter.name}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      data-testid="input-edit-center-name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Constituency</label>
                    <input
                      type="text"
                      name="constituency"
                      defaultValue={editingCenter.constituency}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      data-testid="input-edit-center-constituency"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">District</label>
                    <input
                      type="text"
                      name="district"
                      defaultValue={editingCenter.district}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      data-testid="input-edit-center-district"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">State/Region</label>
                    <input
                      type="text"
                      name="state"
                      defaultValue={editingCenter.state}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      data-testid="input-edit-center-state"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Registered Voters</label>
                    <input
                      type="number"
                      name="registeredVoters"
                      defaultValue={editingCenter.registeredVoters}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      data-testid="input-edit-center-voters"
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button
                      type="submit"
                      disabled={updatePollingCenterMutation.isPending}
                      data-testid="button-save-center-edit"
                    >
                      {updatePollingCenterMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditingCenter(null)}
                      data-testid="button-cancel-center-edit"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <div className="grid gap-6">
            {/* 2FA Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Two-Factor Authentication (2FA)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Enable 2FA for all users</p>
                      <p className="text-sm text-gray-600">
                        Require users to set up 2FA for enhanced security
                      </p>
                    </div>
                    <Checkbox
                      checked={apiSettings.twoFaEnabled}
                      onCheckedChange={(checked) =>
                        setApiSettings(prev => ({ ...prev, twoFaEnabled: checked as boolean }))
                      }
                      data-testid="checkbox-2fa-enabled"
                    />
                  </div>
                  {apiSettings.twoFaEnabled && (
                    <div className="space-y-3 border-l-4 border-blue-500 pl-4">
                      <div>
                        <label className="text-sm font-medium">2FA Provider</label>
                        <Select
                          value={apiSettings.twoFaProvider}
                          onValueChange={(value) =>
                            setApiSettings(prev => ({ ...prev, twoFaProvider: value }))
                          }
                        >
                          <SelectTrigger data-testid="select-2fa-provider">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="authenticator">Authenticator Apps (TOTP)</SelectItem>
                            <SelectItem value="twilio">Twilio SMS</SelectItem>
                            <SelectItem value="google">Google Authenticator</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {apiSettings.twoFaProvider === 'twilio' && (
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <label className="text-sm font-medium">Twilio Account SID</label>
                            <Input
                              value={apiSettings.twilioAccountSid}
                              onChange={(e) =>
                                setApiSettings(prev => ({ ...prev, twilioAccountSid: e.target.value }))
                              }
                              placeholder="AC..."
                              data-testid="input-twilio-sid"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Twilio Auth Token</label>
                            <Input
                              type="password"
                              value={apiSettings.twilioAuthToken}
                              onChange={(e) =>
                                setApiSettings(prev => ({ ...prev, twilioAuthToken: e.target.value }))
                              }
                              placeholder="Your auth token"
                              data-testid="input-twilio-token"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Twilio Phone Number</label>
                            <Input
                              value={apiSettings.twilioPhoneNumber}
                              onChange={(e) =>
                                setApiSettings(prev => ({ ...prev, twilioPhoneNumber: e.target.value }))
                              }
                              placeholder="+1234567890"
                              data-testid="input-twilio-phone"
                            />
                          </div>
                        </div>
                      )}

                      {apiSettings.twoFaProvider === 'google' && (
                        <div className="grid grid-cols-1 gap-3">
                          <div>
                            <label className="text-sm font-medium">Google Client ID</label>
                            <Input
                              value={apiSettings.googleClientId}
                              onChange={(e) =>
                                setApiSettings(prev => ({ ...prev, googleClientId: e.target.value }))
                              }
                              placeholder="Your Google OAuth Client ID"
                              data-testid="input-google-client-id"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Google Client Secret</label>
                            <Input
                              type="password"
                              value={apiSettings.googleClientSecret}
                              onChange={(e) =>
                                setApiSettings(prev => ({ ...prev, googleClientSecret: e.target.value }))
                              }
                              placeholder="Your Google OAuth Client Secret"
                              data-testid="input-google-client-secret"
                            />
                          </div>
                        </div>
                      )}

                      <p className="text-sm text-blue-600">
                        <Shield className="w-4 h-4 inline mr-1" />
                        When enabled, users will be required to set up 2FA using {
                          apiSettings.twoFaProvider === 'authenticator' ? 'authenticator apps' :
                          apiSettings.twoFaProvider === 'twilio' ? 'SMS verification' :
                          'Google Authenticator'
                        }
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* WhatsApp Integration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  WhatsApp Integration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Enable WhatsApp uploads</p>
                      <p className="text-sm text-gray-600">
                        Allow agents to submit results via WhatsApp
                      </p>
                    </div>
                    <Checkbox
                      checked={apiSettings.whatsappEnabled}
                      onCheckedChange={(checked) =>
                        setApiSettings(prev => ({ ...prev, whatsappEnabled: checked as boolean }))
                      }
                      data-testid="checkbox-whatsapp-enabled"
                    />
                  </div>

                  {apiSettings.whatsappEnabled && (
                    <div className="space-y-4 border-l-4 border-green-500 pl-4 bg-green-50 p-4 rounded-lg">
                      <div className="text-sm text-green-800 mb-3">
                        <p className="font-medium">WhatsApp Business API Configuration</p>
                        <p>Configure your Meta WhatsApp Business Platform credentials to enable bot functionality.</p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-green-900">Access Token</label>
                        <Input
                          type="password"
                          value={apiSettings.whatsappToken}
                          onChange={(e) =>
                            setApiSettings(prev => ({ ...prev, whatsappToken: e.target.value }))
                          }
                          placeholder="Permanent access token from Meta Business"
                          data-testid="input-whatsapp-token"
                          className="mt-1"
                        />
                        <p className="text-xs text-green-700 mt-1">
                          Get this from developers.facebook.com/apps → Your App → WhatsApp → Configuration
                        </p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-green-900">Phone Number ID</label>
                        <Input
                          value={apiSettings.whatsappPhoneNumberId}
                          onChange={(e) =>
                            setApiSettings(prev => ({ ...prev, whatsappPhoneNumberId: e.target.value }))
                          }
                          placeholder="Phone number ID from WhatsApp Business"
                          data-testid="input-whatsapp-phone-id"
                          className="mt-1"
                        />
                        <p className="text-xs text-green-700 mt-1">
                          Found in WhatsApp Business API → Phone Numbers section
                        </p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-green-900">Webhook Verify Token</label>
                        <Input
                          type="password"
                          value={apiSettings.whatsappWebhookVerifyToken}
                          onChange={(e) =>
                            setApiSettings(prev => ({ ...prev, whatsappWebhookVerifyToken: e.target.value }))
                          }
                          placeholder="Custom secure token for webhook verification"
                          data-testid="input-whatsapp-verify-token"
                          className="mt-1"
                        />
                        <p className="text-xs text-green-700 mt-1">
                          Create a secure random string to verify webhook calls from Meta
                        </p>
                      </div>
                      
                      <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
                        <p className="font-medium text-blue-900 mb-1">Webhook URL:</p>
                        <code className="text-blue-800 bg-blue-100 px-2 py-1 rounded">
                          {window.location.origin}/api/whatsapp/webhook
                        </code>
                        <p className="text-blue-700 mt-1 text-xs">
                          Configure this URL in your WhatsApp Business Platform webhook settings
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Available WhatsApp Providers */}
                  {apiSettings.whatsappEnabled && whatsappProviders && whatsappProviders.length > 0 && (
                    <div className="mt-6 space-y-4">
                      <h4 className="font-medium text-green-900">Available WhatsApp Providers</h4>
                      <div className="grid gap-4">
                        {whatsappProviders.map((provider) => (
                          <div key={provider.id} className="bg-green-50 border border-green-200 rounded p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p className="font-medium text-green-900">{provider.name}</p>
                                <p className="text-sm text-green-700">{provider.configuration?.description || `${provider.type} WhatsApp service`}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={provider.isPrimary ? "default" : "secondary"}>
                                  {provider.isPrimary ? "Primary" : "Alternative"}
                                </Badge>
                                <Badge variant={provider.isActive ? "default" : "outline"}>
                                  {provider.isActive ? "Active" : "Inactive"}
                                </Badge>
                                <Checkbox
                                  checked={provider.isActive}
                                  onCheckedChange={(checked) =>
                                    toggleWhatsappProviderMutation.mutate({
                                      id: provider.id,
                                      isActive: checked as boolean
                                    })
                                  }
                                  data-testid={`checkbox-${provider.type}-whatsapp`}
                                />
                              </div>
                            </div>
                            {provider.configuration?.features && (
                              <div className="text-xs text-green-700">
                                <strong>Features:</strong> {provider.configuration.features.join(', ')}
                              </div>
                            )}
                            {provider.configuration?.pricing && (
                              <div className="text-xs text-green-600 mt-1">
                                <strong>Pricing:</strong> {provider.configuration.pricing}
                              </div>
                            )}
                            {provider.configuration?.webhookUrl && (
                              <div className="text-xs text-green-700 bg-green-100 p-2 rounded mt-2">
                                <strong>Webhook:</strong> {provider.configuration.webhookUrl}
                              </div>
                            )}
                            
                            {/* Configuration Interface */}
                            <div className="mt-3">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setConfiguringProvider({
                                    type: 'whatsapp',
                                    id: provider.id,
                                    name: provider.name,
                                    currentConfig: provider.configuration
                                  });
                                  setProviderConfig({
                                    apiKey: provider.configuration?.apiKey || '',
                                    accountSid: provider.configuration?.accountSid || '',
                                    authToken: provider.configuration?.authToken || '',
                                    phoneNumber: provider.configuration?.phoneNumber || '',
                                    shortCode: provider.configuration?.shortCode || '',
                                    clientId: provider.configuration?.clientId || '',
                                    clientSecret: provider.configuration?.clientSecret || '',
                                    webhookUrl: provider.configuration?.webhookUrl || '',
                                    description: provider.configuration?.description || ''
                                  });
                                }}
                                className="text-green-700 hover:text-green-800"
                                data-testid={`button-configure-${provider.type}-whatsapp`}
                              >
                                <Edit className="w-3 h-3 mr-1" />
                                Configure
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* USSD Integration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  USSD Integration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Enable USSD Services</p>
                      <p className="text-sm text-gray-600">
                        Allow agents to register and submit results via USSD
                      </p>
                    </div>
                    <Checkbox
                      checked={apiSettings.ussdEnabled}
                      onCheckedChange={(checked) =>
                        setApiSettings(prev => ({ ...prev, ussdEnabled: checked as boolean }))
                      }
                      data-testid="checkbox-ussd-enabled"
                    />
                  </div>

                  {apiSettings.ussdEnabled && (
                    <div className="space-y-6 border-l-4 border-yellow-500 pl-4">
                      <p className="text-sm text-yellow-700 bg-yellow-50 p-3 rounded">
                        <Zap className="w-4 h-4 inline mr-1" />
                        Multiple USSD providers can be enabled concurrently for redundancy and better coverage
                      </p>

                      {/* Dynamic USSD Providers from Database */}
                      {ussdProviders?.map((provider) => (
                        <div key={provider.id} className="bg-blue-50 border border-blue-200 rounded p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="font-medium text-blue-900">{provider.name}</p>
                              <p className="text-sm text-blue-700">{provider.configuration?.description || `${provider.type} USSD service`}</p>
                              {provider.configuration?.supportedCountries && (
                                <p className="text-xs text-blue-600 mt-1">
                                  Countries: {provider.configuration.supportedCountries.join(', ')}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={provider.isActive ? "default" : "secondary"}>
                                {provider.isActive ? "Active" : "Inactive"}
                              </Badge>
                              <Checkbox
                                checked={provider.isActive}
                                onCheckedChange={(checked) =>
                                  toggleUssdProviderMutation.mutate({
                                    id: provider.id,
                                    isActive: checked as boolean
                                  })
                                }
                                data-testid={`checkbox-${provider.type}-ussd`}
                              />
                            </div>
                          </div>
                          {provider.configuration?.webhookUrl && (
                            <div className="text-xs text-blue-700 bg-blue-100 p-2 rounded">
                              <strong>Webhook:</strong> {provider.configuration.webhookUrl}
                            </div>
                          )}
                          
                          {/* Configuration Interface */}
                          <div className="mt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setConfiguringProvider({
                                  type: 'ussd',
                                  id: provider.id,
                                  name: provider.name,
                                  currentConfig: provider.configuration
                                });
                                setProviderConfig({
                                  apiKey: provider.configuration?.apiKey || '',
                                  accountSid: provider.configuration?.accountSid || '',
                                  authToken: provider.configuration?.authToken || '',
                                  phoneNumber: provider.configuration?.phoneNumber || '',
                                  shortCode: provider.configuration?.shortCode || '',
                                  clientId: provider.configuration?.clientId || '',
                                  clientSecret: provider.configuration?.clientSecret || '',
                                  webhookUrl: provider.configuration?.webhookUrl || '',
                                  description: provider.configuration?.description || ''
                                });
                              }}
                              className="text-blue-700 hover:text-blue-800"
                              data-testid={`button-configure-${provider.type}-ussd`}
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              Configure
                            </Button>
                          </div>
                        </div>
                      ))}

                      {/* Legacy Twilio Config */}
                      <div className="bg-blue-50 border border-blue-200 rounded p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-medium text-blue-900">Twilio USSD</p>
                            <p className="text-sm text-blue-700">Global USSD service via Twilio</p>
                          </div>
                          <Checkbox
                            checked={apiSettings.ussdProviders.twilio.enabled}
                            onCheckedChange={(checked) =>
                              setApiSettings(prev => ({
                                ...prev,
                                ussdProviders: {
                                  ...prev.ussdProviders,
                                  twilio: { ...prev.ussdProviders.twilio, enabled: checked as boolean }
                                }
                              }))
                            }
                            data-testid="checkbox-twilio-ussd"
                          />
                        </div>
                        {apiSettings.ussdProviders.twilio.enabled && (
                          <div className="grid grid-cols-1 gap-3 mt-3">
                            <div>
                              <label className="text-sm font-medium text-blue-900">Account SID</label>
                              <Input
                                value={apiSettings.ussdProviders.twilio.accountSid}
                                onChange={(e) =>
                                  setApiSettings(prev => ({
                                    ...prev,
                                    ussdProviders: {
                                      ...prev.ussdProviders,
                                      twilio: { ...prev.ussdProviders.twilio, accountSid: e.target.value }
                                    }
                                  }))
                                }
                                placeholder="AC..."
                                data-testid="input-twilio-ussd-sid"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-blue-900">Auth Token</label>
                              <Input
                                type="password"
                                value={apiSettings.ussdProviders.twilio.authToken}
                                onChange={(e) =>
                                  setApiSettings(prev => ({
                                    ...prev,
                                    ussdProviders: {
                                      ...prev.ussdProviders,
                                      twilio: { ...prev.ussdProviders.twilio, authToken: e.target.value }
                                    }
                                  }))
                                }
                                placeholder="Your Twilio auth token"
                                data-testid="input-twilio-ussd-token"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-blue-900">USSD Phone Number</label>
                              <Input
                                value={apiSettings.ussdProviders.twilio.phoneNumber}
                                onChange={(e) =>
                                  setApiSettings(prev => ({
                                    ...prev,
                                    ussdProviders: {
                                      ...prev.ussdProviders,
                                      twilio: { ...prev.ussdProviders.twilio, phoneNumber: e.target.value }
                                    }
                                  }))
                                }
                                placeholder="*123#"
                                data-testid="input-twilio-ussd-number"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* TNM USSD */}
                      <div className="bg-green-50 border border-green-200 rounded p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-medium text-green-900">TNM USSD</p>
                            <p className="text-sm text-green-700">Telekom Networks Malawi USSD service</p>
                          </div>
                          <Checkbox
                            checked={apiSettings.ussdProviders.tnm.enabled}
                            onCheckedChange={(checked) =>
                              setApiSettings(prev => ({
                                ...prev,
                                ussdProviders: {
                                  ...prev.ussdProviders,
                                  tnm: { ...prev.ussdProviders.tnm, enabled: checked as boolean }
                                }
                              }))
                            }
                            data-testid="checkbox-tnm-ussd"
                          />
                        </div>
                        {apiSettings.ussdProviders.tnm.enabled && (
                          <div className="grid grid-cols-1 gap-3 mt-3">
                            <div>
                              <label className="text-sm font-medium text-green-900">API Key</label>
                              <Input
                                type="password"
                                value={apiSettings.ussdProviders.tnm.apiKey}
                                onChange={(e) =>
                                  setApiSettings(prev => ({
                                    ...prev,
                                    ussdProviders: {
                                      ...prev.ussdProviders,
                                      tnm: { ...prev.ussdProviders.tnm, apiKey: e.target.value }
                                    }
                                  }))
                                }
                                placeholder="Your TNM API key"
                                data-testid="input-tnm-api-key"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-green-900">Short Code</label>
                              <Input
                                value={apiSettings.ussdProviders.tnm.shortCode}
                                onChange={(e) =>
                                  setApiSettings(prev => ({
                                    ...prev,
                                    ussdProviders: {
                                      ...prev.ussdProviders,
                                      tnm: { ...prev.ussdProviders.tnm, shortCode: e.target.value }
                                    }
                                  }))
                                }
                                placeholder="12345"
                                data-testid="input-tnm-short-code"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-green-900">Service Code</label>
                              <Input
                                value={apiSettings.ussdProviders.tnm.serviceCode}
                                onChange={(e) =>
                                  setApiSettings(prev => ({
                                    ...prev,
                                    ussdProviders: {
                                      ...prev.ussdProviders,
                                      tnm: { ...prev.ussdProviders.tnm, serviceCode: e.target.value }
                                    }
                                  }))
                                }
                                placeholder="*123*45#"
                                data-testid="input-tnm-service-code"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Airtel USSD */}
                      <div className="bg-red-50 border border-red-200 rounded p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-medium text-red-900">Airtel USSD</p>
                            <p className="text-sm text-red-700">Airtel network USSD integration</p>
                          </div>
                          <Checkbox
                            checked={apiSettings.ussdProviders.airtel.enabled}
                            onCheckedChange={(checked) =>
                              setApiSettings(prev => ({
                                ...prev,
                                ussdProviders: {
                                  ...prev.ussdProviders,
                                  airtel: { ...prev.ussdProviders.airtel, enabled: checked as boolean }
                                }
                              }))
                            }
                            data-testid="checkbox-airtel-ussd"
                          />
                        </div>
                        {apiSettings.ussdProviders.airtel.enabled && (
                          <div className="grid grid-cols-1 gap-3 mt-3">
                            <div>
                              <label className="text-sm font-medium text-red-900">Client ID</label>
                              <Input
                                value={apiSettings.ussdProviders.airtel.clientId}
                                onChange={(e) =>
                                  setApiSettings(prev => ({
                                    ...prev,
                                    ussdProviders: {
                                      ...prev.ussdProviders,
                                      airtel: { ...prev.ussdProviders.airtel, clientId: e.target.value }
                                    }
                                  }))
                                }
                                placeholder="Your Airtel client ID"
                                data-testid="input-airtel-client-id"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-red-900">Client Secret</label>
                              <Input
                                type="password"
                                value={apiSettings.ussdProviders.airtel.clientSecret}
                                onChange={(e) =>
                                  setApiSettings(prev => ({
                                    ...prev,
                                    ussdProviders: {
                                      ...prev.ussdProviders,
                                      airtel: { ...prev.ussdProviders.airtel, clientSecret: e.target.value }
                                    }
                                  }))
                                }
                                placeholder="Your Airtel client secret"
                                data-testid="input-airtel-client-secret"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-red-900">Short Code</label>
                              <Input
                                value={apiSettings.ussdProviders.airtel.shortCode}
                                onChange={(e) =>
                                  setApiSettings(prev => ({
                                    ...prev,
                                    ussdProviders: {
                                      ...prev.ussdProviders,
                                      airtel: { ...prev.ussdProviders.airtel, shortCode: e.target.value }
                                    }
                                  }))
                                }
                                placeholder="*456#"
                                data-testid="input-airtel-short-code"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="bg-purple-50 border border-purple-200 rounded p-3 text-sm">
                        <p className="font-medium text-purple-900 mb-2">USSD Webhook Endpoints:</p>
                        <div className="space-y-1 text-purple-800">
                          <div>
                            <strong>Twilio:</strong> <code className="bg-purple-100 px-2 py-1 rounded">{window.location.origin}/api/ussd/twilio</code>
                          </div>
                          <div>
                            <strong>TNM:</strong> <code className="bg-purple-100 px-2 py-1 rounded">{window.location.origin}/api/ussd/tnm</code>
                          </div>
                          <div>
                            <strong>Airtel:</strong> <code className="bg-purple-100 px-2 py-1 rounded">{window.location.origin}/api/ussd/airtel</code>
                          </div>
                        </div>
                        <p className="text-purple-700 mt-2 text-xs">
                          Configure these URLs in your respective USSD provider dashboards
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Email Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  Email Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Enable password reset emails</p>
                      <p className="text-sm text-gray-600">
                        Allow users to reset passwords via email
                      </p>
                    </div>
                    <Checkbox
                      checked={apiSettings.passwordResetEnabled}
                      onCheckedChange={(checked) =>
                        setApiSettings(prev => ({ ...prev, passwordResetEnabled: checked as boolean }))
                      }
                      data-testid="checkbox-password-reset-enabled"
                    />
                  </div>

                  {apiSettings.passwordResetEnabled && (
                    <div className="space-y-3 border-l-4 border-blue-500 pl-4">
                      <div>
                        <label className="text-sm font-medium">Email Provider</label>
                        <Select
                          value={apiSettings.emailProvider}
                          onValueChange={(value) =>
                            setApiSettings(prev => ({ ...prev, emailProvider: value }))
                          }
                        >
                          <SelectTrigger data-testid="select-email-provider">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="smtp">SMTP</SelectItem>
                            <SelectItem value="sendgrid">SendGrid</SelectItem>
                            <SelectItem value="mailgun">Mailgun</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {apiSettings.emailProvider === 'smtp' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-sm font-medium">SMTP Host</label>
                            <Input
                              value={apiSettings.smtpHost}
                              onChange={(e) =>
                                setApiSettings(prev => ({ ...prev, smtpHost: e.target.value }))
                              }
                              placeholder="smtp.example.com"
                              data-testid="input-smtp-host"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">SMTP Port</label>
                            <Input
                              type="number"
                              value={apiSettings.smtpPort}
                              onChange={(e) =>
                                setApiSettings(prev => ({ ...prev, smtpPort: parseInt(e.target.value) }))
                              }
                              data-testid="input-smtp-port"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">SMTP Username</label>
                            <Input
                              value={apiSettings.smtpUser}
                              onChange={(e) =>
                                setApiSettings(prev => ({ ...prev, smtpUser: e.target.value }))
                              }
                              placeholder="username@example.com"
                              data-testid="input-smtp-user"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">SMTP Password</label>
                            <Input
                              type="password"
                              value={apiSettings.smtpPassword}
                              onChange={(e) =>
                                setApiSettings(prev => ({ ...prev, smtpPassword: e.target.value }))
                              }
                              placeholder="App password"
                              data-testid="input-smtp-password"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <Button
                    onClick={() => saveApiSettingsMutation.mutate()}
                    disabled={saveApiSettingsMutation.isPending}
                    data-testid="button-save-api-settings"
                  >
                    <Key className="w-4 h-4 mr-2" />
                    Save API Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
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

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="clean-ussd-sessions"
                      checked={cleanupOptions.ussdSessions}
                      onCheckedChange={(checked) =>
                        setCleanupOptions(prev => ({ ...prev, ussdSessions: checked as boolean }))
                      }
                      data-testid="checkbox-clean-ussd-sessions"
                    />
                    <label htmlFor="clean-ussd-sessions" className="text-sm font-medium">
                      USSD Sessions
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="clean-ussd-providers"
                      checked={cleanupOptions.ussdProviders}
                      onCheckedChange={(checked) =>
                        setCleanupOptions(prev => ({ ...prev, ussdProviders: checked as boolean }))
                      }
                      data-testid="checkbox-clean-ussd-providers"
                    />
                    <label htmlFor="clean-ussd-providers" className="text-sm font-medium">
                      USSD Provider Configurations
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="clean-user-sessions"
                      checked={cleanupOptions.userSessions}
                      onCheckedChange={(checked) =>
                        setCleanupOptions(prev => ({ ...prev, userSessions: checked as boolean }))
                      }
                      data-testid="checkbox-clean-user-sessions"
                    />
                    <label htmlFor="clean-user-sessions" className="text-sm font-medium">
                      User Sessions (Force Re-login)
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

      {/* Provider Configuration Dialog */}
      <Dialog open={!!configuringProvider} onOpenChange={() => setConfiguringProvider(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Configure {configuringProvider?.name} ({configuringProvider?.type?.toUpperCase()})
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input
                value={providerConfig.description}
                onChange={(e) => setProviderConfig(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Provider description"
                data-testid="input-provider-description"
              />
            </div>

            {configuringProvider?.type === 'whatsapp' && (
              <>
                <div>
                  <label className="text-sm font-medium">WhatsApp API Key</label>
                  <Input
                    type="password"
                    value={providerConfig.apiKey}
                    onChange={(e) => setProviderConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                    placeholder="WhatsApp Business API key"
                    data-testid="input-whatsapp-api-key"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Phone Number</label>
                  <Input
                    value={providerConfig.phoneNumber}
                    onChange={(e) => setProviderConfig(prev => ({ ...prev, phoneNumber: e.target.value }))}
                    placeholder="WhatsApp phone number"
                    data-testid="input-whatsapp-phone"
                  />
                </div>
              </>
            )}

            {configuringProvider?.type === 'ussd' && (
              <>
                <div>
                  <label className="text-sm font-medium">Account SID / Client ID</label>
                  <Input
                    value={providerConfig.accountSid || providerConfig.clientId}
                    onChange={(e) => setProviderConfig(prev => ({ 
                      ...prev, 
                      accountSid: e.target.value,
                      clientId: e.target.value 
                    }))}
                    placeholder="Account SID or Client ID"
                    data-testid="input-ussd-account-id"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Auth Token / Client Secret</label>
                  <Input
                    type="password"
                    value={providerConfig.authToken || providerConfig.clientSecret}
                    onChange={(e) => setProviderConfig(prev => ({ 
                      ...prev, 
                      authToken: e.target.value,
                      clientSecret: e.target.value 
                    }))}
                    placeholder="Auth token or client secret"
                    data-testid="input-ussd-auth-token"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">USSD Short Code</label>
                  <Input
                    value={providerConfig.shortCode}
                    onChange={(e) => setProviderConfig(prev => ({ ...prev, shortCode: e.target.value }))}
                    placeholder="USSD short code (e.g., *123#)"
                    data-testid="input-ussd-short-code"
                  />
                </div>
              </>
            )}

            <div>
              <label className="text-sm font-medium">Webhook URL (Optional)</label>
              <Input
                value={providerConfig.webhookUrl}
                onChange={(e) => setProviderConfig(prev => ({ ...prev, webhookUrl: e.target.value }))}
                placeholder="https://your-webhook-url.com/webhook"
                data-testid="input-provider-webhook"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setConfiguringProvider(null)}
                data-testid="button-cancel-configure"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (configuringProvider) {
                    saveProviderConfigMutation.mutate({
                      id: configuringProvider.id,
                      type: configuringProvider.type,
                      configuration: providerConfig
                    });
                  }
                }}
                disabled={saveProviderConfigMutation.isPending}
                data-testid="button-save-configure"
              >
                {saveProviderConfigMutation.isPending ? "Saving..." : "Save Configuration"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}