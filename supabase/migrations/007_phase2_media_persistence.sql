CREATE TABLE IF NOT EXISTS message_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  contact_id UUID REFERENCES contacts(id),
  conversation_id UUID REFERENCES conversations(id),
  message_id UUID REFERENCES messages(id),
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_name TEXT,
  file_size INTEGER,
  direction TEXT NOT NULL CHECK (direction IN ('INBOUND', 'OUTBOUND')),
  meta_media_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Note: In a live Supabase environment, the bucket should be created via Dashboard or Storage API.
-- INSERT INTO storage.buckets (id, name, public) VALUES ('whatsapp-media', 'whatsapp-media', false) ON CONFLICT DO NOTHING;
