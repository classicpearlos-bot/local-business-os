export const META_API_VERSION = 'v19.0';
export const META_GRAPH_URL = `https://graph.facebook.com/${META_API_VERSION}`;

export class MetaClientError extends Error {
  status: number;
  data: any;

  constructor(status: number, data: any) {
    super(`Meta API Error: ${data?.error?.message || 'Unknown error'}`);
    this.name = 'MetaClientError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Base client for Meta Graph API requests
 */
export async function fetchMetaAPI(endpoint: string, method: 'GET' | 'POST' = 'GET', body?: any, accessToken?: string) {
  if (!accessToken) {
    throw new Error('Meta API Access Token is required');
  }

  const url = `${META_GRAPH_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers: HeadersInit = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  const options: RequestInit = {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {})
  };

  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new MetaClientError(response.status, errorData);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof MetaClientError) {
      throw error;
    }
    throw new Error(`Network or parsing error calling Meta API: ${error}`);
  }
}
