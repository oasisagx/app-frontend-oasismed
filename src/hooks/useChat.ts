import { useState, useCallback, useEffect, useRef, startTransition } from 'react';
import { ChatMessage, MessageMetadata } from '../types';
import {
  createChatSession,
  listChatSessions,
  sendChatMessageStream,
  getChatMessages,
  renameChatSession,
  deleteChatSession,
  getSessionPatients,
  getChatSession,
  getSessionDocuments,
  type ChatSessionSummary,
  type ChatContext,
  type MedChatContextPayload,
  type ChatContextMode,
  type ChatSource,
  type SessionPatient,
  type SessionDocument,
} from '../lib/medChatApi';

interface ConversationHistoryItem {
  id: string; // sessionId from backend
  createdAt: string;
  title: string;
  c_status?: 'OPEN' | 'CLOSED';
}

// Context highlights - indicates which documents were actually used in RAG
export interface SessionContextHighlight {
  usedPatientIds: string[];
  usedPatientDocumentUuids: string[];
  usedReferenceDocumentUuids: string[];
}

/**
 * Custom hook for MedChat functionality using REST API
 * Uses explicit context mode: PATIENT or REFERENCE
 * Supports multiple patients for multi-patient chat sessions
 */
export const useChat = (
  chatContext: ChatContext | null,
  selectedPatientDocumentUuids: string[] = [],
  selectedReferenceDocumentUuids: string[] = [],
  chatContextPatientIds: string[] = [] // NEW: Array of all selected patient IDs for multi-patient support
) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [history, setHistory] = useState<ConversationHistoryItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [currentContext, setCurrentContext] = useState<ChatContext | null>(null);
  const [sessionPatients, setSessionPatients] = useState<SessionPatient[]>([]);
  
  // Store context highlights per session (which documents were actually used)
  const [sessionContextHighlights, setSessionContextHighlights] = useState<Record<string, SessionContextHighlight>>({});
  
  // Store session documents per session (documents actually used in that session)
  // Key format: `${sessionId}:${patientId || 'null'}` to avoid mixing contexts
  const [sessionDocuments, setSessionDocuments] = useState<Record<string, SessionDocument[]>>({});
  
  // Store the patient context used when loading session documents (to detect context changes)
  const sessionDocumentsContextRef = useRef<Record<string, string | null>>({});
  
  // Flag to prevent reloading sessions when context is restored from a selected chat
  const isRestoringContextFromChatRef = useRef(false);
  
  // Store the patientId filter used to load sessions, so we can use the same filter when reloading
  const lastLoadedPatientIdRef = useRef<string | null>(null);

  // Store conversation messages by sessionId
  const conversationsRef = useRef<Record<string, ChatMessage[]>>({});
  
  // Store last user message metadata per session for context restoration
  const lastUserMessageMetadataRef = useRef<Record<string, MessageMetadata | null>>({});

  // Get patient ID from context (if PATIENT mode)
  const getPatientId = useCallback((): string | null => {
    if (chatContext?.mode === 'PATIENT') {
      return chatContext.patient_id;
    }
    return null;
  }, [chatContext]);

  // Load chat sessions from backend for current patient or reference-only
  // Always loads fresh from database to ensure history is stateful and linked to database data
  const loadSessions = useCallback(async (patientId: string | null): Promise<ChatSessionSummary[]> => {
    try {
      // Always fetch fresh data from database
      const backendSessions = await listChatSessions(patientId);
      
      console.log('[useChat] loadSessions - Fetched from database:', {
        patientId,
        sessionCount: backendSessions.length,
        sessions: backendSessions.map(s => ({ id: s.id, title: s.title, lastActivityAt: s.lastActivityAt }))
      });
      
      // Store the patientId filter used so we can reload with the same filter later
      lastLoadedPatientIdRef.current = patientId;
      
      setSessions(backendSessions);

      // Convert backend sessions to history items - always use fresh database data
      // Support both new format (ChatSessionSummary) and legacy format (ChatSession)
      // Backend already sorts by lastActivityAt DESC, so we preserve that order
      const historyItems: ConversationHistoryItem[] = backendSessions.map((session) => ({
        id: session.id,
        createdAt: session.lastActivityAt || (session as any).created_at || new Date().toISOString(),
        title: session.title,
        c_status: session.status === 'CLOSED' ? 'CLOSED' : (session.status === 'ARCHIVED' ? 'CLOSED' : 'OPEN'),
      }));

      // Ensure history is sorted by lastActivityAt (backend should already sort, but verify client-side too)
      // This ensures history always shows most recently active sessions first
      historyItems.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA; // Most recent first
      });

      console.log('[useChat] loadSessions - Setting history:', {
        historyItemCount: historyItems.length,
        historyItems: historyItems.map(h => ({ id: h.id, title: h.title, createdAt: h.createdAt }))
      });

      // Always update history from database data - this makes it stateful and linked to database
      setHistory(historyItems);
      
      // Clear error on success
      setError(null);
      
      // Return sessions for use after loading
      return backendSessions;
    } catch (err) {
      console.error('[useChat] Error loading sessions:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar sessões de chat';
      setError(new Error(errorMessage));
      // Don't break the UI - set empty sessions/history on error
      setSessions([]);
      setHistory([]);
      return [];
    }
  }, []);

  // Load sessions when context changes OR on initial mount - always loads from database
  useEffect(() => {
    // Skip reloading if we're restoring context from a selected chat
    // This prevents history from disappearing when selecting a chat
    if (isRestoringContextFromChatRef.current) {
      console.log('[useChat] Skipping session reload - context restored from chat selection');
      isRestoringContextFromChatRef.current = false;
      // Update currentContext without reloading sessions
      setCurrentContext(chatContext);
      return;
    }
    
    // Check if context actually changed
    const contextChanged = 
      currentContext?.mode !== chatContext?.mode ||
      (chatContext?.mode === 'PATIENT' && currentContext?.mode === 'PATIENT' && currentContext.patient_id !== chatContext.patient_id) ||
      (chatContext?.mode === 'REFERENCE' && currentContext?.mode === 'REFERENCE' && currentContext.reference_slug !== chatContext.reference_slug);
    
    // Load if context changed OR on initial mount (currentContext is null)
    // Even if chatContext is null, we should load reference-only sessions
    const shouldLoad = contextChanged || (!currentContext && !chatContext) || (chatContext && !currentContext);
    
    if (shouldLoad) {
      setCurrentContext(chatContext);
      const patientId = getPatientId(); // Returns null for REFERENCE mode or null context
      
      console.log('[useChat] Loading sessions from database:', {
        mode: chatContext?.mode,
        patientId,
        isReferenceMode: chatContext?.mode === 'REFERENCE',
        contextChanged,
        isInitialLoad: !currentContext,
        shouldLoad,
        chatContext: chatContext ? 'has context' : 'no context'
      });
      
      // Always load ALL sessions (no filter) for history sidebar
      // This ensures all historic chats remain visible regardless of current context
      // The history sidebar should show all sessions, not filtered by patient
      loadSessions(null).catch(err => {
        // Error is already logged in loadSessions, just set error state
        console.error('[useChat] Failed to load sessions:', err);
      });
      
      // Clear active conversation when context changes (but not on initial load)
      if (contextChanged && currentContext !== null) {
        setActiveConversationId(null);
        setMessages([]);
      }
    }
  }, [chatContext, currentContext, getPatientId, loadSessions]);

  // Initial load: Load sessions on mount even if chatContext is null
  // This ensures reference-only sessions are loaded and displayed in history
  useEffect(() => {
    // Only run on initial mount (when currentContext is still null and no sessions loaded yet)
    // This ensures history shows even when user hasn't selected a patient yet
    if (currentContext === null && sessions.length === 0 && history.length === 0) {
      console.log('[useChat] Initial mount - Loading all sessions (no filter)');
      // Always load all sessions for history sidebar, regardless of context
      loadSessions(null).catch(err => {
        console.error('[useChat] Failed to load sessions on initial mount:', err);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount, functions are stable via useCallback

  // Create a new chat session (can be patient-scoped or reference-only)
  const createNewSession = useCallback(
    async (patientId: string | null, title?: string): Promise<string> => {
      try {
        // Build defaultContext based on chatContext - ALWAYS send defaultContext when creating session
        // This ensures session starts in a defined state (S1, S2, or S3) instead of S0 (NO_CONTEXT)
        // Use canonical model with separate patientDocumentUuids and referenceDocumentUuids
        
        // Get all selected patient IDs (multi-patient support)
        // Use chatContextPatientIds (array) if available, otherwise fall back to chatContext.patient_id (single)
        const allSelectedPatientIds = chatContextPatientIds.length > 0 
          ? chatContextPatientIds 
          : (chatContext?.mode === 'PATIENT' ? [chatContext.patient_id] : []);
        
        // Primary patient is the first one in the array (or from chatContext for backward compatibility)
        const primaryPatientId = allSelectedPatientIds.length > 0 
          ? allSelectedPatientIds[0] 
          : (chatContext?.mode === 'PATIENT' ? chatContext.patient_id : null);
        
        const hasPatientDocs = selectedPatientDocumentUuids.length > 0;
        const hasReferenceDocs = selectedReferenceDocumentUuids.length > 0;
        
        // Determine mode: PATIENT_ONLY, REFERENCES_ONLY, or PATIENT_AND_REFERENCES
        let mode: ChatContextMode;
        if (primaryPatientId && hasReferenceDocs) {
          mode = 'PATIENT_AND_REFERENCES';
        } else if (primaryPatientId) {
          mode = 'PATIENT_ONLY';
        } else {
          mode = 'REFERENCES_ONLY';
        }
        
        // Always provide defaultContext - never create session in S0 (NO_CONTEXT) state
        const defaultContext: MedChatContextPayload = {
          mode,
          patientId: primaryPatientId ?? undefined, // Primary patient (first in array)
          patientDocumentUuids: hasPatientDocs ? selectedPatientDocumentUuids : undefined,
          // Only include referenceScope for modes that use references
          ...(mode === 'REFERENCES_ONLY' || mode === 'PATIENT_AND_REFERENCES' 
            ? { referenceScope: 'GLOBAL_DOCTOR' as const } 
            : {}),
          referenceDocumentUuids: hasReferenceDocs ? selectedReferenceDocumentUuids : undefined,
        };
        
        console.log('[useChat] Creating session with defaultContext:', defaultContext);
        console.log('[useChat] All selected patient IDs:', allSelectedPatientIds);
        console.log('[useChat] Primary patient ID:', primaryPatientId);
        
        // Send patientIds array for multi-patient support - ALL selected patients
        const patientIdsArray = allSelectedPatientIds.length > 0 ? allSelectedPatientIds : undefined;
        
        console.log('[useChat] Creating session with patientIds array:', patientIdsArray);
        
        const sessionId = await createChatSession(patientId, title, defaultContext, patientIdsArray);
        
        // Add new session optimistically to history to prevent UI flash/flutter
        // This avoids the visual flicker caused by reloading all sessions immediately
        const nowIso = new Date().toISOString();
        const newHistoryItem: ConversationHistoryItem = {
          id: sessionId,
          createdAt: nowIso,
          title: title || `Consulta ${new Date().toLocaleDateString('pt-BR')}`,
          c_status: 'OPEN',
        };
        
        // Use startTransition to mark non-urgent updates and prevent UI flash
        startTransition(() => {
          setHistory((prev) => {
            // Add new session at the beginning (most recent first)
            const updated = [newHistoryItem, ...prev];
            return updated;
          });
          
          // Also add to sessions list optimistically
          const newSession: ChatSessionSummary = {
            id: sessionId,
            title: title || `Consulta ${new Date().toLocaleDateString('pt-BR')}`,
            patientId: patientId,
            status: 'OPEN',
            defaultMode: mode,
            defaultReferenceScope: 'GLOBAL_DOCTOR',
            lastActivityAt: nowIso,
            defaultContext,
          };
          
          setSessions((prev) => [newSession, ...prev]);
        });
        
        // Don't reload sessions immediately - optimistic update is sufficient
        // Reload will happen naturally on next explicit load or when needed
        // This prevents UI flash/flutter when creating new sessions
        
        return sessionId;
      } catch (err) {
        console.error('[useChat] Error creating session:', err);
        throw err;
      }
    },
    [chatContext, loadSessions, selectedPatientDocumentUuids, selectedReferenceDocumentUuids, chatContextPatientIds]
  );

  // Load messages for a specific session from backend
  // Returns the session info so context can be restored
  const loadConversation = useCallback(
    async (sessionId: string): Promise<ChatSessionSummary | null> => {
      // Find session in local state first (fallback)
      const localSession = sessions.find(s => s.id === sessionId);
      
      // Try to load full session data from backend (includes defaultContext with documents)
      // NOTE: This endpoint may not exist - if it fails, use session from listChatSessions which may already have defaultContext
      let fullSession: ChatSessionSummary | null = null;
      try {
        fullSession = await getChatSession(sessionId);
        console.log('[useChat] Loaded full session data from GET endpoint:', {
          sessionId,
          title: fullSession.title,
          defaultMode: fullSession.defaultMode,
          hasDefaultContext: !!fullSession.defaultContext,
          patientDocumentUuids: fullSession.defaultContext?.patientDocumentUuids?.length || 0,
          referenceDocumentUuids: fullSession.defaultContext?.referenceDocumentUuids?.length || 0,
        });
      } catch (err) {
        // Check if it's a 404 error (session doesn't exist)
        const isNotFoundError = err instanceof Error && (
          err.message === 'SESSION_NOT_FOUND' ||
          (err as any).code === 'SESSION_NOT_FOUND' ||
          (err as any).isNotFound === true ||
          err.message.includes('Sessão não encontrada')
        );
        
        if (isNotFoundError) {
          // Session doesn't exist - mark as ghost session
          console.warn('[useChat] Session not found (404) - ghost session:', sessionId);
          fullSession = null; // Explicitly set to null to trigger ghost session cleanup
        } else if (err instanceof Error && err.message === 'GET_SESSION_ENDPOINT_NOT_FOUND') {
          // Endpoint doesn't exist - use session from listChatSessions
          console.log('[useChat] GET /chat/sessions/{id} endpoint not available, using session from list:', sessionId);
          fullSession = localSession || null;
          
          if (fullSession?.defaultContext) {
            console.log('[useChat] Local session has defaultContext:', {
              patientDocumentUuids: fullSession.defaultContext.patientDocumentUuids?.length || 0,
              referenceDocumentUuids: fullSession.defaultContext.referenceDocumentUuids?.length || 0,
            });
          }
        } else {
          // Other error - try to use local session as fallback
          console.warn('[useChat] Could not load full session data, using local session:', err);
          fullSession = localSession || null;
        }
      }
      
      // Check if session exists - if getChatSession failed with 404 AND localSession is null, session doesn't exist
      const sessionDoesNotExist = !fullSession && !localSession;
      
      if (sessionDoesNotExist) {
        // Session doesn't exist in backend or local state - it's a ghost session
        console.warn('[useChat] Session does not exist (ghost session):', sessionId);
        
        // Remove from local state (clean up ghost session)
        setHistory(prev => {
          const filtered = prev.filter(item => item.id !== sessionId);
          if (filtered.length !== prev.length) {
            console.log('[useChat] Removed ghost session from history:', sessionId);
          }
          return filtered;
        });
        setSessions(prev => {
          const filtered = prev.filter(s => s.id !== sessionId);
          if (filtered.length !== prev.length) {
            console.log('[useChat] Removed ghost session from sessions list:', sessionId);
          }
          return filtered;
        });
        
        // Clear cached messages
        delete conversationsRef.current[sessionId];
        
        // Don't set as active - return null to indicate failure
        return null;
      }
      
      // Always try to load message history from backend (this is critical)
      try {
        const backendMessages = await getChatMessages(sessionId);
        
        if (backendMessages.length > 0) {
          // Use backend messages
          setMessages(backendMessages);
          // Cache them
          conversationsRef.current[sessionId] = backendMessages;
          
          // Extract metadata from last USER message for context restoration
          // Find the last USER message and extract its metadata
          const lastUserMessage = [...backendMessages]
            .reverse()
            .find(msg => msg.role === 'user' && msg.metadata);
          
          if (lastUserMessage?.metadata) {
            lastUserMessageMetadataRef.current[sessionId] = lastUserMessage.metadata;
            console.log('[useChat] Extracted metadata from last USER message:', {
              sessionId,
              selectedReferenceDocumentUuids: lastUserMessage.metadata.selectedReferenceDocumentUuids?.length || 0,
              selectedPatientDocumentUuids: lastUserMessage.metadata.selectedPatientDocumentUuids?.length || 0,
            });
          } else {
            // Clear metadata if no USER message with metadata found
            lastUserMessageMetadataRef.current[sessionId] = null;
          }
        } else {
          // Check if we have cached messages (for new sessions)
          const cachedMessages = conversationsRef.current[sessionId];
          if (cachedMessages) {
            setMessages(cachedMessages);
            
            // Extract metadata from cached messages too
            const lastUserMessage = [...cachedMessages]
              .reverse()
              .find(msg => msg.role === 'user' && msg.metadata);
            
            if (lastUserMessage?.metadata) {
              lastUserMessageMetadataRef.current[sessionId] = lastUserMessage.metadata;
            } else {
              lastUserMessageMetadataRef.current[sessionId] = null;
            }
          } else {
            // Start with empty array for new sessions
            setMessages([]);
            lastUserMessageMetadataRef.current[sessionId] = null;
          }
        }
      } catch (err) {
        // Check if it's a 404 - session doesn't exist
        const isNotFoundError = err instanceof Error && (
          err.message.includes('404') || 
          err.message.includes('Not Found') ||
          err.message.includes('SESSION_NOT_FOUND')
        );
        
        if (isNotFoundError) {
          console.warn('[useChat] Session not found when loading messages (ghost session):', sessionId);
          
          // Remove from local state (clean up ghost session)
          setHistory(prev => {
            const filtered = prev.filter(item => item.id !== sessionId);
            if (filtered.length !== prev.length) {
              console.log('[useChat] Removed ghost session from history (from messages error):', sessionId);
            }
            return filtered;
          });
          setSessions(prev => {
            const filtered = prev.filter(s => s.id !== sessionId);
            if (filtered.length !== prev.length) {
              console.log('[useChat] Removed ghost session from sessions list (from messages error):', sessionId);
            }
            return filtered;
          });
          
          // Clear cached messages
          delete conversationsRef.current[sessionId];
          
          // Don't set as active - return null to indicate failure
          return null;
        }
        
        console.error('[useChat] Error loading messages:', err);
        // Fallback to cached messages or empty array
        const cachedMessages = conversationsRef.current[sessionId];
        setMessages(cachedMessages || []);
      }
      
      // Set active conversation ID (this is critical for UI)
      setActiveConversationId(sessionId);
      
      // Load session patients and documents in background (non-blocking) to prevent UI flash
      // These are not critical for immediate display, so we defer them
      startTransition(() => {
        // Load session patients for multi-patient display
        // Call GET /chat/sessions/{sessionId}/patients on session change
        getSessionPatients(sessionId).then((patients) => {
          console.log('[useChat] Loaded session patients:', {
            sessionId,
            patientCount: patients.length,
            patients: patients.map(p => ({ id: p.id, fullName: p.fullName }))
          });
          setSessionPatients(patients);
        }).catch((err) => {
          console.error('[useChat] Error loading session patients:', err);
          setSessionPatients([]);
        });
        
        // Load session documents (documents actually used in this session)
        // IMPORTANT: Pass current patient context to get correctly filtered documents
        // - No patient selected → pass null (gets all docs: patient + refs)
        // - Patient selected → pass patient ID (gets only that patient's docs)
        const currentPatientId = chatContextPatientIds.length > 0 ? chatContextPatientIds[0] : null;
        getSessionDocuments(sessionId, currentPatientId).then((docs) => {
          console.log('[useChat] Loaded session documents:', {
            sessionId,
            patientContext: currentPatientId || 'no patient (global view)',
            totalDocs: docs.length,
            patientDocs: docs.filter(d => d.patientId !== null).length,
            refDocs: docs.filter(d => d.patientId === null).length,
          });
          
          // Store with context key to avoid mixing different contexts
          const contextKey = `${sessionId}:${currentPatientId || 'null'}`;
          setSessionDocuments((prev) => {
            // Clear any documents for this session that were loaded with different context
            const cleaned = Object.fromEntries(
              Object.entries(prev).filter(([key]) => !key.startsWith(`${sessionId}:`))
            );
            return {
              ...cleaned,
              [contextKey]: docs,
            };
          });
          
          // Remember the context used for this session
          sessionDocumentsContextRef.current[sessionId] = currentPatientId;
        }).catch((err) => {
          console.error('[useChat] Error loading session documents:', err);
          // Don't set empty array - keep previous documents if available
        });
      });
      
      // Compute context highlights from retrievalSummary (which documents were actually used)
      const session = fullSession || localSession;
      if (session) {
        const retrieval = session.retrievalSummary ?? {
          patientDocuments: [],
          referenceDocuments: [],
        };
        
        // Extract unique patient IDs from patient documents
        const usedPatientIds = Array.from(new Set(
          retrieval.patientDocuments
            .map((d) => d.patientId)
            .filter((id): id is string => !!id)
        ));
        
        // Extract document UUIDs
        const usedPatientDocumentUuids = Array.from(new Set(
          retrieval.patientDocuments.map((d) => d.documentId)
        ));
        
        const usedReferenceDocumentUuids = Array.from(new Set(
          retrieval.referenceDocuments.map((d) => d.documentId)
        ));
        
        // Store highlights for this session
        setSessionContextHighlights((prev) => ({
          ...prev,
          [session.id]: {
            usedPatientIds,
            usedPatientDocumentUuids,
            usedReferenceDocumentUuids,
          },
        }));
        
        console.log('[useChat] Computed context highlights:', {
          sessionId: session.id,
          usedPatientIds,
          usedPatientDocumentUuids,
          usedReferenceDocumentUuids,
        });
      }
      
      // Return full session info with defaultContext so context can be restored
      // Prefer fullSession from backend, fallback to localSession
      return fullSession || localSession || null;
    },
    [sessions, chatContextPatientIds] // Include chatContextPatientIds to re-fetch when patient context changes
  );

  // Archive current conversation (clear UI state, keep session on backend)
  const archiveCurrentConversation = useCallback(() => {
    setMessages([]);
    setError(null);
    setIsLoading(false);
    setActiveConversationId(null);
    setSessionPatients([]); // Clear session patients when archiving
  }, []);

  // Delete a chat session
  const deleteConversation = useCallback(
    async (sessionId: string) => {
      try {
        await deleteChatSession(sessionId);
        
        // Clear messages if this was the active conversation
        if (activeConversationId === sessionId) {
          setMessages([]);
          setActiveConversationId(null);
        }
        
        // Clear cached messages
        delete conversationsRef.current[sessionId];
        
        // Reload ALL sessions (no filter) from backend to ensure history stays in sync with database
        // This ensures all historic chats remain visible after deletion
        const reloadedSessions = await loadSessions(null);
        
        // After reload, select another session if the deleted one was active
        if (activeConversationId === sessionId) {
          // Use the reloaded sessions to select next session
          if (reloadedSessions.length > 0) {
            const first = reloadedSessions[0];
            setActiveConversationId(first.id);
            await loadConversation(first.id);
          } else {
            setActiveConversationId(null);
          }
        }
      } catch (err) {
        console.error('[useChat] Error deleting session:', err);
        setError(err instanceof Error ? err : new Error('Erro ao deletar sessão'));
      }
    },
    [activeConversationId, sessions, loadConversation, getPatientId, loadSessions]
  );

  // Update conversation title - now calls backend API
  const updateConversationTitle = useCallback(
    async (conversationId: string, newTitle: string) => {
      const trimmed = newTitle.trim();
      if (!trimmed) return;

      const normalized =
        trimmed.length > 60 ? `${trimmed.slice(0, 57)}...` : trimmed;

      try {
        // Update on backend
        const updated = await renameChatSession(conversationId, normalized);
        
        // Update local state optimistically - this preserves all existing chats in history
        setHistory((prev) =>
          prev.map((item) =>
            item.id === conversationId ? { ...item, title: updated.title } : item
          )
        );
        
        // Update sessions list
        setSessions((prev) =>
          prev.map((s) => (s.id === conversationId ? updated : s))
        );
        
        console.log('[useChat] Optimistically updated title for session:', {
          sessionId: conversationId,
          newTitle: updated.title,
          note: 'Skipping reload to preserve all visible chats'
        });
        
        // NOTE: We skip the session reload to prevent filtering issues
        // The optimistic update is sufficient and preserves all visible chats
        // The backend has already been updated, so we're in sync
      } catch (err) {
        console.error('[useChat] Error renaming session:', err);
        // Still update UI optimistically
        setHistory((prev) =>
          prev.map((item) =>
            item.id === conversationId ? { ...item, title: normalized } : item
          )
        );
      }
    },
    []
  );

  // Send a message to the active session
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      // Require valid context
      if (!chatContext) {
        setError(new Error('Selecione um paciente ou referência para iniciar a conversa'));
        return;
      }

      const patientId = getPatientId(); // Returns null for REFERENCE mode

      // Ensure we have an active session
      let sessionId = activeConversationId;
      
      if (!sessionId) {
        // Create a new session if none exists
        try {
          setIsLoading(true);
          // Use "Nova conversa" as initial title to allow backend auto-generation
          // Backend will generate title automatically based on first message content
          const title = 'Nova conversa';
          sessionId = await createNewSession(patientId, title);
          setActiveConversationId(sessionId);
        } catch (err) {
          setIsLoading(false);
          setError(err instanceof Error ? err : new Error('Erro ao criar sessão'));
          return;
        }
      }

      // Detect if this is the first message (before adding new messages)
      // This is used to check if we need to fetch auto-generated title after response
      const isFirstMessage = messages.length === 0;
      
      // Create assistant message placeholder for streaming
      const assistantMessageId = `assistant-${Date.now()}`;
      let assistantMessageContent = '';
      let assistantSources: ChatSource[] = [];
      let finalMessageId = '';
      let finalSessionId = sessionId!;

      // Add user message and placeholder assistant message in a single update to prevent flash
      const userMessageId = `user-${Date.now()}`;
      const userMessage: ChatMessage = {
        id: userMessageId,
        content,
        role: 'user',
        timestamp: new Date(),
      };

      const placeholderMessage: ChatMessage = {
        id: assistantMessageId,
        content: '',
        role: 'assistant',
        timestamp: new Date(),
        sources: [],
      };

      // Single update to prevent multiple re-renders
      setMessages((prev) => {
        const updated = [...prev, userMessage, placeholderMessage];
        // Cache the conversation
        conversationsRef.current[sessionId!] = updated;
        return updated;
      });

      setIsLoading(true);
      setError(null);

      try {
        // Build context payload - ALWAYS send context in every message
        // This ensures backend never needs to fall back to default_mode
        // Use canonical model with separate patientDocumentUuids and referenceDocumentUuids
        
        console.log('[useChat] sendMessage - chatContext:', chatContext);
        console.log('[useChat] sendMessage - chatContext?.mode:', chatContext?.mode);
        
        const selectedPatientId = chatContext?.mode === 'PATIENT' ? chatContext.patient_id : null;
        const hasPatientDocs = selectedPatientDocumentUuids.length > 0;
        const hasReferenceDocs = selectedReferenceDocumentUuids.length > 0;
        
        console.log('[useChat] sendMessage - selectedPatientId:', selectedPatientId);
        console.log('[useChat] sendMessage - patient docs:', selectedPatientDocumentUuids);
        console.log('[useChat] sendMessage - reference docs:', selectedReferenceDocumentUuids);
        
        // Determine mode: PATIENT_ONLY, REFERENCES_ONLY, or PATIENT_AND_REFERENCES
        let mode: ChatContextMode;
        if (selectedPatientId && hasReferenceDocs) {
          mode = 'PATIENT_AND_REFERENCES';
        } else if (selectedPatientId) {
          mode = 'PATIENT_ONLY';
        } else {
          mode = 'REFERENCES_ONLY';
        }
        
        const contextPayload: MedChatContextPayload = {
          mode,
          patientId: selectedPatientId ?? undefined,
          patientDocumentUuids: hasPatientDocs ? selectedPatientDocumentUuids : undefined,
          // Only include referenceScope for modes that use references
          ...(mode === 'REFERENCES_ONLY' || mode === 'PATIENT_AND_REFERENCES' 
            ? { referenceScope: 'GLOBAL_DOCTOR' as const } 
            : {}),
          referenceDocumentUuids: hasReferenceDocs ? selectedReferenceDocumentUuids : undefined,
        };

        console.log('[useChat] Sending message with context (streaming):', contextPayload);

        // Send message with streaming
        // Build metadata with selected document UUIDs for context persistence
        const messageMetadata = {
          selectedReferenceDocumentUuids: selectedReferenceDocumentUuids.length > 0 ? selectedReferenceDocumentUuids : undefined,
          selectedPatientDocumentUuids: selectedPatientDocumentUuids.length > 0 ? selectedPatientDocumentUuids : undefined,
        };
        
        await sendChatMessageStream(
          sessionId!,
          content,
          contextPayload,
          {
            onContent: (chunk: string) => {
              // Update assistant message content incrementally
              console.log('[useChat] Received content chunk, length:', chunk.length, 'Total so far:', assistantMessageContent.length + chunk.length);
              assistantMessageContent += chunk;
              setMessages((prev) => {
                const updated = prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? {
                        ...msg,
                        content: assistantMessageContent,
                        sources: assistantSources,
                      }
                    : msg
                );
                conversationsRef.current[sessionId!] = updated;
                return updated;
              });
            },
            onSources: (sources: ChatSource[]) => {
              // Update sources when received
              assistantSources = sources;
              setMessages((prev) => {
                const updated = prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? {
                        ...msg,
                        content: assistantMessageContent,
                        sources: assistantSources,
                      }
                    : msg
                );
                conversationsRef.current[sessionId!] = updated;
                return updated;
              });
            },
            onDone: (messageId: string, sessionIdFromResponse: string) => {
              finalMessageId = messageId || assistantMessageId;
              finalSessionId = sessionIdFromResponse || sessionId!;
              
              // Final update with messageId if different
              setMessages((prev) => {
                const updated = prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? {
                        ...msg,
                        id: finalMessageId,
                        content: assistantMessageContent,
                        sources: assistantSources,
                      }
                    : msg
                );
                conversationsRef.current[finalSessionId] = updated;
                return updated;
              });

              // Update history optimistically with new lastActivityAt for this session
              // This prevents other chats from disappearing when timestamp updates
              // We do an optimistic update instead of reloading to preserve all visible chats
              const nowIso = new Date().toISOString();
              
              // Update history optimistically - use startTransition to prevent UI flash
              startTransition(() => {
                setHistory((prev) => {
                  // Only update if the session exists in history
                  const sessionExists = prev.some(item => item.id === finalSessionId);
                  if (!sessionExists) {
                    console.warn('[useChat] Session not found in history for optimistic update:', finalSessionId);
                    return prev;
                  }
                  
                  const updated = prev.map((item) =>
                    item.id === finalSessionId
                      ? { ...item, createdAt: nowIso }
                      : item
                  );
                  // Re-sort by lastActivityAt (most recent first)
                  return updated.sort((a, b) => {
                    const dateA = new Date(a.createdAt).getTime();
                    const dateB = new Date(b.createdAt).getTime();
                    return dateB - dateA;
                  });
                });
                
                // Also update the session in sessions list
                setSessions((prev) =>
                  prev.map((s) =>
                    s.id === finalSessionId
                      ? { ...s, lastActivityAt: nowIso }
                      : s
                  )
                );
              });
              
              console.log('[useChat] Optimistically updated history timestamp for session:', {
                sessionId: finalSessionId,
                newTimestamp: nowIso,
                note: 'Skipping background reload to preserve all visible chats'
              });
              
              // NEW: If this was the first message, fetch updated title from backend
              // Backend auto-generates title based on first message content
              if (isFirstMessage) {
                // Fetch updated session to get auto-generated title
                // Do this in background to avoid blocking UI
                getChatSession(finalSessionId)
                  .then((updatedSession) => {
                    // Check if title was auto-generated (not "Nova conversa" and different from original)
                    const currentSession = sessions.find(s => s.id === finalSessionId);
                    const originalTitle = currentSession?.title || 'Nova conversa';
                    const newTitle = updatedSession.title;
                    
                    // Only update if title changed and is not the default
                    if (newTitle && newTitle !== originalTitle && newTitle !== 'Nova conversa') {
                      console.log('[useChat] Auto-generated title detected:', {
                        sessionId: finalSessionId,
                        originalTitle,
                        newTitle,
                      });
                      
                      // Update title in history and sessions list
                      startTransition(() => {
                        setHistory((prev) =>
                          prev.map((item) =>
                            item.id === finalSessionId
                              ? { ...item, title: newTitle }
                              : item
                          )
                        );
                        
                        setSessions((prev) =>
                          prev.map((s) =>
                            s.id === finalSessionId
                              ? { ...s, title: newTitle }
                              : s
                          )
                        );
                      });
                    }
                  })
                  .catch((err) => {
                    // Silently fail - title update is optional enhancement
                    console.warn('[useChat] Could not fetch auto-generated title:', err);
                  });
              }
              
              // NOTE: We skip the background reload to prevent filtering issues
              // The optimistic update is sufficient and preserves all visible chats
              // The backend timestamp will be correct, and we'll sync on next explicit load
            },
            onError: (error: Error) => {
              console.error('[useChat] Streaming error:', error);
              setError(error);
              
              // Remove user message on error
              setMessages((prev) => {
                const filtered = prev.filter((msg) => msg.id !== userMessageId && msg.id !== assistantMessageId);
                conversationsRef.current[sessionId!] = filtered;
                return filtered;
              });
              
              // Show error as assistant message
              setMessages((prev) => [
                ...prev,
                {
                  id: `error-${Date.now()}`,
                  content: `Houve um erro ao gerar a resposta: ${error.message}`,
                  role: 'assistant',
                  timestamp: new Date(),
                },
              ]);
            },
          },
          messageMetadata // Pass metadata for context persistence
        );
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Erro ao enviar mensagem');
        setError(error);
        
        // Remove user message and placeholder on error
        setMessages((prev) => {
          const filtered = prev.filter((msg) => msg.id !== userMessageId && msg.id !== assistantMessageId);
          conversationsRef.current[sessionId!] = filtered;
          return filtered;
        });
        
        // Show error as assistant message
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            content: `Houve um erro ao gerar a resposta: ${error.message}`,
            role: 'assistant',
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [chatContext, getPatientId, activeConversationId, createNewSession, loadSessions, selectedPatientDocumentUuids, selectedReferenceDocumentUuids, messages, sessions]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  // Function to set flag that context is being restored from a chat selection
  // This prevents reloading sessions (which would filter them) when restoring context
  const setRestoringContextFromChat = useCallback((isRestoring: boolean) => {
    isRestoringContextFromChatRef.current = isRestoring;
  }, []);

  // Function to fetch session documents with current patient context
  // This ensures documents are fetched with the correct context (patient or global)
  const fetchSessionDocuments = useCallback(async (
    sessionId: string,
    patientId: string | null
  ): Promise<SessionDocument[]> => {
    try {
      const docs = await getSessionDocuments(sessionId, patientId);
      const contextKey = `${sessionId}:${patientId || 'null'}`;
      
      // Store with context key - clear any documents for this session with different context
      setSessionDocuments((prev) => {
        const cleaned = Object.fromEntries(
          Object.entries(prev).filter(([key]) => !key.startsWith(`${sessionId}:`))
        );
        return {
          ...cleaned,
          [contextKey]: docs,
        };
      });
      
      sessionDocumentsContextRef.current[sessionId] = patientId;
      
      return docs;
    } catch (err) {
      console.error('[useChat] Error fetching session documents:', err);
      return [];
    }
  }, []);

  // Helper to get session documents for current context
  const getSessionDocumentsForContext = useCallback((
    sessionId: string | null,
    patientId: string | null
  ): SessionDocument[] => {
    if (!sessionId) return [];
    const contextKey = `${sessionId}:${patientId || 'null'}`;
    return sessionDocuments[contextKey] || [];
  }, [sessionDocuments]);

  // Helper to get last user message metadata for context restoration
  const getLastUserMessageMetadata = useCallback((
    sessionId: string | null
  ): MessageMetadata | null => {
    if (!sessionId) return null;
    return lastUserMessageMetadataRef.current[sessionId] || null;
  }, []);

  return {
    messages,
    isLoading,
    error,
    history,
    activeConversationId,
    sessionPatients, // Expose session patients for display in chat header
    sendMessage,
    clearMessages,
    archiveCurrentConversation,
    loadConversation,
    updateConversationTitle,
    deleteConversation, // New function for deleting sessions
    setRestoringContextFromChat, // Expose function to prevent session reload when restoring context
    // Expose context highlights for showing which documents were actually used
    sessionContextHighlights,
    // Expose session documents for filtering context modal
    sessionDocuments,
    // NEW: Function to fetch session documents with patient context
    fetchSessionDocuments,
    // NEW: Helper to get session documents for current context
    getSessionDocumentsForContext,
    // NEW: Helper to get last user message metadata for context restoration
    getLastUserMessageMetadata,
    // Expose context requirement for UI - context is valid if it's not null
    // hasValidContext: true if either:
    // 1. chatContext is set (user selected patient/reference), OR
    // 2. activeConversationId is set (chat selected from history, which has its own context)
    hasValidContext: chatContext !== null || activeConversationId !== null,
  };
};
