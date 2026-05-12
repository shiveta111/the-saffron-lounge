'use client';

import { useState, useRef, useEffect, useId } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { getImageUrl } from '@/lib/image-utils';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  type?: 'menu' | 'product';
  label?: string;
  productName?: string;
}

export function ImageUpload({ value, onChange, type = 'menu', label = 'Upload Image', productName }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  // Convert the value prop to absolute URL for preview, or use temporary preview during upload
  const [tempPreview, setTempPreview] = useState<string | null>(null);
  const [imageKey, setImageKey] = useState(Date.now()); // For cache busting
  
  // Add cache busting parameter to force reload of updated images
  const getPreviewUrl = (url: string | null | undefined) => {
    if (!url) return null;
    const absoluteUrl = getImageUrl(url);
    if (!absoluteUrl) return null;
    // Add timestamp to bust cache for updated images
    const urlWithCache = `${absoluteUrl}${absoluteUrl.includes('?') ? '&' : '?'}t=${imageKey}`;
    console.log('Image preview URL:', { original: url, absolute: absoluteUrl, withCache: urlWithCache });
    return urlWithCache;
  };
  
  const preview = tempPreview || getPreviewUrl(value);

  // Update imageKey when value prop changes (switching between products)
  useEffect(() => {
    if (value) {
      setImageKey(Date.now());
    }
  }, [value]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (!file) return;

    // Prevent multiple simultaneous uploads
    if (uploading) {
      toast.error('Please wait for the current upload to complete');
      // Reset input value if upload is in progress
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    // Show preview immediately using FileReader
    const reader = new FileReader();
    reader.onloadend = () => {
      setTempPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to server
    setUploading(true);
    toast.info('Please wait, uploading image...', { duration: Infinity, id: 'upload-progress' });

    try {
      const formData = new FormData();
      if (productName) {
        formData.append('name', productName);
      }
      formData.append('image', file);

      const endpoint = type === 'menu' ? '/upload/menu-image' : '/upload/product-image';

      const response = await apiClient.instance.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 second timeout
      });

      if (response.data.success) {
        const imageUrl = response.data.data.imageUrl;
        console.log('Image upload successful:', {
          response: response.data,
          imageUrl,
          convertedUrl: getImageUrl(imageUrl),
          timestamp: new Date().toISOString()
        });
        // Clear temporary preview and use the server URL
        setTempPreview(null);
        // Update cache-busting key to force image reload
        setImageKey(Date.now());
        // Store the relative URL in the form (as returned from server)
        onChange(imageUrl);
        toast.dismiss('upload-progress');
        toast.success('Image uploaded successfully!');
        // Reset input value after successful upload to allow selecting the same file again
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        throw new Error(response.data.error || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.dismiss('upload-progress');
      const errorMessage = error.response?.data?.error || error.message || 'Failed to upload image';
      toast.error(errorMessage);
      // Clear temporary preview on error
      setTempPreview(null);
      // Reset input value on error
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setTempPreview(null);
    setImageKey(Date.now());
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const [imageError, setImageError] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  const handleImageLoad = () => {
    console.log('✅ Image loaded successfully:', preview);
    setImageLoading(false);
  };

  const handleImageError = async (e: React.SyntheticEvent<HTMLImageElement>) => {
    const imgSrc = preview;
    console.error('❌ Image load error:', {
      src: imgSrc,
      error: e,
      timestamp: new Date().toISOString()
    });
    
    // Try to fetch the URL to get more details about the error
    if (imgSrc) {
      try {
        const response = await fetch(imgSrc, { method: 'HEAD' });
        const errorMsg = `HTTP ${response.status} ${response.statusText}`;
        console.error('❌ Image fetch test:', {
          url: imgSrc,
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        });
        setImageError(errorMsg);
      } catch (fetchError: any) {
        const errorMsg = fetchError.message || 'Network error';
        console.error('❌ Image fetch failed:', fetchError);
        setImageError(errorMsg);
      }
    }
    setImageLoading(false);
  };

  // Reset imageError and start loading when preview changes
  useEffect(() => {
    if (preview && !tempPreview) {
      setImageError(null);
      setImageLoading(true);
    }
  }, [preview, tempPreview]);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>

      <div className="flex items-start gap-4">
        {/* Preview */}
        <div className="relative">
          {preview ? (
            <div className="relative w-32 h-32 rounded-lg overflow-hidden border-2 border-gray-200">
              {!imageError ? (
                <>
                  {imageLoading && !tempPreview && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    </div>
                  )}
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                  />
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 text-red-600 text-xs p-2 text-center" title={`Failed to load: ${preview}`}>
                  <ImageIcon className="w-8 h-8 mb-1 text-red-400" />
                  <span className="font-semibold">Failed to load</span>
                  <span className="text-[10px] mt-1">{imageError}</span>
                  <a 
                    href={preview || '#'} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-[9px] mt-1 text-blue-600 underline hover:text-blue-800"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Test URL
                  </a>
                </div>
              )}
              <button
                type="button"
                onClick={handleRemove}
                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
              <ImageIcon className="w-8 h-8 text-gray-400" />
            </div>
          )}
        </div>

        {/* Upload Button */}
        <div className="flex-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id={inputId}
          />
          <Button
            type="button"
            variant="outline"
            disabled={uploading}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!uploading && fileInputRef.current) {
                fileInputRef.current.click();
              }
            }}
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? 'Please wait, uploading...' : 'Choose Image'}
          </Button>
          <p className="text-xs text-gray-500 mt-2">
            JPG, PNG or WebP. Max 5MB.
            <br />
            Saved to: /assets/uploads/{type === 'menu' ? 'menu-items' : 'products'}/
          </p>
        </div>
      </div>
    </div>
  );
}
