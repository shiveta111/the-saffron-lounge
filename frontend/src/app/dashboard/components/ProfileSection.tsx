'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Edit2, Save, X, User as UserIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { UserProfile } from '@/lib/types';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  preferences: z.object({
    theme: z.enum(['light', 'dark', '']).optional(),
    notifications: z.boolean().optional(),
    language: z.string().optional(),
  }).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileSectionProps {
  profile: UserProfile;
  onUpdate: (data: ProfileFormData) => Promise<void>;
  loading?: boolean;
}

export function ProfileSection({ profile, onUpdate, loading = false }: ProfileSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: profile.user?.name || '',
      phone: '',
      preferences: {
        theme: profile.preferences?.theme || '',
        notifications: profile.preferences?.notifications || false,
        language: profile.preferences?.language || 'en',
      },
    },
  });

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    reset();
    setIsEditing(false);
  };

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setIsSubmitting(true);
      await onUpdate(data);
      setIsEditing(false);
    } catch (error) {
      console.error('Profile update failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center space-x-2">
          <UserIcon className="h-5 w-5" />
          <span>Profile Information</span>
        </CardTitle>
        {!isEditing && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleEdit}
            disabled={loading}
          >
            <Edit2 className="h-4 w-4 mr-2" />
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Read-only fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b">
            <div>
              <Label className="text-sm font-medium text-gray-700">Email</Label>
              <p className="mt-1 text-sm text-gray-900">{profile.user?.email || 'N/A'}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Status</Label>
              <p className="mt-1 text-sm text-gray-900">
                {profile.user?.isActive ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    Inactive
                  </span>
                )}
              </p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-700">Member Since</Label>
              <p className="mt-1 text-sm text-gray-900">
                {profile.user?.createdAt ? formatDate(profile.user.createdAt) : 'N/A'}
              </p>
            </div>
          </div>

          {/* Editable fields */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                {...register('name')}
                disabled={!isEditing || isSubmitting}
                className="mt-1"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="theme">Theme</Label>
                <Select
                  value={profile.preferences?.theme || 'light'}
                  onValueChange={(value) => setValue('preferences.theme', value as 'light' | 'dark' | '')}
                  disabled={!isEditing || isSubmitting}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notifications">Notifications</Label>
                <Select
                  value={profile.preferences?.notifications?.toString() || 'false'}
                  onValueChange={(value) => setValue('preferences.notifications', value === 'true')}
                  disabled={!isEditing || isSubmitting}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select preference" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Enabled</SelectItem>
                    <SelectItem value="false">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="language">Language</Label>
                <Input
                  id="language"
                  {...register('preferences.language')}
                  disabled={!isEditing || isSubmitting}
                  className="mt-1"
                  placeholder="en"
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          {isEditing && (
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                <Save className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
