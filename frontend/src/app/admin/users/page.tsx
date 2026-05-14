'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client';
import { User } from '../../../lib/types';
import { queryKeys } from '../../../lib/query-client';
import { useRealtime } from '../../../lib/realtime';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Users,
  UserPlus,
  Edit,
  Trash2,
  Search,
  Filter,
  MoreHorizontal,
  Shield,
  Mail,
  Phone,
  Calendar,
  Activity,
  Ban,
  CheckCircle,
  XCircle,
  Key,
  Settings,
  UserCheck,
  UserX,
  Crown,
  ShieldCheck,
  RefreshCw,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

// Role interface for UI display
interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
  color: string;
}

export default function UsersPage() {
   const [searchTerm, setSearchTerm] = useState('');
   const [roleFilter, setRoleFilter] = useState('all');
   const [statusFilter, setStatusFilter] = useState('all');
   const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
   const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
   const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
   const [selectedUser, setSelectedUser] = useState<User | null>(null);
   const [userToDelete, setUserToDelete] = useState<User | null>(null);
   const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
   const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

   const queryClient = useQueryClient();
   const { subscribe, emitAfterApiCall } = useRealtime();

  // Form states
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'CUSTOMER',
    status: 'active',
    sendWelcomeEmail: true,
    emailVerified: true  // Default to true for admin-created users
  });

  // Queries with pagination and optimized loading
   const { data: usersData, isLoading: loadingUsers, isFetching, error: usersError, refetch: refetchUsers } = useQuery({
     queryKey: [queryKeys.users, searchTerm, roleFilter, statusFilter],
     queryFn: async () => {
       try {
         const response = await apiClient.getUsers({
           page: 1,
           limit: 50, // Paginated loading for better performance
           search: searchTerm || undefined,
           role: roleFilter !== 'all' ? roleFilter : undefined,
           isActive: statusFilter !== 'all' ? statusFilter === 'active' : undefined
         });
         return response.data || {};
       } catch (error: any) {
         console.error('Failed to fetch users:', error);
         // Return empty data instead of throwing to prevent infinite retries
         return { users: [], pagination: { total: 0, pages: 0, currentPage: 1, limit: 50 } };
       }
     },
     staleTime: 30000, // Consider data fresh for 30 seconds
     gcTime: 300000, // Keep in cache for 5 minutes
     refetchOnWindowFocus: false, // Don't refetch on window focus for better UX
     refetchInterval: 60000, // Auto-refresh every 60 seconds for real-time updates
     refetchIntervalInBackground: false, // Don't refetch when tab is not active
     retry: (failureCount, error: any) => {
       // Don't retry on 4xx errors (client errors)
       if (error?.response?.status >= 400 && error?.response?.status < 500) {
         return false;
       }
       return failureCount < 3;
     },
     retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
   });

  const users = usersData?.users || [];
  const pagination = usersData?.pagination || {};

  // Mock roles for display (since roles aren't implemented in backend yet)
  const roles: Role[] = [
    {
      id: 'admin',
      name: 'Administrator',
      description: 'Full system access and control',
      permissions: ['all'],
      userCount: users.filter((u: User) => u.role === 'ADMIN').length,
      color: 'red'
    },
    {
      id: 'seller',
      name: 'Seller',
      description: 'Manage products, orders, and customers',
      permissions: ['products.manage', 'orders.manage', 'customers.view', 'analytics.view'],
      userCount: users.filter((u: User) => u.role === 'SELLER').length,
      color: 'blue'
    },
    {
      id: 'customer',
      name: 'Customer',
      description: 'Standard user with basic access',
      permissions: ['profile.manage', 'orders.view'],
      userCount: users.filter((u: User) => u.role === 'CUSTOMER').length,
      color: 'green'
    }
  ];

  // Mutations
   const createUserMutation = useMutation({
     mutationFn: (data: any) => apiClient.createUser(data),
     onSuccess: async (data, variables) => {
       // Invalidate and refetch immediately
       await queryClient.invalidateQueries({ queryKey: queryKeys.users });
       await refetchUsers();
       
       // Show enhanced success message with password info
       const password = variables.password || 'TempPass123!';
       const message = variables.emailVerified 
         ? `✅ User created successfully!\n\n📧 Credentials sent to: ${variables.email}\n🔑 Password: ${password}\n\nThe user can now log in with these credentials.`
         : `✅ User created successfully!\n\n📧 Email: ${variables.email}\n⚠️ Email not verified - user needs to complete registration.`;
       
       toast.success(message, { 
         duration: 12000,
         style: {
           minWidth: '400px',
           fontSize: '14px',
           lineHeight: '1.5'
         }
       });
       
       setIsCreateDialogOpen(false);
       resetUserForm();
       setLastUpdate(new Date());
       // Emit real-time event for user creation
       emitAfterApiCall('USER_CREATED', { userId: data?.data?.user?.id, user: data?.data?.user });
     },
     onError: (error: any) => {
       console.error('Create user error:', error);
       const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to create user';
       toast.error(errorMessage);
     },
   });

   const updateUserMutation = useMutation({
     mutationFn: ({ id, data }: { id: number; data: any }) => apiClient.updateUser(id, data),
     onSuccess: async (data, variables) => {
       // Invalidate and refetch immediately with force
       await queryClient.invalidateQueries({ queryKey: queryKeys.users, refetchType: 'all' });
       await queryClient.refetchQueries({ queryKey: queryKeys.users });
       await refetchUsers();
       
       // Show enhanced success message
       const backendMessage = data?.data?.message || 'User updated successfully';
       const credentialsSent = backendMessage.includes('credentials');
       
       const message = credentialsSent
         ? `✅ User updated successfully!\n\n📧 Login credentials have been sent to: ${data?.data?.user?.email}\n\nThe user can now log in with their new credentials.`
         : `✅ ${backendMessage}`;
       
       toast.success(message, {
         duration: credentialsSent ? 10000 : 5000,
         style: credentialsSent ? {
           minWidth: '400px',
           fontSize: '14px',
           lineHeight: '1.5'
         } : undefined
       });
       
       setIsEditDialogOpen(false);
       setSelectedUser(null);
       resetUserForm();
       setLastUpdate(new Date());
       // Emit real-time event for user update
       emitAfterApiCall('USER_UPDATED', { userId: variables.id, user: data?.data?.user });
     },
     onError: (error: any) => {
       console.error('Update user error:', error);
       const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to update user';
       toast.error(errorMessage);
     },
   });

   const updateUserStatusMutation = useMutation({
     mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => apiClient.updateUserStatus(id, isActive),
     onSuccess: async (data, variables) => {
       // Invalidate and refetch immediately
       await queryClient.invalidateQueries({ queryKey: queryKeys.users });
       await refetchUsers();
       toast.success('User status updated successfully');
       setLastUpdate(new Date());
       // Emit real-time event for user status update
       emitAfterApiCall('USER_STATUS_UPDATED', { userId: variables.id, isActive: variables.isActive });
     },
     onError: (error: any) => {
       console.error('Update user status error:', error);
       const errorMessage = error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Failed to update user status';
       toast.error(errorMessage);
     },
   });

   const deleteUserMutation = useMutation({
     mutationFn: (id: number) => apiClient.deleteUser(id),
     onSuccess: async (data, variables) => {
       // Invalidate and refetch immediately
       await queryClient.invalidateQueries({ queryKey: queryKeys.users });
       await refetchUsers();
       toast.success('User deleted successfully');
       setLastUpdate(new Date());
       // Close dialog and clear state
       setIsDeleteDialogOpen(false);
       setUserToDelete(null);
       // Emit real-time event for user deletion
       emitAfterApiCall('USER_DELETED', { userId: variables });
     },
     onError: (error: any) => {
       console.error('Delete user error:', error);
       const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to delete user';
       toast.error(errorMessage);
       // Keep dialog open on error so user can see the error and try again or cancel
     },
   });

  // Event handlers
  const handleCreateUser = () => {
     const userData = {
       name: userForm.name,
       email: userForm.email,
       password: userForm.password || 'TempPass123!',
       role: userForm.role,
       phone: userForm.phone || undefined,
       isActive: userForm.status === 'active',
       emailVerified: userForm.emailVerified  // Include email verification status
     };
     createUserMutation.mutate(userData);
   };

  const handleUpdateUser = () => {
     if (!selectedUser) return;
     const userData = {
       name: userForm.name,
       email: userForm.email,
       role: userForm.role,
       phone: userForm.phone || undefined,
       isActive: userForm.status === 'active',
       emailVerified: userForm.emailVerified  // Include email verification status
     };
     updateUserMutation.mutate({ id: selectedUser.id, data: userData });
   };

  const handleDeleteUser = (userId: number) => {
    const user = users.find((u: User) => u.id === userId);
    if (!user) return;
    
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteUser = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id);
      // Don't close dialog here - let the mutation's onSuccess handler close it
    }
  };

  const cancelDeleteUser = () => {
    setIsDeleteDialogOpen(false);
    setUserToDelete(null);
  };

  const handleBulkAction = async (action: string) => {
    if (selectedUsers.length === 0) return;

    if (action === 'delete') {
      if (!confirm(`Are you sure you want to delete ${selectedUsers.length} users? This action cannot be undone.`)) return;
    }

    try {
      // For bulk actions, we'll need to call the API for each user
      const promises = selectedUsers.map(userId => {
        if (action === 'activate') {
          return updateUserStatusMutation.mutateAsync({ id: userId, isActive: true });
        } else if (action === 'suspend') {
          return updateUserStatusMutation.mutateAsync({ id: userId, isActive: false });
        } else if (action === 'delete') {
          return deleteUserMutation.mutateAsync(userId);
        }
        return Promise.resolve();
      });

      await Promise.all(promises);
      toast.success(`${selectedUsers.length} users ${action}d successfully`);
      setSelectedUsers([]);
    } catch (error) {
      console.error(`Bulk ${action} error:`, error);
      toast.error(`Failed to ${action} some users. Please check the console for details.`);
    }
  };

  const startEditingUser = (user: User) => {
     setSelectedUser(user);
     setUserForm({
       name: user.name,
       email: user.email,
       password: '', // Don't pre-fill password for security
       phone: (user as any).phone || '',
       role: user.role,
       status: (user as any).isActive !== undefined ? ((user as any).isActive ? 'active' : 'inactive') : 'active',
       sendWelcomeEmail: false,
       emailVerified: user.emailVerified || false  // Include current email verification status
     });
     setIsEditDialogOpen(true);
   };

  const resetUserForm = () => {
    setUserForm({
      name: '',
      email: '',
      password: '',
      phone: '',
      role: 'CUSTOMER',
      status: 'active',
      sendWelcomeEmail: true,
      emailVerified: true  // Default to true for new users
    });
  };

  // Real-time subscription setup
  useEffect(() => {
    const subscriptionId = subscribe('USER_*', (event) => {
      console.log('Real-time user event:', event);
      // Auto-refresh data when real-time events are received
      refetchUsers();
      setLastUpdate(new Date());
    });

    return () => {
      // Cleanup subscription on unmount
    };
  }, [subscribe, refetchUsers]);

  const getRolePermissions = (role: string): string[] => {
    const roleData = roles.find(r => r.name.toLowerCase() === role.toLowerCase());
    return roleData?.permissions || [];
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <Crown className="w-4 h-4 text-red-500" />;
      case 'SELLER':
        return <ShieldCheck className="w-4 h-4 text-blue-500" />;
      case 'CUSTOMER':
        return <UserCheck className="w-4 h-4 text-green-500" />;
      default:
        return <Users className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (isActive: boolean | undefined) => {
     if (isActive === undefined) return <Badge className="bg-blue-100 text-blue-800">Unknown</Badge>;
     return isActive ? (
       <Badge className="bg-green-100 text-green-800">Active</Badge>
     ) : (
       <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>
     );
   };

  // Remove client-side filtering since backend now handles it
  const filteredUsers = users;

  if (loadingUsers) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
          </div>
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg border">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                  <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
                </div>
                <div className="h-6 w-6 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters Skeleton */}
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex flex-wrap gap-4">
            <div className="h-10 bg-gray-200 rounded w-64 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded w-40 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded w-40 animate-pulse"></div>
          </div>
        </div>

        {/* Table Skeleton */}
        <div className="bg-white rounded-lg border">
          <div className="p-6">
            <div className="space-y-4">
              {/* Table Header */}
              <div className="grid grid-cols-6 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-4 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
              {/* Table Rows */}
              {[...Array(8)].map((_, i) => (
                <div key={i} className="grid grid-cols-6 gap-4">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Loading Message */}
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-700">Loading users...</p>
          <p className="text-sm text-gray-500">Please wait while we fetch the data from the database</p>
        </div>
      </div>
    );
  }

  // Error state
  if (usersError && !loadingUsers) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Failed to Load Users</h2>
          <p className="text-gray-600 mb-4">
            {(usersError as any)?.response?.data?.message || usersError?.message || 'There was an error loading the user data. Please check your connection and try again.'}
          </p>
          <div className="space-y-2">
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: queryKeys.users })}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
            <p className="text-xs text-gray-500">
              If the problem persists, please check that the backend server is running and accessible.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
         <div>
           <h2 className="text-3xl font-bold text-gray-900">User Management</h2>
           <p className="text-gray-600 mt-1">
             Manage users, roles, and permissions with real-time database synchronization
             {!loadingUsers && <span className="ml-2 text-blue-600 font-medium">({pagination.total || users.length} total users)</span>}
             <span className="ml-2 text-xs text-gray-400">
               Last updated: {lastUpdate.toLocaleTimeString()}
             </span>
           </p>
         </div>

         <div className="flex gap-2">
           <Button
             variant="outline"
             onClick={() => queryClient.invalidateQueries({ queryKey: queryKeys.users })}
             disabled={loadingUsers || isFetching}
           >
             <RefreshCw className={`w-4 h-4 mr-2 ${(loadingUsers || isFetching) ? 'animate-spin' : ''}`} />
             {isFetching ? 'Refreshing...' : 'Refresh'}
           </Button>

           <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
             <DialogTrigger asChild>
               <Button>
                 <UserPlus className="w-4 h-4 mr-2" />
                 Add User
               </Button>
             </DialogTrigger>
             <DialogContent className="max-w-md">
               <DialogHeader>
                 <DialogTitle>Create New User</DialogTitle>
                 <p className="text-sm text-gray-600">Add a new user to the system with appropriate role and permissions.</p>
               </DialogHeader>
               <UserForm
                 formData={userForm}
                 setFormData={setUserForm}
                 roles={roles}
                 onSubmit={handleCreateUser}
                 onCancel={() => setIsCreateDialogOpen(false)}
                 submitLabel="Create User"
                 isLoading={createUserMutation.isPending}
                 selectedUser={null}
               />
             </DialogContent>
           </Dialog>
         </div>
       </div>

      {/* User Statistics */}
       {!loadingUsers && users.length > 0 && (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
           <Card>
             <CardHeader className="pb-2">
               <CardTitle className="text-sm font-medium flex items-center">
                 <Users className="w-4 h-4 mr-2" />
                 Total Users
               </CardTitle>
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold">{pagination.total || users.length}</div>
               <p className="text-xs text-gray-500 mt-1">
                 {pagination.pages > 1 ? `${pagination.pages} pages` : 'Single page'}
               </p>
             </CardContent>
           </Card>

           <Card>
             <CardHeader className="pb-2">
               <CardTitle className="text-sm font-medium flex items-center">
                 <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                 Active Users
               </CardTitle>
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold text-green-600">
                 {users.filter((u: User) => (u as any).isActive).length}
               </div>
               <p className="text-xs text-gray-500 mt-1">
                 {Math.round((users.filter((u: User) => (u as any).isActive).length / users.length) * 100)}% active
               </p>
             </CardContent>
           </Card>

           <Card>
             <CardHeader className="pb-2">
               <CardTitle className="text-sm font-medium flex items-center">
                 <CheckCircle className="w-4 h-4 mr-2 text-blue-500" />
                 Verified Emails
               </CardTitle>
             </CardHeader>
             <CardContent>
               <div className="text-2xl font-bold text-blue-600">
                 {users.filter((u: User) => u.emailVerified).length}
               </div>
               <p className="text-xs text-gray-500 mt-1">
                 {Math.round((users.filter((u: User) => u.emailVerified).length / users.length) * 100)}% verified
               </p>
             </CardContent>
           </Card>

           <Card>
             <CardHeader className="pb-2">
               <CardTitle className="text-sm font-medium flex items-center">
                 <ShieldCheck className="w-4 h-4 mr-2 text-purple-500" />
                 Role Distribution
               </CardTitle>
             </CardHeader>
             <CardContent>
               <div className="text-sm space-y-1">
                 <div className="flex justify-between">
                   <span>Admin:</span>
                   <Badge variant="outline" className="text-xs">{users.filter((u: User) => u.role === 'ADMIN').length}</Badge>
                 </div>
                 <div className="flex justify-between">
                   <span>Seller:</span>
                   <Badge variant="outline" className="text-xs">{users.filter((u: User) => u.role === 'SELLER').length}</Badge>
                 </div>
                 <div className="flex justify-between">
                   <span>Customer:</span>
                   <Badge variant="outline" className="text-xs">{users.filter((u: User) => u.role === 'CUSTOMER').length}</Badge>
                 </div>
               </div>
             </CardContent>
           </Card>
         </div>
       )}

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users" className="flex items-center">
            <Users className="w-4 h-4 mr-2" />
            Users ({pagination.total || users.length})
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center">
            <Shield className="w-4 h-4 mr-2" />
            Roles ({roles.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
           {/* Filters */}
           <Card>
             <CardContent className="pt-6">
               <div className="flex flex-wrap gap-4 items-end">
                 <div className="flex-1 min-w-[200px]">
                   <Label htmlFor="search" className="text-sm font-medium">Search Users</Label>
                   <Input
                     id="search"
                     placeholder="Search by name or email..."
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="w-full"
                   />
                 </div>
                 <div className="min-w-[150px]">
                   <Label htmlFor="role-filter" className="text-sm font-medium">Role</Label>
                   <Select value={roleFilter} onValueChange={setRoleFilter}>
                     <SelectTrigger id="role-filter" className="w-full">
                       <SelectValue placeholder="All Roles" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="all">All Roles</SelectItem>
                       <SelectItem value="ADMIN">Admin</SelectItem>
                       <SelectItem value="SELLER">Seller</SelectItem>
                       <SelectItem value="CUSTOMER">Customer</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
                 <div className="min-w-[150px]">
                   <Label htmlFor="status-filter" className="text-sm font-medium">Status</Label>
                   <Select value={statusFilter} onValueChange={setStatusFilter}>
                     <SelectTrigger id="status-filter" className="w-full">
                       <SelectValue placeholder="All Status" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="all">All Status</SelectItem>
                       <SelectItem value="active">Active</SelectItem>
                       <SelectItem value="inactive">Inactive</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
                 <Button
                   variant="outline"
                   onClick={() => {
                     setSearchTerm('');
                     setRoleFilter('all');
                     setStatusFilter('all');
                   }}
                   className="px-3"
                 >
                   <RefreshCw className="w-4 h-4" />
                 </Button>
               </div>
             </CardContent>
           </Card>

          {/* Bulk Actions */}
          {selectedUsers.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected
                  </span>
                  <div className="flex space-x-2">
                    <Button size="sm" onClick={() => handleBulkAction('activate')}>
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Activate
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleBulkAction('suspend')}>
                      <Ban className="w-4 h-4 mr-1" />
                      Suspend
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleBulkAction('delete')}>
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Users Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={selectedUsers.length === users.length && users.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedUsers(users.map((u: User) => u.id));
                          } else {
                            setSelectedUsers([]);
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="text-gray-500">
                          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p className="text-lg font-medium">No users found</p>
                          <p className="text-sm">Try adjusting your search or filters</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user: User) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedUsers.includes(user.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedUsers(prev => [...prev, user.id]);
                              } else {
                                setSelectedUsers(prev => prev.filter(id => id !== user.id));
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-600">
                                {user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">{user.name}</div>
                              <div className="text-sm text-gray-500 flex items-center">
                                <Mail className="w-3 h-3 mr-1" />
                                {user.email}
                              </div>
                              {(user as any).phone && (
                                <div className="text-sm text-gray-500 flex items-center">
                                  <Phone className="w-3 h-3 mr-1" />
                                  {(user as any).phone}
                                </div>
                              )}
                              {user.emailVerified ? (
                                <div className="mt-2 flex items-start space-x-1 bg-green-50 border border-green-200 rounded px-2 py-1">
                                  <CheckCircle className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                                  <span className="text-xs text-green-700 font-medium">
                                    Email verified • Credentials sent
                                  </span>
                                </div>
                              ) : (
                                <div className="mt-2 flex items-start space-x-1 bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
                                  <AlertTriangle className="w-3 h-3 text-yellow-600 mt-0.5 flex-shrink-0" />
                                  <span className="text-xs text-yellow-700 font-medium">
                                    Verify email or ask user to complete account registration
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getRoleIcon(user.role)}
                            <Badge variant="outline">{user.role}</Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge((user as any).isActive)}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{new Date(user.createdAt).toLocaleDateString()}</div>
                            <div className="text-gray-500 text-xs">
                              {new Date(user.createdAt).toLocaleTimeString()}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => startEditingUser(user)}
                              title="Edit user"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteUser(user.id)}
                              title="Delete user"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roles.map((role) => (
              <Card key={role.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center space-x-2">
                      {getRoleIcon(role.name.toUpperCase())}
                      <span>{role.name}</span>
                    </CardTitle>
                    <Badge variant="outline">{role.userCount} users</Badge>
                  </div>
                  <CardDescription>{role.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Permissions:</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {role.permissions.map((permission, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {permission}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full">
                      <Settings className="w-4 h-4 mr-2" />
                      Edit Role
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <p className="text-sm text-gray-600">Update user information and permissions.</p>
          </DialogHeader>
          <UserForm
            formData={userForm}
            setFormData={setUserForm}
            roles={roles}
            onSubmit={handleUpdateUser}
            onCancel={() => setIsEditDialogOpen(false)}
            submitLabel="Update User"
            isLoading={updateUserMutation.isPending}
            selectedUser={selectedUser}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              <span>Confirm User Deletion</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-800 font-medium mb-2">
                ⚠️ Warning: Deleting this user data will also permanently remove all associated records.
              </p>
              <p className="text-sm text-red-700">
                Please confirm before proceeding.
              </p>
            </div>
            
            {userToDelete && (
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-md p-3">
                  <p className="text-sm font-medium text-gray-900 mb-1">
                    User to be deleted:
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>{userToDelete.name}</strong> ({userToDelete.email})
                  </p>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <p className="text-xs font-medium text-yellow-800 mb-2">
                    The following associated data will also be permanently deleted:
                  </p>
                  <ul className="text-xs text-yellow-700 space-y-1">
                    <li>• All orders and order items</li>
                    <li>• All bookings and payments</li>
                    <li>• All notifications</li>
                    <li>• All reservations</li>
                    <li>• Any blogs or events created</li>
                    <li>• All related transaction history</li>
                  </ul>
                  <p className="text-xs font-medium text-yellow-800 mt-2">
                    This action cannot be undone!
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={cancelDeleteUser}
              disabled={deleteUserMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteUser}
              disabled={deleteUserMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteUserMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Permanently'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface UserFormProps {
   formData: any;
   setFormData: (data: any) => void;
   roles: Role[];
   onSubmit: () => void;
   onCancel: () => void;
   submitLabel: string;
   isLoading?: boolean;
   selectedUser?: User | null;
 }

function UserForm({ formData, setFormData, roles, onSubmit, onCancel, submitLabel, isLoading, selectedUser }: UserFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const queryClient = useQueryClient();
  
  const handleResendCredentials = async () => {
    if (!selectedUser || !selectedUser.emailVerified) return;
    
    if (!confirm(`Resend login credentials to ${selectedUser.email}?`)) return;
    
    setIsResending(true);
    try {
      const password = formData.password || undefined;
      const response = await apiClient.resendUserCredentials(selectedUser.id, password);
      
      toast.success(
        `✅ Credentials resent successfully!\n\n📧 Email sent to: ${selectedUser.email}`,
        { 
          duration: 8000,
          style: {
            minWidth: '400px',
            fontSize: '14px',
            lineHeight: '1.5'
          }
        }
      );
    } catch (error: any) {
      console.error('Resend credentials error:', error);
      const errorMessage = error.response?.data?.error || 'Failed to resend credentials';
      toast.error(errorMessage);
    } finally {
      setIsResending(false);
    }
  };
  
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <Crown className="w-4 h-4 text-red-500" />;
      case 'SELLER':
        return <ShieldCheck className="w-4 h-4 text-blue-500" />;
      case 'CUSTOMER':
        return <UserCheck className="w-4 h-4 text-green-500" />;
      default:
        return <Users className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="user-name">Full Name</Label>
          <Input
            id="user-name"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            placeholder="Enter full name"
          />
        </div>
        <div>
          <Label htmlFor="user-email">Email</Label>
          <Input
            id="user-email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            placeholder="Enter email address"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="user-password">Password</Label>
        <div className="relative">
          <Input
            id="user-password"
            type={showPassword ? "text" : "password"}
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            placeholder="Leave empty for default: TempPass123!"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {showPassword ? <Key className="w-4 h-4" /> : <Key className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {submitLabel === "Create User" ? "Default password: TempPass123! (if left empty)" : "Leave empty to keep current password"}
        </p>
      </div>

      <div>
        <Label htmlFor="user-phone">Phone (Optional)</Label>
        <Input
          id="user-phone"
          value={formData.phone}
          onChange={(e) => setFormData({...formData, phone: e.target.value})}
          placeholder="Enter phone number"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Role</Label>
          <Select
            value={formData.role}
            onValueChange={(value) => setFormData({...formData, role: value})}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.name.toUpperCase()}>
                  <div className="flex items-center space-x-2">
                    {getRoleIcon(role.name.toUpperCase())}
                    <span>{role.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value) => setFormData({...formData, status: value})}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3 border-t pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="email-verified"
              checked={formData.emailVerified}
              onCheckedChange={(checked) => setFormData({...formData, emailVerified: checked})}
            />
            <Label htmlFor="email-verified" className="text-sm font-medium">
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 text-blue-500" />
                <span>Email Verified</span>
              </div>
            </Label>
          </div>
          
          {selectedUser && selectedUser.emailVerified && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleResendCredentials}
              disabled={isResending}
              className="text-xs"
            >
              {isResending ? (
                <>
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-3 h-3 mr-1" />
                  Resend Credentials
                </>
              )}
            </Button>
          )}
        </div>
        <p className="text-xs text-gray-500 ml-6">
          Mark email as verified to allow immediate login without email verification
          {selectedUser && selectedUser.emailVerified && (
            <span className="block mt-1 text-blue-600">
              • Click "Resend Credentials" to send login details again
            </span>
          )}
        </p>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="send-welcome"
            checked={formData.sendWelcomeEmail}
            onCheckedChange={(checked) => setFormData({...formData, sendWelcomeEmail: checked})}
          />
          <Label htmlFor="send-welcome" className="text-sm">
            Send welcome email with login instructions
          </Label>
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={isLoading}>
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </div>
  );
}