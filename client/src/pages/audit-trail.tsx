import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { History, Shield } from "lucide-react";
import { format } from "date-fns";

export default function AuditTrail() {
  const { user } = useAuth();

  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ["/api/audit-logs"],
  });

  // Only admin and supervisor users can access this page
  if (user?.role !== 'admin' && user?.role !== 'supervisor') {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600">You need supervisor or administrator privileges to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'default';
      case 'UPDATE':
        return 'secondary';
      case 'DELETE':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900" data-testid="text-audit-trail-title">
          Audit Trail
        </h2>
        <p className="text-gray-600">Track all system activities and changes</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <History className="h-5 w-5" />
            <span>Recent Activities</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading audit logs...</div>
          ) : auditLogs && auditLogs.length > 0 ? (
            <div className="space-y-4">
              {auditLogs.map((log: any) => (
                <div key={log.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <Badge variant={getActionBadgeVariant(log.action)} data-testid={`badge-action-${log.id}`}>
                          {log.action}
                        </Badge>
                        <span className="text-sm font-medium text-gray-900" data-testid={`text-entity-${log.id}`}>
                          {log.entityType} • {log.entityId}
                        </span>
                      </div>
                      
                      <div className="text-sm text-gray-600 mb-2" data-testid={`text-user-${log.id}`}>
                        By: {log.userName || 'Unknown User'}
                        {log.userEmail && <span className="text-gray-500 ml-2">({log.userEmail})</span>}
                      </div>
                      
                      {log.newValues && (
                        <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded mt-2">
                          <pre className="whitespace-pre-wrap">
                            {JSON.stringify(log.newValues, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-right text-sm text-gray-500">
                      <div data-testid={`text-timestamp-${log.id}`}>
                        {format(new Date(log.createdAt), 'MMM dd, yyyy')}
                      </div>
                      <div>
                        {format(new Date(log.createdAt), 'HH:mm:ss')}
                      </div>
                      {log.ipAddress && (
                        <div className="text-xs">
                          IP: {log.ipAddress}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No audit logs found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
