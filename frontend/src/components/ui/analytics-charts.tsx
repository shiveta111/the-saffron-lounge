'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  ShoppingCart,
  Calendar,
  Activity
} from 'lucide-react';

interface ChartData {
  name: string;
  value: number;
  [key: string]: any;
}

interface AnalyticsChartsProps {
  data: {
    revenue?: ChartData[];
    users?: ChartData[];
    orders?: ChartData[];
    categories?: ChartData[];
    timeSeries?: ChartData[];
  };
  className?: string;
}

const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4'];

export function AnalyticsCharts({ data, className = '' }: AnalyticsChartsProps) {
  const revenueData = data.revenue || [];
  const usersData = data.users || [];
  const ordersData = data.orders || [];
  const categoriesData = data.categories || [];
  const timeSeriesData = data.timeSeries || [];

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalRevenue = revenueData.reduce((sum, item) => sum + item.value, 0);
    const totalUsers = usersData.reduce((sum, item) => sum + item.value, 0);
    const totalOrders = ordersData.reduce((sum, item) => sum + item.value, 0);

    const revenueChange = revenueData.length > 1
      ? ((revenueData[revenueData.length - 1].value - revenueData[0].value) / revenueData[0].value) * 100
      : 0;

    const usersChange = usersData.length > 1
      ? ((usersData[usersData.length - 1].value - usersData[0].value) / usersData[0].value) * 100
      : 0;

    const ordersChange = ordersData.length > 1
      ? ((ordersData[ordersData.length - 1].value - ordersData[0].value) / ordersData[0].value) * 100
      : 0;

    return {
      totalRevenue,
      totalUsers,
      totalOrders,
      revenueChange,
      usersChange,
      ordersChange
    };
  }, [revenueData, usersData, ordersData]);

  const formatCurrency = (value: number) => `€${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatNumber = (value: number) => value.toLocaleString();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {metrics.revenueChange >= 0 ? (
                <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
              )}
              <span className={metrics.revenueChange >= 0 ? 'text-green-500' : 'text-red-500'}>
                {Math.abs(metrics.revenueChange).toFixed(1)}%
              </span>
              <span className="ml-1">from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(metrics.totalUsers)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {metrics.usersChange >= 0 ? (
                <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
              )}
              <span className={metrics.usersChange >= 0 ? 'text-green-500' : 'text-red-500'}>
                {Math.abs(metrics.usersChange).toFixed(1)}%
              </span>
              <span className="ml-1">from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(metrics.totalOrders)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {metrics.ordersChange >= 0 ? (
                <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
              )}
              <span className={metrics.ordersChange >= 0 ? 'text-green-500' : 'text-red-500'}>
                {Math.abs(metrics.ordersChange).toFixed(1)}%
              </span>
              <span className="ml-1">from last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.totalOrders > 0 ? formatCurrency(metrics.totalRevenue / metrics.totalOrders) : '€0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Per order average
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        {revenueData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={formatCurrency} />
                  <Tooltip formatter={(value) => [formatCurrency(value as number), 'Revenue']} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#3B82F6"
                    fill="#3B82F6"
                    fillOpacity={0.1}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* User Growth */}
        {usersData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>User Growth</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={usersData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={formatNumber} />
                  <Tooltip formatter={(value) => [formatNumber(value as number), 'Users']} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Orders by Category */}
        {categoriesData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Orders by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoriesData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoriesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [formatNumber(value as number), 'Orders']} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Time Series Analysis */}
        {timeSeriesData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={formatNumber} />
                  <Tooltip formatter={(value) => [formatNumber(value as number), 'Activity']} />
                  <Bar dataKey="value" fill="#8B5CF6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Orders Overview */}
      {ordersData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Orders Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ordersData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={formatNumber} />
                <Tooltip formatter={(value) => [formatNumber(value as number), 'Orders']} />
                <Bar dataKey="value" fill="#F59E0B" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Data Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Best Performing Period</p>
                <p className="text-2xl font-bold">
                  {revenueData.length > 0 ? revenueData.reduce((max, item) =>
                    item.value > max.value ? item : max
                  ).name : 'N/A'}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Growth Rate</p>
                <p className="text-2xl font-bold text-green-600">
                  +{Math.max(metrics.revenueChange, metrics.usersChange, metrics.ordersChange).toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Data Points</p>
                <p className="text-2xl font-bold">
                  {revenueData.length + usersData.length + ordersData.length + categoriesData.length}
                </p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Mock data generator for demo
export function generateMockAnalyticsData() {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

  return {
    revenue: months.map((month, index) => ({
      name: month,
      value: Math.floor(Math.random() * 50000) + 20000
    })),
    users: months.map((month, index) => ({
      name: month,
      value: Math.floor(Math.random() * 1000) + 500
    })),
    orders: months.map((month, index) => ({
      name: month,
      value: Math.floor(Math.random() * 500) + 200
    })),
    categories: [
      { name: 'Food', value: 45 },
      { name: 'Beverages', value: 30 },
      { name: 'Desserts', value: 15 },
      { name: 'Other', value: 10 }
    ],
    timeSeries: months.map((month, index) => ({
      name: month,
      value: Math.floor(Math.random() * 1000) + 300
    }))
  };
}