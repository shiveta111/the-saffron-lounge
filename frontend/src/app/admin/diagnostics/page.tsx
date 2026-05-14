'use client';

import { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../../components/ui/table';
import { Badge } from '../../../components/ui/badge';
import { Progress } from '../../../components/ui/progress';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { RefreshCw, AlertTriangle, CheckCircle, XCircle, Shield, Lock, Unlock, ChevronDown, Server } from 'lucide-react';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../../../components/ui/collapsible';
import { useAuthStore } from '../../../lib/stores/auth-store';
import { env } from '@/lib/env';

const API_BASE_URL = env.apiUrl;
const BASE_API_URL = API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`;

interface ApiHealthResult {
  endpoint: string;
  method: string;
  purpose: string;
  category: string;
  statusCode: number;
  status: 'success' | 'error' | 'timeout';
  responseTime: number;
  errorMessage?: string;
  timestamp: Date;
}

interface SecurityTestResult {
  testName: string;
  endpoint: string;
  method: string;
  authType: 'none' | 'invalid' | 'customer' | 'seller' | 'admin';
  expectedStatus: number;
  actualStatus: number;
  passed: boolean;
  errorMessage?: string;
  responseTime: number;
}

export default function DiagnosticsPage() {
  const [apiHealthResults, setApiHealthResults] = useState<ApiHealthResult[]>([]);
  const [securityResults, setSecurityResults] = useState<SecurityTestResult[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastRunTime, setLastRunTime] = useState<Date | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const { tokens } = useAuthStore();

  const getAuthToken = (): string | null => {
    return tokens?.accessToken || null;
  };

  const runFullDiagnostics = async () => {
    setRunning(true);
    setProgress(0);
    setApiHealthResults([]);
    setSecurityResults([]);

    try {
      // Step 1: Test API Health (30% progress)
      setProgress(10);
      const healthResults = await testAdminApiHealth();
      setApiHealthResults(healthResults);
      setProgress(30);

      // Step 2: Test Security Validation (70% progress)
      setProgress(40);
      const secResults = await testMenuAuthentication();
      setSecurityResults(secResults);
      setProgress(100);

      setLastRunTime(new Date());

      const failedHealth = healthResults.filter(r => r.status === 'error' || r.status === 'timeout').length;
      const failedSecurity = secResults.filter(r => !r.passed).length;

      if (failedHealth > 0 || failedSecurity > 0) {
        toast.error(`${failedHealth} API health checks failed, ${failedSecurity} security tests failed`);
      } else {
        toast.success('All diagnostic tests passed');
      }
    } catch (error: any) {
      console.error('Diagnostics failed:', error);
      toast.error('Diagnostics failed: ' + error.message);
    } finally {
      setRunning(false);
    }
  };

  const testAdminApiHealth = async (): Promise<ApiHealthResult[]> => {
    const results: ApiHealthResult[] = [];
    const token = getAuthToken();

    // Define all admin endpoints to test
    const adminEndpoints = [
      // Menu Management
      { endpoint: '/menu', method: 'POST', purpose: 'Create menu item', category: 'Menu Management' },
      { endpoint: '/menu/1', method: 'PUT', purpose: 'Update menu item', category: 'Menu Management' },
      { endpoint: '/menu/1', method: 'DELETE', purpose: 'Delete menu item', category: 'Menu Management' },
      
      // Products Management
      { endpoint: '/admin/products', method: 'GET', purpose: 'List all products', category: 'Products Management' },
      { endpoint: '/admin/products', method: 'POST', purpose: 'Create product', category: 'Products Management' },
      { endpoint: '/admin/products/1', method: 'PUT', purpose: 'Update product', category: 'Products Management' },
      { endpoint: '/admin/products/1', method: 'DELETE', purpose: 'Delete product', category: 'Products Management' },
      
      // Orders Management
      { endpoint: '/admin/orders', method: 'GET', purpose: 'List all orders', category: 'Orders Management' },
      
      // Reservations Management
      { endpoint: '/admin/reservations', method: 'GET', purpose: 'List all reservations', category: 'Reservations Management' },
      
      // Users Management
      { endpoint: '/admin/users', method: 'GET', purpose: 'List all users', category: 'Users Management' },
      { endpoint: '/admin/users', method: 'POST', purpose: 'Create user', category: 'Users Management' },
      { endpoint: '/admin/users/1/status', method: 'PATCH', purpose: 'Update user status', category: 'Users Management' },
      
      // Customers Management
      { endpoint: '/admin/customers', method: 'GET', purpose: 'List all customers', category: 'Customers Management' },
      { endpoint: '/admin/customers/1', method: 'PUT', purpose: 'Update customer', category: 'Customers Management' },
      { endpoint: '/admin/customers/1/status', method: 'PATCH', purpose: 'Update customer status', category: 'Customers Management' },
      
      // Blog Management
      { endpoint: '/admin/blogs', method: 'GET', purpose: 'List all blogs', category: 'Blog Management' },
      { endpoint: '/admin/blogs', method: 'POST', purpose: 'Create blog', category: 'Blog Management' },
      { endpoint: '/admin/blogs/1', method: 'PUT', purpose: 'Update blog', category: 'Blog Management' },
      { endpoint: '/admin/blogs/1', method: 'DELETE', purpose: 'Delete blog', category: 'Blog Management' },
      
      // Testimonials Management
      { endpoint: '/admin/testimonials', method: 'GET', purpose: 'List all testimonials', category: 'Testimonials Management' },
      { endpoint: '/admin/testimonials', method: 'POST', purpose: 'Create testimonial', category: 'Testimonials Management' },
      { endpoint: '/admin/testimonials/1', method: 'PUT', purpose: 'Update testimonial', category: 'Testimonials Management' },
      { endpoint: '/admin/testimonials/1', method: 'DELETE', purpose: 'Delete testimonial', category: 'Testimonials Management' },
      
      // System Management
      { endpoint: '/admin/dashboard', method: 'GET', purpose: 'Get dashboard stats', category: 'System Management' },
      { endpoint: '/admin/analytics', method: 'GET', purpose: 'Get analytics data', category: 'System Management' },
      { endpoint: '/admin/system/health', method: 'GET', purpose: 'Get system health', category: 'System Management' },
      { endpoint: '/admin/system/stats', method: 'GET', purpose: 'Get system statistics', category: 'System Management' },
    ];

    for (const endpoint of adminEndpoints) {
      const startTime = Date.now();
      try {
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };

        // Add auth token if available
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        // Prepare request body for POST/PUT/PATCH requests
        let body: string | undefined;
        if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
          if (endpoint.endpoint.includes('status')) {
            body = JSON.stringify({ isActive: true });
          } else if (endpoint.endpoint.includes('menu')) {
            body = JSON.stringify({ name: 'Test Item', price: 10.99, category: 'Test' });
          } else if (endpoint.endpoint.includes('products')) {
            body = JSON.stringify({ name: 'Test Product', price: 10.99, category: 'Test' });
          } else if (endpoint.endpoint.includes('blogs')) {
            body = JSON.stringify({ title: 'Test Blog', content: 'Test content' });
          } else if (endpoint.endpoint.includes('testimonials')) {
            body = JSON.stringify({ name: 'Test User', content: 'Test testimonial' });
          } else if (endpoint.endpoint.includes('users')) {
            body = JSON.stringify({ email: 'test@test.com', password: 'test123', name: 'Test User', role: 'CUSTOMER' });
          }
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const response = await fetch(`${BASE_API_URL}${endpoint.endpoint}`, {
          method: endpoint.method,
          headers,
          body,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;

        let errorMessage: string | undefined;
        let status: 'success' | 'error' | 'timeout' = 'success';
        
        try {
          const responseData = await response.json();
          if (!response.ok && responseData.error) {
            errorMessage = responseData.error;
          } else if (!response.ok && responseData.message) {
            errorMessage = responseData.message;
          }
        } catch {
          // Not JSON or already parsed
        }

        // Determine status based on response code
        if (response.ok) {
          // 200-299: Success
          status = 'success';
        } else if (response.status === 401) {
          // 401: Authentication required
          status = 'error';
          if (!token) {
            errorMessage = errorMessage || 'Authentication required (no token provided)';
          } else {
            errorMessage = errorMessage || 'Authentication failed (token may be invalid or expired)';
          }
        } else if (response.status === 400) {
          // 400: Validation error - endpoint works but validation failed (acceptable for testing)
          status = 'success';
          errorMessage = errorMessage || 'Validation error (endpoint is working)';
        } else if (response.status === 404) {
          // 404: Not found - endpoint might not exist or resource doesn't exist
          status = 'error';
          errorMessage = errorMessage || 'Resource not found';
        } else if (response.status === 409) {
          // 409: Conflict - endpoint works but conflict occurred (acceptable)
          status = 'success';
          errorMessage = errorMessage || 'Conflict (endpoint is working)';
        } else if (response.status >= 400 && response.status < 500) {
          // Other 4xx: Client errors - endpoint exists but request is invalid
          status = 'error';
        } else if (response.status >= 500) {
          // 500+: Server errors
          status = 'error';
        } else {
          status = 'error';
        }

        results.push({
          endpoint: endpoint.endpoint,
          method: endpoint.method,
          purpose: endpoint.purpose,
          category: endpoint.category,
          statusCode: response.status,
          status,
          responseTime,
          errorMessage,
          timestamp: new Date(),
        });
      } catch (error: any) {
        const responseTime = Date.now() - startTime;
        const isTimeout = error.name === 'AbortError';
        
        results.push({
          endpoint: endpoint.endpoint,
          method: endpoint.method,
          purpose: endpoint.purpose,
          category: endpoint.category,
          statusCode: 0,
          status: isTimeout ? 'timeout' : 'error',
          responseTime,
          errorMessage: isTimeout ? 'Request timeout (>10s)' : error.message || 'Network error',
          timestamp: new Date(),
        });
      }
    }

    return results;
  };

  const testMenuAuthentication = async (): Promise<SecurityTestResult[]> => {
    const results: SecurityTestResult[] = [];
    const token = getAuthToken();

    // Get a menu item ID for DELETE test (use first available or test ID)
    let testMenuId = 1;
    try {
      const menuResponse = await fetch(`${BASE_API_URL}/menu?limit=1`);
      if (menuResponse.ok) {
        const menuData = await menuResponse.json();
        if (menuData.data?.items?.[0]?.id) {
          testMenuId = menuData.data.items[0].id;
        }
      }
    } catch (error) {
      console.warn('Could not fetch menu ID for DELETE test, using default:', error);
    }

    const testMenuData = {
      name: 'Security Test Menu Item',
      price: 99.99,
      category: 'Security Test',
      description: 'This is a test item for security validation',
    };

    // Test 1: POST /menu without token
    results.push(await testSecurityScenario(
      'POST /menu without token',
      '/menu',
      'POST',
      'none',
      401,
      undefined,
      testMenuData
    ));

    // Test 2: POST /menu with invalid token
    results.push(await testSecurityScenario(
      'POST /menu with invalid token',
      '/menu',
      'POST',
      'invalid',
      401,
      'invalid_token_12345',
      testMenuData
    ));

    // Test 3: DELETE /menu/:id without token
    results.push(await testSecurityScenario(
      `DELETE /menu/${testMenuId} without token`,
      `/menu/${testMenuId}`,
      'DELETE',
      'none',
      401,
      undefined
    ));

    // Test 4: DELETE /menu/:id with invalid token
    results.push(await testSecurityScenario(
      `DELETE /menu/${testMenuId} with invalid token`,
      `/menu/${testMenuId}`,
      'DELETE',
      'invalid',
      401,
      'invalid_token_12345'
    ));

    // Test 5: POST /menu with admin token (should work or return validation error)
    if (token) {
      results.push(await testSecurityScenario(
        'POST /menu with admin token',
        '/menu',
        'POST',
        'admin',
        201, // Expected success or 400 for validation
        token,
        testMenuData
      ));
    } else {
      results.push({
        testName: 'POST /menu with admin token',
        endpoint: '/menu',
        method: 'POST',
        authType: 'admin',
        expectedStatus: 201,
        actualStatus: 0,
        passed: false,
        errorMessage: 'No admin token available in localStorage',
        responseTime: 0,
      });
    }

    // Test 6: DELETE /menu/:id with admin token (should work or return 404/409)
    if (token) {
      results.push(await testSecurityScenario(
        `DELETE /menu/${testMenuId} with admin token`,
        `/menu/${testMenuId}`,
        'DELETE',
        'admin',
        200, // Expected success or 404/409
        token
      ));
    } else {
      results.push({
        testName: `DELETE /menu/${testMenuId} with admin token`,
        endpoint: `/menu/${testMenuId}`,
        method: 'DELETE',
        authType: 'admin',
        expectedStatus: 200,
        actualStatus: 0,
        passed: false,
        errorMessage: 'No admin token available in localStorage',
        responseTime: 0,
      });
    }

    return results;
  };

  const testSecurityScenario = async (
    testName: string,
    endpoint: string,
    method: string,
    authType: 'none' | 'invalid' | 'customer' | 'seller' | 'admin',
    expectedStatus: number,
    token?: string,
    body?: any
  ): Promise<SecurityTestResult> => {
    const startTime = Date.now();
    
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (authType === 'invalid') {
        headers['Authorization'] = `Bearer ${token || 'invalid_token_12345'}`;
      } else if (authType === 'admin' && token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      // For 'none', don't add Authorization header

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${BASE_API_URL}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      let errorMessage: string | undefined;
      try {
        const responseData = await response.json();
        if (responseData.error) {
          errorMessage = responseData.error;
        } else if (responseData.message) {
          errorMessage = responseData.message;
        }
      } catch {
        // Not JSON
      }

      // For admin tests, accept 200-299 (success) or 400-499 (validation/not found) as acceptable
      const passed = authType === 'admin' 
        ? (response.status >= 200 && response.status < 500) || response.status === expectedStatus
        : response.status === expectedStatus;

      return {
        testName,
        endpoint,
        method,
        authType,
        expectedStatus,
        actualStatus: response.status,
        passed,
        errorMessage,
        responseTime,
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      const isTimeout = error.name === 'AbortError';
      
      return {
        testName,
        endpoint,
        method,
        authType,
        expectedStatus,
        actualStatus: 0,
        passed: false,
        errorMessage: isTimeout ? 'Request timeout (>10s)' : error.message || 'Network error',
        responseTime,
      };
    }
  };

  const getStatusBadge = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) {
      return <Badge className="bg-green-100 text-green-800">✓ {statusCode}</Badge>;
    } else if (statusCode >= 400 && statusCode < 500) {
      return <Badge className="bg-yellow-100 text-yellow-800">⚠ {statusCode}</Badge>;
    } else if (statusCode >= 500) {
      return <Badge className="bg-red-100 text-red-800">✗ {statusCode}</Badge>;
    } else if (statusCode === 0) {
      return <Badge className="bg-gray-100 text-gray-800">Timeout</Badge>;
    }
    return <Badge variant="outline">{statusCode}</Badge>;
  };

  const getResponseTimeColor = (time: number) => {
    if (time > 5000) return 'text-red-600 font-medium';
    if (time > 2000) return 'text-yellow-600';
    return 'text-green-600';
  };

  const groupedResults = apiHealthResults.reduce((acc, result) => {
    if (!acc[result.category]) {
      acc[result.category] = [];
    }
    acc[result.category].push(result);
    return acc;
  }, {} as Record<string, ApiHealthResult[]>);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  useEffect(() => {
    runFullDiagnostics();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">System Diagnostics</h2>
          <p className="text-gray-600 mt-1">API Health Monitoring & Security Validation</p>
        </div>
        <Button onClick={runFullDiagnostics} disabled={running}>
          <RefreshCw className={`w-4 h-4 mr-2 ${running ? 'animate-spin' : ''}`} />
          {running ? 'Running...' : 'Run Diagnostics'}
        </Button>
      </div>

      {!getAuthToken() && (
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>Authentication Required:</strong> No authentication token found. Please log in as an admin user to properly test protected endpoints. 
            Endpoints requiring authentication will show 401 errors without a valid token.
          </AlertDescription>
        </Alert>
      )}

      {running && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">Running Diagnostics...</div>
                <Progress value={progress} className="mt-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* API Health Section */}
      {apiHealthResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5" />
              API Health Monitoring
            </CardTitle>
            <div className="text-sm text-gray-600">
              {apiHealthResults.length} administrative endpoints tested
              {lastRunTime && ` • Last run: ${lastRunTime.toLocaleString()}`}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {Object.entries(groupedResults).map(([category, results]) => (
                <Collapsible
                  key={category}
                  open={expandedCategories.has(category)}
                  onOpenChange={() => toggleCategory(category)}
                >
                  <CollapsibleTrigger className="w-full px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${
                            expandedCategories.has(category) ? 'rotate-180' : ''
                          }`}
                        />
                        <span className="font-semibold text-gray-900">{category}</span>
                        <Badge variant="outline">{results.length} endpoints</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                          {results.filter(r => r.status === 'success').length} passed
                        </span>
                        {results.filter(r => r.status === 'error' || r.status === 'timeout').length > 0 && (
                          <Badge className="bg-red-100 text-red-800">
                            {results.filter(r => r.status === 'error' || r.status === 'timeout').length} failed
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Endpoint</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Purpose</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Response Time</TableHead>
                          <TableHead>Error</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {results.map((result, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-mono text-sm">{result.endpoint}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{result.method}</Badge>
                            </TableCell>
                            <TableCell className="text-sm">{result.purpose}</TableCell>
                            <TableCell>{getStatusBadge(result.statusCode)}</TableCell>
                            <TableCell>
                              <span className={getResponseTimeColor(result.responseTime)}>
                                {result.responseTime}ms
                              </span>
                            </TableCell>
                            <TableCell>
                              {result.errorMessage ? (
                                <div 
                                  className={`text-xs max-w-xs truncate ${
                                    result.status === 'success' 
                                      ? 'text-yellow-600' 
                                      : 'text-red-600'
                                  }`} 
                                  title={result.errorMessage}
                                >
                                  {result.errorMessage}
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Validation Section */}
      {securityResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Security Validation - Menu Item Authentication Check
            </CardTitle>
            <div className="text-sm text-gray-600">
              RBAC protection validation for menu item operations (POST/DELETE)
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Auth Type</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead>Actual</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Response Time</TableHead>
                  <TableHead>Error Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {securityResults.map((result, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{result.testName}</TableCell>
                    <TableCell className="font-mono text-sm">
                      <Badge variant="outline" className="mr-2">{result.method}</Badge>
                      {result.endpoint}
                    </TableCell>
                    <TableCell>
                      {result.authType === 'none' && (
                        <Badge className="bg-gray-100 text-gray-800">
                          <Unlock className="w-3 h-3 mr-1" />
                          No Token
                        </Badge>
                      )}
                      {result.authType === 'invalid' && (
                        <Badge className="bg-red-100 text-red-800">
                          <Lock className="w-3 h-3 mr-1" />
                          Invalid Token
                        </Badge>
                      )}
                      {result.authType === 'admin' && (
                        <Badge className="bg-blue-100 text-blue-800">
                          <Shield className="w-3 h-3 mr-1" />
                          Admin Token
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{result.expectedStatus}</Badge>
                    </TableCell>
                    <TableCell>
                      {result.actualStatus > 0 ? getStatusBadge(result.actualStatus) : (
                        <Badge className="bg-gray-100 text-gray-800">N/A</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {result.passed ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <Badge className="bg-green-100 text-green-800">PASS</Badge>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-red-500" />
                          <Badge className="bg-red-100 text-red-800">FAIL</Badge>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={getResponseTimeColor(result.responseTime)}>
                        {result.responseTime}ms
                      </span>
                    </TableCell>
                    <TableCell>
                      {result.errorMessage ? (
                        <div className="text-xs text-red-600 max-w-xs truncate" title={result.errorMessage}>
                          {result.errorMessage}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {apiHealthResults.length > 0 && securityResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Diagnostics Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-sm text-gray-600">API Health</div>
                <div className="text-2xl font-bold text-blue-600">
                  {apiHealthResults.filter(r => r.status === 'success').length} / {apiHealthResults.length}
                </div>
                <div className="text-xs text-gray-500">Endpoints healthy</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-sm text-gray-600">Security Tests</div>
                <div className="text-2xl font-bold text-green-600">
                  {securityResults.filter(r => r.passed).length} / {securityResults.length}
                </div>
                <div className="text-xs text-gray-500">Tests passed</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-sm text-gray-600">Average Response Time</div>
                <div className="text-2xl font-bold text-purple-600">
                  {Math.round(
                    [...apiHealthResults, ...securityResults].reduce((sum, r) => sum + r.responseTime, 0) /
                    (apiHealthResults.length + securityResults.length)
                  )}
                  ms
                </div>
                <div className="text-xs text-gray-500">Across all tests</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-sm mb-2">Environment</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">API Base URL:</span>
                  <span className="font-mono text-xs">{BASE_API_URL}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Environment:</span>
                  <span className="font-mono text-xs">{process.env.NODE_ENV}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Build Time:</span>
                  <span className="font-mono text-xs">{new Date().toISOString()}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-sm mb-2">Authentication Status</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Token Status:</span>
                  <span>
                    {getAuthToken() ? (
                      <Badge className="bg-green-100 text-green-800">Present</Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-800">Not Found</Badge>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Online Status:</span>
                  <span className="flex items-center gap-1">
                    {typeof window !== 'undefined' && window.navigator.onLine ? (
                      <><CheckCircle className="w-3 h-3 text-green-500" /> Online</>
                    ) : (
                      <><XCircle className="w-3 h-3 text-red-500" /> Offline</>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
