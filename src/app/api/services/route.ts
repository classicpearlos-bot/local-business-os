import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import defaultServices from '@/lib/automations/services.json';

export interface SalonService {
  id: string | number;
  name: string;
  category: string;
  regular_price: number;
  member_price: number;
  description?: string;
  whatsapp_number?: string;
  is_active?: boolean;
}

// Helper to flatten default services.json
function getDefaultServices(): SalonService[] {
  const list: SalonService[] = [];
  const raw = defaultServices as Record<string, any[]>;
  for (const group of Object.keys(raw)) {
    const items = raw[group] || [];
    for (const item of items) {
      list.push({
        id: `def_${item.ID || Math.random().toString(36).substring(2, 8)}`,
        name: item.Service || 'Service',
        category: item.Category || group,
        regular_price: Number(item['Regular Price']) || 0,
        member_price: Number(item['Member Price']) || 0,
        description: item.Description || '',
        whatsapp_number: '+91 83107 30322',
        is_active: true
      });
    }
  }
  return list;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search')?.toLowerCase();

    // Check if custom services exist in Supabase
    let dbServices: SalonService[] = [];
    const { data, error } = await supabaseAdmin
      .from('services')
      .select('*')
      .order('created_at', { ascending: true });

    if (!error && data && data.length > 0) {
      dbServices = data.map((d: any) => ({
        id: d.id,
        name: d.name,
        category: d.category,
        regular_price: Number(d.regular_price),
        member_price: Number(d.member_price),
        description: d.description || '',
        whatsapp_number: d.whatsapp_number || '+91 83107 30322',
        is_active: d.is_active !== false
      }));
    } else {
      // Fallback to pre-loaded Classic Pearl catalog
      dbServices = getDefaultServices();
    }

    // Apply filters
    let filtered = dbServices;
    if (category && category !== 'All') {
      filtered = filtered.filter(s => s.category.toLowerCase().includes(category.toLowerCase()));
    }
    if (search) {
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(search) || 
        s.category.toLowerCase().includes(search)
      );
    }

    // Extract unique categories
    const allCategories = Array.from(new Set(dbServices.map(s => s.category))).sort();

    return NextResponse.json({
      success: true,
      services: filtered,
      categories: allCategories,
      total: filtered.length
    });
  } catch (err: any) {
    console.error('Error fetching services:', err);
    const fallback = getDefaultServices();
    return NextResponse.json({
      success: true,
      services: fallback,
      categories: Array.from(new Set(fallback.map(s => s.category))).sort(),
      total: fallback.length
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, category, regular_price, member_price, description, whatsapp_number } = body;

    if (!name || regular_price === undefined || member_price === undefined) {
      return NextResponse.json({ error: 'Name, Regular Price, and Member Price are required.' }, { status: 400 });
    }

    const newService = {
      name: name.trim(),
      category: category?.trim() || 'General',
      regular_price: Number(regular_price),
      member_price: Number(member_price),
      description: description?.trim() || '',
      whatsapp_number: (whatsapp_number || '+91 83107 30322').trim(),
      is_active: true
    };

    const { data, error } = await supabaseAdmin
      .from('services')
      .insert(newService)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({
        success: true,
        service: { ...newService, id: `local_${Date.now()}` }
      }, { status: 201 });
    }

    return NextResponse.json({ success: true, service: data }, { status: 201 });
  } catch (err: any) {
    console.error('Error creating service:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
