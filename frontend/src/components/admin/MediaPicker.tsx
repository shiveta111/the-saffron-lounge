'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Loader2, Upload, Search, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { SafeImg } from '../ui/safe-image';

interface MediaPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}

interface MediaItem {
  id: number;
  name: string;
  url: string;
  mimetype: string;
  size: number;
  createdAt: string;
}

export function MediaPicker({ open, onClose, onSelect }: MediaPickerProps) {
  const [activeTab, setActiveTab] = useState('upload');
  const [uploading, setUploading] = useState(false);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [preview, setPreview] = useState<string | null>(null);

  // Fetch media from API
  const fetchMedia = useCallback(async (pageNum: number = 1, searchTerm: string = '') => {
    setLoading(true);
    try {
      const response = await apiClient.getAllMedia({
        page: pageNum,
        limit: 20,
        search: searchTerm,
      });
      if (response.success) {
        setMedia(response.data);
        setTotalPages(response.pagination?.totalPages || 1);
      }
    } catch (error: any) {
      toast.error('Failed to load media library');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load media when dialog opens
  useEffect(() => {
    if (open) {
      fetchMedia(1, '');
      setSearch('');
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]); // Only depend on open

  // Handle file upload via dropzone
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    setUploading(true);
    try {
      const response = await apiClient.uploadMedia(file);
      if (response.success) {
        toast.success('Image uploaded successfully!');
        // Switch to gallery tab and select the uploaded image
        setActiveTab('gallery');
        // Refresh media list
        await fetchMedia(1, '');
        // Auto-select the uploaded image
        onSelect(response.data.url);
        setPreview(null);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to upload image');
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }, [fetchMedia, onSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
    },
    multiple: false,
  });

  // Handle search with debounce (only when dialog is open and search changes)
  useEffect(() => {
    if (!open) return;
    
    const timer = setTimeout(() => {
      fetchMedia(1, search);
      setPage(1);
    }, search ? 500 : 0);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, open]); // Only depend on search and open

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchMedia(newPage, search);
  };

  // Handle image selection
  const handleSelect = (url: string) => {
    onSelect(url);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Media Library</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="gallery">Gallery</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="flex-1 overflow-auto">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300'
              } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <input {...getInputProps()} />
              {preview ? (
                <div className="space-y-4">
                  <img src={preview} alt="Preview" className="max-w-full max-h-64 mx-auto rounded-lg" />
                  {uploading && (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Uploading...</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="w-12 h-12 mx-auto text-gray-400" />
                  <div>
                    <p className="text-lg font-medium">
                      {isDragActive ? 'Drop the image here' : 'Drag & drop an image here'}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">or click to browse</p>
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG, GIF, WebP (Max 5MB)</p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="gallery" className="flex-1 flex flex-col overflow-hidden">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search images..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : media.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <ImageIcon className="w-12 h-12 mb-2" />
                <p>No images found</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-4 gap-4 overflow-auto flex-1">
                  {media.map((item) => (
                    <div
                      key={item.id}
                      className="group relative aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-colors cursor-pointer"
                      onClick={() => handleSelect(item.url)}
                    >
                      <SafeImg
                        src={item.url}
                        alt={item.name}
                        fallbackType="default"
                        className="w-full h-full object-cover"
                        showMessage={true}
                        message="Not found"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                        <Button
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelect(item.url);
                          }}
                        >
                          Select
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
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
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
