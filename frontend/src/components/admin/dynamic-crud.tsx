'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Download,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { SwaggerResource, SwaggerEndpoint, SwaggerSchema } from '@/lib/swagger-parser';
import { apiClient } from '@/lib/api-client';

interface DynamicCrudProps {
  resource: SwaggerResource;
  baseUrl?: string;
}

import { env } from '@/lib/env';

interface CrudData {
  [key: string]: any;
}

export function DynamicCrud({ resource, baseUrl = env.apiUrl }: DynamicCrudProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [selectedItem, setSelectedItem] = useState<CrudData | null>(null);
  const [editingItem, setEditingItem] = useState<CrudData | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const queryClient = useQueryClient();

  // Generate Zod schema from Swagger schema
  const generateZodSchema = (schema: SwaggerSchema | undefined): z.ZodSchema => {
    if (!schema || !schema.properties) {
      return z.object({});
    }

    const shape: Record<string, z.ZodType> = {};

    Object.entries(schema.properties).forEach(([key, prop]: [string, any]) => {
      let fieldSchema: z.ZodType;

      switch (prop.type) {
        case 'string':
          fieldSchema = z.string();
          if (prop.format === 'email') {
            fieldSchema = z.string().email();
          } else if (prop.format === 'date' || prop.format === 'date-time') {
            fieldSchema = z.string();
          }
          break;
        case 'number':
        case 'integer':
          fieldSchema = z.number();
          break;
        case 'boolean':
          fieldSchema = z.boolean();
          break;
        case 'array':
          fieldSchema = z.array(z.any());
          break;
        default:
          fieldSchema = z.any();
      }

      // Make field optional if not required
      if (!schema.required?.includes(key)) {
        fieldSchema = fieldSchema.optional();
      }

      shape[key] = fieldSchema;
    });

    return z.object(shape);
  };

  const zodSchema = generateZodSchema(resource.schema);
  const form = useForm<CrudData>({
    // resolver: zodResolver(zodSchema), // Disabled due to type mismatch
    defaultValues: {},
  });

  // Find CRUD endpoints
  const listEndpoint = resource.endpoints.find(e => e.method === 'get' && !e.path.includes('{'));
  const createEndpoint = resource.endpoints.find(e => e.method === 'post');
  const updateEndpoint = resource.endpoints.find(e => e.method === 'put' || e.method === 'patch');
  const deleteEndpoint = resource.endpoints.find(e => e.method === 'delete');

  // API calls using the existing apiClient
  const fetchData = async () => {
    if (!listEndpoint) return [];

    try {
      // Try to use existing apiClient methods first
      const methodName = `get${resource.displayName.replace(/\s+/g, '')}`;
      if ((apiClient as any)[methodName]) {
        const response = await (apiClient as any)[methodName]({
          page: currentPage,
          limit: pageSize,
          search: searchTerm || undefined,
        });
        return response.success ? response.data : [];
      }

      // Fallback to generic API call
      const response = await apiClient.instance.get(listEndpoint.path, {
        params: { page: currentPage, limit: pageSize, search: searchTerm },
      });
      return response.data?.data || response.data || [];
    } catch (error) {
      console.error('Failed to fetch data:', error);
      return [];
    }
  };

  const createData = async (data: CrudData) => {
    if (!createEndpoint) throw new Error('Create endpoint not available');

    try {
      const methodName = `create${resource.displayName.replace(/\s+/g, '')}`;
      if ((apiClient as any)[methodName]) {
        return await (apiClient as any)[methodName](data);
      }

      const response = await apiClient.instance.post(createEndpoint.path, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const updateData = async (id: string | number, data: CrudData) => {
    if (!updateEndpoint) throw new Error('Update endpoint not available');

    try {
      const methodName = `update${resource.displayName.replace(/\s+/g, '')}`;
      if ((apiClient as any)[methodName]) {
        return await (apiClient as any)[methodName](id, data);
      }

      const path = updateEndpoint.path.replace('{id}', id.toString());
      const response = await apiClient.instance.put(path, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const deleteData = async (id: string | number) => {
    if (!deleteEndpoint) throw new Error('Delete endpoint not available');

    try {
      const methodName = `delete${resource.displayName.replace(/\s+/g, '')}`;
      if ((apiClient as any)[methodName]) {
        return await (apiClient as any)[methodName](id);
      }

      const path = deleteEndpoint.path.replace('{id}', id.toString());
      const response = await apiClient.instance.delete(path);
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  // React Query hooks
  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: [resource.name, currentPage, searchTerm],
    queryFn: fetchData,
    staleTime: 30000,
  });

  const createMutation = useMutation({
    mutationFn: createData,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [resource.name] });
      toast.success(`${resource.displayName} created successfully`);
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create item');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string | number; data: CrudData }) => updateData(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [resource.name] });
      toast.success(`${resource.displayName} updated successfully`);
      setIsEditDialogOpen(false);
      setEditingItem(null);
      form.reset();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update item');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteData,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [resource.name] });
      toast.success(`${resource.displayName} deleted successfully`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete item');
    },
  });

  const handleCreate = (data: CrudData) => {
    createMutation.mutate(data);
  };

  const handleUpdate = (data: CrudData) => {
    if (editingItem?.id) {
      updateMutation.mutate({ id: editingItem.id, data });
    }
  };

  const handleEdit = (item: CrudData) => {
    setEditingItem(item);
    form.reset(item);
    setIsEditDialogOpen(true);
  };

  const handleView = (item: CrudData) => {
    setSelectedItem(item);
    setIsViewDialogOpen(true);
  };

  const handleDelete = (id: string | number) => {
    deleteMutation.mutate(id);
  };

  const renderFormField = (key: string, field: any, schema: any) => {
    const fieldSchema = schema?.properties?.[key];
    const fieldType = fieldSchema?.type || 'string';
    const isRequired = schema?.required?.includes(key);

    switch (fieldType) {
      case 'boolean':
        return (
          <FormField
            key={key}
            control={form.control}
            name={key}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                  {isRequired && <span className="text-red-500 ml-1">*</span>}
                </FormLabel>
                <Select onValueChange={(value) => formField.onChange(value === 'true')} value={formField.value?.toString()}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="true">Yes</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'number':
      case 'integer':
        return (
          <FormField
            key={key}
            control={form.control}
            name={key}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                  {isRequired && <span className="text-red-500 ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder={`Enter ${key}`}
                    {...formField}
                    onChange={(e) => formField.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      case 'string':
        if (fieldSchema?.enum) {
          return (
            <FormField
              key={key}
              control={form.control}
              name={key}
              render={({ field: formField }) => (
                <FormItem>
                  <FormLabel>
                    {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                    {isRequired && <span className="text-red-500 ml-1">*</span>}
                  </FormLabel>
                  <Select onValueChange={formField.onChange} value={formField.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={`Select ${key}`} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {fieldSchema.enum.map((option: string) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          );
        }

        if (fieldSchema?.format === 'date' || fieldSchema?.format === 'date-time') {
          return (
            <FormField
              key={key}
              control={form.control}
              name={key}
              render={({ field: formField }) => (
                <FormItem>
                  <FormLabel>
                    {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                    {isRequired && <span className="text-red-500 ml-1">*</span>}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type={fieldSchema.format === 'date' ? 'date' : 'datetime-local'}
                      {...formField}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          );
        }

        if (key.toLowerCase().includes('description') || key.toLowerCase().includes('notes')) {
          return (
            <FormField
              key={key}
              control={form.control}
              name={key}
              render={({ field: formField }) => (
                <FormItem>
                  <FormLabel>
                    {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                    {isRequired && <span className="text-red-500 ml-1">*</span>}
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={`Enter ${key}`}
                      {...formField}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          );
        }

        return (
          <FormField
            key={key}
            control={form.control}
            name={key}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                  {isRequired && <span className="text-red-500 ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={`Enter ${key}`}
                    {...formField}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );

      default:
        return (
          <FormField
            key={key}
            control={form.control}
            name={key}
            render={({ field: formField }) => (
              <FormItem>
                <FormLabel>
                  {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                  {isRequired && <span className="text-red-500 ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={`Enter ${key}`}
                    {...formField}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
    }
  };

  const getTableColumns = () => {
    if (!resource.schema?.properties) return ['id', 'name', 'actions'];

    const properties = Object.keys(resource.schema.properties);
    const priorityFields = ['id', 'name', 'title', 'email', 'status', 'createdAt', 'updatedAt'];

    // Prioritize important fields and limit to 6 columns
    const selectedFields = priorityFields.filter(field => properties.includes(field)).slice(0, 5);
    if (selectedFields.length < 5) {
      const remainingFields = properties.filter(field => !selectedFields.includes(field));
      selectedFields.push(...remainingFields.slice(0, 5 - selectedFields.length));
    }

    return [...selectedFields, 'actions'];
  };

  const formatCellValue = (value: any, key: string) => {
    if (value === null || value === undefined) return '-';

    if (typeof value === 'boolean') {
      return <Badge variant={value ? 'default' : 'secondary'}>{value ? 'Yes' : 'No'}</Badge>;
    }

    if (key.toLowerCase().includes('date') || key.toLowerCase().includes('time')) {
      try {
        return new Date(value).toLocaleDateString();
      } catch {
        return value;
      }
    }

    if (key.toLowerCase().includes('status')) {
      return <Badge variant="outline">{value}</Badge>;
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  };

  const exportData = () => {
    const csvContent = [
      getTableColumns().filter(col => col !== 'actions').join(','),
      ...items.map((item: CrudData) =>
        getTableColumns()
          .filter(col => col !== 'actions')
          .map(col => `"${item[col] || ''}"`)
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${resource.name}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const columns = getTableColumns();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">{resource.displayName} Management</h2>
          <p className="text-gray-600 mt-1">
            Manage {resource.displayName.toLowerCase()} with full CRUD operations
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportData}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          {createEndpoint && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add {resource.displayName}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New {resource.displayName}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {resource.schema?.properties &&
                        Object.keys(resource.schema.properties).map((key) =>
                          renderFormField(key, null, resource.schema)
                        )}
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCreateDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createMutation.isPending}>
                        {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Create
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder={`Search ${resource.displayName.toLowerCase()}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column}>
                    {column === 'actions' ? '' : column.charAt(0).toUpperCase() + column.slice(1).replace(/([A-Z])/g, ' $1')}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    {columns.map((column) => (
                      <TableCell key={column}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center py-8">
                    No {resource.displayName.toLowerCase()} found
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item: CrudData, index: number) => (
                  <TableRow key={item.id || index}>
                    {columns.map((column) => {
                      if (column === 'actions') {
                        return (
                          <TableCell key={column}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleView(item)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View
                                </DropdownMenuItem>
                                {updateEndpoint && (
                                  <DropdownMenuItem onClick={() => handleEdit(item)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                )}
                                {deleteEndpoint && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                      </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete {resource.displayName}</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete this {resource.displayName.toLowerCase()}?
                                          This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleDelete(item.id)}
                                          className="bg-red-600 hover:bg-red-700"
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        );
                      }

                      return (
                        <TableCell key={column}>
                          {formatCellValue(item[column], column)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit {resource.displayName}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {resource.schema?.properties &&
                  Object.keys(resource.schema.properties).map((key) =>
                    renderFormField(key, null, resource.schema)
                  )}
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Update
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>View {resource.displayName}</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              {resource.schema?.properties &&
                Object.entries(resource.schema.properties).map(([key, schema]: [string, any]) => (
                  <div key={key} className="flex flex-col space-y-1">
                    <label className="text-sm font-medium text-gray-700">
                      {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                    </label>
                    <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {formatCellValue(selectedItem[key], key)}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}