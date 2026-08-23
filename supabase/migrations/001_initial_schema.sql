-- 1. Foundations
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- 2. Meta WhatsApp Core
CREATE TABLE public.whatsapp_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    waba_id TEXT NOT NULL, -- WhatsApp Business Account ID
    phone_number_id TEXT NOT NULL,
    access_token TEXT NOT NULL, -- Should be encrypted ideally or stored securely
    webhook_verify_token TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(waba_id)
);

-- 3. CRM / Contacts
CREATE TABLE public.contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL,
    name TEXT,
    attributes JSONB DEFAULT '{}',
    opted_in BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, phone_number)
);

CREATE TABLE public.contact_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT,
    UNIQUE(organization_id, name)
);

CREATE TABLE public.contact_tag_relations (
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.contact_tags(id) ON DELETE CASCADE,
    PRIMARY KEY(contact_id, tag_id)
);

-- 4. Messaging
CREATE TABLE public.message_templates (
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

CREATE TABLE public.campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    template_id UUID REFERENCES public.message_templates(id),
    status TEXT NOT NULL DEFAULT 'DRAFT',
    scheduled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    wam_id TEXT UNIQUE, -- WhatsApp Message ID returned by Meta
    direction TEXT NOT NULL CHECK (direction IN ('INBOUND', 'OUTBOUND')),
    type TEXT NOT NULL,
    content JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'SENT', -- SENT, DELIVERED, READ, FAILED
    error_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Setup
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_tag_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Helper to get user orgs
CREATE OR REPLACE FUNCTION public.get_user_org_ids()
RETURNS TABLE (org_id UUID)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid();
$$;

-- Generic RLS Policy Template for direct tenant tables
-- USING (organization_id IN (SELECT org_id FROM public.get_user_org_ids()))
