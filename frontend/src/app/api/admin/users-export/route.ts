import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';

export async function GET(request: NextRequest) {
  try {
    // Proxy the request to the real backend
    const API_BASE_URL = env.apiUrl;
    const backendUrl = `${API_BASE_URL}/api/admin/users-export`;

    const response = await fetch(backendUrl, {
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
    console.error('Error retrieving users:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to retrieve users from database',
        error: error.message,
      },
      { status: 500 }
    );
  }
}