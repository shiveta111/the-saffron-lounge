// Swagger/OpenAPI parser for dynamic admin panel generation
import axios from 'axios';
import { apiClient } from './api-client';

export interface SwaggerInfo {
  title: string;
  version: string;
  description?: string;
}

export interface SwaggerParameter {
  name: string;
  in: 'query' | 'path' | 'header' | 'cookie';
  required: boolean;
  schema: any;
  description?: string;
}

export interface SwaggerSchema {
  type?: string;
  properties?: Record<string, any>;
  required?: string[];
  items?: any;
  $ref?: string;
  enum?: any[];
  format?: string;
  description?: string;
}

export interface SwaggerEndpoint {
  path: string;
  method: 'get' | 'post' | 'put' | 'delete' | 'patch';
  summary?: string;
  description?: string;
  operationId?: string;
  parameters?: SwaggerParameter[];
  requestBody?: {
    content: Record<string, { schema: SwaggerSchema }>;
  };
  responses: Record<string, {
    description: string;
    content?: Record<string, { schema: SwaggerSchema }>;
  }>;
  tags?: string[];
}

export interface SwaggerResource {
  name: string;
  endpoints: SwaggerEndpoint[];
  schema?: SwaggerSchema;
  icon?: string;
  displayName: string;
}

export interface ParsedSwagger {
  info: SwaggerInfo;
  resources: SwaggerResource[];
  baseUrl: string;
}

import { env } from './env';

export class SwaggerParser {
  private swaggerUrl?: string;
  private baseUrl: string;

  constructor(swaggerUrl?: string) {
    // swaggerUrl can be provided, otherwise construct from env.apiUrl
    // env.apiUrl already includes /api/v1, so we just need /api-docs/swagger.json
    this.swaggerUrl = swaggerUrl;
    this.baseUrl = env.apiUrl;
  }

  async fetchSwagger(): Promise<any> {
    try {
      // Validate env.apiUrl is set
      if (!env.apiUrl) {
        throw new Error('NEXT_PUBLIC_API_URL is not configured. Please check your .env.local file.');
      }

      // Construct full URL directly from env.apiUrl to avoid any proxy/middleware issues
      // env.apiUrl is already http://localhost:8000/api/v1
      // Backend endpoint is /api/v1/api-docs/swagger.json
      // So we just append /api-docs/swagger.json to env.apiUrl
      const baseUrl = env.apiUrl.replace(/\/$/, ''); // Remove trailing slash if present
      const fullUrl = `${baseUrl}/api-docs/swagger.json`;
      
      console.log('[SwaggerParser] Fetching Swagger from:', fullUrl, {
        envApiUrl: env.apiUrl,
        baseUrl,
        fullUrl,
        isBrowser: typeof window !== 'undefined',
      });
      
      // Use axios directly (not apiClient) since this is a public endpoint
      // This avoids any interceptors or middleware that might modify the URL
      const response = await axios.get(fullUrl, {
        timeout: 15000, // Increased timeout
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        // Ensure we're calling the backend directly, not through Next.js proxy
        withCredentials: false,
        validateStatus: (status) => status < 500, // Don't throw on 4xx errors
      });
      
      if (response.status !== 200) {
        throw new Error(`Backend returned status ${response.status}: ${response.statusText}`);
      }
      
      if (!response.data || typeof response.data !== 'object') {
        throw new Error('Invalid response format from backend');
      }
      
      console.log('[SwaggerParser] Swagger fetched successfully:', {
        status: response.status,
        dataKeys: Object.keys(response.data || {}),
        hasPaths: !!response.data.paths,
        pathCount: Object.keys(response.data.paths || {}).length,
      });
      
      return response.data;
    } catch (error: any) {
      const baseUrl = env.apiUrl?.replace(/\/$/, '') || 'unknown';
      const attemptedUrl = `${baseUrl}/api-docs/swagger.json`;
      
      // Detailed error logging
      const errorDetails: any = {
        error: error.message,
        attemptedUrl,
        envApiUrl: env.apiUrl || 'NOT SET',
        baseUrl,
        isBrowser: typeof window !== 'undefined',
      };
      
      if (error.response) {
        errorDetails.responseStatus = error.response.status;
        errorDetails.responseStatusText = error.response.statusText;
        errorDetails.responseData = error.response.data;
        errorDetails.responseHeaders = error.response.headers;
      }
      
      if (error.request) {
        errorDetails.requestMade = true;
        errorDetails.requestUrl = error.config?.url;
        errorDetails.requestBaseURL = error.config?.baseURL;
      }
      
      if (error.config) {
        errorDetails.configUrl = error.config.url;
        errorDetails.configBaseURL = error.config.baseURL;
        errorDetails.configMethod = error.config.method;
      }
      
      console.error('[SwaggerParser] Failed to fetch Swagger documentation:', errorDetails);
      
      // Provide more helpful error message
      if (error.response) {
        const status = error.response.status;
        if (status === 404) {
          throw new Error(`Swagger endpoint not found (404). Backend might not be running or endpoint changed. Tried: ${attemptedUrl}`);
        } else if (status === 403 || status === 401) {
          throw new Error(`Access denied (${status}). Check CORS configuration. Tried: ${attemptedUrl}`);
        } else {
          throw new Error(`Backend returned ${status}: ${error.response.statusText}. Check backend logs. Tried: ${attemptedUrl}`);
        }
      } else if (error.request) {
        // Network error - backend not reachable
        throw new Error(`Cannot connect to backend server. Is it running at ${baseUrl}? Check: 1) Backend is running, 2) Port is correct, 3) CORS is configured`);
      } else if (error.message.includes('timeout')) {
        throw new Error(`Request timed out. Backend might be slow or not responding at ${attemptedUrl}`);
      } else {
        throw new Error(`Failed to fetch API documentation: ${error.message}. Check console for details.`);
      }
    }
  }

  parseSwagger(swaggerData: any): ParsedSwagger {
    try {
      if (!swaggerData || typeof swaggerData !== 'object') {
        throw new Error('Invalid Swagger data: expected an object');
      }

      const info: SwaggerInfo = {
        title: swaggerData.info?.title || 'API Documentation',
        version: swaggerData.info?.version || '1.0.0',
        description: swaggerData.info?.description,
      };

      const paths = swaggerData.paths || {};
      const schemas = swaggerData.components?.schemas || {};

      // Group endpoints by resource
      const resourceMap = new Map<string, SwaggerEndpoint[]>();

      try {
        Object.entries(paths).forEach(([path, methods]: [string, any]) => {
          try {
            const resourceName = this.extractResourceName(path);

            if (!resourceMap.has(resourceName)) {
              resourceMap.set(resourceName, []);
            }

            if (methods && typeof methods === 'object') {
              Object.entries(methods).forEach(([method, operation]: [string, any]) => {
                try {
                  if (operation && typeof operation === 'object') {
                    const endpoint: SwaggerEndpoint = {
                      path,
                      method: method as SwaggerEndpoint['method'],
                      summary: operation.summary,
                      description: operation.description,
                      operationId: operation.operationId,
                      parameters: Array.isArray(operation.parameters) ? operation.parameters : [],
                      requestBody: operation.requestBody,
                      responses: operation.responses || {},
                      tags: Array.isArray(operation.tags) ? operation.tags : [],
                    };

                    resourceMap.get(resourceName)!.push(endpoint);
                  }
                } catch (endpointError) {
                  console.warn(`[SwaggerParser] Failed to parse endpoint ${method.toUpperCase()} ${path}:`, endpointError);
                }
              });
            }
          } catch (pathError) {
            console.warn(`[SwaggerParser] Failed to parse path ${path}:`, pathError);
          }
        });
      } catch (pathsError) {
        console.error('[SwaggerParser] Error parsing paths:', pathsError);
        // Continue with empty resourceMap if paths parsing fails
      }

      // Convert to resources array
      const resources: SwaggerResource[] = Array.from(resourceMap.entries()).map(([name, endpoints]) => {
        try {
          const schema = this.findSchemaForResource(name, schemas);
          return {
            name,
            endpoints: this.sortEndpoints(endpoints),
            schema,
            icon: this.getResourceIcon(name),
            displayName: this.formatDisplayName(name),
          };
        } catch (resourceError) {
          console.warn(`[SwaggerParser] Failed to process resource ${name}:`, resourceError);
          return {
            name,
            endpoints: [],
            schema: undefined,
            icon: this.getResourceIcon(name),
            displayName: this.formatDisplayName(name),
          };
        }
      });

      const result = {
        info,
        resources: resources.filter(resource => resource.endpoints.length > 0),
        baseUrl: this.baseUrl,
      };

      console.log('[SwaggerParser] Parsed Swagger successfully:', {
        resourceCount: result.resources.length,
        totalEndpoints: result.resources.reduce((sum, r) => sum + r.endpoints.length, 0),
      });

      return result;
    } catch (error: any) {
      console.error('[SwaggerParser] Error parsing Swagger data:', error);
      throw new Error(`Failed to parse Swagger documentation: ${error.message}`);
    }
  }

  private extractResourceName(path: string): string {
    // Extract resource name from path like /api/users/{id} -> users
    const parts = path.split('/').filter(part => part && !part.startsWith('{'));
    const apiIndex = parts.indexOf('api');

    if (apiIndex !== -1 && apiIndex < parts.length - 1) {
      return parts[apiIndex + 1];
    }

    // Fallback: use the first non-empty part
    return parts[0] || 'unknown';
  }

  private findSchemaForResource(resourceName: string, schemas: Record<string, SwaggerSchema>): SwaggerSchema | undefined {
    // Look for schema with matching name (case insensitive)
    const schemaKey = Object.keys(schemas).find(key =>
      key.toLowerCase() === resourceName.toLowerCase() ||
      key.toLowerCase() === `${resourceName}schema` ||
      key.toLowerCase() === resourceName
    );

    return schemaKey ? schemas[schemaKey] : undefined;
  }

  private sortEndpoints(endpoints: SwaggerEndpoint[]): SwaggerEndpoint[] {
    // Sort by CRUD priority: GET (list), POST (create), GET (single), PUT/PATCH (update), DELETE
    const order = { get: 1, post: 2, put: 3, patch: 3, delete: 4 };

    return endpoints.sort((a, b) => {
      const aOrder = order[a.method] || 5;
      const bOrder = order[b.method] || 5;

      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }

      // For same method type, sort by path complexity (simpler paths first)
      return a.path.localeCompare(b.path);
    });
  }

  private getResourceIcon(resourceName: string): string {
    const iconMap: Record<string, string> = {
      users: 'Users',
      bookings: 'Calendar',
      orders: 'ShoppingCart',
      menu: 'Utensils',
      customers: 'UserCheck',
      promotions: 'Tag',
      notifications: 'Bell',
      blog: 'FileText',
      team: 'Users',
      testimonials: 'Star',
      services: 'Settings',
      events: 'Calendar',
      faq: 'HelpCircle',
      gallery: 'Image',
      inventory: 'Package',
      newsletter: 'Mail',
      contact: 'Mail',
    };

    return iconMap[resourceName.toLowerCase()] || 'Database';
  }

  private formatDisplayName(resourceName: string): string {
    // Convert camelCase/snake_case to Title Case
    return resourceName
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  async getParsedSwagger(): Promise<ParsedSwagger> {
    try {
      const swaggerData = await this.fetchSwagger();
      return this.parseSwagger(swaggerData);
    } catch (error: any) {
      // Re-throw with more context if it's already a parsing error
      if (error.message?.includes('Failed to parse Swagger')) {
        throw error;
      }
      // Otherwise, it's a fetch error - re-throw as is
      throw error;
    }
  }

  // Utility method to check if endpoint supports CRUD operations
  static hasCrudOperations(endpoints: SwaggerEndpoint[]): boolean {
    const methods = new Set(endpoints.map(e => e.method));
    return methods.has('get') && (methods.has('post') || methods.has('put') || methods.has('delete'));
  }

  // Get primary endpoint for a resource (usually the list endpoint)
  static getPrimaryEndpoint(endpoints: SwaggerEndpoint[]): SwaggerEndpoint | undefined {
    return endpoints.find(e => e.method === 'get' && !e.path.includes('{'));
  }
}

export const swaggerParser = new SwaggerParser();