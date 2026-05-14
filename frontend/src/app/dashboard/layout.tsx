'use client';

import { useState } from 'react';
import { useAuth } from '../../lib/auth-context';
import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import { Button } from '../../components/ui/button';
import { DashboardSidebar } from './components/DashboardSidebar';
import { LogOut } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { logout, isLoading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <ProtectedRoute requiredRoles={['CUSTOMER', 'SELLER', 'ADMIN']}>
      <div className="min-h-screen bg-gray-50 flex">
        {/* Sidebar Navigation */}
        <DashboardSidebar
          isMobileMenuOpen={isMobileMenuOpen}
          onMobileMenuToggle={handleMobileMenuToggle}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
          {/* Top Bar */}
          <header className="bg-white shadow-sm border-b sticky top-0 z-30">
            <div className="px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-4">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 ml-12 lg:ml-0">
                  Dashboard
                </h1>
                <Button
                  onClick={handleLogout}
                  disabled={isLoading}
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {isLoading ? 'Logging out...' : 'Logout'}
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}