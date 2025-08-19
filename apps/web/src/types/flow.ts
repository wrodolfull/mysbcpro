export interface NodeType {
  type: string;
  label: string;
  category: string;
  color: string;
  description: string;
  freeswitchAction: string;
  defaultDigits?: string;
  hasConfig: boolean;
  configProps?: ConfigProp[];
}

export interface ConfigProp {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'array';
  default: any;
  label: string;
  required?: boolean;
  options?: string[];
}

export interface Flow {
  id?: string;
  name: string;
  organizationId: string;
  status: 'draft' | 'published';
  version: number;
  graph: {
    nodes: Node[];
    edges: Edge[];
  };
  freeswitch_xml?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    nodeType: string;
    [key: string]: any;
  };
}

export interface Edge {
  id: string;
  source: string;
  target: string;
  type?: string;
  data?: any;
}
