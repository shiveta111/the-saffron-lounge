import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';

const API_BASE_URL = env.apiUrl;

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const backendUrl = new URL(`${API_BASE_URL}/api/subscribers${url.search}`);

    const response = await fetch(backendUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(request.headers.get('authorization') && {
          'Authorization': request.headers.get('authorization')!
        })
      }
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error proxying subscribers request:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch subscribers', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${API_BASE_URL}/api/subscribers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(request.headers.get('authorization') && {
          'Authorization': request.headers.get('authorization')!
        })
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Error proxying subscriber creation:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create subscriber', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}