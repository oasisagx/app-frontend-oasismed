/**
 * MedChat API Service
 * Handles communication with the MedChat backend REST API
 */

import { getIdToken } from './authUtils';
import { decodeJWT, extractCustomAttributes } from './jwtUtils';
import { ChatMessage } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
  console.warn('[MedChat API] VITE_API_BASE_URL não está configurada');
}

/**
 * Extract clinic_id from JWT token
 */
async function getClinicIdFromToken(): Promise<string> {
  const token = await getIdToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const attrs = extractCustomAttributes(token);
  const clinicId = attrs.clinic_id;
  
  if (!clinicId) {
    // Try decoding the token directly in case the claim is not in custom: namespace
    const decoded = decodeJWT(token);
    const clinicIdAlt = decoded?.clinic_id || decoded?.['custom:clinic_id'];
    if (clinicIdAlt) {
      return clinicIdAlt;
    }
    throw new Error('clinic_id not found in JWT token');
  }

  return clinicId;
}

/**
 * Handle API errors with user-friendly messages
 */
async function handleApiError(response: Response): Promise<never> {
  let errorMessage = 'Erro desconhecido';
  let errorCode = 'UNKNOWN_ERROR';

  try {
    const errorData = await response.json();
    errorMessage = errorData.error || errorMessage;
    errorCode = errorData.code || errorCode;
  } catch {
    // If response is not JSON, use status text
    errorMessage = response.statusText || errorMessage;
  }

  // Map HTTP status codes to user-friendly messages
  switch (response.status) {
    case 401:
      // Redirect to login if not authenticated
      if (errorCode === 'AUTH_ERROR' || errorMessage.includes('token') || errorMessage.includes('auth')) {
        window.location.href = '/login';
        throw new Error('Sessão expirada. Redirecionando para login...');
      }
      throw new Error('Não autorizado. Por favor, faça login novamente.');

    case 403:
      if (errorCode === 'CLINIC_MISMATCH') {
        throw new Error('Erro de autorização: clínica não corresponde.');
      }
      if (errorCode === 'SESSION_OWNERSHIP_MISMATCH') {
        throw new Error('Você não tem permissão para acessar esta sessão.');
      }
      throw new Error('Você não tem permissão para acessar este recurso.');

    case 404:
      if (errorCode === 'PATIENT_NOT_FOUND') {
        throw new Error('Paciente não encontrado.');
      }
      if (errorCode === 'SESSION_NOT_FOUND') {
        // Create a specific error type for session not found
        const error = new Error('Sessão não encontrada.');
        (error as any).code = 'SESSION_NOT_FOUND';
        (error as any).isNotFound = true;
        throw error;
      }
      // Generic 404 - check if it's a session endpoint
      if (response.url && response.url.includes('/chat/sessions/')) {
        const error = new Error('Sessão não encontrada.');
        (error as any).code = 'SESSION_NOT_FOUND';
        (error as any).isNotFound = true;
        throw error;
      }
      throw new Error('Recurso não encontrado.');

    case 400:
      throw new Error(errorMessage || 'Requisição inválida. Verifique os dados enviados.');

    case 500:
      if (errorCode === 'EMBEDDING_ERROR' || errorCode === 'VECTOR_SEARCH_ERROR') {
        throw new Error('Erro ao processar a consulta. Tente novamente.');
      }
      throw new Error('Erro interno do servidor. Tente novamente em alguns instantes.');

    case 502:
      if (errorCode === 'CLAUDE_ERROR') {
        throw new Error('Serviço de IA indisponível. Tente novamente.');
      }
      throw new Error('Erro ao gerar resposta. Tente novamente.');

    default:
      throw new Error(errorMessage || 'Erro ao processar a requisição.');
  }
}

/**
 * Make authenticated API request
 */
async function authenticatedRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL não está configurada');
  }

  const token = await getIdToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const url = `${API_BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Content-Type', 'application/json');

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    await handleApiError(response);
  }

  return response;
}

/**
 * Chat Session Types - Updated to match new backend structure
 */
export type ChatMode = "PATIENT_ONLY" | "REFERENCES_ONLY" | "PATIENT_AND_REFERENCES";
export type ChatStatus = "OPEN" | "CLOSED" | "ARCHIVED";

/**
 * Document retrieval summary - indicates which documents were actually used in RAG
 */
export interface SessionRetrievalDoc {
  documentId: string;
  patientId?: string | null;
  messageCount: number;
}

export interface SessionRetrievalSummary {
  patientDocuments: SessionRetrievalDoc[];
  referenceDocuments: SessionRetrievalDoc[];
}

export interface ChatSessionSummary {
  id: string;
  title: string;
  patientId: string | null;
  patientName?: string | null;
  status: ChatStatus;
  defaultMode: ChatMode | null;
  defaultReferenceScope: string;
  lastActivityAt: string | null; // ISO string
  defaultContext?: MedChatContextPayload; // Full context including patientDocumentUuids and referenceDocumentUuids
  retrievalSummary?: SessionRetrievalSummary; // NEW: Which documents were actually used in RAG
  summary?: string | null; // NEW: Session summary (long-term memory) - auto-generated by backend
}

/**
 * Legacy ChatSession interface for backward compatibility
 * Maps to ChatSessionSummary
 */
export interface ChatSession {
  id: string;
  title: string;
  c_status: 'OPEN' | 'CLOSED';
  created_at: string;
  closed_at: string | null;
}

/**
 * Source/Citation from RAG response
 */
export interface ChatSource {
  documentId: string;
  chunkId: string;
  chunkIndex: number;
}

/**
 * Response from send message endpoint
 */
export interface SendMessageResponse {
  answer: string;
  sessionId: string;
  messageId: string;
  sources: ChatSource[];
}

/**
 * Message from backend (GET /chat/sessions/{sessionId}/messages)
 * Updated to match new backend structure
 */
export interface BackendChatMessage {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  index: number;
  content: string;
  model?: string | null;
  metadata?: any;
  mode?: ChatMode | null;
  referenceScope?: string | null;
  createdAt: string | null; // ISO string
  sources?: ChatSource[];
}

/**
 * Legacy format for backward compatibility
 */
export interface LegacyBackendChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string; // ISO 8601 datetime
  sources?: ChatSource[];
}

/**
 * Optional options for sending a message
 */
export type SendMessageOptions = {
  mode?: ChatMode;
  referenceScope?: string;
};

/**
 * Patient info from session
 */
export interface SessionPatient {
  id: string;
  fullName: string;
}

/**
 * Create a new chat session for a specific patient or reference-only
 * Updated to support multi-patient sessions
 * @param patientId - Patient UUID (optional, null for reference-only sessions) - legacy support
 * @param patientIds - Array of Patient UUIDs (optional, for multi-patient sessions)
 * @param title - Optional session title
 * @param defaultContext - Optional default context for the session
 */
export async function createChatSession(
  patientId: string | null,
  title?: string,
  defaultContext?: MedChatContextPayload,
  patientIds?: string[] // New: array of patient IDs for multi-patient sessions
): Promise<string> {
  const clinicId = await getClinicIdFromToken();

  // Generate title from current date if not provided
  const sessionTitle = title || `Consulta ${new Date().toLocaleDateString('pt-BR')}`;

  const body: any = {
    clinicId,
    title: sessionTitle,
  };

  // Support new patientIds array (multi-patient sessions)
  // When patientIds array is provided, use it as primary method
  if (patientIds && patientIds.length > 0) {
    // Use the array as-is - it contains ALL selected patients
    body.patientIds = patientIds;
    console.log('[medChatApi] createChatSession - Using patientIds array:', patientIds);
    
    // If patientId is also provided and not in array, add it
    // Backend will deduplicate automatically
    if (patientId !== null && !patientIds.includes(patientId)) {
      body.patientIds = [patientId, ...patientIds];
      console.log('[medChatApi] createChatSession - Added legacy patientId to array:', body.patientIds);
    }
  } else if (patientId !== null) {
    // When on a patient page: send patientIds: [currentPatientId]
    // This is the new format (backend normalizes it)
    body.patientIds = [patientId];
    console.log('[medChatApi] createChatSession - Using single patientId:', patientId);
    // Also include legacy patientId for backward compatibility during transition
    body.patientId = patientId;
  } else {
    console.log('[medChatApi] createChatSession - No patients, creating reference-only session');
  }
  // If both are null/empty, backend creates reference-only session

  // Include defaultMode and defaultReferenceScope if defaultContext provided
  if (defaultContext) {
    body.defaultMode = defaultContext.mode;
    body.defaultReferenceScope = defaultContext.referenceScope || 'GLOBAL_DOCTOR';
    
    // Legacy support: also include defaultContext if backend expects it
    body.defaultContext = defaultContext;
  } else {
    // Default values
    body.defaultMode = 'PATIENT_AND_REFERENCES';
    body.defaultReferenceScope = 'GLOBAL_DOCTOR';
  }

  console.log('[medChatApi] createChatSession - Final request body:', JSON.stringify(body, null, 2));
  
  const response = await authenticatedRequest('/chat/sessions', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const data = await response.json();
  // Backend returns { sessionId: string } or just the sessionId string
  return data.sessionId || data.id || data;
}

/**
 * List all chat sessions - Returns new format (ChatSessionSummary[])
 * Also supports legacy format for backward compatibility
 * @param patientId - Patient UUID (optional, null for reference-only sessions)
 * @param limit - Maximum number of sessions to return (optional, defaults to 50)
 * @param offset - Pagination offset (optional, defaults to 0)
 */
export async function listChatSessions(
  patientId: string | null,
  limit?: number,
  offset?: number
): Promise<ChatSessionSummary[]> {
  const params = new URLSearchParams();
  
  // Only add patientId if not null (backend returns reference-only sessions when omitted)
  if (patientId !== null) {
    params.append('patientId', patientId);
  }
  
  // Add pagination parameters if provided
  if (limit !== undefined) {
    params.append('limit', String(limit));
  }
  if (offset !== undefined) {
    params.append('offset', String(offset));
  }

  const url = `/chat/sessions${params.toString() ? '?' + params.toString() : ''}`;
  
  console.log('[medChatApi] listChatSessions - URL:', url);
  console.log('[medChatApi] listChatSessions - patientId:', patientId);
  
  try {
    const response = await authenticatedRequest(url, {
      method: 'GET',
    });

    const data = await response.json();
    console.log('[medChatApi] listChatSessions - Response:', data);
    
    // Backend returns array directly or wrapped in sessions property
    const sessions = Array.isArray(data) ? data : (data.sessions || []);
    
    // Convert to ChatSessionSummary format if needed
    return sessions.map((session: any) => {
      // If already in new format, return as-is (includes defaultContext if backend provides it)
      if ('status' in session && 'lastActivityAt' in session) {
        const summary = session as ChatSessionSummary;
        // Log if defaultContext is present
        if (summary.defaultContext) {
          console.log('[medChatApi] listChatSessions - Session has defaultContext:', {
            sessionId: summary.id,
            title: summary.title,
            patientDocumentUuids: summary.defaultContext.patientDocumentUuids?.length || 0,
            referenceDocumentUuids: summary.defaultContext.referenceDocumentUuids?.length || 0,
          });
        }
        return summary;
      }
      // Convert from legacy format
      return {
        id: session.id,
        title: session.title,
        patientId: session.patientId || null,
        patientName: session.patientName || null,
        status: session.c_status === 'CLOSED' ? 'CLOSED' : (session.c_status === 'ARCHIVED' ? 'ARCHIVED' : 'OPEN'),
        defaultMode: session.defaultMode || null,
        defaultReferenceScope: session.defaultReferenceScope || 'GLOBAL_DOCTOR',
        lastActivityAt: session.lastActivityAt || session.created_at || null,
        defaultContext: session.defaultContext || undefined, // Include defaultContext if backend provides it
      } as ChatSessionSummary;
    });
  } catch (error) {
    console.error('[medChatApi] listChatSessions - Error details:', error);
    // Re-throw to let the hook handle it
    throw error;
  }
}

/**
 * Legacy listChatSessions that returns old format (for backward compatibility)
 */
export async function listChatSessionsLegacy(patientId: string | null): Promise<ChatSession[]> {
  const summaries = await listChatSessions(patientId);
  return summaries.map(summary => ({
    id: summary.id,
    title: summary.title,
    c_status: summary.status === 'CLOSED' ? 'CLOSED' : (summary.status === 'ARCHIVED' ? 'CLOSED' : 'OPEN'),
    created_at: summary.lastActivityAt || new Date().toISOString(),
    closed_at: summary.status === 'CLOSED' ? (summary.lastActivityAt || new Date().toISOString()) : null,
  }));
}

/**
 * Chat Context Types - Canonical Model
 * Context is always per-message, with 3 modes
 * ChatMode is defined above, ChatContextMode is an alias for backward compatibility
 */
export type ChatContextMode = ChatMode;

export type ReferenceScope = 'GLOBAL_DOCTOR' | 'CLINIC' | 'PATIENT';

/**
 * Context payload that travels in the request
 * Backend requires explicit context to determine which documents to use
 * 
 * Canonical structure with separate patient and reference document UUIDs
 */
export interface MedChatContextPayload {
  mode: ChatMode;
  
  // Patient side
  patientId?: string; // UUID - required when mode uses patient
  patientDocumentUuids?: string[]; // Optional subset filter; if omitted: "all patient docs"
  
  // References side
  referenceScope?: ReferenceScope; // Default: 'GLOBAL_DOCTOR'
  referenceDocumentUuids?: string[]; // Optional subset filter; if omitted: "all reference docs"
  
  // Optional future filters:
  // filters?: { tagIds?: string[]; dateFrom?: string; dateTo?: string; }
}

/**
 * Legacy ChatContext type (for internal frontend state)
 * Maps to MedChatContextPayload when sending to backend
 */
export type ChatContext =
  | { mode: 'PATIENT'; patient_id: string }
  | { mode: 'REFERENCE'; reference_slug: string };

/**
 * Streaming response chunk types
 */
export interface StreamChunk {
  type: 'content' | 'sources' | 'done' | 'error';
  content?: string;
  sources?: ChatSource[];
  messageId?: string;
  sessionId?: string;
  error?: string;
}

/**
 * Callback types for streaming
 */
export interface StreamCallbacks {
  onContent: (chunk: string) => void;
  onSources?: (sources: ChatSource[]) => void;
  onDone?: (messageId: string, sessionId: string) => void;
  onError?: (error: Error) => void;
}

/**
 * Send a message to a chat session with streaming response
 * Reads Server-Sent Events (SSE) or chunked JSON from the backend
 * 
 * @param sessionId - Session UUID
 * @param content - User's message/query
 * @param context - Context payload with mode, patientId, and referenceScope
 * @param callbacks - Callbacks for handling streaming chunks
 * @param metadata - Optional metadata with selected document UUIDs for context persistence
 * @returns Promise that resolves when stream completes
 */
export async function sendChatMessageStream(
  sessionId: string,
  content: string,
  context: MedChatContextPayload,
  callbacks: StreamCallbacks,
  metadata?: { selectedReferenceDocumentUuids?: string[]; selectedPatientDocumentUuids?: string[] } | null
): Promise<void> {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL não está configurada');
  }

  const token = await getIdToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const url = `${API_BASE_URL}/chat/sessions/${sessionId}/messages`;
  
  // Support both new format (query + options) and legacy format (content + context)
  const body: any = {
    // New format uses 'query'
    query: content,
    // Legacy format uses 'content' (for backward compatibility)
    content: content,
    // New format: mode and referenceScope as direct options
    mode: context.mode,
    referenceScope: context.referenceScope || 'GLOBAL_DOCTOR',
    // Legacy format: full context payload
    context: context,
    options: {
      stream: true,
    },
    // NEW: Include metadata for context persistence (selected document UUIDs)
    metadata: metadata ? {
      selectedReferenceDocumentUuids: metadata.selectedReferenceDocumentUuids || [],
      selectedPatientDocumentUuids: metadata.selectedPatientDocumentUuids || [],
    } : undefined,
  };

  console.log('[medChatApi] sendChatMessageStream - URL:', url);
  console.log('[medChatApi] sendChatMessageStream - Body:', JSON.stringify(body, null, 2));

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || 'Erro ao processar requisição');
    }

    // Always try to read as a stream first, regardless of Content-Type
    // This ensures we can process chunks as they arrive
    const contentType = response.headers.get('content-type') || '';
    const isSSE = contentType.includes('text/event-stream');
    const isNDJSON = contentType.includes('application/x-ndjson');
    
    console.log('[medChatApi] Streaming response - Content-Type:', contentType);
    console.log('[medChatApi] Is SSE:', isSSE, 'Is NDJSON:', isNDJSON);

    // If response.body exists and is readable, always stream it
    if (response.body && typeof response.body.getReader === 'function') {
      console.log('[medChatApi] Starting to read stream...');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      let buffer = '';
      let messageId = '';
      let sessionIdFromResponse = sessionId;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('[medChatApi] Stream ended, buffer length:', buffer.length);
          // Process any remaining buffer
          if (buffer.trim()) {
            if (isSSE) {
              // Try to parse remaining SSE data
              const lines = buffer.split('\n');
              for (const line of lines) {
                if (line.trim() && line.startsWith('data: ')) {
                  try {
                    const jsonStr = line.slice(6).trim();
                    if (jsonStr && jsonStr !== '[DONE]') {
                      const data = JSON.parse(jsonStr);
                      if (data.content) callbacks.onContent(data.content);
                      if (data.messageId) messageId = data.messageId;
                      if (data.sessionId) sessionIdFromResponse = data.sessionId;
                      if (data.sources && callbacks.onSources) {
                        callbacks.onSources(data.sources);
                      }
                    }
                  } catch (e) {
                    console.error('[medChatApi] Error parsing final SSE data:', e);
                  }
                }
              }
            } else {
              // Try NDJSON or plain JSON for remaining buffer
              const lines = buffer.trim().split('\n');
              for (const line of lines) {
                if (line.trim()) {
                  try {
                    const data = JSON.parse(line.trim());
                    if (data.content) callbacks.onContent(data.content);
                    if (data.messageId) messageId = data.messageId;
                    if (data.sessionId) sessionIdFromResponse = data.sessionId;
                    if (data.sources && callbacks.onSources) {
                      callbacks.onSources(data.sources);
                    }
                  } catch (e) {
                    // Ignore parse errors for partial lines
                  }
                }
              }
            }
          }
          
          if (callbacks.onDone) {
            callbacks.onDone(messageId, sessionIdFromResponse);
          }
          break;
        }

        // Decode chunk immediately
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        console.log('[medChatApi] Received chunk, length:', chunk.length, 'Buffer length:', buffer.length);
        
        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;
          
          // Handle SSE format: "data: {json}"
          if (isSSE && trimmedLine.startsWith('data: ')) {
            const jsonStr = trimmedLine.slice(6).trim();
            
            if (jsonStr === '[DONE]') {
              if (callbacks.onDone) {
                callbacks.onDone(messageId, sessionIdFromResponse);
              }
              return;
            }

            if (!jsonStr) continue;

            try {
              const data = JSON.parse(jsonStr);
              
              // Handle different chunk types
              if (data.type === 'content' && data.content) {
                console.log('[medChatApi] Content chunk received, length:', data.content.length);
                callbacks.onContent(data.content);
              } else if (data.type === 'sources' && data.sources) {
                if (callbacks.onSources) {
                  callbacks.onSources(data.sources);
                }
              } else if (data.type === 'done') {
                messageId = data.messageId || messageId;
                sessionIdFromResponse = data.sessionId || sessionIdFromResponse;
                if (callbacks.onDone) {
                  callbacks.onDone(messageId, sessionIdFromResponse);
                }
                return;
              } else if (data.type === 'error') {
                throw new Error(data.error || 'Erro no stream');
              } else if (data.content !== undefined && data.content !== null) {
                // Fallback: if content is present (even empty string), treat as content chunk
                console.log('[medChatApi] Content chunk received (fallback), length:', String(data.content).length);
                callbacks.onContent(String(data.content));
                if (data.messageId) messageId = data.messageId;
                if (data.sessionId) sessionIdFromResponse = data.sessionId;
                if (data.sources && callbacks.onSources) {
                  callbacks.onSources(data.sources);
                }
              } else if (data.delta && data.delta.content) {
                // Handle OpenAI-style delta format: { delta: { content: "text" } }
                console.log('[medChatApi] Delta content chunk received, length:', data.delta.content.length);
                callbacks.onContent(data.delta.content);
              } else if (typeof data === 'string') {
                // Handle plain string chunks
                console.log('[medChatApi] Plain string chunk received, length:', data.length);
                callbacks.onContent(data);
              }
            } catch (e) {
              console.error('[medChatApi] Error parsing SSE data:', e, 'Raw:', jsonStr);
            }
          } else if (isNDJSON || !isSSE) {
            // Handle NDJSON or plain JSON lines
            try {
              const data = JSON.parse(trimmedLine);
              
              if (data.content !== undefined && data.content !== null) {
                console.log('[medChatApi] Content chunk received (NDJSON/JSON), length:', String(data.content).length);
                callbacks.onContent(String(data.content));
              } else if (data.delta && data.delta.content) {
                // Handle OpenAI-style delta format
                console.log('[medChatApi] Delta content chunk received (NDJSON), length:', data.delta.content.length);
                callbacks.onContent(data.delta.content);
              } else if (typeof data === 'string') {
                // Handle plain string chunks
                console.log('[medChatApi] Plain string chunk received (NDJSON), length:', data.length);
                callbacks.onContent(data);
              }
              if (data.sources && callbacks.onSources) {
                callbacks.onSources(data.sources);
              }
              if (data.messageId) messageId = data.messageId;
              if (data.sessionId) sessionIdFromResponse = data.sessionId;
              if (data.done === true || data.type === 'done') {
                if (callbacks.onDone) {
                  callbacks.onDone(messageId || '', sessionIdFromResponse);
                }
                return;
              }
            } catch (e) {
              // Not valid JSON, might be plain text chunk - try to process as content
              if (trimmedLine && (!isSSE || !trimmedLine.startsWith('data: '))) {
                // If not SSE format or not starting with 'data:', treat as plain text content
                console.log('[medChatApi] Plain text chunk received (fallback), length:', trimmedLine.length);
                callbacks.onContent(trimmedLine);
              } else {
                console.error('[medChatApi] Error parsing JSON line:', e, 'Line:', trimmedLine.substring(0, 100));
              }
            }
          }
        }
      }
    } else {
      // Fallback: response body not readable as stream, wait for complete response
      console.warn('[medChatApi] Response body is not readable as stream, falling back to text()');
      const text = await response.text();
      
      // If it's JSON, parse it (non-streaming response)
      try {
        const json = JSON.parse(text);
        if (json.content) {
          callbacks.onContent(json.content);
        }
        if (json.sources && callbacks.onSources) {
          callbacks.onSources(json.sources);
        }
        if (callbacks.onDone) {
          callbacks.onDone(json.messageId || '', json.sessionId || sessionId);
        }
      } catch {
        // If not JSON, treat entire response as content
        callbacks.onContent(text);
        if (callbacks.onDone) {
          callbacks.onDone('', sessionId);
        }
      }
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Erro desconhecido');
    console.error('[medChatApi] sendChatMessageStream - Error:', err);
    
    if (callbacks.onError) {
      callbacks.onError(err);
    } else {
      throw err;
    }
  }
}

/**
 * Send a message to a chat session and get AI response
 * Backend requires explicit context in the request body
 * 
 * NOTE: Backend Bedrock Configuration
 * The backend should use the following Bedrock `converse` API format:
 * 
 * ```typescript
 * const response = await bedrock.converse({
 *   modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
 *   messages: [
 *     {
 *       role: 'user',
 *       content: [{ text: full_prompt }]
 *     }
 *   ],
 *   inferenceConfig: {
 *     maxTokens: 512,
 *     temperature: 0.2,
 *     topP: 0.9,           // Use topP, NOT topK
 *     stopSequences: ['</json>']
 *   }
 * });
 * ```
 * 
 * @param sessionId - Session UUID
 * @param content - User's message/query
 * @param context - Context payload with mode, patientId, and referenceScope
 */
export async function sendChatMessage(
  sessionId: string,
  content: string,
  context: MedChatContextPayload
): Promise<SendMessageResponse> {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL não está configurada');
  }

  const token = await getIdToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const url = `${API_BASE_URL}/chat/sessions/${sessionId}/messages`;
  
  // Support both new format (query + options) and legacy format (content + context)
  const body: any = {
    // New format uses 'query'
    query: content,
    // Legacy format uses 'content' (for backward compatibility)
    content: content,
    // New format: mode and referenceScope as direct options
    mode: context.mode,
    referenceScope: context.referenceScope || 'GLOBAL_DOCTOR',
    // Legacy format: full context payload
    context: context,
  };

  console.log('[medChatApi] sendChatMessage - URL:', url);
  console.log('[medChatApi] sendChatMessage - Body:', JSON.stringify(body, null, 2));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const json = await response.json().catch(() => null);

  console.log('[medChatApi] sendChatMessage - Status:', response.status);
  console.log('[medChatApi] sendChatMessage - Response:', json);

  if (!response.ok) {
    console.error('[medChatApi] sendChatMessage - Error:', json || 'Unknown error');
    throw json || { error: 'Unknown error', code: 'UNKNOWN' };
  }

  // Support both new format (answer, messageId) and legacy format (content)
  return {
    answer: json?.answer || json?.content || '',
    sessionId: json?.sessionId || sessionId,
    messageId: json?.messageId || json?.id || '',
    sources: json?.sources || [],
  };
}

/**
 * Get message history for a chat session
 * Updated to support new backend format and metadata
 * @param sessionId - Session UUID
 * @param limit - Maximum number of messages to retrieve (default: 200)
 */
export async function getChatMessages(sessionId: string, limit = 200): Promise<ChatMessage[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  const response = await authenticatedRequest(`/chat/sessions/${sessionId}/messages?${params.toString()}`, {
    method: 'GET',
  });

  const data = await response.json();
  // Backend returns array directly or wrapped in messages property
  const backendMessages: BackendChatMessage[] = Array.isArray(data) ? data : (data.messages || []);
  
  // Convert backend messages to frontend format (supporting both new and legacy formats)
  return backendMessages.map((msg: any) => {
    // Extract metadata if present (for context restoration)
    const metadata = msg.metadata ? {
      selectedReferenceDocumentUuids: msg.metadata.selectedReferenceDocumentUuids || [],
      selectedPatientDocumentUuids: msg.metadata.selectedPatientDocumentUuids || [],
    } : undefined;
    
    // New format: has index, createdAt, uppercase role
    if ('index' in msg && 'createdAt' in msg) {
      return {
        id: msg.id,
        content: msg.content,
        role: msg.role.toLowerCase() === 'user' ? 'user' : (msg.role.toLowerCase() === 'system' ? 'assistant' : 'assistant'),
        timestamp: msg.createdAt ? new Date(msg.createdAt) : new Date(),
        sources: msg.sources || [],
        metadata: metadata, // Preserve metadata for context restoration
      };
    }
    // Legacy format: has timestamp, lowercase role
    return {
      id: msg.id,
      content: msg.content,
      role: msg.role.toLowerCase() === 'user' ? 'user' : 'assistant',
      timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
      sources: msg.sources || [],
      metadata: metadata, // Preserve metadata for context restoration
    };
  });
}

/**
 * Rename a chat session
 * @param sessionId - Session UUID
 * @param title - New title
 */
export async function renameChatSession(sessionId: string, title: string): Promise<ChatSessionSummary> {
  const response = await authenticatedRequest(`/chat/sessions/${sessionId}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  });

  const data = await response.json();
  
  // Backend returns ChatSessionSummary or wrapped format
  if ('status' in data && 'lastActivityAt' in data) {
    return data as ChatSessionSummary;
  }
  
  // Convert if needed
  return {
    id: data.id || sessionId,
    title: data.title || title,
    patientId: data.patientId || null,
    patientName: data.patientName || null,
    status: data.status || data.c_status === 'CLOSED' ? 'CLOSED' : 'OPEN',
    defaultMode: data.defaultMode || null,
    defaultReferenceScope: data.defaultReferenceScope || 'GLOBAL_DOCTOR',
    lastActivityAt: data.lastActivityAt || data.created_at || null,
  } as ChatSessionSummary;
}

/**
 * Get a single chat session with full context
 * NOTE: This endpoint may not exist in the backend (returns 404).
 * If the backend uses a different path (e.g., /med-chat/sessions/{id}), update the endpoint below.
 * If it fails, the caller should use the session from listChatSessions instead.
 * 
 * @param sessionId - Session UUID
 * @returns ChatSessionSummary with full defaultContext
 * @throws Error if endpoint doesn't exist (404) - caller should handle gracefully
 */
export async function getChatSession(sessionId: string): Promise<ChatSessionSummary> {
  try {
    // Try standard path first: /chat/sessions/{id}
    // If your backend uses a different path (e.g., /med-chat/sessions/{id}), change it here:
    const endpoint = `/chat/sessions/${encodeURIComponent(sessionId)}`;
    
    console.log('[medChatApi] getChatSession - Attempting to fetch:', endpoint);
    
    const response = await authenticatedRequest(endpoint, {
      method: 'GET',
    });

    const data = await response.json();
    
    // Extract retrievalSummary from backend response
    const retrievalSummary: SessionRetrievalSummary = {
      patientDocuments: data.retrievalSummary?.patientDocuments ?? [],
      referenceDocuments: data.retrievalSummary?.referenceDocuments ?? [],
    };
    
    console.log('[medChatApi] getChatSession - Success, received data:', {
      hasDefaultContext: !!data.defaultContext,
      patientDocumentUuids: data.defaultContext?.patientDocumentUuids?.length || 0,
      referenceDocumentUuids: data.defaultContext?.referenceDocumentUuids?.length || 0,
      patientDocCount: retrievalSummary.patientDocuments.length,
      refDocCount: retrievalSummary.referenceDocuments.length,
    });
    
    // Backend returns ChatSessionSummary with defaultContext
    if ('status' in data && 'lastActivityAt' in data) {
      return {
        ...data,
        retrievalSummary,
        summary: data.summary || undefined, // Preserve session summary if available
      } as ChatSessionSummary;
    }
    
    // Convert if needed
    return {
      id: data.id || sessionId,
      title: data.title || '',
      patientId: data.patientId || null,
      patientName: data.patientName || null,
      status: data.status || data.c_status === 'CLOSED' ? 'CLOSED' : 'OPEN',
      defaultMode: data.defaultMode || null,
      defaultReferenceScope: data.defaultReferenceScope || 'GLOBAL_DOCTOR',
      lastActivityAt: data.lastActivityAt || data.created_at || null,
      defaultContext: data.defaultContext || undefined,
      retrievalSummary,
      summary: data.summary || undefined, // Preserve session summary if available
    } as ChatSessionSummary;
  } catch (error) {
    // If endpoint doesn't exist (404), throw a specific error
    if (error instanceof Error) {
      // Check if it's a 404 error (session doesn't exist)
      if (error.message.includes('404') || 
          error.message.includes('Not Found') || 
          error.message.includes('SESSION_NOT_FOUND') ||
          error.message.includes('Sessão não encontrada')) {
        console.warn('[medChatApi] getChatSession - Session not found (404):', sessionId);
        const notFoundError = new Error('SESSION_NOT_FOUND');
        (notFoundError as any).code = 'SESSION_NOT_FOUND';
        (notFoundError as any).isNotFound = true;
        throw notFoundError;
      }
      // Check if endpoint doesn't exist (different from session not found)
      if (error.message.includes('GET_SESSION_ENDPOINT_NOT_FOUND')) {
        console.warn('[medChatApi] getChatSession - Endpoint not found, endpoint may not exist in backend');
        throw error;
      }
      // Check for CORS errors which might indicate wrong path
      if (error.message.includes('CORS') || error.message.includes('blocked')) {
        console.error('[medChatApi] getChatSession - CORS error, check if endpoint path is correct');
      }
    }
    throw error;
  }
}

/**
 * Get all patients associated with a chat session
 * New endpoint for multi-patient sessions
 * @param sessionId - Session UUID
 * @returns Array of patient info ordered by fullName
 */
export async function getSessionPatients(sessionId: string): Promise<SessionPatient[]> {
  const response = await authenticatedRequest(`/chat/sessions/${sessionId}/patients`, {
    method: 'GET',
  });

  const data = await response.json();
  // Backend returns array directly
  return Array.isArray(data) ? data : [];
}

/**
 * Session document - represents a document that was actually used in a session
 */
export interface SessionDocument {
  id: string; // Document UUID
  title: string;
  patientId: string | null; // null for reference documents
  dType: string;
  source?: string;
  dStatus: string;
  createdAt: string;
}

/**
 * Response format from GET /chat/sessions/{sessionId}/documents
 * NEW: Returns object with separate patient_docs and ref_docs arrays
 */
export interface SessionDocumentsResponse {
  patient_docs?: SessionDocument[];
  ref_docs?: SessionDocument[];
  patient_docs_count?: number;
  ref_docs_count?: number;
}

/**
 * Get documents actually used (cited) in a chat session
 * Filters documents based on chat_message_citations → chunks → documents chain
 * 
 * NEW FORMAT: Backend now returns object with patient_docs and ref_docs arrays
 * 
 * @param sessionId - Session UUID
 * @param patientId - Optional patient ID to filter documents (if provided, returns only that patient's documents)
 * @returns Array of documents that were actually used in the session
 */
export async function getSessionDocuments(
  sessionId: string,
  patientId?: string | null
): Promise<SessionDocument[]> {
  const params = new URLSearchParams();
  // Use patientId query parameter (camelCase) as specified in requirements
  if (patientId !== undefined && patientId !== null) {
    params.append('patientId', patientId);
  }

  const url = `/chat/sessions/${sessionId}/documents${params.toString() ? '?' + params.toString() : ''}`;
  
  console.log('[medChatApi] getSessionDocuments - URL:', url);
  console.log('[medChatApi] getSessionDocuments - patientId filter:', patientId ?? 'none');

  try {
    const response = await authenticatedRequest(url, {
      method: 'GET',
    });

    const data = await response.json();
    
    // NEW FORMAT: Check if response is the new object format
    if (data && (data.patient_docs || data.ref_docs || 'patient_docs_count' in data || 'ref_docs_count' in data)) {
      // New format: { patient_docs: [...], ref_docs: [...], patient_docs_count: N, ref_docs_count: M }
      const patientDocs = (data.patient_docs || []).map((doc: any) => ({
        id: doc.id || doc.document_id,
        title: doc.title || doc.name || '',
        patientId: doc.patient_id || doc.patientId || null,
        dType: doc.d_type || doc.dType || 'KNOWLEDGE_PDF',
        source: doc.source || undefined,
        dStatus: doc.d_status || doc.dStatus || 'READY',
        createdAt: doc.created_at || doc.createdAt || new Date().toISOString(),
      }));
      
      const refDocs = (data.ref_docs || []).map((doc: any) => ({
        id: doc.id || doc.document_id,
        title: doc.title || doc.name || '',
        patientId: null, // Reference documents always have null patientId
        dType: doc.d_type || doc.dType || 'KNOWLEDGE_PDF',
        source: doc.source || undefined,
        dStatus: doc.d_status || doc.dStatus || 'READY',
        createdAt: doc.created_at || doc.createdAt || new Date().toISOString(),
      }));
      
      const allDocs = [...patientDocs, ...refDocs];
      
      console.log('[medChatApi] getSessionDocuments - Response (new format):', {
        totalDocs: allDocs.length,
        patientDocs: patientDocs.length,
        refDocs: refDocs.length,
        patientDocsCount: data.patient_docs_count,
        refDocsCount: data.ref_docs_count,
      });
      
      return allDocs;
    }
    
    // LEGACY FORMAT: Backward compatibility - array or wrapped array
    const documents = Array.isArray(data) ? data : (data.documents || []);

    console.log('[medChatApi] getSessionDocuments - Response (legacy format):', {
      totalDocs: documents.length,
      patientDocs: documents.filter((d: SessionDocument) => d.patientId !== null).length,
      refDocs: documents.filter((d: SessionDocument) => d.patientId === null).length,
    });

    return documents.map((doc: any) => ({
      id: doc.id || doc.document_id,
      title: doc.title || doc.name || '',
      patientId: doc.patient_id || doc.patientId || null,
      dType: doc.d_type || doc.dType || 'KNOWLEDGE_PDF',
      source: doc.source || undefined,
      dStatus: doc.d_status || doc.dStatus || 'READY',
      createdAt: doc.created_at || doc.createdAt || new Date().toISOString(),
    }));
  } catch (error) {
    console.error('[medChatApi] getSessionDocuments - Error:', error);
    throw error;
  }
}

/**
 * Delete a chat session
 * @param sessionId - Session UUID
 */
export async function deleteChatSession(sessionId: string): Promise<void> {
  const response = await authenticatedRequest(`/chat/sessions/${sessionId}`, {
    method: 'DELETE',
  });

  // 204 No Content - response is empty
  if (!response.ok && response.status !== 204) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text || response.statusText}`);
  }
}

