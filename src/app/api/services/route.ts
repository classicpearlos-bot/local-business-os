import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import catalogServices from '@/lib/services/catalog.json';

export interface SalonService {
  id: string | number;
  name: string;
  tier?: string;
  category: string;
  regular_price: number;
  member_price: number;
  description?: string;
  image_url?: string;
  whatsapp_number?: string;
  is_active?: boolean;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const tier = searchParams.get('tier');
    const search = searchParams.get('search')?.toLowerCase();

    // Check if custom services exist in Supabase
    let allServices: SalonService[] = catalogServices as SalonService[];
    
    try {
      const { data, error } = await supabaseAdmin
        .from('services')
        .select('*')
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        // Merge DB overrides / new services with the catalog
        const dbMap = new Map(data.map((d: any) => [d.id, d]));
        const merged = catalogServices.map((catItem: any) => {
          if (dbMap.has(catItem.id)) {
            const override = dbMap.get(catItem.id);
            return { ...catItem, ...override };
          }
          return catItem;
        });
        
        // Add any newly inserted DB items not in catalog
        for (const d of data) {
          if (!catalogServices.some((c: any) => c.id === d.id)) {
            merged.push({
              id: d.id,
              name: d.name,
              tier: d.tier || 'Both',
              category: d.category || 'General',
              regular_price: Number(d.regular_price),
              member_price: Number(d.member_price),
              description: d.description || '',
              image_url: d.image_url || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&auto=format&fit=crop&q=80',
              whatsapp_number: d.whatsapp_number || '+91 83107 30322',
              is_active: d.is_active !== false
            });
          }
        }
        allServices = merged;
      }
    } catch (e) {
      console.warn('Supabase services query skipped, using catalog.json baseline');
    }

    // Apply filters
    let filtered = allServices;
    if (tier && tier !== 'All') {
      filtered = filtered.filter(s => (s.tier || '').toLowerCase() === tier.toLowerCase());
    }
    if (category && category !== 'All') {
      filtered = filtered.filter(s => s.category.toLowerCase().includes(category.toLowerCase()));
    }
    if (search) {
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(search) || 
        s.category.toLowerCase().includes(search) ||
        (s.tier || '').toLowerCase().includes(search)
      );
    }

    // Extract unique categories & tiers
    const allCategories = Array.from(new Set(allServices.map(s => s.category))).sort();
    const allTiers = Array.from(new Set(allServices.map(s => s.tier || 'Both'))).sort();

    return NextResponse.json({
      success: true,
      services: filtered,
      categories: allCategories,
      tiers: allTiers,
      total: filtered.length
    });
  } catch (err: any) {
    console.error('Error fetching services:', err);
    return NextResponse.json({
      success: true,
      services: catalogServices,
      categories: Array.from(new Set(catalogServices.map((s: any) => s.category))).sort(),
      tiers: ['Men', 'Women', 'Both'],
      total: catalogServices.length
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, tier, category, regular_price, member_price, description, image_url, whatsapp_number } = body;

    if (!name || regular_price === undefined || member_price === undefined) {
      return NextResponse.json({ error: 'Name, Regular Price, and Member Price are required.' }, { status: 400 });
    }

    const newService = {
      name: name.trim(),
      tier: tier?.trim() || 'Both',
      category: category?.trim() || 'General',
      regular_price: Number(regular_price),
      member_price: Number(member_price),
      description: description?.trim() || '',
      image_url: image_url?.trim() || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&auto=format&fit=crop&q=80',
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
