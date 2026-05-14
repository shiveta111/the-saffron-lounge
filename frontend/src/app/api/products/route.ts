import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';

const API_BASE_URL = env.apiUrl;

export async function GET(request: NextRequest) {
  try {
    // Proxy the request to the real backend
    const url = new URL(request.url);
    const backendUrl = new URL(`${API_BASE_URL}/api/products${url.search}`);

    const response = await fetch(backendUrl.toString(), {
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
    console.error('Error proxying products request:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch products', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Proxy the request to the real backend
    const response = await fetch(`${API_BASE_URL}/api/products`, {
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
    console.error('Error proxying product creation:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create product', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}