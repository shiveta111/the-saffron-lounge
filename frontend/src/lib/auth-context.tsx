'use client';

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useAuthStore } from './stores/auth-store';
import { apiClient } from './api-client';
import { LoginCredentials, RegisterData, User, UserRole } from './types';

interface AuthContextType {
  login: (credentials: LoginCredentials) => Promise<void>;
  initiateRegistration: (data: RegisterData) => Promise<any>;
  completeRegistration: (data: { email: string; otp: string }) => Promise<any>;
  register: (data: RegisterData) => Promise<any>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (data: { token: string; password: string }) => Promise<void>;
  verifyRegistrationOtp: (data: { email: string; otp: string }) => Promise<void>;
  verifyLoginOtp: (data: { email: string; otp: string }) => Promise<void>;
  refreshProfile: () => Promise<void>;
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const {
    user,
    isAuthenticated,
    isLoading: storeLoading,
    error,
    login: storeLogin,
    logout: storeLogout,
    setLoading,
    setError,
    clearError,
    setUser,
    _hasHydrated,
  } = useAuthStore();

  // Check for existing authentication on mount
  useEffect(() => {
    // Wait for hydration before checking auth
    if (!_hasHydrated) return;

    const checkAuth = async () => {
      const { tokens } = useAuthStore.getState();
      if (tokens?.accessToken) {
        try {
          setLoading(true);
          console.log('Checking existing authentication...');
          const response = await apiClient.getProfile();
          console.log('Profile response:', response);

          if (response.success && response.data?.user) {
            console.log('Authentication successful, user:', response.data.user);
            setUser(response.data.user);
          } else {
            console.log('Authentication failed, response:', response);
            // Don't logout immediately, let the user try to refresh
            setError('Session expired. Please login again.');
          }
        } catch (err: any) {
          console.error('Authentication check failed:', err);
          // Only logout if it's a 401 (unauthorized), not network errors
          if (err.response?.status === 401) {
            console.log('Token invalid, logging out...');
            storeLogout();
          } else {
            // Network error or server error, don't logout
            setError('Unable to verify authentication. Please check your connection.');
          }
        } finally {
          setLoading(false);
        }
      } else {
        console.log('No tokens found, user not authenticated');
        setLoading(false);
      }
    };

    checkAuth();
  }, [_hasHydrated, setLoading, setUser, storeLogout]);

  const login = async (credentials: LoginCredentials) => {
    try {
      setLoading(true);
      setError(null);
      clearError();

      console.log('Attempting login with credentials:', { email: credentials.email });

      const response = await apiClient.login(credentials);
      console.log('Login response:', response);

      if (response.success && response.data) {
        const { user, accessToken, refreshToken } = response.data;
        console.log('Login successful, storing user and tokens');

        // Ensure we have all required data
        if (!user || !accessToken || !refreshToken) {
          throw new Error('Invalid response data from server');
        }

        storeLogin(user, { accessToken, refreshToken });

        // Verify the login worked by checking the store
        const storeState = useAuthStore.getState();
        console.log('Auth store after login:', {
          isAuthenticated: storeState.isAuthenticated,
          user: storeState.user,
          hasTokens: !!storeState.tokens
        });

      } else {
        const errorMsg = response.message || 'Login failed - invalid credentials';
        console.error('Login failed:', errorMsg);
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      console.error('Login error:', err);

      let errorMessage = 'Login failed';
      if (err.response?.status === 401) {
        errorMessage = 'Invalid email or password';
      } else if (err.response?.status === 403) {
        errorMessage = 'Account is disabled or access denied';
      } else if (err.response?.status === 422) {
        errorMessage = 'Invalid login data. Please check your input.';
      } else if (err.response?.status === 429) {
        errorMessage = 'Too many login attempts. Please try again later.';
      } else if (err.response?.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.code === 'NETWORK_ERROR' || !navigator.onLine) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (err.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Please try again.';
      } else {
        errorMessage = 'Unable to connect to server. Please check if the backend is running.';
      }

      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const initiateRegistration = async (data: RegisterData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.initiateRegistration(data);
      return response;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to initiate registration';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const completeRegistration = async (data: { email: string; otp: string }) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.completeRegistration(data);

      if (response.success && response.data?.accessToken) {
        // Registration completed successfully, user is now logged in
        const user = response.data.user;
        const tokens = {
          accessToken: response.data.accessToken,
          refreshToken: response.data.refreshToken,
        };

        storeLogin(user, tokens);
      }

      return response;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to complete registration';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.register(data);

      if (response.success) {
        // Registration successful. If backend returns tokens, log in immediately.
        if (response.data?.user && response.data?.accessToken && response.data?.refreshToken) {
          storeLogin(response.data.user, {
            accessToken: response.data.accessToken,
            refreshToken: response.data.refreshToken,
          });
        }
        return response;
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Registration failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiClient.logout();
    } catch (err) {
      // Even if logout fails on server, clear local state
      console.warn('Server logout failed:', err);
    } finally {
      storeLogout();
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.forgotPassword(email);

      if (!response.success) {
        throw new Error(response.message || 'Failed to send reset email');
      }

      return response;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Failed to send reset email';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (data: { token: string; password: string }) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.resetPassword(data);

      if (!response.success) {
        throw new Error(response.message || 'Password reset failed');
      }

      return response;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'Password reset failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const verifyRegistrationOtp = async (data: { email: string; otp: string }) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.verifyRegistrationOtp(data);

      if (response.success) {
        // OTP verified, user can now login
        return response;
      } else {
        throw new Error(response.message || 'OTP verification failed');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        'OTP verification failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const verifyLoginOtp = async (data: { email: string; otp: string }) => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.verifyLoginOtp(data);

      if (response.success && response.data) {
        const { user, accessToken, refreshToken } = response.data;
        storeLogin(user, { accessToken, refreshToken });
      } else {
        throw new Error(response.message || 'OTP verification failed');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'OTP verification failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getProfile();
      if (response.success && response.data?.user) {
        setUser(response.data.user);
      }
    } catch (err: any) {
      setError('Failed to refresh profile');
    } finally {
      setLoading(false);
    }
  };

  const hasRole = (role: UserRole) => {
    return user?.role === role;
  };

  const hasAnyRole = (roles: UserRole[]) => {
    return user ? roles.includes(user.role) : false;
  };

  // Combine store loading state with hydration state
  const isLoading = storeLoading || !_hasHydrated;

  const value: AuthContextType = {
    login,
    initiateRegistration,
    completeRegistration,
    register,
    logout,
    forgotPassword,
    resetPassword,
    verifyRegistrationOtp,
    verifyLoginOtp,
    refreshProfile,
    isAuthenticated,
    user,
    isLoading,
    error,
    clearError,
    hasRole,
    hasAnyRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};