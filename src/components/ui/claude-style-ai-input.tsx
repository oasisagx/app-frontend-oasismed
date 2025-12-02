"use client";

import type React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  ArrowUp,
  X,
  FileText,
  ImageIcon,
  Video,
  Music,
  Archive,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  Folder,
  // Mic,
} from "lucide-react";
import PulsingMic from './PulsingMic';
import { Button } from "./button";
import { cn } from "../../lib/utils";
import { DocumentData, Folder as FolderType } from "../../types";
import { useOverlay } from "../../context/OverlayContext";
import { listMyPatients, listPatientKnowledgeDocuments, listReferencesMedicas } from "../../lib/storageApi";

// Types
export interface FileWithPreview {
  id: string;
  file: File;
  preview?: string;
  type: string;
  uploadStatus: "pending" | "uploading" | "complete" | "error";
  uploadProgress?: number;
  abortController?: AbortController;
  textContent?: string;
}

export interface PastedContent {
  id: string;
  content: string;
  timestamp: Date;
  wordCount: number;
}

interface ChatInputProps {
  onSendMessage?: (
    message: string,
    files: FileWithPreview[],
    pastedContent: PastedContent[]
  ) => void;
  disabled?: boolean;
  disableSend?: boolean;
  placeholder?: string;
  maxFiles?: number;
  maxFileSize?: number;
  onContextModalVisibilityChange?: (isOpen: boolean) => void;
  requiresPatient?: boolean;
  onSelectionChange?: (hasPatientOrReference: boolean) => void;
  onSelectedDocumentsChange?: (documentUuids: string[]) => void; // Legacy - kept for backward compatibility
  onSelectedPatientDocumentsChange?: (patientDocumentUuids: string[]) => void; // NEW: Separate callback for patient documents
  onSelectedReferenceDocumentsChange?: (referenceDocumentUuids: string[]) => void; // NEW: Separate callback for reference documents
  onReferencesModeSelected?: (isSelected: boolean) => void; // Callback when references mode is selected
  onChatContextPatientChange?: (patientId: string | null) => void; // NEW: Callback when chat context patient changes (independent from patient editing) - LEGACY: single patient
  onChatContextPatientsChange?: (patientIds: string[]) => void; // NEW: Callback for multiple patients selection
  currentChatContextPatientId?: string | null; // NEW: Current chat context patient ID (for initializing modal) - LEGACY: single patient
  currentChatContextPatientIds?: string[]; // NEW: Current chat context patient IDs (for initializing modal with multiple)
  currentSelectedPatientDocumentUuids?: string[]; // NEW: Current selected patient document UUIDs (for initializing modal)
  currentSelectedReferenceDocumentUuids?: string[]; // NEW: Current selected reference document UUIDs (for initializing modal)
  currentIsReferencesModeSelected?: boolean; // NEW: Current references mode state (for initializing modal)
  isHistoricChat?: boolean; // NEW: If true, context modal is read-only (view-only) for historic chats
  sessionContextHighlight?: { // NEW: Highlight data showing which documents were actually used in RAG
    usedPatientIds: string[];
    usedPatientDocumentUuids: string[];
    usedReferenceDocumentUuids: string[];
  };
  sessionDocuments?: Array<{ // NEW: Documents actually used in this session (for filtering)
    id: string; // Document UUID
    title: string;
    patientId: string | null;
    dType: string;
    source?: string;
    dStatus: string;
    createdAt: string;
  }>;
  sessionId?: string | null; // NEW: Current session ID (already exists but adding for clarity)
  currentPatientId?: string | null; // NEW: Current patient context for fetching documents
  fetchSessionDocuments?: (sessionId: string, patientId: string | null) => Promise<Array<{ // NEW: Function to fetch session documents with patient context
    id: string;
    title: string;
    patientId: string | null;
    dType: string;
    source?: string;
    dStatus: string;
    createdAt: string;
  }>>;
  lastUserMessageMetadata?: { // NEW: Metadata from last USER message for context restoration
    selectedReferenceDocumentUuids?: string[];
    selectedPatientDocumentUuids?: string[];
  } | null;
}

// Constants
const MAX_FILES = 10;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// File type helpers
const getFileIcon = (type: string) => {
  if (type.startsWith("image/"))
    return <ImageIcon className="h-4 w-4 text-slate-400" />;
  if (type.startsWith("video/"))
    return <Video className="h-4 w-4 text-slate-400" />;
  if (type.startsWith("audio/"))
    return <Music className="h-4 w-4 text-slate-400" />;
  if (type.includes("zip") || type.includes("rar") || type.includes("tar"))
    return <Archive className="h-4 w-4 text-slate-400" />;
  return <FileText className="h-4 w-4 text-slate-400" />;
};

// File Preview Component
const FilePreviewCard: React.FC<{
  file: FileWithPreview;
  onRemove: (id: string) => void;
}> = ({ file, onRemove }) => {
  const isImage = file.type.startsWith("image/");

  return (
    <div className="relative group bg-slate-50 border border-slate-200 rounded-lg p-3 w-20 h-16 shadow-sm flex-shrink-0 overflow-hidden hover:border-slate-300 transition-colors">
      <div className="flex flex-col items-center justify-center h-full">
        {isImage && file.preview ? (
          <img
            src={file.preview}
            alt={file.file.name}
            className="w-full h-full object-cover rounded"
          />
        ) : (
          <>
            <div className="mb-1">
              {getFileIcon(file.type)}
            </div>
            <span className="text-xs text-slate-600 truncate w-full text-center">
              {file.file.name.split('.').pop()?.toUpperCase()}
            </span>
          </>
        )}
      </div>
      
      <Button
        size="icon"
        variant="ghost"
        className="absolute -top-1 -right-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 bg-white border border-slate-200 shadow-sm hover:bg-slate-50"
        onClick={() => onRemove(file.id)}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
};

// Main ChatInput Component
const ClaudeChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  disabled = false,
  disableSend = false,
  placeholder = "Como posso ajudar?",
  maxFiles = MAX_FILES,
  maxFileSize = MAX_FILE_SIZE,
  onContextModalVisibilityChange,
  requiresPatient: _requiresPatient = false,
  onSelectionChange,
  onSelectedDocumentsChange,
  onSelectedPatientDocumentsChange,
  onSelectedReferenceDocumentsChange,
  onReferencesModeSelected,
  onChatContextPatientChange,
  onChatContextPatientsChange,
  currentChatContextPatientId = null,
  currentChatContextPatientIds = [],
  currentSelectedPatientDocumentUuids = [],
  currentSelectedReferenceDocumentUuids = [],
  currentIsReferencesModeSelected = false,
  isHistoricChat = false, // If true, context modal is read-only (view-only)
  sessionContextHighlight, // Highlight data showing which documents were actually used in RAG
  sessionDocuments, // Documents actually used in this session (for filtering)
  sessionId, // Current session ID
  currentPatientId, // Current patient context for fetching documents
  fetchSessionDocuments, // Function to fetch session documents with patient context
  lastUserMessageMetadata, // Metadata from last USER message for context restoration
}) => {
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showContextModal, setShowContextModal] = useState(false);
  const { registerOverlay, unregisterOverlay } = useOverlay();
  // Note: Patients are loaded dynamically when opening the modal

  useEffect(() => {
    if (!showContextModal) return;
    registerOverlay();
    return () => {
      unregisterOverlay();
    };
  }, [showContextModal, registerOverlay, unregisterOverlay]);

  useEffect(() => {
    onContextModalVisibilityChange?.(showContextModal);
  }, [showContextModal, onContextModalVisibilityChange]);
  const shouldDimInputSurface = showContextModal;

  const closeContextModal = () => {
    setShowContextModal(false);
    onContextModalVisibilityChange?.(false);
    // Reset modal selection state when closing (but don't reset if confirming)
    // Note: We don't reset here if confirming, as the confirm handler will reset it
    // But if closing without confirming, we should reset to avoid stale state
    // Actually, the useEffect will handle resetting when modal opens next time
  };

  const [contextDocuments, setContextDocuments] = useState<DocumentData[]>([]);
  const [contextFolders, setContextFolders] = useState<FolderType[]>([]);
  const [expandedContextFolders, setExpandedContextFolders] = useState<Set<number>>(new Set());
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<Set<number>>(new Set());
  const [patientNamesMap, setPatientNamesMap] = useState<Map<string, string>>(new Map());
  const [selectedPatientIdsInModal, setSelectedPatientIdsInModal] = useState<Set<string>>(new Set()); // Track multiple patient selections in modal
  const [selectedReferencesInModal, setSelectedReferencesInModal] = useState<boolean>(false); // Track references selection in modal

  // Initialize selection state when modal opens - show currently selected chat context patient/reference if any
  useEffect(() => {
    if (showContextModal) {
      console.log('[ClaudeChatInput] Modal opened, initializing selections:', {
        currentChatContextPatientIds,
        currentChatContextPatientId,
        currentIsReferencesModeSelected,
        currentSelectedPatientDocumentUuids: currentSelectedPatientDocumentUuids.length,
        currentSelectedReferenceDocumentUuids: currentSelectedReferenceDocumentUuids.length,
      });
      
      // If patients are already selected for chat context, show them in the modal
      // Prioritize currentChatContextPatientIds (array) over currentChatContextPatientId (single) for multi-patient support
      if (currentChatContextPatientIds && currentChatContextPatientIds.length > 0) {
        console.log('[ClaudeChatInput] Setting patient IDs in modal:', currentChatContextPatientIds);
        setSelectedPatientIdsInModal(new Set(currentChatContextPatientIds));
        setSelectedReferencesInModal(false); // Patient takes precedence
      } else if (currentChatContextPatientId) {
        // Legacy: single patient support
        console.log('[ClaudeChatInput] Setting single patient ID in modal:', currentChatContextPatientId);
        setSelectedPatientIdsInModal(new Set([currentChatContextPatientId]));
        setSelectedReferencesInModal(false); // Patient takes precedence
      } else if (currentIsReferencesModeSelected) {
        // Check if references mode is selected
        console.log('[ClaudeChatInput] Setting references mode in modal');
        setSelectedReferencesInModal(true);
        setSelectedPatientIdsInModal(new Set());
      } else {
        // No default selection - user must explicitly choose patient or references
        console.log('[ClaudeChatInput] No context selected, clearing modal selections');
        setSelectedPatientIdsInModal(new Set());
        setSelectedReferencesInModal(false);
      }
      
      // NOTE: Document selections will be restored by the separate useEffect that handles document restoration
      // We don't clear them here because they need to persist across modal opens for stateful display
    } else {
      // Reset selection state when modal closes
      setSelectedPatientIdsInModal(new Set());
      setSelectedReferencesInModal(false);
      // Don't clear document selections here - let them persist so restoration can work immediately
      // They will be cleared if there are no UUIDs to restore, or restored if UUIDs exist
    }
  }, [showContextModal, currentChatContextPatientId, currentChatContextPatientIds, currentIsReferencesModeSelected]);
  
  // Restore selected documents when documents are loaded and modal is open
  // This runs separately because documents load asynchronously
  // IMPORTANT: For historic chats, we ONLY highlight documents from retrievalSummary (actually used in RAG)
  // For new chats, we restore from selected document UUIDs
  useEffect(() => {
    // Only restore if modal is open
    if (!showContextModal) {
      // Clear selections when modal closes and no context to preserve
      setSelectedDocumentIds(new Set());
      return;
    }
    
    // Wait for documents to be loaded before restoring
    if (contextDocuments.length === 0) {
      console.log('[ClaudeChatInput] Waiting for documents to load before restoring selections...');
      return;
    }
    
    const docIdsToSelect = new Set<number>();
    let foundPatientDocs = 0;
    let foundReferenceDocs = 0;
    
    // For historic chats, use the SAVED context (selected document UUIDs) for checkboxes
    // Use retrievalSummary (docs used in RAG) ONLY for visual highlighting, NOT for selection
    // NEW: Priority: lastUserMessageMetadata > currentSelected*DocumentUuids
    if (isHistoricChat) {
      // NEW: Use metadata from last USER message if available, otherwise fall back to current selections
      const metadataPatientUuids = lastUserMessageMetadata?.selectedPatientDocumentUuids;
      const metadataRefUuids = lastUserMessageMetadata?.selectedReferenceDocumentUuids;
      const useMetadata = !!(metadataPatientUuids?.length || metadataRefUuids?.length);
      
      const patientUuidsToRestore = useMetadata ? (metadataPatientUuids || []) : (currentSelectedPatientDocumentUuids || []);
      const refUuidsToRestore = useMetadata ? (metadataRefUuids || []) : (currentSelectedReferenceDocumentUuids || []);
      
      console.log('[ClaudeChatInput] Historic chat - restoring saved context:', {
        useMetadata,
        hasMetadata: !!lastUserMessageMetadata,
        hasSavedPatientDocs: (patientUuidsToRestore.length || 0) > 0,
        hasSavedRefDocs: (refUuidsToRestore.length || 0) > 0,
        usedPatientDocUuids: sessionContextHighlight?.usedPatientDocumentUuids.length || 0,
        usedReferenceDocUuids: sessionContextHighlight?.usedReferenceDocumentUuids.length || 0,
      });
      
      // CRITICAL: For historic chats, use SAVED context for checkboxes
      // The retrievalSummary (docs used in RAG) is used ONLY for visual highlighting
      const hasSavedContext = patientUuidsToRestore.length > 0 || refUuidsToRestore.length > 0;
      
      if (hasSavedContext) {
        // Restore from saved context (what was actually selected for this chat)
        console.log('[ClaudeChatInput] Historic chat has saved context - restoring saved selections', {
          source: useMetadata ? 'metadata' : 'currentSelected',
        });
        
        if (patientUuidsToRestore.length > 0) {
          patientUuidsToRestore.forEach(uuid => {
            const doc = contextDocuments.find(d => d.documentUuid === uuid);
            if (doc) {
              docIdsToSelect.add(doc.id);
              foundPatientDocs++;
              console.log('[ClaudeChatInput] ✓ Restored saved patient document:', { uuid, docId: doc.id, name: doc.name });
            }
          });
        }
        
        if (refUuidsToRestore.length > 0) {
          refUuidsToRestore.forEach(uuid => {
            const doc = contextDocuments.find(d => d.documentUuid === uuid);
            if (doc) {
              docIdsToSelect.add(doc.id);
              foundReferenceDocs++;
              console.log('[ClaudeChatInput] ✓ Restored saved reference document:', { uuid, docId: doc.id, name: doc.name });
            }
          });
        }
      } else {
        // No saved context - don't pre-select anything, just show empty checkboxes
        // The retrievalSummary will still be used for visual highlighting (badges, borders, etc.)
        console.log('[ClaudeChatInput] Historic chat has no saved context - no documents will be pre-selected (highlight only)');
        setSelectedDocumentIds(new Set());
        return;
      }
    } else {
      // For new chats, restore from selected document UUIDs (normal stateful behavior)
      const hasUuidsToRestore = 
        (currentSelectedPatientDocumentUuids && currentSelectedPatientDocumentUuids.length > 0) ||
        (currentSelectedReferenceDocumentUuids && currentSelectedReferenceDocumentUuids.length > 0);
      
      if (!hasUuidsToRestore) {
        setSelectedDocumentIds(new Set());
        return;
      }
      
      // Restore patient documents
      if (currentSelectedPatientDocumentUuids && currentSelectedPatientDocumentUuids.length > 0) {
        currentSelectedPatientDocumentUuids.forEach(uuid => {
          const doc = contextDocuments.find(d => d.documentUuid === uuid);
          if (doc) {
            docIdsToSelect.add(doc.id);
            foundPatientDocs++;
          }
        });
      }
      
      // Restore reference documents
      if (currentSelectedReferenceDocumentUuids && currentSelectedReferenceDocumentUuids.length > 0) {
        currentSelectedReferenceDocumentUuids.forEach(uuid => {
          const doc = contextDocuments.find(d => d.documentUuid === uuid);
          if (doc) {
            docIdsToSelect.add(doc.id);
            foundReferenceDocs++;
          }
        });
      }
    }
    
    // Set selections - for historic chats, this shows SAVED context (not all docs used in RAG)
    console.log('[ClaudeChatInput] Setting selected documents:', {
      isHistoricChat,
      totalToSelect: docIdsToSelect.size,
      foundPatientDocs,
      foundReferenceDocs,
      note: isHistoricChat ? 'Using saved context for checkboxes; retrievalSummary used only for visual highlighting' : 'Using current selections',
    });
    
    setSelectedDocumentIds(docIdsToSelect);
    
    // Automatically expand folders that contain documents to highlight
    if (docIdsToSelect.size > 0) {
      const foldersToExpand = new Set<number>();
      contextDocuments.forEach(doc => {
        if (docIdsToSelect.has(doc.id) && doc.folderId) {
          foldersToExpand.add(doc.folderId);
        }
      });
      
      if (foldersToExpand.size > 0) {
        console.log('[ClaudeChatInput] Auto-expanding folders with highlighted documents:', Array.from(foldersToExpand));
        setExpandedContextFolders(prev => {
          const newSet = new Set(prev);
          foldersToExpand.forEach(folderId => newSet.add(folderId));
          return newSet;
        });
      }
    }
  }, [showContextModal, contextDocuments, currentSelectedPatientDocumentUuids, currentSelectedReferenceDocumentUuids, isHistoricChat, sessionContextHighlight, lastUserMessageMetadata]);

  // Track if patient documents or references are selected and notify parent
  // NOTE: For MVP, we don't automatically select patients when documents are selected
  // Document selection is disabled - context is determined by patient selection or reference mode
  const prevSelectedUuidsRef = useRef<string[]>([]);
  const prevPatientDocUuidsRef = useRef<string[]>([]);
  const prevReferenceDocUuidsRef = useRef<string[]>([]);
  
  useEffect(() => {
    if (!onSelectionChange) return;
    
    const REFERENCIAS_FOLDER_NAME = 'Referências';
    const referenciasFolder = contextFolders.find(f => f.name === REFERENCIAS_FOLDER_NAME);
    
    // Check if any selected documents are references
    const hasSelectedReferences = referenciasFolder && 
      contextDocuments.some(doc => 
        doc.folderId === referenciasFolder.id && selectedDocumentIds.has(doc.id)
      );
    
    // Check if any selected documents are from patient folders
    const patientFolders = contextFolders.filter(f => 
      f.name !== REFERENCIAS_FOLDER_NAME && patientNamesMap.has(f.name)
    );
    const selectedPatientDocs = contextDocuments.filter(doc => 
      doc.folderId && patientFolders.some(f => f.id === doc.folderId) && selectedDocumentIds.has(doc.id)
    );
    const hasSelectedPatientDocs = selectedPatientDocs.length > 0;
    
    // MVP: Don't automatically select patients - document selection is disabled
    // Users must explicitly select patients via the patient selector
    
    // Bar is enabled if either references or patient documents are selected
    const hasSelection = hasSelectedReferences || hasSelectedPatientDocs;
    onSelectionChange(hasSelection);

    // Collect and notify parent of selected document UUIDs - separate patient vs reference
    // Use the same constants already declared above in this useEffect
    const selectedDocs = contextDocuments.filter(doc => selectedDocumentIds.has(doc.id));
    
    // Separate patient and reference document UUIDs
    const patientDocUuids = selectedDocs
      .filter(doc => doc.folderId && patientFolders.some(f => f.id === doc.folderId))
      .map(doc => doc.documentUuid)
      .filter((uuid): uuid is string => !!uuid);
    
    const referenceDocUuids = selectedDocs
      .filter(doc => doc.folderId === referenciasFolder?.id)
      .map(doc => doc.documentUuid)
      .filter((uuid): uuid is string => !!uuid);
    
    // Legacy callback (all documents combined) - only call if changed
    if (onSelectedDocumentsChange) {
      const selectedUuids = [...patientDocUuids, ...referenceDocUuids];
      const uuidsChanged = selectedUuids.length !== prevSelectedUuidsRef.current.length ||
        selectedUuids.some((uuid, idx) => uuid !== prevSelectedUuidsRef.current[idx]);
      
      if (uuidsChanged) {
        prevSelectedUuidsRef.current = selectedUuids;
        onSelectedDocumentsChange(selectedUuids);
      }
    }
    
    // New separate callbacks - only call if values actually changed
    if (onSelectedPatientDocumentsChange) {
      const patientUuidsChanged = patientDocUuids.length !== prevPatientDocUuidsRef.current.length ||
        patientDocUuids.some((uuid, idx) => uuid !== prevPatientDocUuidsRef.current[idx]);
      
      if (patientUuidsChanged) {
        prevPatientDocUuidsRef.current = patientDocUuids;
        onSelectedPatientDocumentsChange(patientDocUuids);
      }
    }
    
    if (onSelectedReferenceDocumentsChange) {
      const referenceUuidsChanged = referenceDocUuids.length !== prevReferenceDocUuidsRef.current.length ||
        referenceDocUuids.some((uuid, idx) => uuid !== prevReferenceDocUuidsRef.current[idx]);
      
      if (referenceUuidsChanged) {
        prevReferenceDocUuidsRef.current = referenceDocUuids;
        onSelectedReferenceDocumentsChange(referenceDocUuids);
      }
    }
  }, [selectedDocumentIds, contextFolders, contextDocuments, patientNamesMap, onSelectionChange, onSelectedDocumentsChange, onSelectedPatientDocumentsChange, onSelectedReferenceDocumentsChange]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const maxHeight = 120;
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        maxHeight
      )}px`;
    }
  }, [message]);

  const handleFileSelect = useCallback(
    (selectedFiles: FileList | null) => {
      if (!selectedFiles) return;

      const filesToAdd = Array.from(selectedFiles).slice(0, maxFiles - files.length);

      const newFiles = filesToAdd
        .filter((file) => {
          if (file.size > maxFileSize) {
            alert(`Arquivo ${file.name} muito grande.`);
            return false;
          }
          return true;
        })
        .map((file) => ({
          id: Math.random().toString(),
          file,
          preview: file.type.startsWith("image/")
            ? URL.createObjectURL(file)
            : undefined,
          type: file.type || "application/octet-stream",
          uploadStatus: "complete" as const,
          uploadProgress: 100,
        }));

      setFiles((prev) => [...prev, ...newFiles]);
    },
    [files.length, maxFiles, maxFileSize]
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === id);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);
  
    // Helper: canSend
    const hasContent = message.trim().length > 0 || files.length > 0;
    const canSend = hasContent && !disableSend;

    // Handlers
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Durante streaming (disableSend), Enter não envia mensagem, mas Shift+Enter continua quebrando linha
      if (disableSend) {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          return;
        }
        // Shift+Enter cai no comportamento normal do textarea (quebra de linha)
      } else if (e.key === "Enter" && !e.shiftKey && canSend) {
        // Fora de streaming: Enter envia, Shift+Enter quebra linha
        e.preventDefault();
        handleSend();
      }
    };

    const handleSend = () => {
      if (!canSend || disabled) return;
      if (onSendMessage) {
        onSendMessage(message, files, []);
      }
      setMessage("");
      setFiles([]);
    };

    const handleVoiceToggle = () => {
      setIsRecording((prev) => !prev);
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files) {
        handleFileSelect(e.dataTransfer.files);
      }
    }, [handleFileSelect]);

    // ...existing code...
    return (
      <div
        className="relative w-full"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {isDragging && (
          <div className="absolute inset-0 z-50 bg-blue-50 border-2 border-dashed border-blue-300 rounded-2xl flex flex-col items-center justify-center pointer-events-none">
            <p className="text-sm text-blue-600 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Solte os arquivos aqui
            </p>
          </div>
        )}
        <div
          className={cn(
            "bg-white border rounded-2xl shadow-sm min-h-[56px] flex flex-col overflow-hidden relative",
            shouldDimInputSurface ? "opacity-70 pointer-events-none" : "",
            disabled 
              ? "border-slate-200 bg-slate-50/50 opacity-75" 
              : "border-slate-200"
          )}
        >
          {/* Files Preview */}
          {files.length > 0 && (
            <div className="border-b border-slate-100 p-3">
              <div className="flex gap-2 overflow-x-auto scrollbar-thin">
                {files.map((file) => (
                  <FilePreviewCard key={file.id} file={file} onRemove={removeFile} />
                ))}
              </div>
            </div>
          )}
          {/* Input Area */}
          <div className="flex items-end relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              className={cn(
                "flex-1 min-h-[56px] max-h-[120px] p-4 pr-2 resize-none border-0 bg-transparent placeholder:mt-4 text-sm focus-visible:outline-none focus:ring-0",
                disabled 
                  ? "text-slate-500 placeholder:text-slate-400 cursor-not-allowed" 
                  : "text-slate-900 placeholder:text-slate-400"
              )}
              rows={1}
            />
            <div className="flex items-center">
              <div className={cn("ai-input-icon-wrapper -translate-y-2 -translate-x-3", "pointer-events-none opacity-30")}>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-slate-400 hover:text-slate-400 hover:bg-transparent m-0 cursor-not-allowed"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={true}
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
                {/* Context Button - Visible but document selection disabled for MVP */}
                <div 
                  className="ai-input-icon-wrapper -translate-y-2 -translate-x-3"
                  style={{ pointerEvents: 'auto', position: 'relative', zIndex: 30 }}
                >
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-oasis-blue hover:text-oasis-blue-600 hover:bg-oasis-blue-50 m-0"
                    onClick={async () => {
                      setShowContextModal(true);
                      onContextModalVisibilityChange?.(true);
                      
                      // For historic chats, fetch session documents with current patient context FIRST
                      // This ensures we get the correctly filtered list from backend
                      if (isHistoricChat && sessionId && fetchSessionDocuments) {
                        try {
                          console.log('[ClaudeChatInput] Fetching session documents with patient context:', {
                            sessionId,
                            currentPatientId: currentPatientId || 'null (global view)',
                          });
                          await fetchSessionDocuments(sessionId, currentPatientId || null);
                        } catch (error) {
                          console.error('[ClaudeChatInput] Error fetching session documents:', error);
                        }
                      }
                      
                      // Load documents and folders when opening modal
                      try {
                        // Load patients to map patient IDs to patient names
                        const { patients } = await listMyPatients();
                        const patientsMap = new Map<string, string>();
                        patients.forEach(patient => {
                          patientsMap.set(patient.id, patient.full_name);
                        });

                        // Format file size helper
                        const formatFileSize = (bytes: number): string => {
                          if (bytes === 0) return '0 Bytes';
                          const k = 1024;
                          const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                          const i = Math.floor(Math.log(bytes) / Math.log(k));
                          return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
                        };

                        // Load patient documents
                        const allPatientDocs: DocumentData[] = [];
                        const patientFolders: FolderType[] = [];
                        
                        for (const patient of patients) {
                          // Create folder for this patient (even if no documents yet)
                          const folderId = Date.now() + patientFolders.length;
                          const folder: FolderType = {
                            id: folderId,
                            name: patient.id, // Store patient ID as folder name for matching
                            createdAt: new Date(),
                          };
                          patientFolders.push(folder);

                          try {
                            const patientDocs = await listPatientKnowledgeDocuments(patient.id);

                            // Convert KnowledgeDocument to DocumentData
                            patientDocs.forEach((doc, index) => {
                              const createdDate = doc.createdAt ? new Date(doc.createdAt) : new Date();
                              const dateStr = createdDate.toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric'
                              });

                              const sizeBytes = doc.size || 0;
                              const sizeFormatted = formatFileSize(sizeBytes);

                              allPatientDocs.push({
                                id: parseInt(doc.id.replace(/-/g, '').substring(0, 8), 16) || Date.now() + index,
                                name: doc.filename || 'Sem título',
                                size: sizeFormatted,
                                type: doc.dtype === 'KNOWLEDGE_PDF' ? 'PDF' : 'FILE',
                                date: dateStr,
                                category: 'S3',
                                status: doc.status === 'READY' ? 'ativo' : doc.status.toLowerCase(),
                                uploadStatus: doc.status === 'READY' ? 'complete' : doc.status === 'ERROR' ? 'error' : 'uploading',
                                folderId: folderId,
                                s3Key: doc.s3Key,
                                url: undefined,
                                documentUuid: doc.id, // Store actual UUID from backend
                              });
                            });
                          } catch (error) {
                            console.error(`[ClaudeChatInput] Error loading documents for patient ${patient.id}:`, error);
                            // Continue even if loading fails - folder will just be empty
                          }
                        }

                        // Load reference documents
                        let referenceDocs: DocumentData[] = [];
                        let referenceFolder: FolderType | undefined;
                        try {
                          const refsResponse = await listReferencesMedicas();
                          const refsItems = refsResponse.items || [];
                          
                          // Create reference folder (even if no documents)
                          const refFolderId = Date.now() + patientFolders.length + 1000;
                          referenceFolder = {
                            id: refFolderId,
                            name: 'Referências',
                            createdAt: new Date(),
                          };

                          // Convert StorageItem to DocumentData
                          referenceDocs = refsItems.map((item, index) => {
                            const createdDate = item.created_at || item.lastModified 
                              ? new Date(item.created_at || item.lastModified!) 
                              : new Date();
                            const dateStr = createdDate.toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            });

                            const sizeBytes = item.size || 0;
                            const sizeFormatted = formatFileSize(sizeBytes);

                            return {
                              id: parseInt((item.id || item.documentId || '').replace(/-/g, '').substring(0, 8), 16) || Date.now() + index + 20000,
                              name: item.title || item.name || 'Sem título',
                              size: sizeFormatted,
                              type: (item.d_type || 'KNOWLEDGE_PDF') === 'KNOWLEDGE_PDF' ? 'PDF' : 'FILE',
                              date: dateStr,
                              category: 'S3',
                              status: (item.d_status || item.status || 'READY') === 'READY' ? 'ativo' : (item.d_status || item.status || 'READY').toLowerCase(),
                              uploadStatus: (item.d_status || item.status || 'READY') === 'READY' ? 'complete' : (item.d_status || item.status || 'READY') === 'ERROR' ? 'error' : 'uploading',
                              folderId: refFolderId,
                              s3Key: item.s3Key || item.s3_key || '',
                              url: undefined,
                              documentUuid: item.id || item.documentId || '', // Store actual UUID from backend
                            };
                          });
                        } catch (error) {
                          console.error('[ClaudeChatInput] Error loading reference documents:', error);
                          // Create empty reference folder anyway
                          const refFolderId = Date.now() + patientFolders.length + 1000;
                          referenceFolder = {
                            id: refFolderId,
                            name: 'Referências',
                            createdAt: new Date(),
                          };
                        }

                        // Filter documents based on sessionDocuments if provided (historic chat)
                        // Only show documents that were actually used in this session
                        let filteredPatientDocs = allPatientDocs;
                        let filteredReferenceDocs = referenceDocs;
                        let filteredPatientFolders = patientFolders;
                        
                        if (sessionDocuments && sessionDocuments.length > 0) {
                          console.log('[ClaudeChatInput] Filtering documents based on session documents:', {
                            totalSessionDocs: sessionDocuments.length,
                            sessionPatientDocs: sessionDocuments.filter(d => d.patientId !== null).length,
                            sessionRefDocs: sessionDocuments.filter(d => d.patientId === null).length,
                          });
                          
                          // Create a set of session document UUIDs for fast lookup
                          const sessionDocUuids = new Set(sessionDocuments.map(d => d.id));
                          
                          // Filter patient documents - only keep those in sessionDocuments
                          filteredPatientDocs = allPatientDocs.filter(doc => 
                            doc.documentUuid && sessionDocUuids.has(doc.documentUuid)
                          );
                          
                          // Filter reference documents - only keep those in sessionDocuments
                          filteredReferenceDocs = referenceDocs.filter(doc => 
                            doc.documentUuid && sessionDocUuids.has(doc.documentUuid)
                          );
                          
                          // Filter patient folders - only keep folders that have documents in sessionDocuments
                          const sessionPatientIds = new Set(
                            sessionDocuments
                              .filter(d => d.patientId !== null)
                              .map(d => d.patientId!)
                          );
                          filteredPatientFolders = patientFolders.filter(folder => 
                            sessionPatientIds.has(folder.name) || // Patient folder is in session
                            filteredPatientDocs.some(doc => doc.folderId === folder.id) // Folder has session docs
                          );
                          
                          console.log('[ClaudeChatInput] Filtered documents:', {
                            filteredPatientDocs: filteredPatientDocs.length,
                            filteredReferenceDocs: filteredReferenceDocs.length,
                            filteredPatientFolders: filteredPatientFolders.length,
                          });
                        }
                        
                        // Set folders and documents (filtered if sessionDocuments provided)
                        const allFolders = referenceFolder 
                          ? [...filteredPatientFolders, referenceFolder]
                          : filteredPatientFolders;
                        setContextFolders(allFolders);
                        setContextDocuments([...filteredPatientDocs, ...filteredReferenceDocs]);
                        // Store patient names map for display
                        setPatientNamesMap(patientsMap);
                      } catch (error) {
                        console.error('[ClaudeChatInput] Error loading context documents:', error);
                      }
                    }}
                  >
                    <SlidersHorizontal className="h-5 w-5" />
                  </Button>
                </div>
              <div className={cn("ai-input-icon-wrapper -translate-y-2 -translate-x-3", disabled ? "pointer-events-none opacity-50" : "")}>
                <PulsingMic
                  isRecording={isRecording}
                  size="md"
                  onClick={handleVoiceToggle}
                  disabled={disabled || disableSend}
                  className="mx-0"
                />
              </div>
              <div className={cn("ai-input-icon-wrapper -translate-y-2 -translate-x-3", disabled ? "pointer-events-none opacity-50" : "")}>
                <Button
                  size="icon"
                  className={cn(
                    "h-8 w-8 p-0 rounded-lg transition-colors ml-1",
                    canSend
                      ? "bg-oasis-blue hover:bg-oasis-blue-600 text-white"
                      : "bg-oasis-blue/20 text-slate-400 cursor-not-allowed border border-oasis-blue/30"
                  )}
                  onClick={handleSend}
                  disabled={!canSend}
                >
                  <ArrowUp className={canSend ? "h-4 w-4" : "h-4 w-4 text-oasis-blue/70"} />
                </Button>
              </div>
            </div>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          aria-label="Upload files"
          onChange={(e) => {
            handleFileSelect(e.target.files);
            if (e.target) e.target.value = "";
          }}
        />

        {/* Context Modal */}
        {showContextModal &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 animate-in fade-in-0"
              onClick={closeContextModal}
            >
              <div
                className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-6xl mx-4 max-h-[80vh] flex flex-col animate-in fade-in-0 zoom-in-95 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="relative flex items-center justify-center p-6 border-b border-slate-200 bg-slate-50 rounded-t-xl">
                  <h3 className="text-lg font-semibold text-slate-900">Contexto</h3>
                  <button
                    onClick={closeContextModal}
                    className="absolute right-6 p-1 rounded-lg group"
                    aria-label="Fechar"
                  >
                    <X className="w-4 h-4 text-slate-500 group-hover:text-slate-700 transition-colors" />
                  </button>
                </div>

                {/* Modal Content - Two Sides */}
                <div className="flex-1 flex overflow-hidden">
                {/* Left Side - Pacientes */}
                <div className="flex-1 p-6 overflow-y-auto border-r border-slate-200">
                  <h4 className="text-[1.05rem] font-semibold text-slate-900 mb-4 text-center">Pacientes</h4>
                  {(() => {
                    const REFERENCIAS_FOLDER_NAME = 'Referências';
                    const patientFolders = contextFolders.filter(f => 
                      f.name !== REFERENCIAS_FOLDER_NAME && patientNamesMap.has(f.name)
                    );
                    const patientDocsByFolder = new Map<number, DocumentData[]>();
                    
                    contextDocuments.forEach(doc => {
                      if (doc.folderId && patientFolders.some(f => f.id === doc.folderId)) {
                        if (!patientDocsByFolder.has(doc.folderId)) {
                          patientDocsByFolder.set(doc.folderId, []);
                        }
                        patientDocsByFolder.get(doc.folderId)!.push(doc);
                      }
                    });

                    const allPatientDocIds = new Set<number>();
                    patientDocsByFolder.forEach(docs => docs.forEach(doc => allPatientDocIds.add(doc.id)));
                    const allPatientSelected = allPatientDocIds.size > 0 &&
                      Array.from(allPatientDocIds).every(id => selectedDocumentIds.has(id));

                    const toggleAllPatients = () => {
                      if (isHistoricChat) return; // Disabled in read-only mode
                      if (allPatientSelected) {
                        // Desselecionar todos: remove todos os arquivos
                        setSelectedDocumentIds(prev => {
                          const newSet = new Set(prev);
                          allPatientDocIds.forEach(id => newSet.delete(id));
                          return newSet;
                        });
                      } else {
                        // Selecionar todos: seleciona todos os arquivos
                        setSelectedDocumentIds(prev => {
                          const newSet = new Set(prev);
                          allPatientDocIds.forEach(id => newSet.add(id));
                          return newSet;
                        });
                      }
                    };

                    const toggleFolder = (folderId: number) => {
                      if (isHistoricChat) return; // Disabled in read-only mode
                      setExpandedContextFolders(prev => {
                        const newSet = new Set(prev);
                        newSet.has(folderId) ? newSet.delete(folderId) : newSet.add(folderId);
                        return newSet;
                      });
                    };

                    const toggleFolderSelection = (folder: FolderType) => {
                      if (isHistoricChat) return; // Disabled in read-only mode
                      const folderDocs = patientDocsByFolder.get(folder.id) || [];
                      const allFolderDocsSelected = folderDocs.length > 0 &&
                        folderDocs.every(doc => selectedDocumentIds.has(doc.id));

                      if (allFolderDocsSelected) {
                        // Desselecionar pasta: desseleciona todos os arquivos filhos
                        setSelectedDocumentIds(prev => {
                          const newSet = new Set(prev);
                          folderDocs.forEach(doc => newSet.delete(doc.id));
                          return newSet;
                        });
                      } else {
                        // Selecionar pasta: seleciona apenas ela e seus arquivos filhos
                        setSelectedDocumentIds(prev => {
                          const newSet = new Set(prev);
                          folderDocs.forEach(doc => newSet.add(doc.id));
                          return newSet;
                        });
                      }
                    };

                    const toggleDocumentSelection = (docId: number) => {
                      if (isHistoricChat) return; // Disabled in read-only mode
                      setSelectedDocumentIds(prev => {
                        const newSet = new Set(prev);
                        const wasSelected = newSet.has(docId);
                        
                        if (wasSelected) {
                          // Desselecionar arquivo
                          newSet.delete(docId);
                        } else {
                          // Selecionar arquivo
                          newSet.add(docId);
                        }
                        return newSet;
                      });
                    };

                    return (
                      <div className="space-y-2">
                        {allPatientDocIds.size > 0 && (
                          <button
                            onClick={toggleAllPatients}
                            type="button"
                            disabled={isHistoricChat}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-opacity ${
                              isHistoricChat ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'
                            }`}
                          >
                            <span
                              className={`inline-flex h-4 w-4 items-center justify-center rounded border flex-shrink-0 ${
                                allPatientSelected
                                  ? 'bg-oasis-blue border-oasis-blue'
                                  : 'border-slate-300'
                              }`}
                            >
                              {allPatientSelected && (
                                <span className="h-2 w-2 rounded-sm bg-white" />
                              )}
                            </span>
                            <span className="text-sm font-medium text-slate-900">Selecionar tudo</span>
                          </button>
                        )}

                        {patientFolders.length === 0 ? (
                          <p className="text-sm text-slate-500 py-8 text-center">Nenhum paciente ainda</p>
                        ) : (
                          // Show all patient folders, even if empty
                          patientFolders.map((folder) => {
                            const folderDocs = patientDocsByFolder.get(folder.id) || [];
                            const isExpanded = expandedContextFolders.has(folder.id);
                            // For historic chats: check if folder has documents that were actually used in RAG
                            // For new chats: check if all documents in folder are selected
                            const usedPatientIds = sessionContextHighlight?.usedPatientIds ?? [];
                            const usedPatientDocumentUuids = sessionContextHighlight?.usedPatientDocumentUuids ?? [];
                            const isPatientUsed = isHistoricChat && usedPatientIds.includes(folder.name);
                            const hasUsedDocsInFolder = folderDocs.some(doc => usedPatientDocumentUuids.includes(doc.documentUuid || ''));
                            const isPartOfHistoricContext = isHistoricChat && (isPatientUsed || hasUsedDocsInFolder);
                            
                            // For new chats: folder is selected if all documents are selected
                            const allFolderDocsSelected = !isHistoricChat && folderDocs.length > 0 &&
                              folderDocs.every(doc => selectedDocumentIds.has(doc.id));
                            
                            return (
                              <div key={folder.id} className={`border rounded-lg overflow-hidden ${
                                isPartOfHistoricContext
                                  ? 'border-oasis-blue border-2'
                                  : allFolderDocsSelected
                                  ? 'border-oasis-blue'
                                  : 'border-slate-200'
                              }`}>
                                <div
                                  className={`flex items-center ${
                                    isPartOfHistoricContext
                                      ? 'bg-oasis-blue/10' + (isExpanded ? ' border-b border-oasis-blue' : '')
                                      : allFolderDocsSelected
                                      ? 'bg-oasis-blue/5' + (isExpanded ? ' border-b border-oasis-blue' : '')
                                      : isHistoricChat
                                      ? '' + (!allFolderDocsSelected && isExpanded ? ' border-b border-slate-200' : '')
                                      : 'hover:bg-slate-50' + (!allFolderDocsSelected && isExpanded ? ' border-b border-slate-200' : '')
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => toggleFolder(folder.id)}
                                    disabled={isHistoricChat}
                                    className={`p-1 rounded m-1 flex-shrink-0 ${
                                      isHistoricChat 
                                        ? 'opacity-50 cursor-not-allowed' 
                                        : 'hover:bg-slate-100'
                                    }`}
                                    aria-label={isExpanded ? "Recolher" : "Expandir"}
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="w-4 h-4 text-slate-600" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4 text-slate-600" />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isHistoricChat}
                                    onClick={() => {
                                      if (isHistoricChat) return; // Disabled in read-only mode
                                      // Clicking patient folder selects/deselects the patient and all files
                                      // Supports multiple patient selection
                                      const patientId = folder.name;
                                      const folderDocs = patientDocsByFolder.get(folder.id) || [];
                                      const isPatientSelected = selectedPatientIdsInModal.has(patientId);
                                      const areAllFilesSelected = folderDocs.length > 0 && 
                                        folderDocs.every(doc => selectedDocumentIds.has(doc.id));
                                      
                                      // Determine if folder should be considered "selected"
                                      const isFolderSelected = isPatientSelected || areAllFilesSelected;
                                      
                                      if (patientId && patientNamesMap.has(patientId)) {
                                        if (isFolderSelected) {
                                          // Deselect: remove patient from selection and deselect all files
                                          console.log('[ClaudeChatInput] Deselecting patient folder:', patientId);
                                          setSelectedPatientIdsInModal(prev => {
                                            const newSet = new Set(prev);
                                            newSet.delete(patientId);
                                            return newSet;
                                          });
                                          setSelectedDocumentIds(prev => {
                                            const newSet = new Set(prev);
                                            folderDocs.forEach(doc => newSet.delete(doc.id));
                                            return newSet;
                                          });
                                        } else {
                                          // Select: add patient to selection and select all files in folder
                                          console.log('[ClaudeChatInput] Selecting patient folder:', patientId);
                                          setSelectedPatientIdsInModal(prev => {
                                            const newSet = new Set(prev);
                                            newSet.add(patientId);
                                            return newSet;
                                          });
                                          setSelectedReferencesInModal(false);
                                          setSelectedDocumentIds(prev => {
                                            const newSet = new Set(prev);
                                            folderDocs.forEach(doc => newSet.add(doc.id));
                                            return newSet;
                                          });
                                        }
                                      } else {
                                        // Fallback: toggle folder selection for non-patient folders
                                        toggleFolderSelection(folder);
                                      }
                                    }}
                                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-left flex-1 min-w-0 transition-colors ${
                                      isHistoricChat
                                        ? 'cursor-not-allowed'
                                        : 'hover:bg-slate-50'
                                    } ${
                                      isPartOfHistoricContext
                                        ? 'bg-oasis-blue/15'
                                        : selectedPatientIdsInModal.has(folder.name)
                                        ? 'bg-oasis-blue/10'
                                        : allFolderDocsSelected
                                        ? 'bg-oasis-blue/5'
                                        : ''
                                    }`}
                                  >
                                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                                      <Folder className={`w-4 h-4 flex-shrink-0 ${
                                        isPartOfHistoricContext
                                          ? 'text-oasis-blue'
                                          : selectedPatientIdsInModal.has(folder.name)
                                          ? 'text-oasis-blue'
                                          : 'text-slate-400'
                                      }`} />
                                      <span className={`text-sm font-medium truncate ${
                                        isPartOfHistoricContext
                                          ? 'text-oasis-blue font-semibold'
                                          : selectedPatientIdsInModal.has(folder.name)
                                          ? 'text-oasis-blue font-semibold'
                                          : 'text-slate-900'
                                      }`} title={
                                        folder.name === 'Referências' 
                                          ? 'Referências'
                                          : patientNamesMap.get(folder.name) || folder.name
                                      }>
                                        {folder.name === 'Referências' 
                                          ? 'Referências'
                                          : patientNamesMap.get(folder.name) || folder.name}
                                      </span>
                                    </div>
                                    <span
                                      className={`inline-flex h-4 w-4 items-center justify-center rounded border flex-shrink-0 ${
                                        (!isHistoricChat && selectedPatientIdsInModal.has(folder.name))
                                          ? 'bg-oasis-blue border-oasis-blue'
                                          : allFolderDocsSelected
                                          ? 'bg-oasis-blue border-oasis-blue'
                                          : 'border-slate-300'
                                      }`}
                                    >
                                      {((!isHistoricChat && selectedPatientIdsInModal.has(folder.name)) || allFolderDocsSelected) && (
                                        <span className="h-2 w-2 rounded-sm bg-white" />
                                      )}
                                    </span>
                                  </button>
                                </div>

                                {isExpanded && (
                                  <div className={`py-2 space-y-1 ${
                                    isPartOfHistoricContext
                                      ? 'bg-oasis-blue/10'
                                      : allFolderDocsSelected
                                      ? 'bg-oasis-blue/5'
                                      : 'bg-white'
                                  }`}>
                                    {folderDocs.length === 0 ? (
                                      <p className="text-xs text-slate-500 px-3 py-2 text-center">
                                        Nenhum documento neste paciente
                                      </p>
                                    ) : (
                                      folderDocs.map((doc) => {
                                        const isSelected = selectedDocumentIds.has(doc.id);
                                        const isDocUsed = isHistoricChat && usedPatientDocumentUuids.includes(doc.documentUuid || '');
                                        // For historic chats: only highlight documents that were actually used in RAG
                                        // For new chats: highlight selected documents
                                        const shouldHighlight = isDocUsed || (isSelected && !isHistoricChat && !allFolderDocsSelected);
                                        return (
                                          <button
                                            key={doc.id}
                                            type="button"
                                            onClick={() => toggleDocumentSelection(doc.id)}
                                            disabled={isHistoricChat}
                                            className={`w-full flex items-center justify-between px-3 py-2 text-left transition-opacity ${
                                              isHistoricChat
                                                ? 'cursor-not-allowed'
                                                : 'hover:opacity-80'
                                            } ${
                                              isDocUsed
                                                ? 'bg-oasis-blue/10 border-l-2 border-oasis-blue'
                                                : shouldHighlight
                                                ? 'bg-oasis-blue/5'
                                                : ''
                                            }`}
                                          >
                                            <div className="flex-1 min-w-0 pr-3">
                                              <p className={`text-sm font-medium truncate ${
                                                isDocUsed ? 'text-oasis-blue font-semibold' : 'text-slate-900'
                                              }`}>
                                                {doc.name}
                                              </p>
                                            </div>
                                            <span
                                              className={`inline-flex h-4 w-4 items-center justify-center rounded border flex-shrink-0 ${
                                                isSelected
                                                  ? 'bg-oasis-blue border-oasis-blue'
                                                  : 'border-slate-300'
                                              }`}
                                            >
                                              {isSelected && (
                                                <span className="h-2 w-2 rounded-sm bg-white" />
                                              )}
                                            </span>
                                          </button>
                                        );
                                      })
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Right Side - Referências */}
                <div className="flex-1 p-6 overflow-y-auto">
                  {(() => {
                    const REFERENCIAS_FOLDER_NAME = 'Referências';
                    const referenciasFolder = contextFolders.find(f => 
                      f.name === REFERENCIAS_FOLDER_NAME
                    );
                    const referenciasDocs = contextDocuments.filter(doc => 
                      doc.folderId === referenciasFolder?.id
                    );

                    const allReferenciasSelected = referenciasDocs.length > 0 &&
                      referenciasDocs.every(doc => selectedDocumentIds.has(doc.id));
                    
                    // Check if references are part of the historic chat context using retrievalSummary
                    // References are highlighted if any reference documents were actually used in RAG
                    const usedReferenceDocumentUuids = sessionContextHighlight?.usedReferenceDocumentUuids ?? [];
                    const hasUsedReferenceDocs = referenciasDocs.some(doc => usedReferenceDocumentUuids.includes(doc.documentUuid || ''));
                    const isReferencesPartOfHistoricContext = isHistoricChat && hasUsedReferenceDocs;

                    const toggleAllReferencias = () => {
                      if (isHistoricChat) return; // Disabled in read-only mode
                      if (allReferenciasSelected) {
                        setSelectedDocumentIds(prev => {
                          const newSet = new Set(prev);
                          referenciasDocs.forEach(doc => newSet.delete(doc.id));
                          return newSet;
                        });
                      } else {
                        setSelectedDocumentIds(prev => {
                          const newSet = new Set(prev);
                          referenciasDocs.forEach(doc => newSet.add(doc.id));
                          return newSet;
                        });
                      }
                    };

                    const toggleReferenciaDoc = (docId: number) => {
                      if (isHistoricChat) return; // Disabled in read-only mode
                      setSelectedDocumentIds(prev => {
                        const newSet = new Set(prev);
                        if (newSet.has(docId)) {
                          newSet.delete(docId);
                        } else {
                          newSet.add(docId);
                        }
                        return newSet;
                      });
                    };
                    
                    return (
                      <>
                        <h4 className="text-[1.05rem] font-semibold mb-4 text-center text-slate-900">
                          Referências
                        </h4>

                        <div className="space-y-2">
                          {referenciasDocs.length > 0 && (
                          <button
                            type="button"
                            onClick={toggleAllReferencias}
                            disabled={isHistoricChat}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-opacity ${
                              isHistoricChat ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'
                            }`}
                          >
                            <span
                              className={`inline-flex h-4 w-4 items-center justify-center rounded border flex-shrink-0 ${
                                allReferenciasSelected
                                  ? 'bg-oasis-blue border-oasis-blue'
                                  : 'border-slate-300'
                              }`}
                            >
                              {allReferenciasSelected && (
                                <span className="h-2 w-2 rounded-sm bg-white" />
                              )}
                            </span>
                            <span className="text-sm font-medium text-slate-900">
                              Selecionar tudo
                            </span>
                          </button>
                        )}

                        {referenciasDocs.length === 0 ? (
                          <p className="text-sm text-slate-500 py-8 text-center">Nenhuma referência ainda</p>
                        ) : (
                          referenciasDocs.map((doc) => {
                            const isSelected = selectedDocumentIds.has(doc.id);
                            const isDocUsed = isHistoricChat && usedReferenceDocumentUuids.includes(doc.documentUuid || '');
                            return (
                              <button
                                type="button"
                                key={doc.id}
                                onClick={() => toggleReferenciaDoc(doc.id)}
                                disabled={isHistoricChat}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-opacity ${
                                  isHistoricChat
                                    ? 'cursor-not-allowed'
                                    : ''
                                } ${
                                  isDocUsed
                                    ? 'border-oasis-blue bg-oasis-blue/10 border-2'
                                    : (isSelected && !isHistoricChat)
                                    ? 'border-oasis-blue bg-oasis-blue/5'
                                    : 'border-slate-200 hover-border-oasis-blue/60 hover:bg-slate-50'
                                }`}
                              >
                                <div className="flex-1 min-w-0 pr-3">
                                  <p className={`text-sm font-medium truncate ${
                                    isDocUsed
                                      ? 'text-oasis-blue font-semibold'
                                      : 'text-slate-900'
                                  }`}>
                                    {doc.name}
                                  </p>
                                </div>
                                <span
                                  className={`inline-flex h-4 w-4 items-center justify-center rounded border flex-shrink-0 ${
                                    isSelected
                                      ? 'bg-oasis-blue border-oasis-blue'
                                      : 'border-slate-300'
                                  }`}
                                >
                                  {isSelected && (
                                    <span className="h-2 w-2 rounded-sm bg-white" />
                                  )}
                                </span>
                              </button>
                            );
                          })
                        )}
                        </div>
                      </>
                    );
                  })()}
                </div>
                </div>
                
                {/* Modal Footer with Action Buttons */}
                <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-end gap-3 rounded-b-xl">
                  <button
                    type="button"
                    onClick={() => {
                      if (isHistoricChat) return; // Disabled in read-only mode
                      // Only deselect documents in the lists - keep patient/reference selection
                      setSelectedDocumentIds(new Set());
                    }}
                    disabled={isHistoricChat || selectedDocumentIds.size === 0}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isHistoricChat || selectedDocumentIds.size === 0
                        ? 'text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed'
                        : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 cursor-pointer'
                    }`}
                  >
                    Desfazer seleção
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (isHistoricChat) return; // Disabled in read-only mode
                      // Get selected document UUIDs
                      const selectedUuids = Array.from(selectedDocumentIds)
                        .map(docId => {
                          const doc = contextDocuments.find(d => d.id === docId);
                          return doc?.documentUuid;
                        })
                        .filter((uuid): uuid is string => !!uuid);

                      // Determine which mode based on selected documents
                      const REFERENCIAS_FOLDER_NAME = 'Referências';
                      const referenciasFolder = contextFolders.find(f => f.name === REFERENCIAS_FOLDER_NAME);
                      
                      // Check if any selected documents are from references (use selectedDocumentIds, not UUIDs)
                      const hasReferenceDocs = referenciasFolder && 
                        Array.from(selectedDocumentIds).some(docId => {
                          const doc = contextDocuments.find(d => d.id === docId);
                          return doc && doc.folderId === referenciasFolder.id;
                        });

                      // Check if any selected documents are from patient folders (use selectedDocumentIds)
                      const patientFolders = contextFolders.filter(f => 
                        f.name !== REFERENCIAS_FOLDER_NAME && patientNamesMap.has(f.name)
                      );
                      const hasPatientDocs = Array.from(selectedDocumentIds).some(docId => {
                        const doc = contextDocuments.find(d => d.id === docId);
                        return doc && doc.folderId && patientFolders.some(f => f.id === doc.folderId);
                      });

                      // If documents are selected, determine the patient from the documents
                      let patientIdFromDocs: string | null = null;
                      if (hasPatientDocs && !hasReferenceDocs) {
                        // Find the patient ID from the first patient document
                        const firstPatientDoc = contextDocuments.find(d => 
                          selectedDocumentIds.has(d.id) && 
                          d.folderId && 
                          patientFolders.some(f => f.id === d.folderId)
                        );
                        if (firstPatientDoc) {
                          const patientFolder = contextFolders.find(f => f.id === firstPatientDoc.folderId);
                          if (patientFolder && patientNamesMap.has(patientFolder.name)) {
                            patientIdFromDocs = patientFolder.name;
                          }
                        }
                      }

                      // Separate patient and reference document UUIDs
                      const patientDocUuids = Array.from(selectedDocumentIds)
                        .map(docId => {
                          const doc = contextDocuments.find(d => d.id === docId);
                          if (!doc) return null;
                          // Check if it's a patient document
                          if (doc.folderId && patientFolders.some(f => f.id === doc.folderId)) {
                            return doc.documentUuid;
                          }
                          return null;
                        })
                        .filter((uuid): uuid is string => !!uuid);
                      
                      const referenceDocUuids = Array.from(selectedDocumentIds)
                        .map(docId => {
                          const doc = contextDocuments.find(d => d.id === docId);
                          if (!doc) return null;
                          // Check if it's a reference document
                          if (doc.folderId === referenciasFolder?.id) {
                            return doc.documentUuid;
                          }
                          return null;
                        })
                        .filter((uuid): uuid is string => !!uuid);

                      // Notify parent of selected documents (always call, even if empty array)
                      // Legacy callback for backward compatibility
                      if (onSelectedDocumentsChange) {
                        onSelectedDocumentsChange(selectedUuids);
                      }
                      
                      // New separate callbacks for patient and reference documents
                      if (onSelectedPatientDocumentsChange) {
                        onSelectedPatientDocumentsChange(patientDocUuids);
                      }
                      if (onSelectedReferenceDocumentsChange) {
                        onSelectedReferenceDocumentsChange(referenceDocUuids);
                      }

                      // Collect all selected patient IDs from explicit selection and documents
                      const selectedPatientIdsArray = Array.from(selectedPatientIdsInModal);
                      
                      // Also collect patient IDs from selected documents (if any)
                      const patientIdsFromDocs = new Set<string>();
                      if (hasPatientDocs) {
                        contextDocuments
                          .filter(d => selectedDocumentIds.has(d.id) && d.folderId)
                          .forEach(doc => {
                            const patientFolder = contextFolders.find(f => f.id === doc.folderId);
                            if (patientFolder && patientNamesMap.has(patientFolder.name)) {
                              patientIdsFromDocs.add(patientFolder.name);
                            }
                          });
                      }
                      
                      // Merge explicit selections with document-based selections
                      const allSelectedPatientIds = Array.from(new Set([...selectedPatientIdsArray, ...patientIdsFromDocs]));
                      
                      console.log('[ClaudeChatInput] Confirm button clicked:', {
                        selectedDocumentIds: Array.from(selectedDocumentIds),
                        selectedUuids,
                        patientDocUuids,
                        referenceDocUuids,
                        hasReferenceDocs,
                        hasPatientDocs,
                        patientIdFromDocs,
                        selectedPatientIdsInModal: Array.from(selectedPatientIdsInModal),
                        allSelectedPatientIds,
                        selectedReferencesInModal,
                      });

                      // Handle patient/reference mode selection - prioritize explicit selection, then documents
                      // NOTE: Use chat context callback instead of PatientContext to keep selections independent
                      if (allSelectedPatientIds.length > 0) {
                        // Multiple or single patient selection
                        console.log('[ClaudeChatInput] Setting chat context patients from selection:', allSelectedPatientIds);
                        // Use new multi-patient callback if available, otherwise fall back to single patient (first one)
                        if (onChatContextPatientsChange) {
                          onChatContextPatientsChange(allSelectedPatientIds);
                        } else if (onChatContextPatientChange) {
                          // Legacy: single patient support - use first patient
                          onChatContextPatientChange(allSelectedPatientIds[0]);
                        }
                      } else if (selectedReferencesInModal) {
                        // Explicit references mode selection
                        console.log('[ClaudeChatInput] Setting references mode from explicit selection');
                        if (onChatContextPatientsChange) {
                          onChatContextPatientsChange([]);
                        } else if (onChatContextPatientChange) {
                          onChatContextPatientChange(null); // Clear patient selection
                        }
                        onReferencesModeSelected?.(true);
                      } else if (hasReferenceDocs && !hasPatientDocs) {
                        // References determined from selected documents
                        console.log('[ClaudeChatInput] Setting references mode from documents');
                        if (onChatContextPatientsChange) {
                          onChatContextPatientsChange([]);
                        } else if (onChatContextPatientChange) {
                          onChatContextPatientChange(null); // Clear patient selection
                        }
                        onReferencesModeSelected?.(true);
                      } else {
                        console.warn('[ClaudeChatInput] No patients, documents or explicit selection detected - chat will remain disabled');
                      }

                      // Close modal and reset modal state
                      closeContextModal();
                      setSelectedPatientIdsInModal(new Set());
                      setSelectedReferencesInModal(false);
                      // Keep selectedDocumentIds so selection persists when modal reopens
                    }}
                    disabled={isHistoricChat || (selectedDocumentIds.size === 0 && selectedPatientIdsInModal.size === 0 && !selectedReferencesInModal)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isHistoricChat || (selectedDocumentIds.size === 0 && selectedPatientIdsInModal.size === 0 && !selectedReferencesInModal)
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : 'bg-oasis-blue text-white hover:bg-oasis-blue-600 cursor-pointer'
                    }`}
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )}
      </div>
    );
// ...existing code...
};

export default ClaudeChatInput;
