'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../../lib/auth-context';
import { useAuthStore } from '../../../lib/stores/auth-store';
import { loginSchema, LoginFormData } from '../../../lib/schemas';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';

export default function LoginPage() {
  const { login, verifyLoginOtp, isLoading, error, clearError } = useAuth();
  const router = useRouter();
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  // Check for redirect parameter on mount (from URL or sessionStorage)
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check URL params first
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get('redirect');
      if (redirect) {
        setRedirectPath(redirect);
      } else {
        // Check sessionStorage for returnUrl (set by LoginRequiredModal)
        const returnUrl = sessionStorage.getItem('returnUrl');
        if (returnUrl) {
          setRedirectPath(returnUrl);
          sessionStorage.removeItem('returnUrl'); // Clear after reading
        }
      }
    }
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      clearError();
      await login(data);

      // Redirect based on user role after successful login or to the original path
      const user = useAuthStore.getState().user;
      let roleBasedRedirect = '/dashboard';

      if (user) {
        switch (user.role) {
          case 'ADMIN':
            roleBasedRedirect = '/admin/dashboard';
            break;
          case 'CUSTOMER':
            roleBasedRedirect = '/dashboard';
            break;
          default:
            roleBasedRedirect = '/dashboard';
            break;
        }
      }

      // Use redirectPath if available (from URL or sessionStorage), otherwise use role-based redirect
      const finalRedirect = redirectPath || roleBasedRedirect;
      router.push(finalRedirect);
    } catch (err) {
      // Error is handled by auth context
      console.error('Login failed:', err);
    }
  };

  const handleOtpLogin = async () => {
    const email = getValues('email');
    if (!email) return;

    try {
      clearError();
      setOtpEmail(email);
      setShowOtpInput(true);
      // Note: OTP sending would be implemented here if backend supports it
      console.log('OTP login initiated for:', email);
    } catch (err) {
      console.error('Failed to send OTP:', err);
      setOtpError('Failed to send verification code. Please try password login instead.');
    }
  };

  const handleOtpVerification = async () => {
    if (!otp.trim()) {
      setOtpError('Please enter the verification code');
      return;
    }

    if (otp.length !== 6) {
      setOtpError('Verification code must be 6 digits');
      return;
    }

    try {
      setOtpLoading(true);
      setOtpError('');

      await verifyLoginOtp({
        email: otpEmail,
        otp: otp.trim(),
      });

      // OTP verified successfully, redirect based on user role or returnUrl
      const user = useAuthStore.getState().user;
      let roleBasedRedirect = '/dashboard';
      
      if (user) {
        switch (user.role) {
          case 'ADMIN':
            roleBasedRedirect = '/admin/dashboard';
            break;
          case 'CUSTOMER':
            roleBasedRedirect = '/dashboard';
            break;
          default:
            roleBasedRedirect = '/dashboard';
            break;
        }
      }
      
      const finalRedirect = redirectPath || roleBasedRedirect;
      router.push(finalRedirect);
    } catch (err: any) {
      setOtpError(err.message || 'Failed to verify code. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Sign in</CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@test.com"
                {...register('email')}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-red-500 text-sm">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="admin123"
                {...register('password')}
                className={errors.password ? 'border-red-500' : ''}
              />
              {errors.password && (
                <p className="text-red-500 text-sm">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={handleOtpLogin}
              className="text-sm text-blue-600 hover:text-blue-500"
              disabled={!getValues('email')}
            >
              Sign in with OTP instead
            </button>
          </div>

          {showOtpInput && (
            <div className="mt-6 space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-medium">Verify Your Login</h3>
                <p className="text-sm text-gray-600 mt-2">
                  We've sent a verification code to {otpEmail}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className={otpError ? 'border-red-500' : ''}
                />
                {otpError && (
                  <p className="text-red-500 text-sm">{otpError}</p>
                )}
              </div>

              <Button
                className="w-full"
                onClick={handleOtpVerification}
                disabled={otpLoading || otp.length !== 6}
              >
                {otpLoading ? 'Verifying...' : 'Verify & Sign In'}
              </Button>

              <button
                onClick={() => {
                  setShowOtpInput(false);
                  setOtp('');
                  setOtpError('');
                }}
                className="w-full text-sm text-blue-600 hover:text-blue-500"
              >
                Back to password login
              </button>
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link href="/auth/register" className="text-blue-600 hover:text-blue-500">
                Sign up
              </Link>
            </p>
          </div>

          <div className="mt-4 text-center">
            <Link href="/auth/forgot-password" className="text-sm text-blue-600 hover:text-blue-500">
              Forgot your password?
            </Link>
          </div>

          <div className="mt-6 space-y-3">
            {/* Info about admin-created accounts */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-xs text-blue-800">
                <strong>💡 Note:</strong> Accounts created by administrators are pre-verified and can login immediately without email verification.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}