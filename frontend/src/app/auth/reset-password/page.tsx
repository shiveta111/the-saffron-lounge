'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../../lib/auth-context';
import { resetPasswordSchema, ResetPasswordFormData } from '../../../lib/schemas';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Progress } from '../../../components/ui/progress';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';

function ResetPasswordContent() {
  const { resetPassword, isLoading, error, clearError } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [success, setSuccess] = useState(false);
  const token = searchParams.get('token') || '';

  useEffect(() => {
    console.log('🔍 ResetPasswordPage: Component mounted');
    console.log('🔑 ResetPasswordPage: Token from URL:', token ? '***present***' : '***missing***');

    if (!token) {
      console.log('⚠️ ResetPasswordPage: No token provided, redirecting to forgot password');
      router.push('/auth/forgot-password');
    }
  }, [token, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    console.log('🔄 ResetPasswordPage: onSubmit called with data:', { password: '***masked***', confirmPassword: '***masked***' });
    console.log('🔑 ResetPasswordPage: Token being sent:', token);
    console.log('📤 ResetPasswordPage: Full API payload:', { token, password: '***masked***' });

    try {
      clearError();
      console.log('📤 ResetPasswordPage: Calling resetPassword API...');
      await resetPassword({ token, password: data.password });
      console.log('✅ ResetPasswordPage: Password reset successful');
      setSuccess(true);
    } catch (err: any) {
      console.error('❌ ResetPasswordPage: Reset password failed:', err);
      console.error('❌ ResetPasswordPage: Error details:', {
        message: err?.message,
        response: err?.response?.data,
        status: err?.response?.status
      });
      // Error is handled by auth context
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center text-green-600">Password Reset Successful</CardTitle>
            <CardDescription className="text-center">
              Your password has been successfully reset
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-600">
                You can now sign in with your new password.
              </p>
              <button
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                onClick={() => {
                  console.log('🖱️ ResetPasswordPage: Sign In button clicked');
                  router.push('/auth/login');
                }}
              >
                Sign In
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Invalid Reset Link</CardTitle>
            <CardDescription className="text-center">
              The password reset link is invalid or has expired
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-600">
                Please request a new password reset link.
              </p>
              <button
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                onClick={() => {
                  console.log('🖱️ ResetPasswordPage: Request New Reset Link button clicked');
                  router.push('/auth/forgot-password');
                }}
              >
                Request New Reset Link
              </button>
            </div>
          </CardContent>
        </Card>
  
        {/* Loading Modal */}
        <Dialog open={isLoading} onOpenChange={() => {}}>
          <DialogContent showCloseButton={false} className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Processing Password Reset</DialogTitle>
              <DialogDescription>
                Processing your password reset, please wait...
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center space-y-4 py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <Progress value={undefined} className="w-full" />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Reset Your Password</CardTitle>
          <CardDescription className="text-center">
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter new password"
                {...register('password')}
                className={errors.password ? 'border-red-500' : ''}
              />
              {errors.password && (
                <p className="text-red-500 text-sm">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm new password"
                {...register('confirmPassword')}
                className={errors.confirmPassword ? 'border-red-500' : ''}
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-sm">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="button"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
              onClick={() => {
                console.log('🖱️ ResetPasswordPage: Reset Password button clicked');

                const data = getValues();
                console.log('📝 ResetPasswordPage: Form data:', { password: data.password ? '***entered***' : '***empty***', confirmPassword: data.confirmPassword ? '***entered***' : '***empty***' });

                // Manual validation
                if (!data.password || !data.confirmPassword) {
                  console.log('❌ ResetPasswordPage: Validation failed - empty fields');
                  return;
                }

                if (data.password !== data.confirmPassword) {
                  console.log('❌ ResetPasswordPage: Validation failed - passwords do not match');
                  return;
                }

                if (data.password.length < 6) {
                  console.log('❌ ResetPasswordPage: Validation failed - password too short');
                  return;
                }

                console.log('✅ ResetPasswordPage: Validation passed, calling onSubmit');
                onSubmit(data);
              }}
            >
              {isLoading ? 'Resetting Password...' : 'Reset Password'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/auth/login')}
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              Back to Sign In
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Loading...</CardTitle>
            <CardDescription className="text-center">
              Please wait while we load the reset password page
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}