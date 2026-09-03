export type FlowNodeType = 
  | 'trigger'
  | 'message_text'
  | 'message_image'
  | 'message_template'
  | 'message_card'
  | 'message_buttons'
  | 'message_cta'
  | 'logic_condition'
  | 'timing_delay'
  | 'integration_api'
  | 'conversation_action'
  | 'ai_router'
  | 'end';

export type FlowTriggerType = 
  | 'KEYWORD'
  | 'BUTTON_CLICK'
  | 'NEW_CONTACT'
  | 'APPOINTMENT_COMPLETED'
  | 'BILL_COMPLETED'
  | 'BIRTHDAY'
  | '45_DAY_INACTIVE'
  | '90_DAY_INACTIVE'
  | 'MANUAL_LAUNCH';

export interface FlowNodeData {
  label: string;
  node_type: FlowNodeType;
  config: Record<string, any>;
}

export interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: FlowNodeData;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  label?: string;
}

export interface FlowDefinition {
  nodes: FlowNode[];
  edges: FlowEdge[];
  variables?: Record<string, any>;
}

export interface FlowRecord {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  trigger_type: FlowTriggerType;
  trigger_config?: Record<string, any>;
  version?: number;
  status: 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'ARCHIVED';
  definition: FlowDefinition;
  created_at: string;
  updated_at: string;
}

export interface FlowExecutionStep {
  id: string;
  node_id: string;
  node_type: FlowNodeType;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  input_data?: any;
  output_data?: any;
  executed_at: string;
  error?: string;
}

export interface FlowExecution {
  id: string;
  organization_id: string;
  flow_id: string;
  contact_id: string;
  conversation_id?: string;
  status: 'RUNNING' | 'WAITING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  current_node_id: string;
  variables: Record<string, any>;
  steps: FlowExecutionStep[];
  resume_at?: string | null;
  started_at: string;
  completed_at?: string | null;
  error?: string;
}
