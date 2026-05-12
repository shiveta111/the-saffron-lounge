'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/api-client';
import { TeamMember, CreateTeamMemberData } from '../../../lib/types';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../../components/ui/form';
import { Textarea } from '../../../components/ui/textarea';
import { Badge } from '../../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../../components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../../components/ui/alert-dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTeamMemberSchema } from '../../../lib/schemas';
import { format } from 'date-fns';
import { Plus, Search, Filter, MoreHorizontal, Edit, Trash2, Eye, User, Mail, Phone, Calendar, MapPin, Users, Crown, Shield, Wrench, Github, Linkedin, Twitter, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { getImageUrl } from '../../../lib/image-utils';

export default function TeamManagementPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const form = useForm<CreateTeamMemberData>({
    resolver: zodResolver(createTeamMemberSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      role: '',
      bio: '',
      social_links: [],
    },
  });

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      const params: any = {};

      if (searchTerm) params.search = searchTerm;
      if (roleFilter !== 'all') params.role = roleFilter;
      if (statusFilter !== 'all') params.isActive = statusFilter === 'active';

      const response = await apiClient.getTeamMembers(params);
      console.log('📥 Team API Response:', response);
      
      if (response.success) {
        // Handle response structure: {success: true, data: {members: [...]}}
        const teamData = response.data?.members || response.data?.team || response.data?.data || response.data || response.members || [];
        console.log('✅ Extracted team members:', Array.isArray(teamData) ? teamData.length : 0, 'members');
        setTeamMembers(Array.isArray(teamData) ? teamData : []);
      }
    } catch (error: any) {
      toast.error('Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamMembers();
  }, [searchTerm, roleFilter, statusFilter]);

  const handleCreate = async (data: CreateTeamMemberData) => {
    try {
      const formData = new FormData();
      Object.keys(data).forEach(key => {
        if (data[key as keyof CreateTeamMemberData] !== undefined && data[key as keyof CreateTeamMemberData] !== null) {
          if (key === 'social_links' && Array.isArray(data[key])) {
            formData.append(key, JSON.stringify(data[key]));
          } else {
            formData.append(key, data[key as keyof CreateTeamMemberData]?.toString() || '');
          }
        }
      });

      // Add photo if selected
      const imageInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (imageInput?.files?.[0]) {
        formData.append('photo', imageInput.files[0]);
      }

      const response = await apiClient.createTeamMember(formData);
      if (response.success) {
        toast.success('Team member created successfully');
        setIsCreateDialogOpen(false);
        setImagePreview(null);
        form.reset();
        fetchTeamMembers();
        setLastUpdate(new Date());
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create team member');
    }
  };

  const handleUpdate = async (data: CreateTeamMemberData) => {
    if (!editingMember) return;

    try {
      const formData = new FormData();
      Object.keys(data).forEach(key => {
        if (data[key as keyof CreateTeamMemberData] !== undefined && data[key as keyof CreateTeamMemberData] !== null) {
          if (key === 'social_links' && Array.isArray(data[key])) {
            formData.append(key, JSON.stringify(data[key]));
          } else {
            formData.append(key, data[key as keyof CreateTeamMemberData]?.toString() || '');
          }
        }
      });

      // Add photo if selected
      const imageInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (imageInput?.files?.[0]) {
        formData.append('photo', imageInput.files[0]);
      }

      const response = await apiClient.updateTeamMember(editingMember.id, formData);
      if (response.success) {
        toast.success('Team member updated successfully');
        setEditingMember(null);
        setImagePreview(null);
        form.reset();
        fetchTeamMembers();
        setLastUpdate(new Date());
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update team member');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await apiClient.deleteTeamMember(id);
      if (response.success) {
        toast.success('Team member deleted successfully');
        fetchTeamMembers();
        setLastUpdate(new Date());
      }
    } catch (error: any) {
      toast.error('Failed to delete team member');
    }
  };

  const handleEdit = (member: TeamMember) => {
    setEditingMember(member);
    setImagePreview(null);
    form.reset({
      name: member.name,
      email: member.email,
      phone: member.phone || '',
      role: member.role,
      bio: member.bio || '',
      social_links: member.social_links || [],
    });
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
      case 'administrator':
        return <Crown className="w-4 h-4" />;
      case 'manager':
        return <Shield className="w-4 h-4" />;
      case 'developer':
      case 'engineer':
        return <Wrench className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
      case 'administrator':
        return 'bg-purple-100 text-purple-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      case 'developer':
      case 'engineer':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const roles = Array.from(new Set(teamMembers.map(member => member.role)));

  const getTeamStats = () => {
    const stats = {
      total: teamMembers.length,
      active: 0, // teamMembers.filter(m => m.isActive).length,
      inactive: 0, // teamMembers.filter(m => !m.isActive).length,
      roles: roles.length,
      avgTenure: 0, // teamMembers.length > 0 ?
      //   teamMembers.filter(m => m.hireDate).reduce((sum, m) => {
      //     const hireDate = new Date(m.hireDate!);
      //     const now = new Date();
      //     return sum + (now.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
      //   }, 0) / teamMembers.filter(m => m.hireDate).length : 0,
    };
    return stats;
  };

  const stats = getTeamStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Team Management</h2>
          <p className="text-gray-600 mt-1">
            Manage team members, roles, and social profiles with comprehensive member information
            <span className="ml-2 text-blue-600 font-medium">({stats.total} total members)</span>
            <span className="ml-2 text-xs text-gray-400">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </span>
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Team Member
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Team Member</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john@company.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 (555) 123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Administrator">Administrator</SelectItem>
                            <SelectItem value="Manager">Manager</SelectItem>
                            <SelectItem value="Developer">Developer</SelectItem>
                            <SelectItem value="Designer">Designer</SelectItem>
                            <SelectItem value="Marketing">Marketing</SelectItem>
                            <SelectItem value="Sales">Sales</SelectItem>
                            <SelectItem value="Support">Support</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Hire Date field disabled due to schema mismatch */}
                {/* <FormField
                  control={form.control}
                  name="hire_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hire Date (Optional)</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                /> */}

                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Brief biography or description"
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Social Links disabled due to schema mismatch */}
                {/* <div className="space-y-4">
                  <h3 className="font-semibold text-sm">Social Links (Optional)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="social_links.0"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Linkedin className="w-4 h-4" />
                            LinkedIn
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="https://linkedin.com/in/username" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="socialLinks.twitter"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Twitter className="w-4 h-4" />
                            Twitter
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="https://twitter.com/username" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="socialLinks.github"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Github className="w-4 h-4" />
                            GitHub
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="https://github.com/username" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="socialLinks.website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <Globe className="w-4 h-4" />
                            Website
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="https://example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div> */}

                {/* Photo Upload */}
                <div>
                  <FormLabel>Photo</FormLabel>
                  <div className="mt-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {imagePreview && (
                      <div className="mt-2">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-24 h-24 rounded-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Add Member</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Roles</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.roles}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Tenure</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgTenure.toFixed(1)}y</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search team members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roles.map(role => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Members" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Members</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Team Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          Array.from({ length: 8 }).map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-20 h-20 bg-gray-200 rounded-full"></div>
                  <div className="w-24 h-4 bg-gray-200 rounded"></div>
                  <div className="w-16 h-3 bg-gray-200 rounded"></div>
                  <div className="w-20 h-3 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : teamMembers.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No team members found</h3>
            <p className="text-gray-500">Get started by adding your first team member.</p>
          </div>
        ) : (
          teamMembers.map((member) => (
            <Card key={member.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center space-y-4">
                  <Avatar className="w-20 h-20">
                    {/* <AvatarImage src={member.photoUrl} alt={member.name} /> */}
                    <AvatarFallback className="text-lg">
                      {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="text-center">
                    <h3 className="font-semibold text-lg">{member.name}</h3>
                    <div className="flex items-center justify-center gap-2 mt-1">
                      {getRoleIcon(member.role)}
                      <Badge className={getRoleBadgeColor(member.role)}>
                        {member.role}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-center gap-2 mt-2 text-sm text-gray-500">
                      <Mail className="w-3 h-3" />
                      <span className="truncate max-w-[150px]">{member.email}</span>
                    </div>
                    {member.phone && (
                      <div className="flex items-center justify-center gap-2 mt-1 text-sm text-gray-500">
                        <Phone className="w-3 h-3" />
                        <span>{member.phone}</span>
                      </div>
                    )}
                  </div>

                  {member.bio && (
                    <p className="text-sm text-gray-600 text-center line-clamp-3">
                      {member.bio}
                    </p>
                  )}

                  {/* Social Links disabled due to schema mismatch */}
                  {/* {member.socialLinks && (
                    <div className="flex gap-2">
                      {member.socialLinks.linkedin && (
                        <a
                          href={member.socialLinks.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-full bg-blue-50 hover:bg-blue-100 transition-colors"
                        >
                          <Linkedin className="w-4 h-4 text-blue-600" />
                        </a>
                      )}
                      {member.socialLinks.twitter && (
                        <a
                          href={member.socialLinks.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-full bg-blue-50 hover:bg-blue-100 transition-colors"
                        >
                          <Twitter className="w-4 h-4 text-blue-400" />
                        </a>
                      )}
                      {member.socialLinks.github && (
                        <a
                          href={member.socialLinks.github}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-full bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                          <Github className="w-4 h-4 text-gray-700" />
                        </a>
                      )}
                      {member.socialLinks.website && (
                        <a
                          href={member.socialLinks.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-full bg-green-50 hover:bg-green-100 transition-colors"
                        >
                          <Globe className="w-4 h-4 text-green-600" />
                        </a>
                      )}
                    </div>
                  )} */}

                  <div className="flex items-center justify-between w-full pt-4 border-t">
                    <div className="text-xs text-gray-500">
                      {/* Hire date disabled due to schema mismatch */}
                      Join date not set
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedMember(member)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(member)}>
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
                              <AlertDialogTitle>Delete Team Member</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {member.name}?
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(member.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Team Member Details Dialog */}
      <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Team Member Details</DialogTitle>
          </DialogHeader>

          {selectedMember && (
            <div className="space-y-6">
              <div className="flex items-center space-x-4">
                <Avatar className="w-16 h-16">
                  {selectedMember.photo && <AvatarImage src={getImageUrl(selectedMember.photo) || ''} alt={selectedMember.name} />}
                  <AvatarFallback>
                    {selectedMember.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">{selectedMember.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {getRoleIcon(selectedMember.role)}
                    <Badge className={getRoleBadgeColor(selectedMember.role)}>
                      {selectedMember.role}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="flex items-center gap-2 mt-1">
                    <Mail className="w-4 h-4" />
                    {selectedMember.email}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <p className="flex items-center gap-2 mt-1">
                    <Phone className="w-4 h-4" />
                    {selectedMember.phone || 'Not provided'}
                  </p>
                </div>
              </div>

              {/* Hire Date disabled due to schema mismatch */}
              {/* <div>
                <label className="text-sm font-medium text-gray-500">Hire Date</label>
                <p className="flex items-center gap-2 mt-1">
                  <Calendar className="w-4 h-4" />
                  {selectedMember.hireDate
                    ? format(new Date(selectedMember.hireDate), 'PPP')
                    : 'Not set'
                  }
                </p>
              </div> */}

              {selectedMember.bio && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Bio</label>
                  <p className="mt-1 text-sm text-gray-700">{selectedMember.bio}</p>
                </div>
              )}

              {/* Social Links disabled due to schema mismatch */}
              {/* {selectedMember.socialLinks && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Social Links</label>
                  <div className="flex gap-3 mt-2">
                    {selectedMember.socialLinks.linkedin && (
                      <a
                        href={selectedMember.socialLinks.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                      >
                        <Linkedin className="w-4 h-4" />
                        LinkedIn
                      </a>
                    )}
                    {selectedMember.socialLinks.twitter && (
                      <a
                        href={selectedMember.socialLinks.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-400 hover:text-blue-600"
                      >
                        <Twitter className="w-4 h-4" />
                        Twitter
                      </a>
                    )}
                    {selectedMember.socialLinks.github && (
                      <a
                        href={selectedMember.socialLinks.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
                      >
                        <Github className="w-4 h-4" />
                        GitHub
                      </a>
                    )}
                    {selectedMember.socialLinks.website && (
                      <a
                        href={selectedMember.socialLinks.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-green-600 hover:text-green-800"
                      >
                        <Globe className="w-4 h-4" />
                        Website
                      </a>
                    )}
                  </div>
                </div>
              )} */}

              <div className="flex justify-between items-center pt-4 border-t text-sm text-gray-500">
                {/* Timestamps disabled due to schema mismatch */}
                <span>Member details</span>
                <span>Team member</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Team Member Dialog */}
      <Dialog open={!!editingMember} onOpenChange={() => setEditingMember(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john@company.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 (555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Administrator">Administrator</SelectItem>
                          <SelectItem value="Manager">Manager</SelectItem>
                          <SelectItem value="Developer">Developer</SelectItem>
                          <SelectItem value="Designer">Designer</SelectItem>
                          <SelectItem value="Marketing">Marketing</SelectItem>
                          <SelectItem value="Sales">Sales</SelectItem>
                          <SelectItem value="Support">Support</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Hire Date field disabled due to schema mismatch */}
              {/* <FormField
                control={form.control}
                name="hireDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hire Date (Optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              /> */}

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief biography or description"
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Social Links disabled due to schema mismatch */}
              {/* <div className="space-y-4">
                <h3 className="font-semibold text-sm">Social Links (Optional)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="socialLinks.linkedin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Linkedin className="w-4 h-4" />
                          LinkedIn
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="https://linkedin.com/in/username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="socialLinks.twitter"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Twitter className="w-4 h-4" />
                          Twitter
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="https://twitter.com/username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="socialLinks.github"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Github className="w-4 h-4" />
                          GitHub
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="https://github.com/username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="socialLinks.website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Globe className="w-4 h-4" />
                          Website
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div> */}

              {/* Photo Upload */}
              <div>
                <FormLabel>Photo</FormLabel>
                <div className="mt-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  {imagePreview && (
                    <div className="mt-2">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-24 h-24 rounded-full object-cover"
                      />
                    </div>
                  )}
                  {editingMember?.photo && !imagePreview && (
                    <div className="mt-2">
                      <img
                        src={getImageUrl(editingMember.photo) || ''}
                        alt="Current"
                        className="w-24 h-24 rounded-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingMember(null)}
                >
                  Cancel
                </Button>
                <Button type="submit">Update Member</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}