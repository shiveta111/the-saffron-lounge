import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'audit'; // audit, security, permissions

    // Mock security data
    const securityData = {
      audit: [
        {
          id: 1,
          userId: 1,
          userName: 'Admin User',
          action: 'LOGIN',
          resource: 'auth',
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          timestamp: new Date().toISOString(),
          success: true
        },
        {
          id: 2,
          userId: 2,
          userName: 'John Doe',
          action: 'CREATE_ORDER',
          resource: 'orders',
          ipAddress: '192.168.1.101',
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          success: true
        },
        {
          id: 3,
          userId: 1,
          userName: 'Admin User',
          action: 'UPDATE_USER',
          resource: 'users',
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          success: true
        }
      ],
      security: {
        activeSessions: 12,
        failedLoginAttempts: 3,
        blockedIPs: ['192.168.1.200'],
        securityAlerts: [
          {
            id: 1,
            type: 'FAILED_LOGIN',
            message: 'Multiple failed login attempts from IP 192.168.1.200',
            severity: 'medium',
            timestamp: new Date(Date.now() - 1800000).toISOString()
          }
        ]
      },
      permissions: {
        roles: [
          {
            id: 1,
            name: 'ADMIN',
            description: 'Full system access',
            permissions: ['users.*', 'orders.*', 'products.*', 'analytics.*', 'settings.*']
          },
          {
            id: 2,
            name: 'SELLER',
            description: 'Product and order management',
            permissions: ['products.*', 'orders.*', 'analytics.read']
          },
          {
            id: 3,
            name: 'CUSTOMER',
            description: 'Basic user access',
            permissions: ['profile.*', 'orders.read']
          }
        ]
      }
    };

    const data = securityData[type as keyof typeof securityData] || securityData.audit;

    return NextResponse.json({
      success: true,
      data,
      message: `${type} security data retrieved successfully`
    });
  } catch (error) {
    console.error('Error fetching security data:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch security data', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, details } = body;

    // Mock security action logging
    const logEntry = {
      id: Math.floor(Math.random() * 10000) + 1,
      action,
      details,
      timestamp: new Date().toISOString(),
      ipAddress: '192.168.1.100',
      userAgent: request.headers.get('user-agent') || 'Unknown'
    };

    return NextResponse.json({
      success: true,
      data: logEntry,
      message: 'Security action logged successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error logging security action:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to log security action', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}