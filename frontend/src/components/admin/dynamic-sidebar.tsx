'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ChevronDown,
  ChevronRight,
  Database,
  Settings,
  Users,
  Calendar,
  ShoppingCart,
  Utensils,
  UserCheck,
  Tag,
  Bell,
  FileText,
  Briefcase,
  Star,
  Mail,
  HelpCircle,
  Image,
  Package,
  Loader2,
  AlertCircle,
  LogOut,
  User,
  Plus,
  List,
} from 'lucide-react';
import { swaggerParser, ParsedSwagger, SwaggerResource } from '@/lib/swagger-parser';
import { useAuthStore } from '@/lib/stores/auth-store';
import { toast } from 'sonner';

const iconMap = {
  Database,
  Settings,
  Users,
  Calendar,
  ShoppingCart,
  Utensils,
  UserCheck,
  Tag,
  Bell,
  FileText,
  Briefcase,
  Star,
  Mail,
  HelpCircle,
  Image,
  Package,
};

interface DynamicSidebarProps {
  className?: string;
}

export function DynamicSidebar({ className }: DynamicSidebarProps) {
  const [swaggerData, setSwaggerData] = useState<ParsedSwagger | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['static']));
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const loadSwaggerData = async () => {
      try {
        setLoading(true);
        const data = await swaggerParser.getParsedSwagger();
        setSwaggerData(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load API documentation');
        console.error('Failed to load Swagger data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSwaggerData();
  }, [mounted]);

  const toggleSection = (sectionName: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionName)) {
      newExpanded.delete(sectionName);
    } else {
      newExpanded.add(sectionName);
    }
    setExpandedSections(newExpanded);
  };

  const getIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName as keyof typeof iconMap] || Database;
    return IconComponent;
  };

  const isActiveRoute = (path: string) => {
    if (!mounted) return false;
    return pathname === path || pathname.startsWith(path + '/');
  };

  if (loading) {
    return (
      <div className={cn("flex h-full w-64 flex-col border-r bg-white", className)}>
        <div className="flex h-16 items-center justify-center border-b px-4">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2 text-sm">Loading API...</span>
        </div>
        <div className="flex-1 p-4">
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-8 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("flex h-full w-64 flex-col border-r bg-white", className)}>
        <div className="flex h-16 items-center justify-center border-b px-4">
          <AlertCircle className="h-6 w-6 text-red-500" />
          <span className="ml-2 text-sm font-medium">API Error</span>
        </div>
        <div className="flex-1 p-4">
          <div className="text-xs text-red-600 bg-red-50 p-3 rounded-md">
            {error}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 w-full"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const staticMenuItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: 'Settings' },
    { name: 'Users', path: '/admin/users', icon: 'Users' },
    { name: 'Customers', path: '/admin/customers', icon: 'UserCheck' },
    { name: 'Services', path: '/admin/services', icon: 'Settings' },
    { name: 'Menus', path: '/admin/menu', icon: 'Utensils' },
    { name: 'Products', path: '/admin/products', icon: 'Package' },
    { name: 'Inventory', path: '/admin/inventory', icon: 'Package' },
    { name: 'Categories', path: '/admin/categories', icon: 'Tag' },
    { name: 'Orders', path: '/admin/orders', icon: 'ShoppingCart' },
    { name: 'Payments', path: '/admin/payments', icon: 'Package', comingSoon: true },
    {
      name: 'Reservations',
      path: '/admin/reservations',
      icon: 'Calendar',
      children: [
        { name: 'All Reservations', path: '/admin/reservations' },
        { name: 'Create Reservation', path: '/admin/reservations/create' },
      ],
    },
    { name: 'Blog', path: '/admin/blog', icon: 'FileText' },
    { name: 'Blog Categories', path: '/admin/blog-categories', icon: 'Tag' },
    { name: 'Media Library', path: '/admin/media', icon: 'Image' },
    { name: 'Team', path: '/admin/team', icon: 'Users' },
    { name: 'Testimonials', path: '/admin/testimonials', icon: 'Star' },
    { name: 'Promotions', path: '/admin/promotions', icon: 'Tag' },
    { name: 'Diagnostics', path: '/admin/diagnostics', icon: 'Settings' },
    { name: 'Settings', path: '/admin/settings', icon: 'Settings', comingSoon: true },
  ];

  return (
    <div className={cn("flex h-full w-64 flex-col border-r bg-white", className)}>
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        <h2 className="text-lg font-semibold text-gray-900">Admin Panel</h2>
        {swaggerData && (
          <Badge variant="secondary" className="text-xs">
            v{swaggerData.info.version}
          </Badge>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {/* Static Menu Items */}
          <Collapsible
            open={expandedSections.has('static')}
            onOpenChange={() => toggleSection('static')}
          >
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-2 h-auto font-medium text-left"
              >
                <span>Core Management</span>
                {expandedSections.has('static') ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-1 pl-4">
              {staticMenuItems.map((item) => {
                const IconComponent = getIcon(item.icon);

                if (item.comingSoon) {
                  return (
                    <Button
                      key={item.path}
                      variant="ghost"
                      disabled
                      className="w-full justify-start p-2 h-8 text-sm cursor-not-allowed opacity-60"
                      onClick={(e) => {
                        e.preventDefault();
                        toast.info(`${item.name} is coming soon!`);
                      }}
                    >
                      <IconComponent className="mr-2 h-4 w-4" />
                      {item.name}
                      <Badge variant="outline" className="ml-auto text-xs">
                        Coming Soon
                      </Badge>
                    </Button>
                  );
                }

                if (item.children) {
                  const isSectionActive = item.children.some(child => isActiveRoute(child.path));
                  return (
                    <Collapsible
                      key={item.path}
                      open={expandedSections.has(item.path) || isSectionActive}
                      onOpenChange={() => toggleSection(item.path)}
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          variant={isSectionActive ? 'secondary' : 'ghost'}
                          className={cn(
                            'w-full justify-between p-2 h-8 text-sm',
                            isSectionActive && 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                          )}
                        >
                          <span className="flex items-center">
                            <IconComponent className="mr-2 h-4 w-4" />
                            {item.name}
                          </span>
                          {(expandedSections.has(item.path) || isSectionActive) ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-1 pl-4 pt-1">
                        {item.children.map(child => {
                          const isChildActive = pathname === child.path;
                          const ChildIcon = child.path.includes('create') ? Plus : List;
                          return (
                            <Link key={child.path} href={child.path}>
                              <Button
                                variant={isChildActive ? 'secondary' : 'ghost'}
                                className={cn(
                                  'w-full justify-start p-2 h-7 text-xs',
                                  isChildActive && 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                )}
                              >
                                <ChildIcon className="mr-2 h-3 w-3" />
                                {child.name}
                              </Button>
                            </Link>
                          );
                        })}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                }

                const isActive = isActiveRoute(item.path);
                return (
                  <Link key={item.path} href={item.path}>
                    <Button
                      variant={isActive ? 'secondary' : 'ghost'}
                      className={cn(
                        'w-full justify-start p-2 h-8 text-sm',
                        isActive && 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                      )}
                    >
                      <IconComponent className="mr-2 h-4 w-4" />
                      {item.name}
                    </Button>
                  </Link>
                );
              })}
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          {/* Dynamic API Resources - Hidden for now, using existing working pages */}
          {swaggerData && swaggerData.resources && swaggerData.resources.length > 0 && false && (
            <Collapsible
              open={expandedSections.has('dynamic')}
              onOpenChange={() => toggleSection('dynamic')}
            >
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-between p-2 h-auto font-medium text-left"
                >
                  <span>API Resources</span>
                  <Badge variant="outline" className="text-xs">
                    {swaggerData?.resources?.length || 0}
                  </Badge>
                  {expandedSections.has('dynamic') ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 pl-4">
                {swaggerData?.resources?.map((resource) => {
                  const IconComponent = getIcon(resource.icon || 'Database');
                  const resourcePath = `/admin/dynamic/${resource.name}`;
                  const isActive = isActiveRoute(resourcePath);

                  return (
                    <Link key={resource.name} href={resourcePath}>
                      <Button
                        variant={isActive ? "secondary" : "ghost"}
                        className={cn(
                          "w-full justify-start p-2 h-8 text-sm",
                          isActive && "bg-green-50 text-green-700 hover:bg-green-100"
                        )}
                      >
                        <IconComponent className="mr-2 h-4 w-4" />
                        {resource.displayName}
                        <Badge variant="outline" className="ml-auto text-xs">
                          {resource.endpoints?.length || 0}
                        </Badge>
                      </Button>
                    </Link>
                  );
                })}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* API Info */}
          {swaggerData && swaggerData.info && (
            <>
              <Separator />
              <div className="p-3 bg-gray-50 rounded-md">
                <div className="text-xs font-medium text-gray-700 mb-1">
                  {swaggerData.info.title}
                </div>
                <div className="text-xs text-gray-500">
                  {swaggerData.resources ? swaggerData.resources.length : 0} resources loaded
                </div>
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      {/* User Info & Logout */}
      <div className="border-t bg-white p-4 space-y-2">
        {user && (
          <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
              <User className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {user.name || user.email}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {user.email}
              </div>
            </div>
          </div>
        )}
        <Button
          variant="outline"
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}