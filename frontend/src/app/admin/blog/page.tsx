'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../../../lib/api-client';
import { BlogPost, BlogCategory } from '../../../lib/types';
import { CreateBlogPostData } from '../../../lib/schemas';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../../../components/ui/form';
import { Textarea } from '../../../components/ui/textarea';
import { Badge } from '../../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../../../components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../../components/ui/alert-dialog';
import { Switch } from '../../../components/ui/switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createBlogPostSchema } from '../../../lib/schemas';
import { format } from 'date-fns';
import { Plus, Search, Filter, MoreHorizontal, Edit, Trash2, Eye, FileText, Image, Tag, Calendar, User, TrendingUp, EyeIcon, Save, Globe, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { useRealtime, realtimeManager } from '../../../lib/realtime';
import { getImageUrl } from '../../../lib/image-utils';

export default function BlogManagementPage() {
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [blogCategories, setBlogCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const { isConnected, subscribe, emitAfterApiCall } = useRealtime();

  const form = useForm<CreateBlogPostData>({
    resolver: zodResolver(createBlogPostSchema),
    defaultValues: {
      title: '',
      content: '',
      excerpt: '',
      category: '',
      category_id: undefined,
      tags: [],
      seoTitle: '',
      seoDescription: '',
      seoKeywords: [],
      status: 'DRAFT',
    },
  });

  const fetchBlogCategories = async () => {
    try {
      const response = await apiClient.getBlogCategories({ limit: 100, isActive: true });
      if (response.success && response.data?.categories) {
        setBlogCategories(response.data.categories);
      }
    } catch (error) {
      console.error('Failed to fetch blog categories:', error);
    }
  };

  const fetchBlogPosts = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching blog posts...');

      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (categoryFilter !== 'all') params.category_id = parseInt(categoryFilter);

      console.log('📡 API Call:', '/api/blog', 'Params:', params);

      const response = await apiClient.getBlogPosts(params);
      console.log('📥 Blog API Response:', response);

      if (response.success) {
        // Handle response structure: {success: true, data: {blogs: [...], pagination: {...}}}
        let blogData = response.data?.blogs || response.data?.posts || response.data?.data || response.data || response.blogs || [];
        
        // Handle numeric keys (weird response format)
        if (!Array.isArray(blogData) || blogData.length === 0) {
          const blogsFromProps = [];
          for (const key in response) {
            if (!isNaN(Number(key)) && response[key] && typeof response[key] === 'object') {
              blogsFromProps.push(response[key]);
            }
          }
          if (blogsFromProps.length > 0) {
            blogData = blogsFromProps;
          }
        }
        
        console.log('✅ Extracted blog posts:', Array.isArray(blogData) ? blogData.length : 0, 'posts');
        blogData = Array.isArray(blogData) ? blogData : [];

        // Normalize blog post data structure - map backend fields to frontend fields
        blogData = blogData.map((post: any) => ({
          ...post,
          title: post.title || post.post_title || post.name || 'Untitled',
          content: post.content || post.post_content || post.description || '',
          slug: post.slug || post.post_slug || '',
          featuredImage: post.featuredImage || post.featured_image || post.image || '',
          tags: post.tags || post.post_tags || [],
          publishedStatus: post.publishedStatus || post.published_status || post.status || 'DRAFT',
          metaTitle: post.metaTitle || post.meta_title || post.seo_title || '',
          metaDescription: post.metaDescription || post.meta_description || post.seo_description || '',
          authorId: post.authorId || post.author_id || post.author?.id || 0,
          author: post.author || {
            id: post.author_id || 0,
            username: post.author_name || post.author_username || 'Unknown',
            name: post.author_name || 'Unknown Author'
          },
          createdAt: post.createdAt || post.created_at || post.date_created || new Date().toISOString(),
          updatedAt: post.updatedAt || post.updated_at || post.date_updated || new Date().toISOString(),
          publishedAt: post.publishedAt || post.published_at || post.date_published,
          viewCount: post.viewCount || post.view_count || post.views || 0,
          category: post.category || post.post_category || 'Uncategorized',
          excerpt: post.excerpt || post.post_excerpt || '',
          seoTitle: post.seoTitle || post.seo_title || post.metaTitle || '',
          seoDescription: post.seoDescription || post.seo_description || post.metaDescription || '',
          seoKeywords: post.seoKeywords || post.seo_keywords || [],
          // Convert published_status (boolean) to status (string)
          status: post.status || (post.published_status === true ? 'PUBLISHED' : post.published_status === false ? 'DRAFT' : 'DRAFT'),
          published_status: post.published_status !== undefined ? post.published_status : false,
          id: post.id || post.post_id || post.blog_id || Math.random()
        }));

        console.log('📊 Final processed blog posts:', blogData.length, 'items');
        console.log('📋 Sample blog post:', blogData[0] ? {
          id: blogData[0].id,
          title: blogData[0].title,
          status: blogData[0].status,
          author: blogData[0].author?.username
        } : 'No posts');

        setBlogPosts(blogData);
      } else {
        console.warn('❌ API response not successful:', response);
        setBlogPosts([]);
      }
    } catch (error: any) {
      console.error('❌ Failed to load blog posts:', error);
      console.error('Error details:', {
        message: error?.message,
        response: error?.response,
        status: error?.response?.status,
        data: error?.response?.data
      });
      toast.error(error?.response?.data?.message || error?.message || 'Failed to load blog posts');
      setBlogPosts([]);
    } finally {
      setLoading(false);
    }
  };

  // Real-time updates subscription
  useEffect(() => {
    const subscriptionIds: string[] = [];

    subscriptionIds.push(subscribe('BLOG_POST_CREATED', (event) => {
      console.log('Real-time blog post created:', event.data);
      fetchBlogPosts();
    }));

    subscriptionIds.push(subscribe('BLOG_POST_UPDATED', (event) => {
      console.log('Real-time blog post updated:', event.data);
      fetchBlogPosts();
    }));

    subscriptionIds.push(subscribe('BLOG_POST_DELETED', (event) => {
      console.log('Real-time blog post deleted:', event.data);
      fetchBlogPosts();
    }));

    return () => {
      subscriptionIds.forEach(id => realtimeManager.unsubscribe(id));
    };
  }, []);

  useEffect(() => {
    fetchBlogCategories();
  }, []);

  useEffect(() => {
    fetchBlogPosts();
  }, [searchTerm, statusFilter, categoryFilter]);

  const handleCreate = async (data: CreateBlogPostData) => {
    try {
      // Generate slug from title
      const slug = data.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const formData = new FormData();
      
      // Add required fields
      formData.append('title', data.title);
      formData.append('slug', slug);
      formData.append('content', data.content);
      
      // Add optional fields
      if (data.excerpt) formData.append('excerpt', data.excerpt);
      if (data.category_id) formData.append('category_id', data.category_id.toString());
      if (data.tags && data.tags.length > 0) formData.append('tags', JSON.stringify(data.tags));
      if (data.status) formData.append('status', data.status);
      if (data.seoTitle) formData.append('seoTitle', data.seoTitle);
      if (data.seoDescription) formData.append('seoDescription', data.seoDescription);
      if (data.seoKeywords && data.seoKeywords.length > 0) formData.append('seoKeywords', JSON.stringify(data.seoKeywords));

      // Add image if selected
      if (imageFile) {
        formData.append('featuredImage', imageFile);
      }

      console.log('Creating blog post with FormData:', {
        title: data.title,
        slug,
        hasImage: !!imageFile,
        category_id: data.category_id
      });

      const response = await apiClient.createBlogPost(formData);
      if (response.success) {
        toast.success('Blog post created successfully');
        setIsCreateDialogOpen(false);
        setImagePreview(null);
        setImageFile(null);
        form.reset();
        fetchBlogPosts();
        emitAfterApiCall('BLOG_POST_CREATED', { postId: response.data?.id, title: data.title });
      }
    } catch (error: any) {
      console.error('Create blog post error:', error);
      const errorMessage = error?.response?.data?.error || error?.response?.data?.message || error?.message || 'Failed to create blog post';
      toast.error(errorMessage);
      console.error('Full error details:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status
      });
    }
  };

  const handleUpdate = async (data: CreateBlogPostData) => {
    if (!editingPost) return;

    try {
      const formData = new FormData();
      
      // Always include required fields
      if (data.title) formData.append('title', data.title);
      if (data.content) formData.append('content', data.content);
      
      // Always include status - this is critical for status updates
      if (data.status) {
        formData.append('status', data.status);
      }
      
      // Include optional fields
      if (data.excerpt) formData.append('excerpt', data.excerpt);
      if (data.category_id !== undefined && data.category_id !== null) {
        formData.append('category_id', data.category_id.toString());
      }
      if (data.tags && data.tags.length > 0) {
        formData.append('tags', JSON.stringify(data.tags));
      }
      if (data.seoTitle) formData.append('seoTitle', data.seoTitle);
      if (data.seoDescription) formData.append('seoDescription', data.seoDescription);
      if (data.seoKeywords && data.seoKeywords.length > 0) {
        formData.append('seoKeywords', JSON.stringify(data.seoKeywords));
      }

      // Add image if selected - use state instead of querySelector
      if (imageFile) {
        formData.append('featuredImage', imageFile);
      }

      console.log('Updating blog post with FormData:', {
        id: editingPost.id,
        title: data.title,
        status: data.status,
        hasImage: !!imageFile,
        category_id: data.category_id
      });

      const response = await apiClient.updateBlogPost(editingPost.id, formData);
      if (response.success) {
        toast.success('Blog post updated successfully');
        setEditingPost(null);
        setImagePreview(null);
        setImageFile(null);
        form.reset();
        fetchBlogPosts();
        emitAfterApiCall('BLOG_POST_UPDATED', { postId: editingPost.id, title: data.title });
      }
    } catch (error: any) {
      console.error('Update blog post error:', error);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to update blog post');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await apiClient.deleteBlogPost(id);
      if (response.success) {
        toast.success('Blog post deleted successfully');
        fetchBlogPosts();
        emitAfterApiCall('BLOG_POST_DELETED', { postId: id });
      }
    } catch (error: any) {
      console.error('Delete blog post error:', error);
      toast.error(error?.response?.data?.message || error?.message || 'Failed to delete blog post');
    }
  };

  const handleEdit = (post: BlogPost) => {
    setEditingPost(post);
    setImagePreview(null);
    setImageFile(null);
    // Convert published_status to status string if needed
    let statusValue = (post as any).status;
    if (!statusValue && (post as any).published_status !== undefined) {
      statusValue = (post as any).published_status === true ? 'PUBLISHED' : 'DRAFT';
    }
    form.reset({
      title: post.title,
      content: post.content,
      excerpt: (post as any).excerpt || '',
      category_id: post.category_id || post.category?.id,
      tags: post.tags,
      seoTitle: (post as any).seoTitle || '',
      seoDescription: (post as any).seoDescription || '',
      seoKeywords: (post as any).seoKeywords || [],
      status: statusValue || 'DRAFT',
    });
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImageFile(null);
      setImagePreview(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PUBLISHED':
        return <Badge className="bg-green-100 text-green-800"><Globe className="w-3 h-3 mr-1" />Published</Badge>;
      case 'DRAFT':
        return <Badge className="bg-yellow-100 text-yellow-800"><Save className="w-3 h-3 mr-1" />Draft</Badge>;
      case 'ARCHIVED':
        return <Badge className="bg-gray-100 text-gray-800"><FileText className="w-3 h-3 mr-1" />Archived</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const tags = Array.from(new Set(blogPosts.flatMap(post => post.tags)));
  
  const getCategoryName = (categoryId?: number) => {
    if (!categoryId) return 'Uncategorized';
    const category = blogCategories.find(c => c.id === categoryId);
    return category?.name || 'Uncategorized';
  };

  const getBlogStats = () => {
    const stats = {
      total: blogPosts.length,
      published: blogPosts.filter(p => (p as any).status === 'PUBLISHED').length,
      draft: blogPosts.filter(p => (p as any).status === 'DRAFT').length,
      archived: blogPosts.filter(p => (p as any).status === 'ARCHIVED').length,
      totalViews: blogPosts.reduce((sum, p) => sum + ((p as any).viewCount || 0), 0),
      avgViews: blogPosts.length > 0 ?
        blogPosts.reduce((sum, p) => sum + ((p as any).viewCount || 0), 0) / blogPosts.length : 0,
    };
    return stats;
  };

  const stats = getBlogStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-3xl font-bold text-gray-900">Blog Management</h2>
          <div title={isConnected ? "Real-time updates active" : "Real-time updates offline"}>
            {isConnected ? (
              <Wifi className="w-5 h-5 text-green-500" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-500" />
            )}
          </div>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Post
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Blog Post</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter blog post title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="category_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(value === 'none' ? undefined : parseInt(value))} 
                          value={field.value?.toString() || 'none'}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">No Category</SelectItem>
                            {blogCategories.map(category => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="excerpt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Excerpt (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Brief summary of the post"
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Content</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Write your blog post content here... (For production, integrate a rich text editor like Tiptap)"
                          className="min-h-[200px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tags</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="tech, news, tutorial (comma separated)"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="DRAFT">Draft</SelectItem>
                            <SelectItem value="PUBLISHED">Published</SelectItem>
                            <SelectItem value="ARCHIVED">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* SEO Section */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <h3 className="font-semibold text-sm">SEO Settings</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="seoTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SEO Title</FormLabel>
                          <FormControl>
                            <Input placeholder="SEO optimized title" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="seoKeywords"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SEO Keywords</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="keyword1, keyword2, keyword3"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value.split(',').map(kw => kw.trim()).filter(kw => kw))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="seoDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SEO Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="SEO meta description (150-160 characters)"
                            className="min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Featured Image */}
                <div>
                  <FormLabel>Featured Image</FormLabel>
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
                          className="w-48 h-32 object-cover rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      setImagePreview(null);
                      setImageFile(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Create Post</Button>
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
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.published}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <EyeIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalViews}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Views/Post</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgViews.toFixed(1)}</div>
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
                placeholder="Search posts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PUBLISHED">Published</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {blogCategories.map(category => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Blog Posts Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Views</TableHead>
                <TableHead>Published</TableHead>
                <TableHead className="w-[70px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading blog posts...
                  </TableCell>
                </TableRow>
              ) : blogPosts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No blog posts found
                  </TableCell>
                </TableRow>
              ) : (
                blogPosts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{post.title}</div>
                        <div className="text-sm text-gray-500 flex items-center gap-2">
                          <Tag className="w-3 h-3" />
                          {post.tags.slice(0, 2).join(', ')}
                          {post.tags.length > 2 && ` +${post.tags.length - 2} more`}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {post.category?.name || getCategoryName(post.category_id) || 'Uncategorized'}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge((post as any).status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span className="text-sm">{post.author.username}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <EyeIcon className="w-4 h-4" />
                        <span>{(post as any).viewCount || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {(post as any).publishedAt
                        ? format(new Date((post as any).publishedAt), 'MMM dd, yyyy')
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedPost(post)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(post)}>
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
                                <AlertDialogTitle>Delete Blog Post</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{post.title}"?
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(post.id)}
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

      {/* Edit Blog Post Dialog */}
      <Dialog open={!!editingPost} onOpenChange={() => setEditingPost(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Blog Post</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter blog post title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(value === 'none' ? undefined : parseInt(value))} 
                        value={field.value?.toString() || 'none'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No Category</SelectItem>
                          {blogCategories.map(category => (
                            <SelectItem key={category.id} value={category.id.toString()}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="excerpt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Excerpt (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief summary of the post"
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Write your blog post content here..."
                        className="min-h-[200px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="tech, news, tutorial (comma separated)"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="DRAFT">Draft</SelectItem>
                          <SelectItem value="PUBLISHED">Published</SelectItem>
                          <SelectItem value="ARCHIVED">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* SEO Section */}
              <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="font-semibold text-sm">SEO Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="seoTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SEO Title</FormLabel>
                        <FormControl>
                          <Input placeholder="SEO optimized title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="seoKeywords"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SEO Keywords</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="keyword1, keyword2, keyword3"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value.split(',').map(kw => kw.trim()).filter(kw => kw))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="seoDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SEO Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="SEO meta description"
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Featured Image */}
              <div>
                <FormLabel>Featured Image</FormLabel>
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
                        className="w-48 h-32 object-cover rounded-lg"
                      />
                    </div>
                  )}
                  {(editingPost as any)?.featuredImage && !imagePreview && (
                    <div className="mt-2">
                      <img
                        src={getImageUrl((editingPost as any).featuredImage) || ''}
                        alt="Current"
                        className="w-48 h-32 object-cover rounded-lg"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingPost(null)}
                >
                  Cancel
                </Button>
                <Button type="submit">Update Post</Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Blog Post Details Dialog */}
      <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPost?.title}</DialogTitle>
          </DialogHeader>

          {selectedPost && (
            <div className="space-y-6">
              {(selectedPost as any).featuredImage && (
                <img
                  src={getImageUrl((selectedPost as any).featuredImage) || ''}
                  alt={selectedPost.title}
                  className="w-full h-64 object-cover rounded-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              )}

              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>{selectedPost.author.username}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{format(new Date(selectedPost.created_at), 'PPP')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <EyeIcon className="w-4 h-4" />
                  <span>{(selectedPost as any).viewCount || 0} views</span>
                </div>
                {getStatusBadge((selectedPost as any).status)}
              </div>

              {(selectedPost as any).excerpt && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-700 italic">{(selectedPost as any).excerpt}</p>
                </div>
              )}

              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap">{selectedPost.content}</div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  <div className="flex gap-2">
                    {selectedPost.tags.map((tag, index) => (
                      <Badge key={index} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                </div>
                <Badge variant="outline">
                  {selectedPost.category?.name || getCategoryName(selectedPost.category_id) || 'Uncategorized'}
                </Badge>
              </div>

              {/* SEO Information */}
              {((selectedPost as any).seoTitle || (selectedPost as any).seoDescription) && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-sm mb-2">SEO Information</h3>
                  {(selectedPost as any).seoTitle && (
                    <p className="text-sm"><strong>Title:</strong> {(selectedPost as any).seoTitle}</p>
                  )}
                  {(selectedPost as any).seoDescription && (
                    <p className="text-sm mt-1"><strong>Description:</strong> {(selectedPost as any).seoDescription}</p>
                  )}
                  {(selectedPost as any).seoKeywords && (selectedPost as any).seoKeywords.length > 0 && (
                    <p className="text-sm mt-1"><strong>Keywords:</strong> {(selectedPost as any).seoKeywords.join(', ')}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}