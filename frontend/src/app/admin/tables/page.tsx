'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../../components/ui/form';
import { Switch } from '../../../components/ui/switch';
import { Badge } from '../../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../../components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../../components/ui/alert-dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, MoreHorizontal, Edit, Trash2, QrCode, Download, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useWebSocket } from '../../../lib/hooks/useWebSocket';
import { env } from '@/lib/env';

const createTableSchema = z.object({
  tableNumber: z.string().min(1, 'Table number is required').max(50),
  capacity: z.number().min(1, 'Capacity must be at least 1').max(20, 'Capacity cannot exceed 20'),
  location: z.string().max(255).optional(),
  isActive: z.boolean(),
});

type CreateTableData = z.infer<typeof createTableSchema>;

interface TableData {
  id: number;
  tableNumber: string;
  capacity: number;
  location?: string;
  isActive: boolean;
  qrCode?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    orders: number;
    reservations: number;
  };
}

export default function TablesManagementPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<TableData | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [selectedQRTable, setSelectedQRTable] = useState<TableData | null>(null);

  const queryClient = useQueryClient();

  // WebSocket connection for real-time updates
  const { on, off, emit, isConnected } = useWebSocket();

  // Listen for table events via WebSocket
  useEffect(() => {
    if (!isConnected) return;

    // Subscribe to tables updates
    emit('subscribe:tables');

    // Listen for table created event
    const handleTableCreated = (data: any) => {
      console.log('Table created:', data);
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast.success(`Table ${data.table.tableNumber} created`);
    };

    // Listen for table updated event
    const handleTableUpdated = (data: any) => {
      console.log('Table updated:', data);
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast.info(`Table ${data.table.tableNumber} updated`);
    };

    // Listen for table deleted event
    const handleTableDeleted = (data: any) => {
      console.log('Table deleted:', data);
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast.info(`Table ${data.tableNumber} deleted`);
    };

    // Listen for QR code updated event
    const handleQRUpdated = (data: any) => {
      console.log('QR code updated:', data);
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast.info(`QR code regenerated for table ${data.table.tableNumber}`);
    };

    on('TABLE_CREATED', handleTableCreated);
    on('TABLE_UPDATED', handleTableUpdated);
    on('TABLE_DELETED', handleTableDeleted);
    on('TABLE_QR_UPDATED', handleQRUpdated);

    // Cleanup listeners on unmount
    return () => {
      off('TABLE_CREATED', handleTableCreated);
      off('TABLE_UPDATED', handleTableUpdated);
      off('TABLE_DELETED', handleTableDeleted);
      off('TABLE_QR_UPDATED', handleQRUpdated);
    };
  }, [on, off, emit, isConnected, queryClient]);

  // Queries
  const { data: tablesResponse, isLoading } = useQuery({
    queryKey: ['tables'],
    queryFn: () => apiClient.getTables(),
    refetchInterval: 30000,
  });

  const tables = tablesResponse?.data?.tables || [];

  // Mutations
  const createTableMutation = useMutation({
    mutationFn: (data: CreateTableData) => apiClient.createTable(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast.success('Table created successfully with QR code');
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create table');
    },
  });

  const updateTableMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CreateTableData }) =>
      apiClient.updateTable(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast.success('Table updated successfully');
      setEditingTable(null);
      form.reset();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update table');
    },
  });

  const deleteTableMutation = useMutation({
    mutationFn: (id: number) => apiClient.deleteTable(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast.success('Table deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete table');
    },
  });

  const regenerateQRMutation = useMutation({
    mutationFn: (id: number) => apiClient.regenerateQRCode(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast.success('QR code regenerated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to regenerate QR code');
    },
  });

  const form = useForm<CreateTableData>({
    resolver: zodResolver(createTableSchema),
    defaultValues: {
      tableNumber: '',
      capacity: 4,
      location: '',
      isActive: true,
    },
  });

  const handleCreate = (data: CreateTableData) => {
    createTableMutation.mutate(data);
  };

  const handleUpdate = (data: CreateTableData) => {
    if (!editingTable) return;
    updateTableMutation.mutate({ id: editingTable.id, data });
  };

  const handleEdit = (table: TableData) => {
    setEditingTable(table);
    form.reset({
      tableNumber: table.tableNumber,
      capacity: table.capacity,
      location: table.location || '',
      isActive: table.isActive,
    });
  };

  const handleViewQR = async (table: TableData) => {
    try {
      const response = await apiClient.getTableQRDataURL(table.id);
      setQrCodeDataUrl(response.data.qrCodeDataUrl);
      setSelectedQRTable(table);
    } catch (error: any) {
      toast.error('Failed to load QR code');
    }
  };

  const handleDownloadQR = (table: TableData) => {
    if (table.qrCode) {
      const link = document.createElement('a');
      link.href = `${env.apiUrl}${table.qrCode}`;
      link.download = `table-${table.tableNumber}-qr.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const stats = {
    total: tables.length,
    active: tables.filter((t: TableData) => t.isActive).length,
    inactive: tables.filter((t: TableData) => !t.isActive).length,
    totalCapacity: tables.reduce((sum: number, t: TableData) => sum + t.capacity, 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Table Management</h2>
          <p className="text-gray-600 mt-1">
            Manage restaurant tables and QR codes
            <span className="ml-2 text-blue-600 font-medium">({stats.total} tables)</span>
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['tables'] })}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) form.reset();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Table
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Table</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="tableNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Table Number</FormLabel>
                        <FormControl>
                          <Input placeholder="T-01" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Capacity</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="20"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Ground Floor, Window Side" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Active</FormLabel>
                        <FormControl>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                            <span>{field.value ? 'Active' : 'Inactive'}</span>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Create Table</Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistics Cards */}
      {!isLoading && tables.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Tables</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <XCircle className="w-4 h-4 mr-2 text-gray-500" />
                Inactive
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{stats.inactive}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Capacity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.totalCapacity}</div>
              <p className="text-xs text-gray-500">seats</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tables List */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Table Number</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>QR Code</TableHead>
                <TableHead>Orders/Reservations</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading tables...
                  </TableCell>
                </TableRow>
              ) : tables.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No tables found. Create your first table to get started.
                  </TableCell>
                </TableRow>
              ) : (
                tables.map((table: TableData) => (
                  <TableRow key={table.id}>
                    <TableCell className="font-medium">{table.tableNumber}</TableCell>
                    <TableCell>{table.capacity} seats</TableCell>
                    <TableCell>{table.location || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={table.isActive ? 'default' : 'secondary'}>
                        {table.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {table.qrCode ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewQR(table)}
                          >
                            <QrCode className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownloadQR(table)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">Not generated</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{table._count?.orders || 0} orders</div>
                        <div>{table._count?.reservations || 0} reservations</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(table)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => regenerateQRMutation.mutate(table.id)}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Regenerate QR
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewQR(table)}>
                            <QrCode className="mr-2 h-4 w-4" />
                            View QR Code
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Table</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete table "{table.tableNumber}"?
                                  {(table._count?.orders || 0) > 0 || (table._count?.reservations || 0) > 0
                                    ? ' This table has existing orders or reservations and cannot be deleted.'
                                    : ' This action cannot be undone.'}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteTableMutation.mutate(table.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                  disabled={(table._count?.orders || 0) > 0 || (table._count?.reservations || 0) > 0}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingTable} onOpenChange={() => setEditingTable(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Table</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4">
              <FormField
                control={form.control}
                name="tableNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Table Number</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Active</FormLabel>
                    <FormControl>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                        <span>{field.value ? 'Active' : 'Inactive'}</span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setEditingTable(null)}>
                  Cancel
                </Button>
                <Button type="submit">Update Table</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* QR Code View Dialog */}
      <Dialog open={!!qrCodeDataUrl} onOpenChange={() => {
        setQrCodeDataUrl(null);
        setSelectedQRTable(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>QR Code - {selectedQRTable?.tableNumber}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            {qrCodeDataUrl && (
              <img src={qrCodeDataUrl} alt="QR Code" className="w-64 h-64" />
            )}
            <p className="text-sm text-gray-600">
              Scan to order from this table
            </p>
            {selectedQRTable && (
              <Button onClick={() => handleDownloadQR(selectedQRTable)}>
                <Download className="w-4 h-4 mr-2" />
                Download QR Code
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}