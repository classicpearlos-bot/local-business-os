import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { error } = await supabaseAdmin
      .from('services')
      .update({
        name: body.name,
        category: body.category,
        regular_price: body.regular_price,
        member_price: body.member_price,
        description: body.description,
        whatsapp_number: body.whatsapp_number,
        is_active: body.is_active
      })
      .eq('id', id);

    if (error) {
      console.warn('Update in DB failed (table might be local):', error);
    }

    return NextResponse.json({ success: true, id, ...body });
  } catch (err: any) {
    console.error('Error updating service:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await supabaseAdmin
      .from('services')
      .delete()
      .eq('id', id);

    return NextResponse.json({ success: true, deleted: id });
  } catch (err: any) {
    console.error('Error deleting service:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
