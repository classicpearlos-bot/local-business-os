-- Phase 3 Hardening: Idempotency Keys
CREATE TABLE public.api_requests (
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

CREATE INDEX idx_api_requests_org_key ON public.api_requests(organization_id, idempotency_key);

ALTER TABLE public.api_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their orgs api_requests" ON public.api_requests 
  FOR SELECT USING (organization_id IN (SELECT org_id FROM public.get_user_org_ids()));
CREATE POLICY "Users can insert their orgs api_requests" ON public.api_requests 
  FOR INSERT WITH CHECK (organization_id IN (SELECT org_id FROM public.get_user_org_ids()));
CREATE POLICY "Users can update their orgs api_requests" ON public.api_requests 
  FOR UPDATE USING (organization_id IN (SELECT org_id FROM public.get_user_org_ids()));
