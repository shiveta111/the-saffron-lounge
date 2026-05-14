'use client';

import { ProtectedRoute } from '../../components/auth/ProtectedRoute';
import { DynamicSidebar } from '../../components/admin/dynamic-sidebar';
import { RouteErrorBoundary } from '../../components/error/RouteErrorBoundary';
import { Button } from '../../components/ui/button';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ProtectedRoute requiredRoles={['ADMIN']}>
      <div className="min-h-screen bg-gray-50 flex">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 lg:hidden bg-black bg-opacity-50"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={cn(
          "fixed inset-y-0 left-0 z-50 lg:static lg:inset-0",
          "transform transition-transform duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}>
          <DynamicSidebar />
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile header */}
          <div className="lg:hidden bg-white shadow-sm border-b px-4 py-3">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <h1 className="text-lg font-semibold text-gray-900">Admin Panel</h1>
              <div className="w-9" /> {/* Spacer for centering */}
            </div>
          </div>

          {/* Main content area */}
          <main className="flex-1 overflow-auto">
            <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
              <RouteErrorBoundary>
                {children}
              </RouteErrorBoundary>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}