'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Shield,
  Activity,
  Users,
  AlertTriangle,
  Eye,
  RefreshCw,
  Lock,
  Unlock
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

interface AuditLog {
  id: number;
  userId: number;
  userName: string;
  action: string;
  resource: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  success: boolean;
}

interface SecurityAlert {
  id: number;
  type: string;
  message: string;
  severity: string;
  timestamp: string;
}

interface Permission {
  id: number;
  name: string;
  description: string;
  permissions: string[];
}

export default function SecurityPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [activeSessions, setActiveSessions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('audit');

  const fetchSecurityData = async () => {
    try {
      setLoading(true);

      // Fetch audit logs
      const auditResponse = await apiClient.instance.get('/api/security?type=audit');
      if (auditResponse.data.success) {
        setAuditLogs(auditResponse.data.data);
      }

      // Fetch security alerts
      const securityResponse = await apiClient.instance.get('/api/security?type=security');
      if (securityResponse.data.success) {
        setSecurityAlerts(securityResponse.data.data.securityAlerts || []);
        setActiveSessions(securityResponse.data.data.activeSessions || 0);
      }

      // Fetch permissions
      const permissionsResponse = await apiClient.instance.get('/api/security?type=permissions');
      if (permissionsResponse.data.success) {
        setPermissions(permissionsResponse.data.data.roles || []);
      }

    } catch (error) {
      console.error('Failed to fetch security data:', error);
      toast.error('Failed to load security data');
    } finally {
      setLoading(false);
    }
  };

  const logSecurityAction = async (action: string, details: any) => {
    try {
      await apiClient.instance.post('/api/security', {
        action,
        details
      });
      toast.success('Security action logged');
    } catch (error) {
      console.error('Failed to log security action:', error);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'login':
        return 'bg-green-100 text-green-800';
      case 'logout':
        return 'bg-gray-100 text-gray-800';
      case 'create':
      case 'update':
        return 'bg-blue-100 text-blue-800';
      case 'delete':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Security & Audit</h2>
          <p className="text-gray-600 mt-1">Monitor system security and user activities</p>
        </div>
        <Button onClick={fetchSecurityData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSessions}</div>
            <p className="text-xs text-muted-foreground">
              Currently logged in users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{securityAlerts.length}</div>
            <p className="text-xs text-muted-foreground">
              Active security alerts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Audit Entries</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{auditLogs.length}</div>
            <p className="text-xs text-muted-foreground">
              Total logged actions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Security Alerts */}
      {securityAlerts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Active Security Alerts</h3>
          {securityAlerts.map((alert) => (
            <Alert key={alert.id} className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{alert.type}:</span> {alert.message}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getSeverityColor(alert.severity)}>
                      {alert.severity}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      {new Date(alert.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="audit" className="flex items-center">
            <Activity className="w-4 h-4 mr-2" />
            Audit Logs
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center">
            <Shield className="w-4 h-4 mr-2" />
            Permissions
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center">
            <Lock className="w-4 h-4 mr-2" />
            Sessions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="audit" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Audit Logs</CardTitle>
              <CardDescription>Track all administrative and user actions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.userName}</TableCell>
                      <TableCell>
                        <Badge className={getActionColor(log.action)}>
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-600">{log.resource}</TableCell>
                      <TableCell className="font-mono text-sm">{log.ipAddress}</TableCell>
                      <TableCell>
                        <Badge variant={log.success ? 'default' : 'destructive'}>
                          {log.success ? 'Success' : 'Failed'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Role Permissions</CardTitle>
              <CardDescription>Manage user roles and their access permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {permissions.map((role) => (
                  <div key={role.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium">{role.name}</h3>
                        <p className="text-sm text-gray-600">{role.description}</p>
                      </div>
                      <Badge variant="outline">{role.permissions.length} permissions</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {role.permissions.map((permission, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {permission}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>Monitor and manage active user sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Lock className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Session Management</h3>
                <p className="text-gray-600 mb-4">
                  Active session monitoring and management features would be implemented here.
                </p>
                <div className="flex justify-center space-x-2">
                  <Button variant="outline">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Sessions
                  </Button>
                  <Button variant="outline">
                    <Unlock className="w-4 h-4 mr-2" />
                    Force Logout All
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}