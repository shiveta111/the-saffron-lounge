import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';

const API_BASE_URL = env.apiUrl;

// Standardized backend proxy function
async function proxyToBackend(request: NextRequest, method: string, body?: any) {
  try {
    const url = new URL(request.url);
    const backendUrl = `${API_BASE_URL}/categories${url.search}`;

    console.log(`[API] ${method} ${url.pathname} -> ${backendUrl}`);

    const response = await fetch(backendUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        // Forward authorization header
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

    console.log(`[API] Response ${response.status}:`, data);

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error(`[API] Backend connection error for ${method} ${request.url}:`, error);
    return NextResponse.json(
      {
        success: false,
        message: 'Backend service unavailable',
        error: 'BACKEND_CONNECTION_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    );
  }
}

export async function GET(request: NextRequest) {
  return proxyToBackend(request, 'GET');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return proxyToBackend(request, 'POST', body);
  } catch (error) {
    console.error('[API] Invalid JSON in POST request:', error);
    return NextResponse.json(
      { success: false, message: 'Invalid JSON in request body', error: 'INVALID_JSON' },
      { status: 400 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    return proxyToBackend(request, 'PUT', body);
  } catch (error) {
    console.error('[API] Invalid JSON in PUT request:', error);
    return NextResponse.json(
      { success: false, message: 'Invalid JSON in request body', error: 'INVALID_JSON' },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  return proxyToBackend(request, 'DELETE');
}