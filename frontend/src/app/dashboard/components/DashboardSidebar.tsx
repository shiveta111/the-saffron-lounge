'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  ShoppingBag,
  Calendar,
  User,
  Menu,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DashboardSidebarProps {
  isMobileMenuOpen: boolean;
  onMobileMenuToggle: () => void;
}

const navigationItems = [
  { id: 'overview', label: 'Overview', icon: Home, path: '/dashboard', exact: true },
  { id: 'orders', label: 'Orders', icon: ShoppingBag, path: '/dashboard/orders', exact: false },
  { id: 'reservations', label: 'Reservations', icon: Calendar, path: '/dashboard/reservations', exact: false },
  { id: 'profile', label: 'Profile', icon: User, path: '/dashboard/profile', exact: false },
];

export function DashboardSidebar({
  isMobileMenuOpen,
  onMobileMenuToggle,
}: DashboardSidebarProps) {
  const pathname = usePathname();

  const isActive = (item: typeof navigationItems[0]) => {
    if (item.exact) {
      return pathname === item.path;
    }
    return pathname.startsWith(item.path);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden fixed top-4 left-4 z-50"
        onClick={onMobileMenuToggle}
        aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
      >
        {isMobileMenuOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
      </Button>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onMobileMenuToggle}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 z-40 h-screen w-64 bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out',
          'lg:translate-x-0',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <nav className="flex flex-col h-full p-4" aria-label="Dashboard navigation">
          {/* Logo/Brand Area */}
          <div className="mb-8 mt-4 lg:mt-0">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Home className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">Dashboard</span>
            </Link>
          </div>

          <div className="space-y-1 flex-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);

              return (
                <Link
                  key={item.id}
                  href={item.path}
                  onClick={() => {
                    if (isMobileMenuOpen) {
                      onMobileMenuToggle();
                    }
                  }}
                  className={cn(
                    'w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-150',
                    'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon
                    className={cn('h-5 w-5', active ? 'text-primary' : 'text-gray-500')}
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Footer - Back to Site Link */}
          <div className="pt-4 border-t border-gray-200">
            <Link
              href="/"
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-150"
            >
              <Home className="h-5 w-5 text-gray-500" aria-hidden="true" />
              <span>Back to Site</span>
            </Link>
          </div>
        </nav>
      </aside>
    </>
  );
}
