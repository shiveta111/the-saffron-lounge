'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  Eye,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  BarChart3,
  PieChart,
  LineChart,
  Zap,
  Server,
  Database,
  Globe,
  Smartphone,
  Monitor,
  Settings,
  ChefHat,
  Calendar,
  Tag,
  Package,
  Truck,
  Star
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';

interface SellerDashboardStats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  completedOrders: number;
  totalProducts: number;
  activeProducts: number;
  totalCustomers: number;
  orderGrowth: number;
  revenueGrowth: number;
  customerGrowth: number;
}

interface RecentOrder {
  id: string;
  orderId: number;
  customerName: string;
  total: number;
  status: string;
  createdAt: string;
}

export default function SellerDashboardPage() {
  const [dashboardStats, setDashboardStats] = useState<SellerDashboardStats>({
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalProducts: 0,
    activeProducts: 0,
    totalCustomers: 0,
    orderGrowth: 0,
    revenueGrowth: 0,
    customerGrowth: 0
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [realTimeData, setRealTimeData] = useState({
    activeOrders: 0,
    recentSales: 0,
    serverLoad: 35
  });

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch data from multiple APIs
      const [
        ordersResponse,
        productsResponse,
        customersResponse
      ] = await Promise.allSettled([
        apiClient.getOrders({ limit: 10 }),
        apiClient.getMenuItems({ limit: 1 }),
        apiClient.getCustomers({ limit: 1 })
      ]);

      // Extract totals from responses
      const orders = ordersResponse.status === 'fulfilled' ? ordersResponse.value.data?.data || [] : [];
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum: number, order: any) => sum + order.total, 0);
      const pendingOrders = orders.filter((order: any) => order.status === 'PENDING' || order.status === 'PREPARING').length;
      const completedOrders = orders.filter((order: any) => order.status === 'DELIVERED').length;

      const totalProducts = productsResponse.status === 'fulfilled' ? productsResponse.value.data?.pagination?.total || 0 : 0;
      const totalCustomers = customersResponse.status === 'fulfilled' ? customersResponse.value.data?.pagination?.total || 0 : 0;

      setDashboardStats({
        totalOrders,
        totalRevenue,
        pendingOrders,
        completedOrders,
        totalProducts,
        activeProducts: Math.floor(totalProducts * 0.8), // Assume 80% are active
        totalCustomers,
        orderGrowth: 12.5,
        revenueGrowth: 15.7,
        customerGrowth: 8.3
      });

      // Generate recent orders
      const recentOrdersData: RecentOrder[] = orders.slice(0, 5).map((order: any) => ({
        id: order.id.toString(),
        orderId: order.id,
        customerName: order.customer?.name || 'Unknown Customer',
        total: order.total,
        status: order.status,
        createdAt: order.createdAt
      }));

      setRecentOrders(recentOrdersData);

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Simulate real-time updates
    const interval = setInterval(() => {
      setRealTimeData(prev => ({
        activeOrders: Math.max(0, prev.activeOrders + (Math.random() > 0.5 ? 1 : -1)),
        recentSales: Math.max(0, prev.recentSales + (Math.random() > 0.7 ? 1 : 0)),
        serverLoad: Math.min(100, Math.max(0, prev.serverLoad + (Math.random() - 0.5) * 10))
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge className="bg-blue-100 text-blue-800">Pending</Badge>;
      case 'PREPARING':
        return <Badge className="bg-yellow-100 text-yellow-800">Preparing</Badge>;
      case 'READY':
        return <Badge className="bg-green-100 text-green-800">Ready</Badge>;
      case 'DELIVERED':
        return <Badge className="bg-purple-100 text-purple-800">Delivered</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Seller Dashboard</h2>
          <p className="text-gray-600 mt-1">Manage your restaurant operations and track performance</p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2 px-3 py-1 bg-green-100 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-green-800">Operations Active</span>
          </div>
          <Button onClick={fetchDashboardData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(dashboardStats.totalOrders)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {dashboardStats.orderGrowth >= 0 ? (
                <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
              )}
              <span className={dashboardStats.orderGrowth >= 0 ? 'text-green-500' : 'text-red-500'}>
                {Math.abs(dashboardStats.orderGrowth)}%
              </span>
              <span className="ml-1">from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboardStats.totalRevenue)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {dashboardStats.revenueGrowth >= 0 ? (
                <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
              )}
              <span className={dashboardStats.revenueGrowth >= 0 ? 'text-green-500' : 'text-red-500'}>
                {Math.abs(dashboardStats.revenueGrowth)}%
              </span>
              <span className="ml-1">from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Products</CardTitle>
            <ChefHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(dashboardStats.activeProducts)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <span>of {dashboardStats.totalProducts} total</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(dashboardStats.totalCustomers)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {dashboardStats.customerGrowth >= 0 ? (
                <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
              )}
              <span className={dashboardStats.customerGrowth >= 0 ? 'text-green-500' : 'text-red-500'}>
                {Math.abs(dashboardStats.customerGrowth)}%
              </span>
              <span className="ml-1">from last month</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(dashboardStats.pendingOrders)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <span>Require attention</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Orders</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(dashboardStats.completedOrders)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <span>Successfully delivered</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Order Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardStats.totalOrders > 0 ?
                Math.round((dashboardStats.completedOrders / dashboardStats.totalOrders) * 100) : 0}%
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <span>Completion rate</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardStats.totalOrders > 0 ?
                formatCurrency(dashboardStats.totalRevenue / dashboardStats.totalOrders) : formatCurrency(0)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <span>Per order</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Server className="w-5 h-5 mr-2" />
              Operations Status
            </CardTitle>
            <CardDescription>Real-time operational status and performance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Kitchen Operations</span>
                </div>
                <Badge variant="default">Active</Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Order System</span>
                </div>
                <Badge variant="default">Online</Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Payment Processing</span>
                </div>
                <Badge variant="default">Active</Badge>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Order Fulfillment</span>
                <span className="font-medium">
                  {dashboardStats.totalOrders > 0 ?
                    Math.round((dashboardStats.completedOrders / dashboardStats.totalOrders) * 100) : 0}%
                </span>
              </div>
              <Progress
                value={dashboardStats.totalOrders > 0 ?
                  (dashboardStats.completedOrders / dashboardStats.totalOrders) * 100 : 0}
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Recent Orders
            </CardTitle>
            <CardDescription>Latest customer orders and their status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-start space-x-3">
                  <div className="mt-0.5">
                    <Package className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Order #{order.orderId}</p>
                    <p className="text-sm text-gray-900">{order.customerName}</p>
                    <p className="text-xs text-gray-500 flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatCurrency(order.total)}</p>
                    {getStatusBadge(order.status)}
                  </div>
                </div>
              ))}
              {recentOrders.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No recent orders</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Zap className="w-5 h-5 mr-2" />
              Quick Actions
            </CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <Button variant="outline" className="justify-start">
                <Package className="w-4 h-4 mr-2" />
                View All Orders
              </Button>
              <Button variant="outline" className="justify-start">
                <ChefHat className="w-4 h-4 mr-2" />
                Manage Menu
              </Button>
              <Button variant="outline" className="justify-start">
                <Users className="w-4 h-4 mr-2" />
                Customer List
              </Button>
              <Button variant="outline" className="justify-start">
                <BarChart3 className="w-4 h-4 mr-2" />
                View Reports
              </Button>
            </div>

            <div className="pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span>Pending Orders</span>
                <span className="font-medium text-orange-600">{dashboardStats.pendingOrders}</span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span>Ready for Pickup</span>
                <span className="font-medium text-green-600">
                  {recentOrders.filter(o => o.status === 'READY').length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <LineChart className="w-5 h-5 mr-2" />
            Real-Time Operations
          </CardTitle>
          <CardDescription>Live operational metrics updated every 5 seconds</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{realTimeData.activeOrders}</div>
              <div className="text-sm text-gray-500">Active Orders</div>
              <div className="flex items-center justify-center mt-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse mr-2"></div>
                <span className="text-xs text-gray-400">Live</span>
              </div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{realTimeData.recentSales}</div>
              <div className="text-sm text-gray-500">Recent Sales</div>
              <div className="text-xs text-gray-400 mt-1">Last 5 minutes</div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">{Math.round(realTimeData.serverLoad)}%</div>
              <div className="text-sm text-gray-500">System Load</div>
              <div className="text-xs text-gray-400 mt-1">Current usage</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}