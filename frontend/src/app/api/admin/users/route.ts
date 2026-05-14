import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';

const API_BASE_URL = env.apiUrl;

export async function GET(request: NextRequest) {
  try {
    // Proxy the request to the real backend
    const url = new URL(request.url);
    const params: any = {};

    // Parse query parameters
    if (url.searchParams.get('page')) params.page = parseInt(url.searchParams.get('page')!);
    if (url.searchParams.get('limit')) params.limit = parseInt(url.searchParams.get('limit')!);
    if (url.searchParams.get('search')) params.search = url.searchParams.get('search');
    if (url.searchParams.get('role')) params.role = url.searchParams.get('role');
    if (url.searchParams.get('isActive')) params.isActive = url.searchParams.get('isActive') === 'true';

    const queryString = new URLSearchParams(params).toString();
    const backendUrl = `${API_BASE_URL}/api/admin/users${queryString ? `?${queryString}` : ''}`;

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
  } catch (error) {
    console.error('Error proxying admin users request:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch users', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (jsonError) {
      console.error('Invalid JSON in request body:', jsonError);
      return NextResponse.json(
        { success: false, message: 'Invalid JSON in request body', error: 'Request body contains invalid JSON' },
        { status: 400 }
      );
    }

    const API_BASE_URL = env.apiUrl;

    const response = await fetch(`${API_BASE_URL}/api/users`, {
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
  } catch (error) {
    console.error('Error proxying admin users POST request:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create user', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}