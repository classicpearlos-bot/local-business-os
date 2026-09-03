import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { FlowDefinition, FlowNodeType, FlowEdge, FlowNode } from './types';
import { sendWhatsAppText, sendWhatsAppTemplate, sendWhatsAppInteractive } from '@/lib/meta/whatsapp';

export class FlowExecutionEngine {
  constructor(private executionId: string, private orgId: string) {}

  /**
   * Initializes a new flow execution in the database and begins processing.
   */
  static async start(
    orgId: string,
    flowId: string,
    contactId: string,
    conversationId: string | null,
    triggerEventId?: string
  ): Promise<string | null> {
    
    // Fetch flow definition to get version and start node
    const { data: flow } = await supabaseAdmin
      .from('flows')
      .select('version, definition')
      .eq('id', flowId)
      .eq('status', 'PUBLISHED')
      .single();

    if (!flow) return null;

    const def: FlowDefinition = flow.definition;
    const triggerNode = def.nodes.find(n => n.type === 'trigger');
    if (!triggerNode) return null;

    // Check Idempotency (prevent duplicate trigger processing)
    if (triggerEventId) {
      const { data: existing } = await supabaseAdmin
        .from('flow_executions')
        .select('id')
        .eq('organization_id', orgId)
        .eq('flow_id', flowId)
        .eq('contact_id', contactId)
        .eq('trigger_event_id', triggerEventId)
        .maybeSingle();

      if (existing) return existing.id; // Already processed
    }

    // Insert new execution
    const { data: execution, error } = await supabaseAdmin
      .from('flow_executions')
      .insert({
        organization_id: orgId,
        flow_id: flowId,
        flow_version: flow.version,
        contact_id: contactId,
        conversation_id: conversationId,
        trigger_event_id: triggerEventId,
        current_node_id: triggerNode.id,
        status: 'RUNNING'
      })
      .select('id')
      .single();

    if (error || !execution) {
      console.error('Failed to start flow execution', error);
      return null;
    }

    const engine = new FlowExecutionEngine(execution.id, orgId);
    // Asynchronously continue processing so we don't block the webhook
    engine.processNextNode().catch(e => console.error('Flow processing error:', e));

    return execution.id;
  }

  /**
   * Resumes a WAITING flow execution (e.g., from a scheduler or interaction).
   */
  static async resume(executionId: string, orgId: string, edgeHandle?: string) {
    const { data: exec } = await supabaseAdmin
      .from('flow_executions')
      .update({ status: 'RUNNING', resume_at: null })
      .eq('id', executionId)
      .eq('organization_id', orgId)
      .eq('status', 'WAITING')
      .select('id, current_node_id, flow_id')
      .single();

    if (!exec) return; // Not waiting or doesn't exist

    const engine = new FlowExecutionEngine(executionId, orgId);
    
    let overrideNodeId = undefined;
    if (edgeHandle) {
      const { data: flow } = await supabaseAdmin.from('flows').select('definition').eq('id', exec.flow_id).single();
      if (flow) {
        overrideNodeId = engine.getNextNodeId(exec.current_node_id, flow.definition.edges, edgeHandle);
        if (overrideNodeId) {
          await engine.updateExecutionCurrentNode(overrideNodeId);
        } else {
          // Handle edge case where button branch has no target node
          overrideNodeId = engine.getNextNodeId(exec.current_node_id, flow.definition.edges, null);
          if (overrideNodeId) {
             await engine.updateExecutionCurrentNode(overrideNodeId);
          } else {
             await engine.completeExecution();
             return;
          }
        }
      }
    }

    engine.processNextNode(overrideNodeId).catch(e => console.error('Flow processing error:', e));
  }

  /**
   * Main loop to process nodes until WAITING, HANDOVER, or COMPLETED.
   */
  async processNextNode(overrideNodeId?: string) {
    let hasMoreNodes = true;
    
    // Prevent infinite loops (e.g. 100 step max)
    let stepsProcessed = 0;
    const MAX_STEPS = 100;

    while (hasMoreNodes && stepsProcessed < MAX_STEPS) {
      const { data: exec } = await supabaseAdmin
        .from('flow_executions')
        .select('current_node_id, status, flow_id, contact_id, conversation_id, context')
        .eq('id', this.executionId)
        .single();

      if (!exec || exec.status !== 'RUNNING') return; // Stop processing if not RUNNING

      const currentNodeId = overrideNodeId || exec.current_node_id;
      
      const { data: flow } = await supabaseAdmin
        .from('flows')
        .select('definition')
        .eq('id', exec.flow_id)
        .single();

      if (!flow) {
        await this.failExecution('Flow definition missing');
        return;
      }

      const def: FlowDefinition = flow.definition;
      const currentNode = def.nodes.find(n => n.id === currentNodeId);

      if (!currentNode) {
        await this.failExecution('Current node not found in flow definition');
        return;
      }

      // Check step idempotency
      const { data: existingStep } = await supabaseAdmin
        .from('flow_execution_steps')
        .select('id, status')
        .eq('execution_id', this.executionId)
        .eq('node_id', currentNodeId)
        .maybeSingle();

      if (existingStep && existingStep.status === 'SUCCESS') {
        // Find next node and continue
        const nextNodeId = this.getNextNodeId(currentNodeId, def.edges);
        if (nextNodeId) {
          overrideNodeId = nextNodeId;
          await this.updateExecutionCurrentNode(nextNodeId);
          continue;
        } else {
          await this.completeExecution();
          return;
        }
      }

      // Execute Node logic
      let stepStatus: 'SUCCESS' | 'FAILED' | 'SKIPPED' = 'SUCCESS';
      let stepError = null;
      let nextNodePath: string | null = null;
      let requiresWait = false;
      let isHandover = false;

      const stepRecord = await this.startStep(currentNodeId);

      try {
        const result = await this.executeNodeLogic(currentNode, exec);
        if (result.wait_until) {
          requiresWait = true;
          await this.waitExecution(result.wait_until);
        }
        if (result.handover) {
          isHandover = true;
          await this.handoverExecution();
        }
        nextNodePath = result.next_edge_handle || null;
      } catch (err: any) {
        stepStatus = 'FAILED';
        stepError = err.message || 'Unknown node error';
        await this.failExecution(stepError);
        hasMoreNodes = false;
      }

      if (stepRecord) await this.finishStep(stepRecord.id, stepStatus, stepError);

      if (stepStatus === 'SUCCESS' && !requiresWait && !isHandover) {
        const nextNodeId = this.getNextNodeId(currentNodeId, def.edges, nextNodePath);
        if (nextNodeId) {
          overrideNodeId = nextNodeId;
          await this.updateExecutionCurrentNode(nextNodeId);
          stepsProcessed++;
        } else {
          // Reached end of flow graph without explicit END node
          await this.completeExecution();
          hasMoreNodes = false;
        }
      } else {
        hasMoreNodes = false; // Stop while loop
      }
    }

    if (stepsProcessed >= MAX_STEPS) {
      await this.failExecution('FLOW_MAX_STEPS_EXCEEDED');
    }
  }

  private async executeNodeLogic(node: FlowNode, exec: any): Promise<{ next_edge_handle?: string, wait_until?: string, handover?: boolean }> {
    const config = node.data.config;

    // Fetch WA account context
    const { data: account } = await supabaseAdmin
      .from('whatsapp_accounts')
      .select('phone_number_id, access_token')
      .eq('organization_id', this.orgId)
      .single();
    
    const { data: contact } = await supabaseAdmin
      .from('contacts')
      .select('phone_number, name')
      .eq('id', exec.contact_id)
      .single();

    if (!account || !contact) throw new Error('Account or Contact missing');

    switch (node.data.node_type) {
      case 'trigger':
        return {}; // Pass through
      
      case 'message_text':
        let text = config.text || '';
        // Variable resolution
        text = text.replace(/{{name}}/g, contact.name || 'Friend');
        
        const waRes = await sendWhatsAppText({
          phoneNumberId: account.phone_number_id,
          accessToken: account.access_token,
          to: contact.phone_number
        }, text);

        if (waRes.error) throw new Error(waRes.error.message);
        
        if (waRes.messages?.[0]?.id && exec.conversation_id) {
          await supabaseAdmin.from('messages').insert({
            organization_id: this.orgId,
            conversation_id: exec.conversation_id,
            contact_id: exec.contact_id,
            direction: 'OUTBOUND',
            type: 'text',
            content: { text: { body: text } },
            status: 'SENT',
            wam_id: waRes.messages[0].id
          });
          await supabaseAdmin.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', exec.conversation_id);
        }
        return {};
      
      case 'message_template':
        // Implementation for template sending
        return {};

      case 'message_buttons':
        const bodyText = (config.text || '').replace(/{{name}}/g, contact.name || 'Friend');
        const buttons = config.buttons || [];
        
        if (buttons.length > 0) {
          const interactivePayload = {
            type: 'button',
            body: { text: bodyText },
            action: {
              buttons: buttons.slice(0, 3).map((btn: any) => ({
                type: 'reply',
                reply: {
                  id: btn.id.substring(0, 256),
                  title: btn.title.substring(0, 20)
                }
              }))
            }
          };
          
          const btnRes = await sendWhatsAppInteractive({
            phoneNumberId: account.phone_number_id,
            accessToken: account.access_token,
            to: contact.phone_number
          }, interactivePayload);

          if (btnRes.error) throw new Error(btnRes.error.message);

          if (btnRes.messages?.[0]?.id && exec.conversation_id) {
            await supabaseAdmin.from('messages').insert({
              organization_id: this.orgId,
              conversation_id: exec.conversation_id,
              contact_id: exec.contact_id,
              direction: 'OUTBOUND',
              type: 'interactive',
              content: { interactive: interactivePayload },
              status: 'SENT',
              wam_id: btnRes.messages[0].id
            });
            await supabaseAdmin.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', exec.conversation_id);
          }
        }
        // Pause execution indefinitely, waiting for user to click a button
        return { wait_until: '2099-12-31T23:59:59.999Z' };

      case 'message_cta':
        const ctaText = (config.text || '').replace(/{{name}}/g, contact.name || 'Friend');
        const ctaType = config.action_type === 'call' ? 'cta_call' : 'cta_url';
        
        const ctaPayload = {
          type: ctaType,
          body: { text: ctaText },
          action: {
            name: ctaType,
            parameters: {
              display_text: (config.action_title || 'Click Here').substring(0, 20),
              ...(ctaType === 'cta_url' ? { url: config.action_payload || 'https://' } : {}),
              ...(ctaType === 'cta_call' ? { phone_number: config.action_payload || '' } : {}) // Note: phone_number or payload depending on WA version, we will safely provide both if needed, but phone_number is standard for templates.
            }
          }
        };

        const ctaRes = await sendWhatsAppInteractive({
          phoneNumberId: account.phone_number_id,
          accessToken: account.access_token,
          to: contact.phone_number
        }, ctaPayload);

        if (ctaRes.error) {
           // Fallback to text if CTA interactive is rejected by WA API
           await sendWhatsAppText({
             phoneNumberId: account.phone_number_id,
             accessToken: account.access_token,
             to: contact.phone_number
           }, `${ctaText}\n\n📍 ${config.action_title}: ${config.action_payload}`);
        } else if (ctaRes.messages?.[0]?.id && exec.conversation_id) {
          await supabaseAdmin.from('messages').insert({
            organization_id: this.orgId,
            conversation_id: exec.conversation_id,
            contact_id: exec.contact_id,
            direction: 'OUTBOUND',
            type: 'interactive',
            content: { interactive: ctaPayload },
            status: 'SENT',
            wam_id: ctaRes.messages[0].id
          });
          await supabaseAdmin.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', exec.conversation_id);
        }
        return {};

      case 'logic_condition':
        // Simple condition evaluator
        const field = config.field;
        const op = config.operator;
        const val = config.value;
        
        let match = false;
        if (field === 'opted_in') {
           const optData = await supabaseAdmin.from('contacts').select('opted_in').eq('id', exec.contact_id).single();
           if (op === 'is_true') match = optData.data?.opted_in === true;
           if (op === 'is_false') match = optData.data?.opted_in === false;
        }

        return { next_edge_handle: match ? 'true' : 'false' };
      
      case 'timing_delay':
        const delaySeconds = config.seconds || 0;
        const delayMinutes = config.minutes || 0;
        const delayHours = config.hours || 0;
        const delayDays = config.days || 0;
        
        const totalMs = (delaySeconds + (delayMinutes * 60) + (delayHours * 3600) + (delayDays * 86400)) * 1000;
        const resumeTime = new Date(Date.now() + totalMs).toISOString();
        
        return { wait_until: resumeTime };

      case 'conversation_action':
        if (config.action === 'HUMAN_HANDOVER') {
          return { handover: true };
        }
        return {};

      case 'end':
        return {}; // Reached end node
        
      default:
        // Skip unhandled nodes
        return {};
    }
  }

  public getNextNodeId(currentNodeId: string, edges: FlowEdge[], sourceHandle: string | null = null): string | null {
    const edge = edges.find(e => {
      if (e.source !== currentNodeId) return false;
      if (sourceHandle && e.sourceHandle !== sourceHandle) return false;
      return true;
    });
    return edge ? edge.target : null;
  }

  private async startStep(nodeId: string) {
    const { data: step } = await supabaseAdmin
      .from('flow_execution_steps')
      .insert({
        execution_id: this.executionId,
        node_id: nodeId,
        status: 'SUCCESS' // Initial assume success until throw
      })
      .select('id')
      .single();
    return step;
  }

  private async finishStep(stepId: string, status: string, error: string | null) {
    await supabaseAdmin
      .from('flow_execution_steps')
      .update({ status, error, completed_at: new Date().toISOString() })
      .eq('id', stepId);
  }

  private async updateExecutionCurrentNode(nodeId: string) {
    await supabaseAdmin
      .from('flow_executions')
      .update({ current_node_id: nodeId, updated_at: new Date().toISOString() })
      .eq('id', this.executionId);
  }

  private async failExecution(error: string) {
    await supabaseAdmin
      .from('flow_executions')
      .update({ status: 'FAILED', last_error: error, updated_at: new Date().toISOString() })
      .eq('id', this.executionId);
  }

  private async completeExecution() {
    await supabaseAdmin
      .from('flow_executions')
      .update({ status: 'COMPLETED', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', this.executionId);
  }

  private async waitExecution(resumeAt: string) {
    await supabaseAdmin
      .from('flow_executions')
      .update({ status: 'WAITING', resume_at: resumeAt, updated_at: new Date().toISOString() })
      .eq('id', this.executionId);
  }

  private async handoverExecution() {
    await supabaseAdmin
      .from('flow_executions')
      .update({ status: 'HANDOVER', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', this.executionId);
  }
}
