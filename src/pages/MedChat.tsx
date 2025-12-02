import React, { useState, useEffect, useRef, useMemo } from 'react';
import ClaudeChatInput from '../components/ui/claude-style-ai-input';
import { useChat, type SessionContextHighlight } from '../hooks/useChat';
import { Bot, Stethoscope, Copy, MessagesSquare, FileText, AlertCircle } from 'lucide-react';
import { usePatients } from '../context/usePatients';
import RightBar from '../components/RightBar';
import { useOverlay } from '../context/OverlayContext';
import type { ChatContext } from '../lib/medChatApi';

// Context cache interface for storing complete context per session
interface SessionContext {
  patientIds: string[];
  isReferencesMode: boolean;
  patientDocumentUuids: string[];
  referenceDocumentUuids: string[];
}

const MedChat: React.FC = () => {
  const { patients } = usePatients();
  // Separate chat context state - independent from patient editing selection
  // Support for multiple patients
  const [chatContextPatientIds, setChatContextPatientIds] = useState<string[]>([]);
  // Legacy: keep single patient ID for backward compatibility (derived from array)
  const chatContextPatientId = chatContextPatientIds.length > 0 ? chatContextPatientIds[0] : null;
  const [isReferencesModeSelected, setIsReferencesModeSelected] = useState(false);
  // Separate tracking for patient vs reference document selections
  const [selectedPatientDocumentUuids, setSelectedPatientDocumentUuids] = useState<string[]>([]);
  const [selectedReferenceDocumentUuids, setSelectedReferenceDocumentUuids] = useState<string[]>([]);
  
  // Cache context per session to restore when switching between chats
  const sessionContextCacheRef = useRef<Record<string, SessionContext>>({});
  
  // Determine chat context: PATIENT mode if patient selected, REFERENCE mode if explicitly set, null otherwise
  const chatContext: ChatContext | null = useMemo(() => {
    // If patients are selected for chat context, use PATIENT mode (use first as primary for compatibility)
    if (chatContextPatientIds.length > 0) {
      return {
        mode: 'PATIENT' as const,
        patient_id: chatContextPatientIds[0], // Primary patient for backward compatibility
      };
    }
    // If references mode is explicitly selected (via context popup), use REFERENCE mode
    if (isReferencesModeSelected) {
      return {
        mode: 'REFERENCE' as const,
        reference_slug: 'GLOBAL_DOCTOR', // Default reference scope
      };
    }
    // If no context selected, return null (chat bar will be disabled)
    return null;
  }, [chatContextPatientIds, isReferencesModeSelected]);
  
  // Reset references mode when patients are selected for chat context
  useEffect(() => {
    if (chatContextPatientIds.length > 0) {
      setIsReferencesModeSelected(false);
    }
  }, [chatContextPatientIds]);

  const {
    messages,
    isLoading,
    error,
    history,
    activeConversationId,
    sessionPatients,
    sendMessage,
    archiveCurrentConversation,
    loadConversation,
    updateConversationTitle,
    deleteConversation,
    setRestoringContextFromChat,
    sessionContextHighlights,
    sessionDocuments,
    fetchSessionDocuments,
    getSessionDocumentsForContext,
    getLastUserMessageMetadata,
    hasValidContext,
  } = useChat(chatContext, selectedPatientDocumentUuids, selectedReferenceDocumentUuids, chatContextPatientIds);
  
  // Save context to cache whenever it changes (for the active session)
  // Must be after useChat hook so activeConversationId is available
  useEffect(() => {
    if (activeConversationId) {
      sessionContextCacheRef.current[activeConversationId] = {
        patientIds: [...chatContextPatientIds],
        isReferencesMode: isReferencesModeSelected,
        patientDocumentUuids: [...selectedPatientDocumentUuids],
        referenceDocumentUuids: [...selectedReferenceDocumentUuids],
      };
      console.log('[MedChat] Saved context to cache for session:', activeConversationId, {
        patientIds: chatContextPatientIds,
        isReferencesMode: isReferencesModeSelected,
        patientDocumentUuids: selectedPatientDocumentUuids,
        referenceDocumentUuids: selectedReferenceDocumentUuids,
      });
    }
  }, [activeConversationId, chatContextPatientIds, isReferencesModeSelected, selectedPatientDocumentUuids, selectedReferenceDocumentUuids]);
  
  // Track previous activeConversationId to detect when it changes from a value to null (archiving)
  const prevActiveConversationIdRef = useRef<string | null>(null);
  
  // Clear context when session is archived (activeConversationId changes from value to null)
  // Don't clear on initial mount (when prevActiveConversationIdRef.current is null and activeConversationId is null)
  useEffect(() => {
    const prevId = prevActiveConversationIdRef.current;
    const currentId = activeConversationId;
    
    // Only clear if we had an active session and now we don't (archived)
    if (prevId !== null && currentId === null) {
      // Clear context when session is archived
      setChatContextPatientIds([]);
      setIsReferencesModeSelected(false);
      setSelectedPatientDocumentUuids([]);
      setSelectedReferenceDocumentUuids([]);
      console.log('[MedChat] Cleared context - session archived');
    }
    
    // Update ref for next comparison
    prevActiveConversationIdRef.current = currentId;
  }, [activeConversationId]);
  
  const [showHistory, setShowHistory] = useState(false); // controla largura da barra
  
  // State persistence key for sessionStorage
  const STATE_STORAGE_KEY = 'medchat_state';
  
  // Interface for persisted state
  interface PersistedMedChatState {
    activeConversationId: string | null;
    chatContextPatientIds: string[];
    isReferencesModeSelected: boolean;
    selectedPatientDocumentUuids: string[];
    selectedReferenceDocumentUuids: string[];
    showHistory: boolean;
  }
  
  // Load persisted state on mount (only once)
  const hasRestoredStateRef = useRef(false);
  useEffect(() => {
    if (hasRestoredStateRef.current) return; // Only restore once
    hasRestoredStateRef.current = true;
    
    try {
      const savedState = sessionStorage.getItem(STATE_STORAGE_KEY);
      if (savedState) {
        const parsed: PersistedMedChatState = JSON.parse(savedState);
        console.log('[MedChat] Restoring state from sessionStorage:', parsed);
        
        // Restore state
        if (parsed.chatContextPatientIds && parsed.chatContextPatientIds.length > 0) {
          setChatContextPatientIds(parsed.chatContextPatientIds);
        }
        if (parsed.isReferencesModeSelected !== undefined) {
          setIsReferencesModeSelected(parsed.isReferencesModeSelected);
        }
        if (parsed.selectedPatientDocumentUuids) {
          setSelectedPatientDocumentUuids(parsed.selectedPatientDocumentUuids);
        }
        if (parsed.selectedReferenceDocumentUuids) {
          setSelectedReferenceDocumentUuids(parsed.selectedReferenceDocumentUuids);
        }
        if (parsed.showHistory !== undefined) {
          setShowHistory(parsed.showHistory);
        }
        
        // Restore active conversation after a short delay to ensure useChat is ready
        if (parsed.activeConversationId) {
          setTimeout(() => {
            loadConversation(parsed.activeConversationId!).catch((err) => {
              console.warn('[MedChat] Could not restore conversation:', err);
            });
          }, 200);
        }
      } else {
        // No saved state - this is the first access after login or page refresh
        // Start fresh with welcome screen (no conversation, no context)
        console.log('[MedChat] No saved state found - starting fresh with welcome screen');
      }
    } catch (err) {
      console.warn('[MedChat] Error loading persisted state:', err);
    }
  }, [loadConversation]); // Only depend on loadConversation
  
  // Save state to sessionStorage whenever it changes
  useEffect(() => {
    const stateToSave: PersistedMedChatState = {
      activeConversationId,
      chatContextPatientIds,
      isReferencesModeSelected,
      selectedPatientDocumentUuids,
      selectedReferenceDocumentUuids,
      showHistory,
    };
    
    try {
      sessionStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(stateToSave));
      console.log('[MedChat] Saved state to sessionStorage');
    } catch (err) {
      console.warn('[MedChat] Error saving state:', err);
    }
  }, [activeConversationId, chatContextPatientIds, isReferencesModeSelected, selectedPatientDocumentUuids, selectedReferenceDocumentUuids, showHistory]);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLParagraphElement | null>(null);
  const { hasOverlay } = useOverlay();
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);
  const [isTitleCompact, setIsTitleCompact] = useState(false);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Show notification to user
  const showNotification = (message: string, type: 'error' | 'info' = 'error') => {
    const bgColor = type === 'error' ? 'bg-red-600' : 'bg-blue-600';
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 ${bgColor} text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm font-medium flex items-center gap-3 max-w-md`;
    notification.innerHTML = `
      <span>${message}</span>
      <button onclick="this.parentElement.remove()" class="ml-2 font-bold text-white hover:text-white/80 transition-colors cursor-pointer flex-shrink-0" aria-label="Fechar notificação" style="font-size: 18px; line-height: 1;">×</button>
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
      if (notification.parentElement) {
        notification.parentElement.removeChild(notification);
      }
    }, 5000);
  };

  const handleCopy = async (text: string, key: string) => {
    const value = text ?? '';
    if (!value.trim()) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((current) => (current === key ? null : current));
      }, 2000);
    } catch {
      // silenciosamente ignora falhas de cópia
    }
  };

  // Auto-scroll para o final sempre que houver novas mensagens
  // Use requestAnimationFrame to prevent flash/flutter
  useEffect(() => {
    if (messagesContainerRef.current) {
      const el = messagesContainerRef.current;
      // Use requestAnimationFrame to defer scroll and prevent flash
      requestAnimationFrame(() => {
        if (el) {
          el.scrollTo({
            top: el.scrollHeight,
            behavior: 'smooth',
          });
        }
      });
    }
  }, [messages]);

  // Dados básicos do médico autenticado salvos no localStorage pelo fluxo de login
  let doctorName: string | undefined;
  let doctorTreatment: string | undefined;
  try {
    const storedAuth = localStorage.getItem('oasis_auth_user');
    if (storedAuth) {
      const parsed = JSON.parse(storedAuth) as { doctorName?: string; doctorTreatment?: string };
      doctorName = parsed.doctorName;
      doctorTreatment = parsed.doctorTreatment;
    }
  } catch {
    doctorName = undefined;
  }

  // Helper function to extract first name with treatment from full name
  const getFirstNameWithTreatment = (fullName: string | undefined, treatment: string | undefined): string => {
    if (!fullName) return 'doutor(a)';
    
    // Remove treatment prefix if present (Dr., Dra., etc.) to get clean name
    const nameWithoutTreatment = fullName.replace(/^(Dr\.|Dra\.|Sr\.|Sra\.)\s*/i, '').trim();
    
    // Get first word (first name)
    const firstName = nameWithoutTreatment.split(/\s+/)[0];
    
    if (!firstName) return 'doutor(a)';
    
    // Add treatment if available and not 'Nenhum'
    if (treatment && treatment !== 'Nenhum') {
      return `${treatment} ${firstName}`;
    }
    
    return firstName;
  };

  // Saudação contextual baseada no horário (UTC-3, fuso horário brasileiro)
  const getGreeting = () => {
    // Get current time in Brazilian timezone (America/Sao_Paulo, UTC-3)
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      hour: 'numeric',
      hour12: false,
    });
    const hour = parseInt(formatter.format(now), 10);
    
    // Bom dia: from 0h to 11:59 (till last second) - hour 0 to 11
    if (hour < 12) {
      return 'Bom dia';
    }
    
    // Boa tarde: from 12h to 17:59 (till last second) - hour 12 to 17
    if (hour < 18) {
      return 'Boa tarde';
    }
    
    // Boa noite: from 18h to 23:59 (till last second) - hour 18 to 23
    return 'Boa noite';
  };

  const handleSendMessage = (message: string, _files?: unknown[], _pastedContent?: unknown[]) => {
    // Parameters _files and _pastedContent are required by ClaudeChatInput interface but not used here
    void _files;
    void _pastedContent;
    if (message.trim()) {
      sendMessage(message);
    }
  };

  const handleNewChat = () => {
    // Save current context to cache before clearing (if there's an active session)
    if (activeConversationId) {
      sessionContextCacheRef.current[activeConversationId] = {
        patientIds: [...chatContextPatientIds],
        isReferencesMode: isReferencesModeSelected,
        patientDocumentUuids: [...selectedPatientDocumentUuids],
        referenceDocumentUuids: [...selectedReferenceDocumentUuids],
      };
    }
    
    // Clear current conversation
    archiveCurrentConversation();
    
    // Clear context so user starts from zero and needs to select context again
    setChatContextPatientIds([]);
    setIsReferencesModeSelected(false);
    
    // Clear document selections
    setSelectedPatientDocumentUuids([]);
    setSelectedReferenceDocumentUuids([]);
  };

  const handleToggleHistory = () => {
    // Barra apenas alterna largura; o conteúdo já está sempre pronto em posição final.
    setShowHistory((prev) => !prev);
  };

  const shouldDimFloatingInput = hasOverlay && !isContextModalOpen;

  useEffect(() => {
    const observerTarget = titleRef.current;
    const updateCompactState = () => {
      if (!observerTarget) return;
      setIsTitleCompact(observerTarget.scrollWidth > observerTarget.clientWidth);
    };

    updateCompactState();

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            requestAnimationFrame(updateCompactState);
          })
        : null;

    if (resizeObserver && observerTarget) {
      resizeObserver.observe(observerTarget);
    }

    const handleResize = () => requestAnimationFrame(updateCompactState);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver && observerTarget) {
        resizeObserver.unobserve(observerTarget);
        resizeObserver.disconnect();
      }
    };
  }, [activeConversationId]);

  const showPageSpinner = isLoading && messages.length === 0;

  return (
    <div className="h-full flex flex-col bg-white relative overflow-x-hidden">
      
      {/* Chat Header - quando há mensagens */}
      {messages.length > 0 && (
        <div
          className={`border-b border-slate-100 px-6 py-3 h-16 transition-all duration-300 ${
            showHistory ? 'pr-64' : 'pr-10'
          }`}
        >
          <div className="grid grid-cols-[auto_1fr_auto] items-center h-full gap-2">
            {/* Lado esquerdo: botão Nova conversa */}
            <div className="flex items-center">
              <button
                onClick={handleNewChat}
                className="flex items-center px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition-colors space-x-2"
              >
                <MessagesSquare className="w-4 h-4 flex-shrink-0" />
                <span
                  className="inline-block whitespace-nowrap flex-shrink-0 transition-[opacity,max-width] duration-200"
                  style={{
                    opacity: isTitleCompact ? 0 : 1,
                    maxWidth: isTitleCompact ? 0 : 110,
                  }}
                >
                  Novo chat
                </span>
              </button>
            </div>

            {/* Centro: título da conversa selecionada + patient chips, sempre centralizado na barra */}
            <div className="flex flex-col items-center justify-center pointer-events-none h-full gap-1">
              {(() => {
                if (!activeConversationId) return null;
                const active = history.find(
                  (item) => item.id === activeConversationId
                );
                if (!active) return null;
                return (
                  <>
                    <p
                      ref={titleRef}
                      className={`text-sm font-semibold text-slate-600 text-center leading-snug max-w-full whitespace-nowrap ${
                        isTitleCompact ? 'truncate' : ''
                      }`}
                    >
                      {active.title}
                    </p>
                  </>
                );
              })()}
            </div>

            {/* Lado direito: espaço espelho para manter o título realmente centralizado */}
            <div className="flex items-center justify-end invisible">
              <button
                className={`flex items-center px-3 py-1.5 text-sm rounded-lg ${
                  isTitleCompact ? 'space-x-0' : 'space-x-1'
                }`}
              >
                <MessagesSquare className="w-4 h-4" />
                <span
                  className="hidden md:inline-block overflow-hidden whitespace-nowrap"
                  style={{
                    opacity: isTitleCompact ? 0 : 1,
                    maxWidth: isTitleCompact ? 0 : 120,
                  }}
                >
                  Nova conversa
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {showPageSpinner && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/5 z-30 pointer-events-none mt-[-96px]">
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 border-4 border-white/40 border-t-white rounded-full animate-spin drop-shadow" />
              <p className="text-sm text-slate-200">Carregando página...</p>
            </div>
          </div>
        )}
        {/* Messages / Welcome */}
        {messages.length > 0 ? (
          <div
            ref={messagesContainerRef}
            className={`flex-1 overflow-y-auto px-6 pt-6 pb-32 transition-all duration-300 ${
              showHistory ? 'pr-64' : 'pr-10'
            } ${showPageSpinner ? 'opacity-0' : 'opacity-100'}`}
          >
            <div className="max-w-4xl mx-auto space-y-6">
              {messages
                .filter((message) => {
                  // Filter out empty assistant messages (they will appear once content starts streaming)
                  if (message.role === 'assistant' && !message.content.trim()) {
                    return false;
                  }
                  return true;
                })
                .map((message) => (
                  <div
                    key={message.id}
                    className={`flex items-start space-x-3 ${
                      message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                    } ${
                      message.role === 'user'
                        ? showHistory
                          ? 'mr-8'
                          : 'mr-5'
                        : ''
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        message.role === 'user' ? 'bg-oasis-blue' : 'bg-slate-100'
                      }`}
                    >
                      {message.role === 'user' ? (
                        <Stethoscope className="w-4 h-4 text-white" />
                      ) : (
                        <Bot className="w-4 h-4 text-slate-600" />
                      )}
                    </div>

                    {/* Message + Copy */}
                    <div
                      className={`flex flex-col max-w-[80%] ${
                        message.role === 'user' ? 'items-end' : 'items-start'
                      }`}
                    >
                      <div
                        className={`rounded-2xl px-4 py-3 ${
                          message.role === 'user'
                            ? 'bg-oasis-blue text-white'
                            : 'bg-slate-100 text-slate-900'
                        }`}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {message.content}
                        </p>
                      </div>
                      
                      {/* Sources/Citations for assistant messages */}
                      {message.role === 'assistant' && message.sources && message.sources.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <p className="text-xs text-slate-500 font-medium mb-1">
                            Fontes ({message.sources.length}):
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {message.sources.map((source, idx) => (
                              <div
                                key={`${source.documentId}-${source.chunkIndex}-${idx}`}
                                className="inline-flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded-md text-xs text-slate-600"
                                title={`Documento: ${source.documentId}, Chunk: ${source.chunkIndex}`}
                              >
                                <FileText className="w-3 h-3" />
                                <span>Doc #{source.chunkIndex + 1}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-1 flex items-center relative">
                        <button
                          type="button"
                          className="inline-flex items-center text-slate-400 hover:text-slate-500 transition-colors"
                          onClick={() => handleCopy(message.content, message.id)}
                          aria-label="Copiar mensagem"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        {copiedKey === message.id && (
                          <div
                            className={`pointer-events-none absolute top-1/2 -translate-y-1/2 px-2 py-[2px] rounded-full bg-oasis-blue text-white text-[10px] shadow-sm ${
                              message.role === 'user'
                                ? 'right-full mr-2'
                                : 'left-full ml-2'
                            }`}
                          >
                            Copiado
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

              {/* Typing indicator while waiting for response */}
              {isLoading && (
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-slate-600" />
                  </div>
                  <div className="bg-slate-100 rounded-2xl px-4 py-3">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.1s]"></div>
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Welcome Screen - Estilo Claude PERFEITO */
          <div
            className={`flex-1 flex flex-col items-center justify-center px-6 py-16 transition-all duration-300 ${
              showHistory ? 'pr-64' : 'pr-10'
            } ${showPageSpinner ? 'opacity-0' : 'opacity-100'}`}
          >
            {/* Greeting - EXATO como pedido no feedback */}
            <div className="text-center mb-12 max-w-2xl">
              <h1 className="text-4xl font-light text-slate-800 mb-3">
                {getGreeting()}, {getFirstNameWithTreatment(doctorName, doctorTreatment)}!
              </h1>
              
              {/* Context requirement warning */}
              {!hasValidContext && (
                <div className="mt-8 flex flex-col items-center">
                  <div className="flex items-center gap-2 text-slate-400 mb-2">
                    <AlertCircle className="w-4 h-4" />
                    <p className="text-sm text-slate-500">
                      Selecione um paciente ou uma referência para conversar com o MedChat
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Input Area - Claude Style PERFEITO (flutuante) + aviso */}
      <div
        className="absolute bottom-0 left-0 z-30 px-4 sm:px-6 transition-all duration-300"
        style={{ right: showHistory ? '16rem' : '2.5rem' }}  // 16rem ≈ w-64, 2.5rem ≈ w-10
      >
        <div
          className={`max-w-[57rem] mx-auto flex flex-col gap-0 ${
            shouldDimFloatingInput ? 'opacity-60 pointer-events-none' : ''
          }`}
        >
          <ClaudeChatInput
            onSendMessage={handleSendMessage}
            placeholder={!hasValidContext ? "Selecione um paciente ou referência para iniciar..." : "Como posso te ajudar hoje?"}
            disabled={!hasValidContext}
            disableSend={isLoading || !hasValidContext}
            onContextModalVisibilityChange={setIsContextModalOpen}
            requiresPatient={!hasValidContext}
            onSelectionChange={() => {}} // Not used in MVP - no document selection
            onSelectedPatientDocumentsChange={setSelectedPatientDocumentUuids} // Store selected patient document UUIDs
            onSelectedReferenceDocumentsChange={setSelectedReferenceDocumentUuids} // Store selected reference document UUIDs
            onReferencesModeSelected={setIsReferencesModeSelected} // Callback when references mode is selected
            onChatContextPatientChange={(patientId) => {
              // Legacy: single patient callback - convert to array
              setChatContextPatientIds(patientId ? [patientId] : []);
            }}
            onChatContextPatientsChange={setChatContextPatientIds} // NEW: Callback for multiple patients
            currentChatContextPatientId={chatContextPatientId} // Legacy: single patient for backward compatibility
            currentChatContextPatientIds={chatContextPatientIds} // NEW: multiple patients for modal initialization
            currentSelectedPatientDocumentUuids={selectedPatientDocumentUuids} // NEW: selected patient documents for modal initialization
            currentSelectedReferenceDocumentUuids={selectedReferenceDocumentUuids} // NEW: selected reference documents for modal initialization
            currentIsReferencesModeSelected={isReferencesModeSelected} // NEW: references mode state for modal initialization
            isHistoricChat={!!activeConversationId && messages.length > 0} // Read-only mode for historic chats
            sessionContextHighlight={activeConversationId ? sessionContextHighlights[activeConversationId] : undefined} // Highlight data for showing used documents
            sessionDocuments={activeConversationId ? getSessionDocumentsForContext(activeConversationId, chatContextPatientId) : undefined} // Documents actually used in this session (filtered by current patient context)
            sessionId={activeConversationId} // Current session ID for filtering
            currentPatientId={chatContextPatientId} // Current patient context for fetching documents
            fetchSessionDocuments={fetchSessionDocuments} // Function to fetch documents with patient context
            lastUserMessageMetadata={activeConversationId ? getLastUserMessageMetadata(activeConversationId) : null} // Metadata from last USER message for context restoration
          />
          {error && (
            <p className="text-red-500 text-center mt-2">
              Ocorreu um erro: {error.message}
            </p>
          )}
          <div className="bg-white h-10 flex items-center justify-center">
            <p className="text-xs text-slate-500 italic text-center">
              Sempre confira informações sensíveis retornadas pelo MedChat
            </p>
          </div>
        </div>
      </div>

      <RightBar
        showHistory={showHistory}
        onToggleHistory={handleToggleHistory}
        history={history}
        activeConversationId={activeConversationId}
        onSelectConversation={async (sessionId: string) => {
          // Save current context to cache before switching (if there's an active session)
          if (activeConversationId && activeConversationId !== sessionId) {
            sessionContextCacheRef.current[activeConversationId] = {
              patientIds: [...chatContextPatientIds],
              isReferencesMode: isReferencesModeSelected,
              patientDocumentUuids: [...selectedPatientDocumentUuids],
              referenceDocumentUuids: [...selectedReferenceDocumentUuids],
            };
            console.log('[MedChat] Saved context to cache before switching sessions:', activeConversationId);
          }
          
          // Load the conversation
          const session = await loadConversation(sessionId);
          
          // Check if session doesn't exist (ghost session)
          if (!session) {
            // Session doesn't exist - it's a ghost session
            console.warn('[MedChat] Session does not exist (ghost session):', sessionId);
            
            // Show notification to user
            showNotification('Esta conversa não existe mais e foi removida do histórico.', 'error');
            
            // Clear context
            setChatContextPatientIds([]);
            setIsReferencesModeSelected(false);
            setSelectedPatientDocumentUuids([]);
            setSelectedReferenceDocumentUuids([]);
            
            // Don't proceed with restoration
            return;
          }
          
          // Restore context from cache or session data
          if (session) {
            console.log('[MedChat] Restoring context from session:', {
              sessionId: session.id,
              patientId: session.patientId,
              defaultMode: session.defaultMode,
              title: session.title
            });
            
            // Set flag to prevent session reload (which would filter and hide other sessions)
            setRestoringContextFromChat(true);
            
            // Try to restore from cache first (most accurate - includes documents)
            const cachedContext = sessionContextCacheRef.current[sessionId];
            if (cachedContext) {
              console.log('[MedChat] Restoring context from cache:', cachedContext);
              setChatContextPatientIds(cachedContext.patientIds);
              setIsReferencesModeSelected(cachedContext.isReferencesMode);
              setSelectedPatientDocumentUuids(cachedContext.patientDocumentUuids);
              setSelectedReferenceDocumentUuids(cachedContext.referenceDocumentUuids);
            } else if (session.defaultContext) {
              // Restore from session's defaultContext (from database)
              console.log('[MedChat] Restoring context from session defaultContext:', session.defaultContext);
              
              // Restore patients from defaultContext or sessionPatients
              if (session.defaultContext.patientId) {
                // Use patientId from defaultContext
                setChatContextPatientIds([session.defaultContext.patientId]);
              } else if (sessionPatients.length > 0) {
                // Fallback: use sessionPatients
                const patientIdsFromSession = sessionPatients.map(p => p.id);
                setChatContextPatientIds(patientIdsFromSession);
              } else if (session.patientId) {
                // Legacy: use session.patientId
                setChatContextPatientIds([session.patientId]);
              } else {
                setChatContextPatientIds([]);
              }
              
              // Restore mode
              if (session.defaultContext.mode === 'REFERENCES_ONLY') {
                setIsReferencesModeSelected(true);
              } else if (session.defaultContext.mode === 'PATIENT_AND_REFERENCES') {
                setIsReferencesModeSelected(true);
              } else {
                setIsReferencesModeSelected(false);
              }
              
              // Restore document selections from defaultContext
              setSelectedPatientDocumentUuids(session.defaultContext.patientDocumentUuids || []);
              setSelectedReferenceDocumentUuids(session.defaultContext.referenceDocumentUuids || []);
              
              console.log('[MedChat] Restored documents:', {
                patientDocs: session.defaultContext.patientDocumentUuids?.length || 0,
                referenceDocs: session.defaultContext.referenceDocumentUuids?.length || 0,
              });
            } else {
              // No cache and no defaultContext - restore from session data (fallback)
              console.log('[MedChat] No cache or defaultContext, restoring from session data');
              
              // Restore context based on session's patientId and defaultMode
              // Load session patients to restore all patients (multi-patient support)
              if (sessionPatients.length > 0) {
                // Session has patients - restore all patient IDs
                const patientIdsFromSession = sessionPatients.map(p => p.id);
                setChatContextPatientIds(patientIdsFromSession);
                setIsReferencesModeSelected(false);
              } else if (session.patientId) {
                // Legacy: session has single patient - restore patient context
                setChatContextPatientIds([session.patientId]);
                setIsReferencesModeSelected(false);
              } else if (session.defaultMode === 'REFERENCES_ONLY' || session.defaultMode === 'PATIENT_AND_REFERENCES') {
                // Session is reference-only or uses references - restore reference mode
                setIsReferencesModeSelected(true);
                setChatContextPatientIds([]);
              } else {
                // Default: no patient context
                setChatContextPatientIds([]);
                setIsReferencesModeSelected(false);
              }
              
              // Clear document selections when restoring from session data (no cache, no defaultContext)
              setSelectedPatientDocumentUuids([]);
              setSelectedReferenceDocumentUuids([]);
            }
            
            // Clear the flag after a short delay to allow context update to propagate
            setTimeout(() => {
              setRestoringContextFromChat(false);
            }, 100);
          }
        }}
        onUpdateTitle={updateConversationTitle}
        onDeleteConversation={deleteConversation}
      />
    </div>
  );
};

export default MedChat;
