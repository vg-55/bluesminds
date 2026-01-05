import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';

// Check if user is admin
async function checkAdminAccess(supabase: Awaited<ReturnType<typeof createServerClient>>) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check user role from database
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const authError = await checkAdminAccess(supabase);
    if (authError) return authError;

    const body = await request.json();
    const { base_url, api_key } = body;

    if (!base_url) {
      return NextResponse.json(
        { error: 'Base URL is required' },
        { status: 400 }
      );
    }

    // Construct the models endpoint URL
    const url = base_url.endsWith('/')
      ? `${base_url}models`
      : `${base_url}/models`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (api_key) {
      headers['Authorization'] = `Bearer ${api_key}`;
    }

    // Fetch models from the LiteLLM server
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch models: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Parse models from various response formats
    let models: string[] = [];
    if (data.data && Array.isArray(data.data)) {
      models = data.data
        .map((m: any) => m.id || m.model || m.name)
        .filter(Boolean);
    } else if (Array.isArray(data)) {
      models = data
        .map((m: any) => m.id || m.model || m.name)
        .filter(Boolean);
    }

    if (models.length === 0) {
      return NextResponse.json(
        { error: 'No models found in response' },
        { status: 404 }
      );
    }

    return NextResponse.json({ models });
  } catch (error) {
    console.error('Error fetching models:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Failed to fetch models from server',
      },
      { status: 500 }
    );
  }
}
