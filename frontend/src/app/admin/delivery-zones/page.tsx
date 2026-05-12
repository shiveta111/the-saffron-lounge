'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client';
import { io, Socket } from 'socket.io-client';
import { env } from '@/lib/env';
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
import { Plus, MoreHorizontal, Edit, Trash2, MapPin, Clock, DollarSign, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const createZoneSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  postcodes: z.array(z.string()).min(1, 'At least one postcode is required'),
  deliveryFee: z.number().min(0, 'Delivery fee cannot be negative'),
  minOrderValue: z.number().min(0).optional(),
  estimatedTime: z.number().min(10, 'Minimum 10 minutes').max(180, 'Maximum 180 minutes'),
  isActive: z.boolean(),
});

type CreateZoneData = z.infer<typeof createZoneSchema>;

interface DeliveryZone {
  id: number;
  name: string;
  postcodes: string[];
  deliveryFee: number;
  minOrderValue?: number;
  estimatedTime: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function DeliveryZonesPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [postcodesInput, setPostcodesInput] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);

  const queryClient = useQueryClient();

  // WebSocket connection for real-time updates
  useEffect(() => {
    // Extract base URL from apiUrl (remove /api/v1)
    const socketUrl = env.apiUrl.split('/api/v1')[0];
    const newSocket = io(socketUrl, {
      path: '/socket.io',
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected for delivery zones');
      newSocket.emit('subscribe:delivery-zones');
    });

    newSocket.on('ZONE_CREATED', (data: any) => {
      console.log('Zone created event received:', data);
      queryClient.invalidateQueries({ queryKey: ['delivery-zones'] });
      toast.success('New delivery zone added');
    });

    newSocket.on('ZONE_UPDATED', (data: any) => {
      console.log('Zone updated event received:', data);
      queryClient.invalidateQueries({ queryKey: ['delivery-zones'] });
      toast.info('Delivery zone updated');
    });

    newSocket.on('ZONE_DELETED', (data: any) => {
      console.log('Zone deleted event received:', data);
      queryClient.invalidateQueries({ queryKey: ['delivery-zones'] });
      toast.info('Delivery zone removed');
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [queryClient]);

  const { data: zonesResponse, isLoading } = useQuery({
    queryKey: ['delivery-zones'],
    queryFn: () => apiClient.getDeliveryZones(),
    refetchInterval: 30000,
  });

  const zones = zonesResponse?.data?.zones || [];

  const createZoneMutation = useMutation({
    mutationFn: (data: CreateZoneData) => apiClient.createDeliveryZone(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-zones'] });
      toast.success('Delivery zone created successfully');
      setIsCreateDialogOpen(false);
      form.reset();
      setPostcodesInput('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create delivery zone');
    },
  });

  const updateZoneMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateZoneData> }) =>
      apiClient.updateDeliveryZone(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-zones'] });
      toast.success('Delivery zone updated successfully');
      setEditingZone(null);
      form.reset();
      setPostcodesInput('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update delivery zone');
    },
  });

  const deleteZoneMutation = useMutation({
    mutationFn: (id: number) => apiClient.deleteDeliveryZone(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-zones'] });
      toast.success('Delivery zone deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete delivery zone');
    },
  });

  const form = useForm<CreateZoneData>({
    resolver: zodResolver(createZoneSchema),
    defaultValues: {
      name: '',
      postcodes: [],
      deliveryFee: 0,
      minOrderValue: 0,
      estimatedTime: 45,
      isActive: true,
    },
  });

  const handleCreate = (data: CreateZoneData) => {
    const postcodes = postcodesInput
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0);
    
    createZoneMutation.mutate({ ...data, postcodes });
  };

  const handleUpdate = (data: CreateZoneData) => {
    if (!editingZone) return;
    
    const postcodes = postcodesInput
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0);
    
    updateZoneMutation.mutate({
      id: editingZone.id,
      data: { ...data, postcodes },
    });
  };

  const handleEdit = (zone: DeliveryZone) => {
    setEditingZone(zone);
    setPostcodesInput(zone.postcodes.join(', '));
    form.reset({
      name: zone.name,
      postcodes: zone.postcodes,
      deliveryFee: zone.deliveryFee,
      minOrderValue: zone.minOrderValue || 0,
      estimatedTime: zone.estimatedTime,
      isActive: zone.isActive,
    });
  };

  const stats = {
    total: zones.length,
    active: zones.filter((z: DeliveryZone) => z.isActive).length,
    totalPostcodes: zones.reduce((sum: number, z: DeliveryZone) => sum + z.postcodes.length, 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Delivery Zones</h2>
          <p className="text-gray-600 mt-1">
            Configure delivery zones, postcodes, and fees
            <span className="ml-2 text-blue-600 font-medium">({stats.total} zones)</span>
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['delivery-zones'] })}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) {
              form.reset();
              setPostcodesInput('');
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Zone
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Delivery Zone</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Zone Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Central London" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div>
                    <Label>Postcodes (comma-separated)</Label>
                    <Input
                      placeholder="SW1, SW2, SW3, W1"
                      value={postcodesInput}
                      onChange={(e) => setPostcodesInput(e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Enter postcodes separated by commas
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="deliveryFee"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Delivery Fee (£)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="3.99"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="minOrderValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Min Order for Free Delivery (£)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="20.00"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="estimatedTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estimated Delivery Time (minutes)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="45"
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
                    <Button type="submit">Create Zone</Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Zones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Zones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Postcodes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.totalPostcodes}</div>
          </CardContent>
        </Card>
      </div>

      {/* Zones Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Zone Name</TableHead>
                <TableHead>Postcodes</TableHead>
                <TableHead>Delivery Fee</TableHead>
                <TableHead>Free Delivery Min</TableHead>
                <TableHead>Est. Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading delivery zones...
                  </TableCell>
                </TableRow>
              ) : zones.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No delivery zones configured. Add your first zone to start.
                  </TableCell>
                </TableRow>
              ) : (
                zones.map((zone: DeliveryZone) => (
                  <TableRow key={zone.id}>
                    <TableCell className="font-medium flex items-center">
                      <MapPin className="w-4 h-4 mr-2" />
                      {zone.name}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {zone.postcodes.slice(0, 3).map((pc: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {pc}
                          </Badge>
                        ))}
                        {zone.postcodes.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{zone.postcodes.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <DollarSign className="w-4 h-4 mr-1" />
                        £{zone.deliveryFee.toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {zone.minOrderValue
                        ? `£${zone.minOrderValue.toFixed(2)}`
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {zone.estimatedTime} min
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={zone.isActive ? 'default' : 'secondary'}>
                        {zone.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(zone)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
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
                                <AlertDialogTitle>Delete Delivery Zone</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{zone.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteZoneMutation.mutate(zone.id)}
                                  className="bg-red-600 hover:bg-red-700"
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
      <Dialog open={!!editingZone} onOpenChange={() => {
        setEditingZone(null);
        setPostcodesInput('');
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Delivery Zone</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zone Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <Label>Postcodes (comma-separated)</Label>
                <Input
                  value={postcodesInput}
                  onChange={(e) => setPostcodesInput(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="deliveryFee"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Fee (£)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="minOrderValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min for Free (£)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="estimatedTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Time (minutes)</FormLabel>
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
                <Button type="button" variant="outline" onClick={() => setEditingZone(null)}>
                  Cancel
                </Button>
                <Button type="submit">Update Zone</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}