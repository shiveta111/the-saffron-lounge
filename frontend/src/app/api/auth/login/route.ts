import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';

const API_BASE_URL = env.apiUrl;

// FIXED: Standardized backend proxy function for auth endpoints
async function proxyToBackend(request: NextRequest, method: string, body?: any) {
  try {
    const backendUrl = `${API_BASE_URL}/api/auth/login`;

    console.log(`[AUTH] ${method} ${request.url} -> ${backendUrl}`);

    const response = await fetch(backendUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        // Forward authorization header if present
        ...(request.headers.get('authorization') && {
          'Authorization': request.headers.get('authorization')!
        }),
        // Forward other important headers
        ...(request.headers.get('x-api-key') && {
          'x-api-key': request.headers.get('x-api-key')!
        })
      },
      ...(body && { body: JSON.stringify(body) }),
    });

    const data = await response.json();

    console.log(`[AUTH] Response ${response.status}:`, data);

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error(`[AUTH] Backend connection error for ${method} ${request.url}:`, error);
    return NextResponse.json(
      {
        success: false,
        message: 'Authentication service unavailable',
        error: 'BACKEND_CONNECTION_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return proxyToBackend(request, 'POST', body);
  } catch (error) {
    console.error('[AUTH] Invalid JSON in POST request:', error);
    return NextResponse.json(
      { success: false, message: 'Invalid JSON in request body', error: 'INVALID_JSON' },
      { status: 400 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed: GET /api/auth/login',
    },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed',
    },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    {
      success: false,
      error: 'Method not allowed',
    },
    { status: 405 }
  );
}