'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ProfileSection } from '../components/ProfileSection';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import type { UserProfile } from '@/lib/types';

export default function ProfilePage() {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.getProfile();
      
      if (response.success && response.data) {
        setProfile(response.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch profile:', error);
      toast.error('Failed to load profile', {
        description: error.message || 'Please try refreshing the page',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileUpdate = async (data: any) => {
    try {
      const response = await apiClient.updateProfile(data);
      
      if (response.success) {
        toast.success('Profile updated successfully', {
          description: 'Your changes have been saved',
        });
        await refreshProfile();
        await fetchProfile();
      } else {
        throw new Error(response.message || 'Update failed');
      }
    } catch (error: any) {
      console.error('Profile update error:', error);
      toast.error('Failed to update profile', {
        description: error.message || 'Please try again',
      });
      throw error;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="text-center py-12">
          <p className="text-gray-600">Failed to load profile data</p>
          <Button onClick={fetchProfile} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard')}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
        <p className="text-gray-600 mt-2">Manage your account information and preferences</p>
      </div>

      {/* Profile Section */}
      <ProfileSection
        profile={profile}
        onUpdate={handleProfileUpdate}
        loading={isLoading}
      />
    </div>
  );
}
