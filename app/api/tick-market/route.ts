import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { runTick } from '@/lib/game-engine';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key) as any;
}

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const supabase = getServiceClient();
  if (!supabase) return NextResponse.json({ error: 'Not configured' }, { status: 500 });

  const { data: world } = await supabase.from('world').select('last_tick_at,tick_interval_seconds').single();
  if (world?.last_tick_at && world?.tick_interval_seconds) {
    const elapsed = (Date.now() - new Date(world.last_tick_at).getTime()) / 1000;
    if (elapsed < world.tick_interval_seconds * 0.85) {
      return NextResponse.json({ skipped: true, elapsed_s: Math.round(elapsed), interval_s: world.tick_interval_seconds });
    }
  }

  try {
    const result = await runTick(supabase);
    return NextResponse.json(result);
  } catch (e) {
    console.error('[tick-cron]', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Tick failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const supabase = getServiceClient();
  if (!supabase) return NextResponse.json({ error: 'Key fehlt' }, { status: 500 });

  const body = await req.json().catch(() => ({}));

  // Support manual BUILD action from client
  if (body?.action === 'BUILD') {
    const { default: sb } = await import('@/lib/supabase');
    const client = (sb as any).getSupabase();
    // Use service client for admin operations
    await supabase.from('actions_queue').insert({
      company_id: body.company_id,
      type: 'BUILD',
      payload: body.payload,
      tick_number: 0,
    }).select();
    return NextResponse.json({ success: true });
  }

  try {
    const result = await runTick(supabase);
    return NextResponse.json(result);
  } catch (e) {
    console.error('[tick]', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Tick failed' }, { status: 500 });
  }
}