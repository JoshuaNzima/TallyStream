import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Users, Shield, UserX, Trash2, UserCheck } from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function UserManagement() {
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: users, isLoading } = useQuery({
    queryKey: ["/api/users"],
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      await apiRequest("PATCH", `/api/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User role updated successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    },
  });

  const deactivateUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/deactivate`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User deactivated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to deactivate user",
        variant: "destructive",
      });
    },
  });

  const reactivateUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/reactivate`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User reactivated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reactivate user",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await apiRequest("DELETE", `/api/admin/users/${userId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  // Only admin users can access this page
  if ((user as any)?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600">You need administrator privileges to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'supervisor':
        return 'default';
      case 'reviewer':
        return 'secondary';
      case 'agent':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900" data-testid="text-user-management-title">
          User Management
        </h2>
        <p className="text-gray-600">Manage user roles and permissions</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>System Users</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading users...</div>
          ) : (
            <div className="space-y-4">
              {users && Array.isArray(users) && (users as any[]).map((user: any) => (
                <div key={user.id} className={`flex items-center justify-between p-4 border rounded-lg ${!user.isActive ? 'opacity-60 bg-gray-50' : ''}`}>
                  <div className="flex items-center space-x-4">
                    <img
                      src={user.profileImageUrl || `https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}&background=1565c0&color=fff`}
                      alt="Avatar"
                      className="w-10 h-10 rounded-full"
                    />
                    <div>
                      <div className="font-medium text-gray-900" data-testid={`text-user-name-${user.id}`}>
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-sm text-gray-500" data-testid={`text-user-email-${user.id}`}>
                        {user.email}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <Badge variant={getRoleBadgeVariant(user.role)} data-testid={`badge-user-role-${user.id}`}>
                      {user.role}
                    </Badge>
                    
                    <Select
                      value={user.role}
                      onValueChange={(role) => updateRoleMutation.mutate({ userId: user.id, role })}
                      disabled={updateRoleMutation.isPending}
                    >
                      <SelectTrigger className="w-32" data-testid={`select-role-${user.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="agent">Agent</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="reviewer">Reviewer</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>

                    {user.isActive ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deactivateUserMutation.mutate(user.id)}
                        disabled={deactivateUserMutation.isPending}
                        data-testid={`button-deactivate-${user.id}`}
                      >
                        <UserX className="h-4 w-4 mr-2" />
                        Deactivate
                      </Button>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Badge variant="destructive">Inactive</Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => reactivateUserMutation.mutate(user.id)}
                          disabled={reactivateUserMutation.isPending}
                          data-testid={`button-reactivate-${user.id}`}
                        >
                          <UserCheck className="h-4 w-4 mr-2" />
                          Reactivate
                        </Button>
                      </div>
                    )}

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
                          deleteUserMutation.mutate(user.id);
                        }
                      }}
                      disabled={deleteUserMutation.isPending}
                      data-testid={`button-delete-${user.id}`}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
