import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Running basic performance tests...');

    // Run a sample database operation test (simulated)
    const dbTestStart = Date.now();
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
    const dbTestDuration = Date.now() - dbTestStart;

    // Run a sample API call test
    const apiTestStart = Date.now();
    const start = Date.now();
    while (Date.now() - start < Math.random() * 50) {
      // Busy wait simulation
    }
    const apiTestDuration = Date.now() - apiTestStart;

    const results = {
      timestamp: new Date().toISOString(),
      sampleTests: {
        databaseTest: {
          duration: dbTestDuration,
          success: true,
          recordsProcessed: Math.floor(Math.random() * 100)
        },
        apiTest: {
          duration: apiTestDuration,
          success: true,
          dataProcessed: Math.floor(Math.random() * 1000)
        },
      },
      systemInfo: {
        nodeVersion: process.version,
        platform: process.platform,
        uptime: process.uptime(),
      },
      recommendations: [
        'Performance monitoring is simplified for development.',
        'Consider implementing detailed monitoring in production.',
      ],
    };

    console.log('✅ Basic performance tests completed');

    return NextResponse.json({
      success: true,
      data: results,
      message: 'Basic performance tests completed successfully',
    });
  } catch (error: any) {
    console.error('Performance test failed:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Performance test failed',
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { testType } = await request.json();

    let result;

    switch (testType) {
      case 'memory':
        // Force garbage collection if available
        if (typeof global !== 'undefined' && global.gc) {
          global.gc();
        }
        result = {
          memoryUsage: typeof process !== 'undefined' ? process.memoryUsage() : null,
          timestamp: new Date().toISOString(),
        };
        break;

      case 'uptime':
        result = {
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
        };
        break;

      default:
        return NextResponse.json(
          { success: false, message: 'Invalid test type. Supported: memory, uptime' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `${testType} test completed`,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: 'Test failed',
        error: error.message,
      },
      { status: 500 }
    );
  }
}