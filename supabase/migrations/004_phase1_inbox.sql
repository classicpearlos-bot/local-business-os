-- Phase 1 Inbox Tables Migration

-- 1. Quick Replies
CREATE TABLE IF NOT EXISTS public.quick_replies (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
    shortcut text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE(organization_id, shortcut)
);

-- Enable RLS for Quick Replies
ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view org quick replies" ON public.quick_replies FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert org quick replies" ON public.quick_replies FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Users can update org quick replies" ON public.quick_replies FOR UPDATE USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete org quick replies" ON public.quick_replies FOR DELETE USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- 2. Chat Labels
CREATE TABLE IF NOT EXISTS public.chat_labels (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    color text DEFAULT '#4F46E5',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(organization_id, name)
);

-- Enable RLS for Chat Labels
ALTER TABLE public.chat_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view org labels" ON public.chat_labels FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert org labels" ON public.chat_labels FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Users can update org labels" ON public.chat_labels FOR UPDATE USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete org labels" ON public.chat_labels FOR DELETE USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- 3. Conversation Labels Mapping
CREATE TABLE IF NOT EXISTS public.conversation_labels (
    conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
    label_id uuid REFERENCES public.chat_labels(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY(conversation_id, label_id)
);

-- Enable RLS for Conversation Labels Mapping
ALTER TABLE public.conversation_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage conversation labels" ON public.conversation_labels FOR ALL USING (
  conversation_id IN (
    SELECT id FROM public.conversations WHERE organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  )
);

-- 4. Internal Chat Notes
CREATE TABLE IF NOT EXISTS public.chat_notes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS for Chat Notes
ALTER TABLE public.chat_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view conversation notes" ON public.chat_notes FOR SELECT USING (
  conversation_id IN (
    SELECT id FROM public.conversations WHERE organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  )
);
CREATE POLICY "Users can insert conversation notes" ON public.chat_notes FOR INSERT WITH CHECK (
  conversation_id IN (
    SELECT id FROM public.conversations WHERE organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  )
);
CREATE POLICY "Users can delete conversation notes" ON public.chat_notes FOR DELETE USING (
  conversation_id IN (
    SELECT id FROM public.conversations WHERE organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  )
);
