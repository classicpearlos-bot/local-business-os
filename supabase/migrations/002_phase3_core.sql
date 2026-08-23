-- Phase 3 Core Feature Tables

-- 1. Campaign Updates & Queue
ALTER TABLE public.campaigns 
ADD COLUMN description TEXT,
ADD COLUMN template_name TEXT,
ADD COLUMN template_language TEXT,
ADD COLUMN template_components JSONB,
ADD COLUMN started_at TIMESTAMPTZ,
ADD COLUMN completed_at TIMESTAMPTZ,
ADD COLUMN cancelled_at TIMESTAMPTZ,
ADD COLUMN total_recipients INTEGER DEFAULT 0,
ADD COLUMN total_sent INTEGER DEFAULT 0,
ADD COLUMN total_delivered INTEGER DEFAULT 0,
ADD COLUMN total_read INTEGER DEFAULT 0,
ADD COLUMN total_failed INTEGER DEFAULT 0,
ADD COLUMN created_by UUID REFERENCES auth.users(id),
ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TABLE public.campaign_recipients (
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

CREATE INDEX idx_camp_recip_org_camp ON public.campaign_recipients(organization_id, campaign_id);
CREATE INDEX idx_camp_recip_status_retry ON public.campaign_recipients(status, next_retry_at) WHERE status IN ('PENDING', 'SCHEDULED', 'PROCESSING');
CREATE INDEX idx_camp_recip_meta_id ON public.campaign_recipients(meta_message_id);

-- Atomic Queue Claim Function
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


-- 2. Conversations
CREATE TABLE public.conversations (
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

ALTER TABLE public.messages
ADD COLUMN conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE;

CREATE INDEX idx_conversations_org ON public.conversations(organization_id, status);
CREATE INDEX idx_conversations_assigned ON public.conversations(organization_id, assigned_to);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);

-- 3. Automations
CREATE TABLE public.automations (
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

CREATE TABLE public.automation_executions (
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

CREATE INDEX idx_automations_org ON public.automations(organization_id, active, priority);
CREATE INDEX idx_auto_exec_org_auto ON public.automation_executions(organization_id, automation_id);

-- 4. Developer API & Webhooks
CREATE TABLE public.api_keys (
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

CREATE TABLE public.tenant_webhooks (
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

CREATE TABLE public.tenant_webhook_deliveries (
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

CREATE INDEX idx_api_keys_hash ON public.api_keys(key_hash);
CREATE INDEX idx_tenant_webhooks_org ON public.tenant_webhooks(organization_id, active);
CREATE INDEX idx_webhook_deliveries_retry ON public.tenant_webhook_deliveries(status, next_retry_at);


-- RLS Setup
ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their orgs campaign recipients" ON public.campaign_recipients FOR SELECT USING (organization_id IN (SELECT org_id FROM public.get_user_org_ids()));
CREATE POLICY "Users can insert their orgs campaign recipients" ON public.campaign_recipients FOR INSERT WITH CHECK (organization_id IN (SELECT org_id FROM public.get_user_org_ids()));
CREATE POLICY "Users can update their orgs campaign recipients" ON public.campaign_recipients FOR UPDATE USING (organization_id IN (SELECT org_id FROM public.get_user_org_ids()));
CREATE POLICY "Users can delete their orgs campaign recipients" ON public.campaign_recipients FOR DELETE USING (organization_id IN (SELECT org_id FROM public.get_user_org_ids()));

CREATE POLICY "Users can view their orgs conversations" ON public.conversations FOR SELECT USING (organization_id IN (SELECT org_id FROM public.get_user_org_ids()));
CREATE POLICY "Users can insert their orgs conversations" ON public.conversations FOR INSERT WITH CHECK (organization_id IN (SELECT org_id FROM public.get_user_org_ids()));
CREATE POLICY "Users can update their orgs conversations" ON public.conversations FOR UPDATE USING (organization_id IN (SELECT org_id FROM public.get_user_org_ids()));
CREATE POLICY "Users can delete their orgs conversations" ON public.conversations FOR DELETE USING (organization_id IN (SELECT org_id FROM public.get_user_org_ids()));

CREATE POLICY "Users can view their orgs automations" ON public.automations FOR SELECT USING (organization_id IN (SELECT org_id FROM public.get_user_org_ids()));
CREATE POLICY "Users can insert their orgs automations" ON public.automations FOR INSERT WITH CHECK (organization_id IN (SELECT org_id FROM public.get_user_org_ids()));
CREATE POLICY "Users can update their orgs automations" ON public.automations FOR UPDATE USING (organization_id IN (SELECT org_id FROM public.get_user_org_ids()));
CREATE POLICY "Users can delete their orgs automations" ON public.automations FOR DELETE USING (organization_id IN (SELECT org_id FROM public.get_user_org_ids()));

CREATE POLICY "Users can view their orgs automation_executions" ON public.automation_executions FOR SELECT USING (organization_id IN (SELECT org_id FROM public.get_user_org_ids()));
CREATE POLICY "Users can insert their orgs automation_executions" ON public.automation_executions FOR INSERT WITH CHECK (organization_id IN (SELECT org_id FROM public.get_user_org_ids()));
CREATE POLICY "Users can update their orgs automation_executions" ON public.automation_executions FOR UPDATE USING (organization_id IN (SELECT org_id FROM public.get_user_org_ids()));
CREATE POLICY "Users can delete their orgs automation_executions" ON public.automation_executions FOR DELETE USING (organization_id IN (SELECT org_id FROM public.get_user_org_ids()));

CREATE POLICY "Users can view their orgs api_keys" ON public.api_keys FOR SELECT USING (organization_id IN (SELECT org_id FROM public.get_user_org_ids()));
CREATE POLICY "Users can insert their orgs api_keys" ON public.api_keys FOR INSERT WITH CHECK (organization_id IN (SELECT org_id FROM public.get_user_org_ids()));
CREATE POLICY "Users can update their orgs api_keys" ON public.api_keys FOR UPDATE USING (organization_id IN (SELECT org_id FROM public.get_user_org_ids()));
CREATE POLICY "Users can delete their orgs api_keys" ON public.api_keys FOR DELETE USING (organization_id IN (SELECT org_id FROM public.get_user_org_ids()));

CREATE POLICY "Users can view their orgs tenant_webhooks" ON public.tenant_webhooks FOR SELECT USING (organization_id IN (SELECT org_id FROM public.get_user_org_ids()));
CREATE POLICY "Users can insert their orgs tenant_webhooks" ON public.tenant_webhooks FOR INSERT WITH CHECK (organization_id IN (SELECT org_id FROM public.get_user_org_ids()));
CREATE POLICY "Users can update their orgs tenant_webhooks" ON public.tenant_webhooks FOR UPDATE USING (organization_id IN (SELECT org_id FROM public.get_user_org_ids()));
CREATE POLICY "Users can delete their orgs tenant_webhooks" ON public.tenant_webhooks FOR DELETE USING (organization_id IN (SELECT org_id FROM public.get_user_org_ids()));

CREATE POLICY "Users can view their orgs tenant_webhook_deliveries" ON public.tenant_webhook_deliveries FOR SELECT USING (organization_id IN (SELECT org_id FROM public.get_user_org_ids()));
CREATE POLICY "Users can insert their orgs tenant_webhook_deliveries" ON public.tenant_webhook_deliveries FOR INSERT WITH CHECK (organization_id IN (SELECT org_id FROM public.get_user_org_ids()));
CREATE POLICY "Users can update their orgs tenant_webhook_deliveries" ON public.tenant_webhook_deliveries FOR UPDATE USING (organization_id IN (SELECT org_id FROM public.get_user_org_ids()));
CREATE POLICY "Users can delete their orgs tenant_webhook_deliveries" ON public.tenant_webhook_deliveries FOR DELETE USING (organization_id IN (SELECT org_id FROM public.get_user_org_ids()));

CREATE OR REPLACE FUNCTION public.increment_campaign_sent(camp_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.campaigns SET total_sent = total_sent + 1 WHERE id = camp_id;
$$;

CREATE OR REPLACE FUNCTION public.increment_campaign_delivered(camp_id UUID) RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$ UPDATE public.campaigns SET total_delivered = total_delivered + 1 WHERE id = camp_id; $$;
CREATE OR REPLACE FUNCTION public.increment_campaign_read(camp_id UUID) RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$ UPDATE public.campaigns SET total_read = total_read + 1 WHERE id = camp_id; $$;
CREATE OR REPLACE FUNCTION public.increment_campaign_failed(camp_id UUID) RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$ UPDATE public.campaigns SET total_failed = total_failed + 1 WHERE id = camp_id; $$;

