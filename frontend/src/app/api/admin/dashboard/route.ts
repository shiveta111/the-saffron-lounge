import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';

const API_BASE_URL = env.apiUrl;

export async function GET(request: NextRequest) {
  try {
    // Proxy the request to the real backend
    const response = await fetch(`${API_BASE_URL}/api/admin/dashboard`, {
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
  } catch (error) {
    console.error('Error proxying admin dashboard request:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch dashboard data', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}