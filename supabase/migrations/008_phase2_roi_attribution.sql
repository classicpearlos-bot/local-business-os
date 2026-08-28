CREATE TABLE IF NOT EXISTS campaign_attribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  contact_id UUID REFERENCES contacts(id),
  campaign_id UUID REFERENCES campaigns(id),
  engagement_time TIMESTAMPTZ,
  conversion_time TIMESTAMPTZ,
  appointment_id UUID,
  revenue_generated NUMERIC DEFAULT 0.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
