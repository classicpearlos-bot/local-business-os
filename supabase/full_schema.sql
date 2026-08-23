-- ==============================================================================
-- WHATSAPP SAAS - COMPLETE PRODUCTION DATABASE MIGRATION (PHASE 1 - 3)
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ORGANIZATIONS & TENANTS
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- 2. META WHATSAPP CLOUD API CONFIG
CREATE TABLE IF NOT EXISTS public.whatsapp_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    waba_id TEXT NOT NULL,
    phone_number_id TEXT NOT NULL,
    access_token TEXT NOT NULL,
    webhook_verify_token TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(waba_id)
);

-- 3. CONTACTS & CRM
CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    name TEXT,
    attributes JSONB DEFAULT '{}',
    opted_in BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, phone_number)
);

CREATE TABLE IF NOT EXISTS public.contact_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT,
    UNIQUE(organization_id, name)
);

CREATE TABLE IF NOT EXISTS public.contact_tag_relations (
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.contact_tags(id) ON DELETE CASCADE,
    PRIMARY KEY(contact_id, tag_id)
);

-- 4. CONVERSATIONS & INBOX
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'OPEN',
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    unread_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, contact_id)
);

-- 5. MESSAGES
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    wam_id TEXT UNIQUE,
    direction TEXT NOT NULL CHECK (direction IN ('INBOUND', 'OUTBOUND')),
    type TEXT NOT NULL,
    content JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'SENT',
    error_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. TEMPLATES & CAMPAIGNS
CREATE TABLE IF NOT EXISTS public.message_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    language TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    components JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, name, language)
);

CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    template_id UUID REFERENCES public.message_templates(id),
    template_name TEXT,
    template_language TEXT,
    template_components JSONB,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    total_recipients INTEGER DEFAULT 0,
    total_sent INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    total_read INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.campaign_recipients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    meta_message_id TEXT,
    attempts INTEGER DEFAULT 0,
    scheduled_at TIMESTAMPTZ,
    processing_at TIMESTAMPTZ,
    last_attempt_at TIMESTAMPTZ,
    next_retry_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    error_code TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(campaign_id, contact_id)
);

-- 7. KEYWORD AUTOMATIONS
CREATE TABLE IF NOT EXISTS public.automations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    trigger_type TEXT NOT NULL,
    trigger_config JSONB NOT NULL,
    action_type TEXT NOT NULL,
    action_config JSONB NOT NULL,
    cooldown_seconds INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.automation_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    inbound_message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    matched_keyword TEXT,
    action_type TEXT NOT NULL,
    status TEXT NOT NULL,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. DEVELOPER APIS & TENANT WEBHOOKS
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tenant_webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    secret TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    events JSONB NOT NULL DEFAULT '[]',
    last_success_at TIMESTAMPTZ,
    last_failure_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tenant_webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    webhook_id UUID NOT NULL REFERENCES public.tenant_webhooks(id) ON DELETE CASCADE,
    event_id TEXT NOT NULL,
    payload JSONB NOT NULL,
    attempts INTEGER DEFAULT 0,
    response_status INTEGER,
    last_attempt_at TIMESTAMPTZ,
    next_retry_at TIMESTAMPTZ,
    last_error TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. IDEMPOTENCY KEYS
CREATE TABLE IF NOT EXISTS public.api_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    idempotency_key TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PROCESSING',
    response_status INTEGER,
    response_body JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, idempotency_key)
);

-- 10. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_conversations_org ON public.conversations(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_conversations_assigned ON public.conversations(organization_id, assigned_to);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_camp_recip_org_camp ON public.campaign_recipients(organization_id, campaign_id);
CREATE INDEX IF NOT EXISTS idx_camp_recip_status_retry ON public.campaign_recipients(status, next_retry_at) WHERE status IN ('PENDING', 'SCHEDULED', 'PROCESSING');
CREATE INDEX IF NOT EXISTS idx_automations_org ON public.automations(organization_id, active, priority);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_requests_org_key ON public.api_requests(organization_id, idempotency_key);

-- 11. RPC FUNCTIONS
CREATE OR REPLACE FUNCTION public.get_user_org_ids()
RETURNS TABLE (org_id UUID)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.claim_campaign_recipients(batch_size INT)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  campaign_id UUID,
  contact_id UUID,
  phone_number TEXT,
  attempts INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  WITH claimed AS (
    SELECT cr.id
    FROM public.campaign_recipients cr
    JOIN public.campaigns c ON cr.campaign_id = c.id
    WHERE 
      cr.status IN ('PENDING', 'SCHEDULED')
      AND c.status IN ('QUEUED', 'PROCESSING')
      AND (cr.scheduled_at IS NULL OR cr.scheduled_at <= NOW())
      AND (cr.next_retry_at IS NULL OR cr.next_retry_at <= NOW())
    ORDER BY cr.scheduled_at ASC NULLS LAST, cr.created_at ASC
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.campaign_recipients u
  SET 
    status = 'PROCESSING',
    processing_at = NOW(),
    attempts = u.attempts + 1,
    last_attempt_at = NOW(),
    updated_at = NOW()
  FROM claimed
  WHERE u.id = claimed.id
  RETURNING u.id, u.organization_id, u.campaign_id, u.contact_id, u.phone_number, u.attempts;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_campaign_sent(camp_id UUID) RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$ UPDATE public.campaigns SET total_sent = total_sent + 1 WHERE id = camp_id; $$;
CREATE OR REPLACE FUNCTION public.increment_campaign_delivered(camp_id UUID) RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$ UPDATE public.campaigns SET total_delivered = total_delivered + 1 WHERE id = camp_id; $$;
CREATE OR REPLACE FUNCTION public.increment_campaign_read(camp_id UUID) RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$ UPDATE public.campaigns SET total_read = total_read + 1 WHERE id = camp_id; $$;
CREATE OR REPLACE FUNCTION public.increment_campaign_failed(camp_id UUID) RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$ UPDATE public.campaigns SET total_failed = total_failed + 1 WHERE id = camp_id; $$;

-- 12. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_tag_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_requests ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their orgs organizations' AND tablename = 'organizations') THEN
    CREATE POLICY "Users can view their orgs organizations" ON public.organizations FOR SELECT USING (id IN (SELECT org_id FROM public.get_user_org_ids()));
    CREATE POLICY "Users can view their orgs members" ON public.organization_members FOR SELECT USING (organization_id IN (SELECT org_id FROM public.get_user_org_ids()));
    CREATE POLICY "Users can view their orgs contacts" ON public.contacts FOR ALL USING (organization_id IN (SELECT org_id FROM public.get_user_org_ids()));
    CREATE POLICY "Users can view their orgs campaigns" ON public.campaigns FOR ALL USING (organization_id IN (SELECT org_id FROM public.get_user_org_ids()));
    CREATE POLICY "Users can view their orgs campaign recipients" ON public.campaign_recipients FOR ALL USING (organization_id IN (SELECT org_id FROM public.get_user_org_ids()));
    CREATE POLICY "Users can view their orgs conversations" ON public.conversations FOR ALL USING (organization_id IN (SELECT org_id FROM public.get_user_org_ids()));
    CREATE POLICY "Users can view their orgs messages" ON public.messages FOR ALL USING (organization_id IN (SELECT org_id FROM public.get_user_org_ids()));
    CREATE POLICY "Users can view their orgs automations" ON public.automations FOR ALL USING (organization_id IN (SELECT org_id FROM public.get_user_org_ids()));
    CREATE POLICY "Users can view their orgs api_keys" ON public.api_keys FOR ALL USING (organization_id IN (SELECT org_id FROM public.get_user_org_ids()));
    CREATE POLICY "Users can view their orgs tenant_webhooks" ON public.tenant_webhooks FOR ALL USING (organization_id IN (SELECT org_id FROM public.get_user_org_ids()));
    CREATE POLICY "Users can view their orgs api_requests" ON public.api_requests FOR ALL USING (organization_id IN (SELECT org_id FROM public.get_user_org_ids()));
  END IF;
END $$;
