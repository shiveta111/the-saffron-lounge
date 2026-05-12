'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { SafeImg } from '@/components/ui/safe-image';
import { MediaPicker } from '@/components/admin/MediaPicker';

interface MediaItem {
  id: number;
  name: string;
  url: string;
  mimetype: string;
  size: number;
  createdAt: string;
}

export default function MediaLibraryPage() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Fetch media from API
  const fetchMedia = useCallback(async (pageNum: number = 1, searchTerm: string = '') => {
    setLoading(true);
    try {
      const response = await apiClient.getAllMedia({
        page: pageNum,
        limit: 24,
        search: searchTerm,
      });
      if (response.success) {
        console.log('Media loaded:', response.data);
        setMedia(response.data || []);
        setTotalPages(response.pagination?.totalPages || 1);
      } else {
        console.error('Media API response not successful:', response);
        setMedia([]);
      }
    } catch (error: any) {
      console.error('Failed to load media library:', error);
      toast.error(error.response?.data?.error || 'Failed to load media library');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load media on mount
  useEffect(() => {
    fetchMedia(1, '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  // Handle search with debounce
  useEffect(() => {
    if (!search) {
      fetchMedia(1, '');
      setPage(1);
      return;
    }

    const timer = setTimeout(() => {
      fetchMedia(1, search);
      setPage(1);
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]); // Only depend on search

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchMedia(newPage, search);
  };

  // Handle delete
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this media?')) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await apiClient.deleteMedia(id);
      if (response.success) {
        toast.success('Media deleted successfully');
        // Refresh media list
        await fetchMedia(page, search);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete media');
    } finally {
      setDeletingId(null);
    }
  };

  // Handle image selection from MediaPicker
  const handleImageSelect = (url: string) => {
    // Close modal and refresh the list to show the newly uploaded image
    setMediaPickerOpen(false);
    setTimeout(() => {
      fetchMedia(1, search);
      setPage(1);
    }, 300);
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Media Library</h1>
          <p className="text-gray-600 mt-1">Manage and organize your media files</p>
        </div>
        <Button onClick={() => setMediaPickerOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Upload Media
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search media by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Media Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : media.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500 bg-gray-50 rounded-lg">
          <ImageIcon className="w-12 h-12 mb-2" />
          <p className="text-lg font-medium">No media found</p>
          <p className="text-sm mt-1">Upload your first image to get started</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {media.map((item) => (
              <div
                key={item.id}
                className="group relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-primary transition-colors bg-white"
              >
                <SafeImg
                  src={item.url}
                  alt={item.name}
                  fallbackType="default"
                  className="w-full h-full object-cover"
                  showMessage={true}
                  message="Not found"
                />
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors flex flex-col items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="text-white text-center px-2 mb-2">
                    <p className="text-xs font-medium truncate w-full">{item.name}</p>
                    <p className="text-xs text-gray-300 mt-1">{formatFileSize(item.size)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        navigator.clipboard.writeText(item.url);
                        toast.success('Image URL copied to clipboard');
                      }}
                    >
                      Copy URL
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                    >
                      {deletingId === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* MediaPicker Modal */}
      <MediaPicker
        open={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        onSelect={handleImageSelect}
      />
    </div>
  );
}
