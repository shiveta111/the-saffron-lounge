'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client';
import { queryKeys } from '../../../lib/query-client';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Badge } from '../../../components/ui/badge';
import { Checkbox } from '../../../components/ui/checkbox';
import { Progress } from '../../../components/ui/progress';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import {
  Users,
  Package,
  FileText,
  Calendar,
  Tag,
  UserCheck,
  MessageSquare,
  Image,
  Settings,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Upload,
  Trash2,
  Edit,
  Eye,
  RefreshCw,
  Play,
  Pause,
  Archive,
  ArchiveRestore,
  UserX,
  Shield,
  ShieldCheck,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Percent,
  Clock,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';

interface BulkOperation {
  id: string;
  name: string;
  description: string;
  entity: string;
  operation: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  totalItems: number;
  processedItems: number;
  createdAt: string;
  completedAt?: string;
  results?: {
    success: number;
    failed: number;
    errors: string[];
  };
}

interface BulkOperationTemplate {
  id: string;
  name: string;
  description: string;
  entity: string;
  operation: string;
  parameters: Record<string, any>;
  estimatedDuration: number;
  riskLevel: 'low' | 'medium' | 'high';
}

function BulkOperationsPageComponent() {
  const [activeTab, setActiveTab] = useState('operations');
  const [selectedOperation, setSelectedOperation] = useState<BulkOperation | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<BulkOperationTemplate | null>(null);
  const [isExecuteDialogOpen, setIsExecuteDialogOpen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const queryClient = useQueryClient();

  // Mock data for bulk operations history
  const [operations, setOperations] = useState<BulkOperation[]>([
    {
      id: '1',
      name: 'Deactivate Inactive Users',
      description: 'Deactivate users who haven\'t logged in for 90 days',
      entity: 'users',
      operation: 'deactivate',
      status: 'completed',
      progress: 100,
      totalItems: 25,
      processedItems: 25,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      completedAt: new Date(Date.now() - 3600000).toISOString(),
      results: {
        success: 23,
        failed: 2,
        errors: ['User ID 5: Permission denied', 'User ID 12: Account protected']
      }
    },
    {
      id: '2',
      name: 'Update Menu Item Prices',
      description: 'Increase all menu item prices by 5%',
      entity: 'menu',
      operation: 'update_price',
      status: 'running',
      progress: 65,
      totalItems: 50,
      processedItems: 32,
      createdAt: new Date(Date.now() - 1800000).toISOString()
    },
    {
      id: '3',
      name: 'Archive Old Orders',
      description: 'Archive orders older than 2 years',
      entity: 'orders',
      operation: 'archive',
      status: 'pending',
      progress: 0,
      totalItems: 150,
      processedItems: 0,
      createdAt: new Date().toISOString()
    }
  ]);

  // Bulk operation templates
  const templates: BulkOperationTemplate[] = [
    // User operations
    {
      id: 'user_deactivate_inactive',
      name: 'Deactivate Inactive Users',
      description: 'Deactivate users who haven\'t logged in for a specified period',
      entity: 'users',
      operation: 'deactivate',
      parameters: { daysInactive: 90 },
      estimatedDuration: 300,
      riskLevel: 'medium'
    },
    {
      id: 'user_activate_bulk',
      name: 'Activate Selected Users',
      description: 'Activate multiple user accounts at once',
      entity: 'users',
      operation: 'activate',
      parameters: {},
      estimatedDuration: 60,
      riskLevel: 'low'
    },
    {
      id: 'user_delete_bulk',
      name: 'Delete Users (GDPR)',
      description: 'Permanently delete user accounts and associated data',
      entity: 'users',
      operation: 'delete',
      parameters: { includeData: true },
      estimatedDuration: 600,
      riskLevel: 'high'
    },
    {
      id: 'user_change_role',
      name: 'Change User Roles',
      description: 'Update role for multiple users',
      entity: 'users',
      operation: 'change_role',
      parameters: { newRole: 'CUSTOMER' },
      estimatedDuration: 120,
      riskLevel: 'medium'
    },

    // Menu operations
    {
      id: 'menu_price_update',
      name: 'Update Menu Prices',
      description: 'Apply percentage or fixed price changes to menu items',
      entity: 'menu',
      operation: 'update_price',
      parameters: { changeType: 'percentage', value: 5 },
      estimatedDuration: 180,
      riskLevel: 'medium'
    },
    {
      id: 'menu_bulk_availability',
      name: 'Toggle Availability',
      description: 'Enable or disable multiple menu items',
      entity: 'menu',
      operation: 'toggle_availability',
      parameters: { available: false },
      estimatedDuration: 90,
      riskLevel: 'low'
    },
    {
      id: 'menu_category_change',
      name: 'Change Categories',
      description: 'Move multiple menu items to a different category',
      entity: 'menu',
      operation: 'change_category',
      parameters: { newCategoryId: 1 },
      estimatedDuration: 150,
      riskLevel: 'low'
    },

    // Order operations
    {
      id: 'order_status_update',
      name: 'Update Order Status',
      description: 'Change status for multiple orders',
      entity: 'orders',
      operation: 'update_status',
      parameters: { newStatus: 'DELIVERED' },
      estimatedDuration: 120,
      riskLevel: 'medium'
    },
    {
      id: 'order_archive_old',
      name: 'Archive Old Orders',
      description: 'Archive orders older than specified period',
      entity: 'orders',
      operation: 'archive',
      parameters: { olderThanDays: 730 },
      estimatedDuration: 300,
      riskLevel: 'low'
    },

    // Customer operations
    {
      id: 'customer_bulk_email',
      name: 'Send Bulk Email',
      description: 'Send promotional emails to selected customers',
      entity: 'customers',
      operation: 'send_email',
      parameters: { templateId: 'promotion', subject: 'Special Offer' },
      estimatedDuration: 240,
      riskLevel: 'low'
    },
    {
      id: 'customer_loyalty_points',
      name: 'Update Loyalty Points',
      description: 'Add or subtract loyalty points for multiple customers',
      entity: 'customers',
      operation: 'update_loyalty',
      parameters: { operation: 'add', points: 100 },
      estimatedDuration: 90,
      riskLevel: 'low'
    },

    // Content operations
    {
      id: 'content_bulk_publish',
      name: 'Bulk Publish Content',
      description: 'Publish multiple content items at once',
      entity: 'content',
      operation: 'publish',
      parameters: {},
      estimatedDuration: 60,
      riskLevel: 'low'
    },
    {
      id: 'content_bulk_archive',
      name: 'Archive Content',
      description: 'Archive multiple content items',
      entity: 'content',
      operation: 'archive',
      parameters: {},
      estimatedDuration: 90,
      riskLevel: 'low'
    },

    // FAQ operations
    {
      id: 'faq_bulk_category',
      name: 'Change FAQ Categories',
      description: 'Move multiple FAQs to a different category',
      entity: 'faq',
      operation: 'change_category',
      parameters: { newCategory: 'general' },
      estimatedDuration: 120,
      riskLevel: 'low'
    },

    // Gallery operations
    {
      id: 'gallery_bulk_delete',
      name: 'Delete Gallery Items',
      description: 'Remove multiple gallery items',
      entity: 'gallery',
      operation: 'delete',
      parameters: {},
      estimatedDuration: 180,
      riskLevel: 'high'
    }
  ];

  // Simulate progress updates
  useEffect(() => {
    const interval = setInterval(() => {
      setOperations(prev => prev.map(op => {
        if (op.status === 'running' && op.progress < 100) {
          const newProgress = Math.min(op.progress + Math.random() * 10, 100);
          const newProcessed = Math.floor((newProgress / 100) * op.totalItems);

          if (newProgress >= 100) {
            return {
              ...op,
              status: 'completed' as const,
              progress: 100,
              processedItems: op.totalItems,
              completedAt: new Date().toISOString(),
              results: {
                success: Math.floor(op.totalItems * 0.9),
                failed: Math.floor(op.totalItems * 0.1),
                errors: ['Sample error 1', 'Sample error 2']
              }
            };
          }

          return {
            ...op,
            progress: newProgress,
            processedItems: newProcessed
          };
        }
        return op;
      }));
      setLastUpdate(new Date());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const executeBulkOperation = (template: BulkOperationTemplate) => {
    const newOperation: BulkOperation = {
      id: Date.now().toString(),
      name: template.name,
      description: template.description,
      entity: template.entity,
      operation: template.operation,
      status: 'running',
      progress: 0,
      totalItems: Math.floor(Math.random() * 100) + 10,
      processedItems: 0,
      createdAt: new Date().toISOString()
    };

    setOperations(prev => [newOperation, ...prev]);
    setIsExecuteDialogOpen(false);
    setSelectedTemplate(null);
    toast.success(`Bulk operation "${template.name}" started`);
  };

  const getEntityIcon = (entity: string) => {
    switch (entity) {
      case 'users': return <Users className="w-4 h-4" />;
      case 'menu': return <Package className="w-4 h-4" />;
      case 'orders': return <FileText className="w-4 h-4" />;
      case 'bookings': return <Calendar className="w-4 h-4" />;
      case 'customers': return <UserCheck className="w-4 h-4" />;
      case 'content': return <FileText className="w-4 h-4" />;
      case 'faq': return <MessageSquare className="w-4 h-4" />;
      case 'gallery': return <Image className="w-4 h-4" />;
      case 'team': return <UserCheck className="w-4 h-4" />;
      case 'testimonials': return <MessageSquare className="w-4 h-4" />;
      case 'services': return <Settings className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getOperationIcon = (operation: string) => {
    switch (operation) {
      case 'delete': return <Trash2 className="w-4 h-4" />;
      case 'update': return <Edit className="w-4 h-4" />;
      case 'activate': return <CheckCircle className="w-4 h-4" />;
      case 'deactivate': return <XCircle className="w-4 h-4" />;
      case 'archive': return <Archive className="w-4 h-4" />;
      case 'publish': return <Upload className="w-4 h-4" />;
      default: return <Settings className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'running':
        return <Badge className="bg-blue-100 text-blue-800">Running</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'high':
        return <Badge className="bg-red-100 text-red-800">High Risk</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800">Medium Risk</Badge>;
      case 'low':
        return <Badge className="bg-green-100 text-green-800">Low Risk</Badge>;
      default:
        return <Badge variant="secondary">{risk}</Badge>;
    }
  };

  const getOperationStats = () => {
    return {
      total: operations.length,
      completed: operations.filter(op => op.status === 'completed').length,
      running: operations.filter(op => op.status === 'running').length,
      pending: operations.filter(op => op.status === 'pending').length,
      failed: operations.filter(op => op.status === 'failed').length,
      successRate: operations.length > 0 ?
        (operations.filter(op => op.status === 'completed').length / operations.length) * 100 : 0
    };
  };

  const stats = getOperationStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Bulk Operations</h2>
          <p className="text-gray-600 mt-1">
            Execute large-scale operations across multiple entities with progress tracking and safety controls
            <span className="ml-2 text-blue-600 font-medium">({stats.total} total operations)</span>
            <span className="ml-2 text-xs text-gray-400">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </span>
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setOperations([])}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Clear History
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Activity className="w-4 h-4 mr-2" />
              Total Operations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.successRate.toFixed(1)}% success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <p className="text-xs text-gray-500 mt-1">
              Successfully executed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Play className="w-4 h-4 mr-2 text-blue-500" />
              Running
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.running}</div>
            <p className="text-xs text-gray-500 mt-1">
              Currently executing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Clock className="w-4 h-4 mr-2 text-yellow-500" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-gray-500 mt-1">
              Waiting to execute
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="operations" className="flex items-center">
            <Activity className="w-4 h-4 mr-2" />
            Operation History ({operations.length})
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center">
            <Settings className="w-4 h-4 mr-2" />
            Operation Templates ({templates.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="operations" className="space-y-6">
          {/* Operations Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Operation</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[70px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="text-gray-500">
                          <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p className="text-lg font-medium">No bulk operations found</p>
                          <p className="text-sm">Execute operations from the templates tab</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    operations.map((operation) => (
                      <TableRow key={operation.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {getOperationIcon(operation.operation)}
                            <div>
                              <div className="font-medium">{operation.name}</div>
                              <div className="text-sm text-gray-500">{operation.description}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getEntityIcon(operation.entity)}
                            <Badge variant="outline">{operation.entity}</Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(operation.status)}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <Progress value={operation.progress} className="w-20" />
                            <div className="text-xs text-gray-500">
                              {operation.progress.toFixed(1)}%
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{operation.processedItems}/{operation.totalItems}</div>
                            {operation.results && (
                              <div className="text-xs text-gray-500">
                                {operation.results.success} success, {operation.results.failed} failed
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(operation.createdAt).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedOperation(operation)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getEntityIcon(template.entity)}
                      {getOperationIcon(template.operation)}
                    </div>
                    {getRiskBadge(template.riskLevel)}
                  </div>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Entity:</span>
                      <Badge variant="outline">{template.entity}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Duration:</span>
                      <span>{Math.floor(template.estimatedDuration / 60)}m {template.estimatedDuration % 60}s</span>
                    </div>

                    {template.parameters && Object.keys(template.parameters).length > 0 && (
                      <div>
                        <Label className="text-sm font-medium">Parameters:</Label>
                        <div className="mt-1 space-y-1">
                          {Object.entries(template.parameters).map(([key, value]) => (
                            <div key={key} className="text-xs text-gray-600">
                              {key}: {String(value)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Dialog open={isExecuteDialogOpen && selectedTemplate?.id === template.id} onOpenChange={(open) => {
                      setIsExecuteDialogOpen(open);
                      if (!open) setSelectedTemplate(null);
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          className="w-full"
                          onClick={() => setSelectedTemplate(template)}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Execute Operation
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Execute Bulk Operation</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <h3 className="font-medium">{template.name}</h3>
                            <p className="text-sm text-gray-600">{template.description}</p>
                          </div>

                          <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              This operation will affect multiple {template.entity} records.
                              {template.riskLevel === 'high' && ' This is a high-risk operation that cannot be undone.'}
                              {template.riskLevel === 'medium' && ' This operation has moderate risk. Please review before proceeding.'}
                            </AlertDescription>
                          </Alert>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <Label className="font-medium">Estimated Duration:</Label>
                              <p>{Math.floor(template.estimatedDuration / 60)}m {template.estimatedDuration % 60}s</p>
                            </div>
                            <div>
                              <Label className="font-medium">Risk Level:</Label>
                              <p>{getRiskBadge(template.riskLevel)}</p>
                            </div>
                          </div>

                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              onClick={() => setIsExecuteDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={() => executeBulkOperation(template)}
                              className={template.riskLevel === 'high' ? 'bg-red-600 hover:bg-red-700' : ''}
                            >
                              Execute Operation
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Operation Details Dialog */}
      <Dialog open={!!selectedOperation} onOpenChange={() => setSelectedOperation(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Operation Details</DialogTitle>
          </DialogHeader>

          {selectedOperation && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-4">Operation Information</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Name</label>
                      <p className="mt-1 font-medium">{selectedOperation.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Description</label>
                      <p className="mt-1">{selectedOperation.description}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Entity</label>
                      <p className="mt-1">
                        <div className="flex items-center gap-2">
                          {getEntityIcon(selectedOperation.entity)}
                          <Badge variant="outline">{selectedOperation.entity}</Badge>
                        </div>
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Operation</label>
                      <p className="mt-1">
                        <div className="flex items-center gap-2">
                          {getOperationIcon(selectedOperation.operation)}
                          <Badge variant="secondary">{selectedOperation.operation}</Badge>
                        </div>
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Status</label>
                      <p className="mt-1">{getStatusBadge(selectedOperation.status)}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-4">Progress & Results</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Progress</label>
                      <div className="mt-2">
                        <Progress value={selectedOperation.progress} />
                        <p className="text-xs text-gray-500 mt-1">
                          {selectedOperation.progress.toFixed(1)}% complete
                        </p>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Items Processed</label>
                      <p className="mt-1">
                        {selectedOperation.processedItems} / {selectedOperation.totalItems}
                      </p>
                    </div>
                    {selectedOperation.results && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Results</label>
                        <div className="mt-1 space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>Success:</span>
                            <Badge className="bg-green-100 text-green-800">
                              {selectedOperation.results.success}
                            </Badge>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Failed:</span>
                            <Badge className="bg-red-100 text-red-800">
                              {selectedOperation.results.failed}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {selectedOperation.results?.errors && selectedOperation.results.errors.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Errors</h3>
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <ul className="text-sm text-red-700 space-y-1">
                      {selectedOperation.results.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t text-sm text-gray-500">
                <span>Created: {new Date(selectedOperation.createdAt).toLocaleString()}</span>
                {selectedOperation.completedAt && (
                  <span>Completed: {new Date(selectedOperation.completedAt).toLocaleString()}</span>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default BulkOperationsPageComponent;