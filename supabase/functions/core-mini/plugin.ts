// Plugin protocol types

export interface PluginManifest {
  tool_key: string;
  name: string;
  version: string;
  routes: string[];
  events_produced: string[];
  events_consumed?: string[];
  capabilities: Record<string, boolean>;
  permissions: string[];
  adapters?: Record<string, string[]>;
  public_endpoints?: string[];
  api: {
    dispatch_url: string;
    manifest_url: string;
    health_url: string;
  };
}

export interface PluginDispatchRequest {
  source_tool: string;
  event_type: string;
  payload: Record<string, any>;
  request_id: string;
  org_id: string;
}

export interface PluginDispatchResponse {
  ok: boolean;
  handled: boolean;
  error?: string;
  data?: any;
  request_id: string;
}

export interface PluginHealthResponse {
  ok: boolean;
  tool_key: string;
  version: string;
  timestamp: string;
}
