import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, supabaseAdmin } from '@/lib/supabase/client';
import { checkAdminAccess } from '@/lib/utils/check-admin';

async function checkServerHealth(baseUrl: string, apiKey?: string) {
  try {
    const startTime = Date.now();

    // Try the /health endpoint first
    const healthUrl = baseUrl.endsWith('/') ? `${baseUrl}health` : `${baseUrl}/health`;

    const headers: HeadersInit = {};
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(healthUrl, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        health_status: 'healthy' as const,
        avg_response_time_ms: responseTime,
      };
    } else if (response.status >= 500) {
      return {
        health_status: 'unhealthy' as const,
        avg_response_time_ms: responseTime,
      };
    } else {
      return {
        health_status: 'degraded' as const,
        avg_response_time_ms: responseTime,
      };
    }
  } catch (error) {
    console.error('Health check error:', error);
    return {
      health_status: 'unhealthy' as const,
      avg_response_time_ms: 0,
    };
  }
}

// POST /api/admin/health-check - Run health check on all servers or specific server
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Check admin access using centralized function
    await checkAdminAccess(supabase);

    const body = await request.json();
    const { serverId } = body;

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Database client not available' },
        { status: 500 }
      );
    }

    // Get servers to check
    let query = supabaseAdmin.from('litellm_servers').select('*');

    if (serverId) {
      query = query.eq('id', serverId);
    } else {
      query = query.eq('is_active', true);
    }

    const { data: servers, error: fetchError } = await query;

    if (fetchError) {
      console.error('Failed to fetch servers:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch servers' },
        { status: 500 }
      );
    }

    if (!servers || servers.length === 0) {
      return NextResponse.json({ message: 'No servers to check', checked: 0 });
    }

    // Run health checks
    const results = await Promise.all(
      servers.map(async (server) => {
        const healthResult = await checkServerHealth(server.base_url, server.api_key);

        // Update server in database
        const { error: updateError } = await supabaseAdmin
          .from('litellm_servers')
          .update({
            health_status: healthResult.health_status,
            avg_response_time_ms: healthResult.avg_response_time_ms,
            last_health_check_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', server.id);

        if (updateError) {
          console.error(`Failed to update server ${server.id}:`, updateError);
        }

        return {
          id: server.id,
          name: server.name,
          status: healthResult.health_status,
          responseTime: healthResult.avg_response_time_ms,
        };
      })
    );

    return NextResponse.json({
      message: 'Health check completed',
      checked: results.length,
      results,
    });
  } catch (error) {
    console.error('Error running health check:', error);
    return NextResponse.json(
      { error: 'Failed to run health check' },
      { status: 500 }
    );
  }
}
