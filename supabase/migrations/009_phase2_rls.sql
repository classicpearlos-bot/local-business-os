-- Enable RLS for flows
ALTER TABLE public.flows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view org flows" ON public.flows FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert org flows" ON public.flows FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Users can update org flows" ON public.flows FOR UPDATE USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete org flows" ON public.flows FOR DELETE USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- Enable RLS for flow_executions
ALTER TABLE public.flow_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view org flow_executions" ON public.flow_executions FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert org flow_executions" ON public.flow_executions FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Users can update org flow_executions" ON public.flow_executions FOR UPDATE USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete org flow_executions" ON public.flow_executions FOR DELETE USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- Enable RLS for flow_execution_steps
ALTER TABLE public.flow_execution_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view org flow_execution_steps" ON public.flow_execution_steps FOR SELECT USING (
  execution_id IN (
    SELECT id FROM public.flow_executions WHERE organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  )
);
CREATE POLICY "Users can insert org flow_execution_steps" ON public.flow_execution_steps FOR INSERT WITH CHECK (
  execution_id IN (
    SELECT id FROM public.flow_executions WHERE organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  )
);
CREATE POLICY "Users can update org flow_execution_steps" ON public.flow_execution_steps FOR UPDATE USING (
  execution_id IN (
    SELECT id FROM public.flow_executions WHERE organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  )
);
CREATE POLICY "Users can delete org flow_execution_steps" ON public.flow_execution_steps FOR DELETE USING (
  execution_id IN (
    SELECT id FROM public.flow_executions WHERE organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  )
);

-- Enable RLS for message_media
ALTER TABLE public.message_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view org message_media" ON public.message_media FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert org message_media" ON public.message_media FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Users can update org message_media" ON public.message_media FOR UPDATE USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete org message_media" ON public.message_media FOR DELETE USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- Enable RLS for campaign_attribution
ALTER TABLE public.campaign_attribution ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view org campaign_attribution" ON public.campaign_attribution FOR SELECT USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert org campaign_attribution" ON public.campaign_attribution FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Users can update org campaign_attribution" ON public.campaign_attribution FOR UPDATE USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Users can delete org campaign_attribution" ON public.campaign_attribution FOR DELETE USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
