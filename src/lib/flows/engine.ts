import { FlowDefinition, FlowNode, FlowEdge, FlowExecution, FlowExecutionStep } from './types';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendWhatsAppText, sendWhatsAppTemplate } from '@/lib/meta/whatsapp';

/**
 * Interpolate string variables: e.g. "Hello {{name}}"
 */
export function interpolateVariables(template: string, variables: Record<string, any>): string {
  if (!template) return '';
  return template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, key) => {
    const val = variables[key];
    return val !== undefined && val !== null ? String(val) : '';
  });
}

/**
 * Execute a Flow from a given node or start trigger
 */
export async function executeFlowStep(
  execution: FlowExecution,
  definition: FlowDefinition,
  incomingEvent?: { type: string; payload?: any }
): Promise<FlowExecution> {
  const { nodes, edges } = definition;
  let currentNode: FlowNode | undefined = nodes.find(n => n.id === execution.current_node_id);

  // If no current node, start from trigger node
  if (!currentNode) {
    currentNode = nodes.find(n => n.data.node_type === 'trigger');
    if (!currentNode) {
      execution.status = 'FAILED';
      execution.error = 'No trigger node found in flow';
      execution.completed_at = new Date().toISOString();
      return execution;
    }
    execution.current_node_id = currentNode.id;
  }

  // Load contact & WhatsApp account
  const { data: contact } = await supabaseAdmin
    .from('contacts')
    .select('*')
    .eq('id', execution.contact_id)
    .single();

  const { data: accounts } = await supabaseAdmin
    .from('whatsapp_accounts')
    .select('*')
    .eq('organization_id', execution.organization_id)
    .limit(1);

  const account = accounts?.[0];

  const contactAttrs = (contact?.attributes as any) || {};
  const mergedVariables: Record<string, any> = {
    name: contact?.name || 'Valued Customer',
    phone: contact?.phone_number || '',
    opted_in: contact?.opted_in ?? true,
    ...(contactAttrs.custom_fields || {}),
    ...execution.variables
  };

  const maxSteps = 25; // Loop protection guard
  let stepsTaken = 0;

  while (currentNode && execution.status === 'RUNNING' && stepsTaken < maxSteps) {
    stepsTaken++;
    const nodeType = currentNode.data.node_type;
    const nodeConfig: Record<string, any> = currentNode.data.config || {};
    let stepStatus: 'SUCCESS' | 'FAILED' | 'SKIPPED' = 'SUCCESS';
    let outputHandle: string | undefined = undefined;
    let stepOutput: any = null;
    let stepError: string | undefined = undefined;

    try {
      switch (nodeType) {
        case 'trigger': {
          stepOutput = { triggered_at: new Date().toISOString() };
          break;
        }

        case 'message_text': {
          const bodyText = interpolateVariables(nodeConfig.text || '', mergedVariables);
          if (account && contact?.phone_number && bodyText) {
            await sendWhatsAppText({
              phoneNumberId: account.phone_number_id,
              accessToken: account.access_token,
              to: contact.phone_number
            }, bodyText);
          }
          stepOutput = { sent_text: bodyText };
          break;
        }

        case 'message_template': {
          const templateName = nodeConfig.template_name;
          const templateLang = nodeConfig.template_language || 'en_US';
          const components = nodeConfig.template_components || [];
          if (account && contact?.phone_number && templateName) {
            await sendWhatsAppTemplate({
              phoneNumberId: account.phone_number_id,
              accessToken: account.access_token,
              to: contact.phone_number
            }, templateName, templateLang, components);
          }
          stepOutput = { sent_template: templateName };
          break;
        }

        case 'logic_condition': {
          const field: string = nodeConfig.field || 'days_since_visit';
          const operator: string = nodeConfig.operator || 'greater_than';
          const targetValue: any = nodeConfig.value;
          const actualValue: any = mergedVariables[field];

          let conditionMet = false;
          if (operator === 'equals') conditionMet = String(actualValue).toLowerCase() === String(targetValue).toLowerCase();
          else if (operator === 'contains') conditionMet = String(actualValue).toLowerCase().includes(String(targetValue).toLowerCase());
          else if (operator === 'greater_than') conditionMet = Number(actualValue) > Number(targetValue);
          else if (operator === 'less_than') conditionMet = Number(actualValue) < Number(targetValue);
          else if (operator === 'is_true') conditionMet = Boolean(actualValue) === true;

          outputHandle = conditionMet ? 'true' : 'false';
          stepOutput = { field, operator, actualValue, conditionMet, chosen_branch: outputHandle };
          break;
        }

        case 'timing_delay': {
          const delayMinutes = Number(nodeConfig.delay_minutes) || 10;
          const resumeAt = new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();
          execution.status = 'WAITING';
          execution.resume_at = resumeAt;
          stepOutput = { delay_minutes: delayMinutes, resume_at: resumeAt };
          break;
        }

        case 'integration_api': {
          const url = interpolateVariables(nodeConfig.url || '', mergedVariables);
          const method = nodeConfig.method || 'GET';
          const headers = nodeConfig.headers || {};
          const body = nodeConfig.body ? interpolateVariables(JSON.stringify(nodeConfig.body), mergedVariables) : undefined;

          try {
            const apiRes = await fetch(url, {
              method,
              headers: { 'Content-Type': 'application/json', ...headers },
              body: method !== 'GET' ? body : undefined
            });
            const apiData = await apiRes.json().catch(() => ({}));
            if (apiRes.ok) {
              outputHandle = 'success';
              stepOutput = { status: apiRes.status, data: apiData };
              if (nodeConfig.response_variable) {
                mergedVariables[nodeConfig.response_variable] = apiData;
              }
            } else {
              outputHandle = 'failure';
              stepOutput = { status: apiRes.status, error: apiData };
            }
          } catch (e: any) {
            outputHandle = 'failure';
            stepOutput = { error: e.message };
          }
          break;
        }

        case 'conversation_action': {
          if (nodeConfig.action === 'ASSIGN_STAFF' && nodeConfig.staff_id && execution.conversation_id) {
            await supabaseAdmin
              .from('conversations')
              .update({ assigned_to: nodeConfig.staff_id })
              .eq('id', execution.conversation_id);
          }
          stepOutput = { action_executed: nodeConfig.action };
          break;
        }

        case 'end': {
          execution.status = 'COMPLETED';
          execution.completed_at = new Date().toISOString();
          break;
        }

        default: {
          stepOutput = { message: 'Node executed' };
        }
      }
    } catch (err: any) {
      stepStatus = 'FAILED';
      stepError = err.message;
      execution.status = 'FAILED';
      execution.error = err.message;
    }

    // Record step
    const step: FlowExecutionStep = {
      id: `step_${Date.now()}_${stepsTaken}`,
      node_id: currentNode.id,
      node_type: nodeType,
      status: stepStatus,
      input_data: nodeConfig,
      output_data: stepOutput,
      executed_at: new Date().toISOString(),
      error: stepError
    };

    execution.steps = [...(execution.steps || []), step];

    if (execution.status === 'WAITING' || execution.status === 'COMPLETED' || execution.status === 'FAILED') {
      break;
    }

    // Find next node via edges
    const matchingEdge: FlowEdge | undefined = edges.find((e: FlowEdge) => {
      if (e.source !== currentNode!.id) return false;
      if (outputHandle) return e.sourceHandle === outputHandle;
      return true;
    });

    if (matchingEdge) {
      const nextNode: FlowNode | undefined = nodes.find((n: FlowNode) => n.id === matchingEdge.target);
      if (nextNode) {
        currentNode = nextNode;
        execution.current_node_id = nextNode.id;
      } else {
        execution.status = 'COMPLETED';
        execution.completed_at = new Date().toISOString();
        break;
      }
    } else {
      execution.status = 'COMPLETED';
      execution.completed_at = new Date().toISOString();
      break;
    }
  }

  execution.variables = mergedVariables;
  return execution;
}
