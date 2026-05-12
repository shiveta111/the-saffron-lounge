import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, AuthTokens, UserRole } from '../types';

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  _hasHydrated: boolean;
}

interface AuthActions {
  setUser: (user: User | null) => void;
  setTokens: (tokens: AuthTokens | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  login: (user: User, tokens: AuthTokens) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  clearError: () => void;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
  setHasHydrated: (state: boolean) => void;
}

type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  _hasHydrated: false,
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setUser: (user) => set({ user }),
      setTokens: (tokens) => {
        set({ tokens });
      },
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      login: (user, tokens) => {
        set({
          user,
          tokens,
          isAuthenticated: true,
          error: null,
        });
      },

      logout: () => {
        // Clear tokens and user but preserve hydration state
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
          error: null,
          isLoading: false,
        });
      },

      updateUser: (userData) => {
        const currentUser = get().user;
        if (currentUser) {
          set({ user: { ...currentUser, ...userData } });
        }
      },

      clearError: () => set({ error: null }),

      hasRole: (role) => {
        const user = get().user;
        return user?.role === role;
      },

      hasAnyRole: (roles) => {
        const user = get().user;
        return user ? roles.includes(user.role) : false;
      },

      setHasHydrated: (state) => {
        set({
          _hasHydrated: state
        });
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

// Helper hooks for role checking
export const useIsAdmin = () => useAuthStore((state) => state.hasRole('ADMIN'));
export const useIsSeller = () => useAuthStore((state) => state.hasRole('SELLER'));
export const useIsCustomer = () => useAuthStore((state) => state.hasRole('CUSTOMER'));

export const useHasAnyRole = (roles: UserRole[]) =>
  useAuthStore((state) => state.hasAnyRole(roles));