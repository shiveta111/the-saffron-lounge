import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';

const API_BASE_URL = env.apiUrl;

export async function GET(request: NextRequest) {
  try {
    // Proxy the request to the backend data integrity endpoint
    const response = await fetch(`${API_BASE_URL}/api/admin/data-integrity`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Forward authorization header if present
        ...(request.headers.get('authorization') && {
          'Authorization': request.headers.get('authorization')!
        })
      }
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('Data integrity proxy error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch data integrity audit',
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Proxy the request to the backend data integrity endpoint
    const response = await fetch(`${API_BASE_URL}/api/admin/data-integrity`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward authorization header if present
        ...(request.headers.get('authorization') && {
          'Authorization': request.headers.get('authorization')!
        })
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('Data integrity fix proxy error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to apply data integrity fixes',
        error: error.message,
      },
      { status: 500 }
    );
  }
}