import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const PROJECT_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const sb = createClient(PROJECT_URL, SERVICE_KEY) as any;

  // ── Create a new company ──────────────────────────────────────────────────
  if (body.name && body.primary_sector) {
    const { data: existing } = await sb.from('companies')
      .select('id').eq('owner_id', body.owner_id ?? 'dev').maybeSingle();
    if (existing) return NextResponse.json({ error: 'Firma existiert bereits' }, { status: 400 });

    const colors = ['#6366f1', '#f59e0b', '#84cc16', '#06b6d4', '#f87171', '#a78bfa'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const { data: company, error } = await sb.from('companies').insert({
      owner_id: body.owner_id ?? 'dev',
      name: body.name,
      primary_sector: body.primary_sector,
      cash: 50000,
      color,
      logo: 'default',
      is_bot: false,
      insolvency_stage: 0,
      production_priority: { cost: 33, quality: 34, growth: 33 },
      warehouse_strategy: 'normal',
    }).select().single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, company });
  }

  return NextResponse.json({ error: 'name und primary_sector erforderlich' }, { status: 400 });
}