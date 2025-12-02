import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Upload, FileText, Search, MoreVertical, CheckCircle, AlertCircle, Folder, X, ChevronDown, ChevronRight, UserPlus } from 'lucide-react';
import { DocumentData, type DocumentItem, Folder as FolderType } from '../types';
import { uploadFileToS3, deleteFileFromS3, getPresignedViewUrl, moveFileInS3 } from '../lib/uploadToS3';
import { listMyPatients, listReferencesMedicas, deletePatient as deletePatientApi, moveDocument as moveDocumentApi, listPatientKnowledgeDocuments, type KnowledgeDocument } from '../lib/storageApi';
import { Button } from '../components/ui/button';
import { useOverlay } from '../context/OverlayContext';

const MAX_SIZE_MB = 50;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const REFERENCIAS_FOLDER_NAME = 'Referências';

const useClickOutside = (callback: () => void) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) callback();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [callback]);
  return ref;
};

const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
  const bgColor = type === 'success' ? 'bg-green-600' : 'bg-red-600';
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 ${bgColor} text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm font-medium flex items-center gap-3`;
  notification.innerHTML = `
    <span>${message}</span>
    <button onclick="this.parentElement.remove()" class="ml-2 font-bold text-white hover:text-white/80 transition-colors cursor-pointer flex-shrink-0" aria-label="Fechar notificação" style="font-size: 18px; line-height: 1;">×</button>
  `;
  document.body.appendChild(notification);
  setTimeout(() => notification.parentElement?.remove(), 20000);
};

const showErrorNotification = (title: string, message: string) => {
  // Handle longer error messages (up to 2000 chars from backend)
  // Truncate display but preserve full message in title attribute
  const maxDisplayLength = 500;
  const displayMessage = message.length > maxDisplayLength 
    ? `${message.substring(0, maxDisplayLength)}... (${message.length} caracteres)`
    : message;
  
  const notification = document.createElement('div');
  notification.className = 'fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm font-medium flex items-center gap-3 max-w-2xl';
  notification.innerHTML = `
    <div class="flex items-start space-x-3 flex-1">
      <div class="flex-shrink-0">
        <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
        </svg>
      </div>
      <div class="flex-1">
        <p class="font-semibold">${title}</p>
        <p class="mt-1 text-sm opacity-90 break-words" title="${message.length > maxDisplayLength ? message.replace(/"/g, '&quot;') : ''}">${displayMessage}</p>
      </div>
    </div>
    <button onclick="this.parentElement.remove()" class="ml-2 font-bold text-white hover:text-white/80 transition-colors cursor-pointer flex-shrink-0" aria-label="Fechar notificação" style="font-size: 18px; line-height: 1;">×</button>
  `;
  document.body.appendChild(notification);
  setTimeout(() => notification.parentElement?.remove(), 30000); // Increased timeout for longer messages
};

// Component to display document status based on d_status
// Never show READY status - only show PENDING, PROCESSING, or ERROR
const DocumentStatusBadge = ({ status, lastError }: { status?: 'PENDING' | 'PROCESSING' | 'READY' | 'ERROR' | string; lastError?: string }) => {
  if (!status) return null;

  const normalizedStatus = status.toUpperCase();
  
  // Never show READY status badge
  if (normalizedStatus === 'READY') return null;

  const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
    PENDING: { label: 'Aguardando processamento', color: 'bg-yellow-100 text-yellow-800', icon: '⏳' },
    PROCESSING: { label: 'Processando', color: 'bg-blue-100 text-blue-800', icon: '🔄' },
    ERROR: { label: 'Erro', color: 'bg-red-100 text-red-800', icon: '✗' },
  };

  const config = statusConfig[normalizedStatus];
  if (!config) return null;

  return (
    <div className="relative group">
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <span>{config.icon}</span>
        <span>{config.label}</span>
      </span>
      {normalizedStatus === 'ERROR' && lastError && (
        <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10">
          <div className="bg-red-600 text-white text-xs rounded px-2 py-1 max-w-md break-words">
            {/* Support for error messages up to 2000 characters - truncate for display but show full on hover */}
            {lastError.length > 300 ? (
              <span title={lastError}>
                {lastError.substring(0, 300)}... ({lastError.length} chars)
              </span>
            ) : (
              lastError
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const ConfirmationModal = ({ title, message, onConfirm, onCancel }: { 
  title: string; 
  message: string; 
  onConfirm: () => void; 
  onCancel: () => void;
}) => (
  <div 
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in-0"
    onClick={onCancel}
  >
    <div 
      className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md mx-4 animate-in fade-in-0 zoom-in-95"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-600 mb-6" dangerouslySetInnerHTML={{ __html: message }} />
        <div className="flex items-center justify-end space-x-3">
          <Button variant="outline" onClick={onCancel} className="border-oasis-blue text-oasis-blue hover:bg-oasis-blue-50 hover:text-oasis-blue-600">
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirm}>Deletar</Button>
        </div>
      </div>
    </div>
  </div>
);

const StatusIcon = ({ uploadStatus }: { uploadStatus: string }) => {
  const icons = {
    uploading: <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />,
    complete: <CheckCircle className="w-4 h-4 text-green-600" />,
    error: <AlertCircle className="w-4 h-4 text-red-600" />,
    default: <FileText className="w-4 h-4 text-slate-500" />
  };
  return icons[uploadStatus as keyof typeof icons] || icons.default;
};

const Menu = ({ items, onClose }: { 
  items: { label: string; onClick: () => void; className?: string }[]; 
  onClose: () => void;
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useClickOutside(() => {
    setMenuOpen(false);
    onClose();
  });

  return (
    <div className="relative" ref={menuRef}>
      <button
        className="p-2 hover:bg-slate-100 rounded-lg opacity-100 transition-opacity"
        aria-label="Mais opções"
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((open) => !open);
        }}
      >
        <MoreVertical className="w-4 h-4 text-slate-500" />
      </button>
      {menuOpen && (
        <div className="absolute right-0 top-12 z-50 bg-white border border-slate-200 rounded-lg shadow-lg py-2 w-32 flex flex-col">
          {items.map((item, index) => (
            <button
              key={index}
              className={`px-4 py-2 text-sm text-left ${item.className || 'text-slate-700 hover:bg-slate-100'}`}
              onClick={(e) => {
                e.stopPropagation();
        setMenuOpen(false);
                item.onClick();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const DocumentItem = ({ 
  doc, 
  onRequestDelete, 
  uploadProgress, 
  onDragStart, 
  onDragEnd 
}: { 
  doc: DocumentData; 
  onRequestDelete?: (doc: DocumentData) => void; 
  uploadProgress?: number;
  onDragStart?: (doc: DocumentData) => void;
  onDragEnd?: () => void;
}) => {
  const handleView = useCallback(async () => {
    if (!doc.s3Key) {
      alert(`Erro: Chave S3 não encontrada para "${doc.name}"`);
      return;
    }
    
    try {
      // Always get fresh URL from backend - don't use cached doc.url (may be expired)
      const url = await getPresignedViewUrl(doc.s3Key);
      window.open(url, '_blank');  // Use URL directly from backend without modifications
    } catch (error) {
      console.error('Erro ao obter URL de visualização:', error);
      alert(`Erro ao abrir "${doc.name}": ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }, [doc.s3Key, doc.name]);

  const menuItems = useMemo(() => [
    { 
      label: 'Visualizar', 
      onClick: handleView,
      className: 'text-slate-700 hover:bg-slate-100'
    },
    ...(onRequestDelete ? [{
      label: 'Deletar',
      onClick: () => onRequestDelete(doc),
      className: 'text-red-600 hover:bg-red-50'
    }] : [])
  ], [doc, onRequestDelete, handleView]);

  return (
    <div 
      className="flex flex-col p-4 border border-slate-200 rounded-lg hover:border-slate-300 hover:bg-slate-50 transition-colors group relative cursor-move"
      draggable
      onDragStart={() => onDragStart?.(doc)}
      onDragEnd={onDragEnd}
    >
      <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center">
          <StatusIcon uploadStatus={doc.uploadStatus} />
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-slate-900">{doc.name}</h4>
          {/* Show status badge if available (for new DocumentItem format) */}
          {(doc as any).d_status && (
            <div className="mt-1">
              <DocumentStatusBadge status={(doc as any).d_status} lastError={(doc as any).last_error} />
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <div className="flex items-center justify-end text-sm text-slate-500 font-mono w-48 gap-2">
          <span className="text-right">{doc.size}</span>
          <span className="text-slate-400">•</span>
          <span>{doc.date}</span>
        </div>
          <Menu items={menuItems} onClose={() => {}} />
          </div>
      </div>
      
      {uploadProgress !== undefined && uploadProgress > 0 && uploadProgress < 100 && (
        <div className="mt-3 w-full border border-slate-300 rounded overflow-hidden">
          <div className="h-2 bg-green-500 transition-all duration-200 ease-out" style={{ width: `${uploadProgress}%` }} />
        </div>
      )}
      {uploadProgress === 100 && <p className="mt-2 text-xs text-green-600">Upload completo!</p>}
    </div>
  );
};

const EmptyState = ({ icon: Icon, title, description }: { 
  icon: React.ElementType; 
  title: string; 
  description: string;
}) => (
  <div className="text-center py-12 flex flex-col items-center">
    <Icon className="w-12 h-12 text-slate-400 mb-4" />
    <h3 className="text-lg font-medium text-slate-900 mb-2">{title}</h3>
    <p className="text-slate-600 text-sm max-w-md">{description}</p>
  </div>
);

// Extended folder type to include patientId for database-sourced folders
interface ExtendedFolder extends FolderType {
  patientId?: string; // UUID from database
  patientDescription?: string; // Patient case description from database
}

const Conhecimento: React.FC = () => {
  const { registerOverlay, unregisterOverlay } = useOverlay();
  const [isDragging, setIsDragging] = useState(false);
  // Separate states for patient documents and reference documents
  const [referenceDocuments, setReferenceDocuments] = useState<DocumentItem[]>([]);
  // Keep old documents state for backward compatibility during migration
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  
  // New clean state for patient knowledge documents (no loops!)
  // Store documents per patientId so we can show counts even when folders are collapsed
  const [patientDocsByPatientId, setPatientDocsByPatientId] = useState<Record<string, KnowledgeDocument[]>>({});
  const [isPollingPatientDocs, setIsPollingPatientDocs] = useState(false);
  const [isPollingReferenceDocs, setIsPollingReferenceDocs] = useState(false);
  
  // 🔒 Garante que só iniciamos UM polling por ciclo, mesmo com StrictMode
  const hasStartedRefPollingRef = useRef(false);

  // Helper function to safely start reference polling
  const startReferencePolling = useCallback(() => {
    // Evita chamar 15x seguidas à toa
    if (isPollingReferenceDocs) {
      console.log('[Conhecimento] Polling já ativo, não vou iniciar de novo.');
      return;
    }

    // Garantia extra: antes de um novo ciclo, deixa a flag livre
    hasStartedRefPollingRef.current = false;
    console.log('[Conhecimento] Pending reference documents found, starting polling...');
    setIsPollingReferenceDocs(true);
  }, [isPollingReferenceDocs]);
  
  const [folders, setFolders] = useState<ExtendedFolder[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<number, number>>({});
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());
  
  // Get currently selected/expanded patient ID
  const selectedPatientId = useMemo(() => {
    // Find first expanded folder that has a patientId
    for (const folderId of expandedFolders) {
      const folder = folders.find(f => f.id === folderId);
      if (folder && (folder as ExtendedFolder).patientId) {
        return (folder as ExtendedFolder).patientId;
      }
    }
    return null;
  }, [expandedFolders, folders]);

  // Helper function to check if documents have pending status
  // Polling stops automatically when all documents reach READY or ERROR status
  // Backend S3 event handler now sets status to READY automatically, so polling should stop quickly
  function hasPendingDocs(docs: KnowledgeDocument[]): boolean {
    return docs.some(
      (d) => d.status === 'UPLOADING' || d.status === 'PROCESSING' || d.status === 'PENDING'
    );
  }
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [draggedDocument, setDraggedDocument] = useState<DocumentData | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<number | null>(null);
  // Removed loadedPatientDocs - no longer needed with new polling implementation
  const [referenciasDocsLoaded, setReferenciasDocsLoaded] = useState(false);
  
  // Doctor data for dynamic title
  const [doctorFirstName, setDoctorFirstName] = useState('');
  const [doctorTreatment, setDoctorTreatment] = useState<string>('');
  
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]); // For batch folder upload
  const [folderModalMode, setFolderModalMode] = useState<'select' | 'create' | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [createFolderName, setCreateFolderName] = useState('');
  const [documentToDelete, setDocumentToDelete] = useState<DocumentData | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<FolderType | null>(null);
  const [folderRemoveConfirmText, setFolderRemoveConfirmText] = useState('');
  
  // Batch upload state
  const [isBatchUploading, setIsBatchUploading] = useState(false);
  const [batchUploadProgress, setBatchUploadProgress] = useState<{
    total: number;
    completedFiles: number;
    currentFileProgress: number;
    failed: number;
    currentFile?: string;
  }>({ total: 0, completedFiles: 0, currentFileProgress: 0, failed: 0 });

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }, []);

  // Helper function to convert DocumentItem to DocumentData for backward compatibility
  const convertDocumentItemToData = useCallback((item: DocumentItem, folderId?: number): DocumentData => {
    const createdDate = item.created_at ? new Date(item.created_at) : new Date();
    const dateStr = createdDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    // Use actual size from S3 if available, otherwise show 0 Bytes
    const sizeBytes = item.size || 0;
    const sizeFormatted = formatFileSize(sizeBytes);

    return {
      id: parseInt(item.id.replace(/-/g, '').substring(0, 8), 16) || Date.now(),
      name: item.title || 'Unknown',
      size: sizeFormatted,
      type: item.d_type === 'KNOWLEDGE_PDF' ? 'PDF' : 'FILE',
      date: dateStr,
      category: 'S3',
      status: item.d_status === 'READY' ? 'ativo' : item.d_status.toLowerCase(),
      uploadStatus: item.d_status === 'READY' ? 'complete' : item.d_status === 'ERROR' ? 'error' : 'uploading',
      folderId: folderId,
      s3Key: item.s3_key,
      url: undefined, // Will be fetched on demand
      // Store DocumentItem fields for status display
      d_status: item.d_status,
      last_error: item.last_error,
    } as DocumentData & { d_status?: string; last_error?: string };
  }, [formatFileSize]);

  // Removed manageFolderPlaceholder - backend now handles folder creation automatically

  const getFolderDisplayName = useCallback((folderName: string): string => {
    return folderName.split('__tag_')[0];
  }, []);

  const validateFile = useCallback((file: File): string | null => {
    const existingDoc = documents.find(doc => doc.name.toLowerCase() === file.name.toLowerCase());
    if (existingDoc) {
      const folder = existingDoc.folderId ? folders.find(f => f.id === existingDoc.folderId) : undefined;
      const folderDisplayName = folder ? getFolderDisplayName(folder.name) : '';
      const folderMsg = folder ? ` na pasta "${folderDisplayName}"` : '';
      showErrorNotification('Documento já existe', `O documento "${file.name}" já existe${folderMsg}.`);
      return 'exists';
    }
    
    if (!file.type.includes("pdf") && file.type !== "application/pdf") {
      showErrorNotification(`Erro ao fazer upload de "${file.name}"`, 'Apenas arquivos PDF são permitidos.');
      return 'invalid-type';
    }

    if (file.size > MAX_SIZE_BYTES) {
      showErrorNotification(`Erro ao fazer upload de "${file.name}"`, `Arquivo muito grande. O tamanho máximo é ${MAX_SIZE_MB} MB.`);
      return 'too-large';
    }

    return null;
  }, [documents, folders, getFolderDisplayName]);

  const updateDocument = useCallback((docId: number, updates: Partial<DocumentData>) => {
    setDocuments(prev => prev.map(doc => doc.id === docId ? { ...doc, ...updates } : doc));
  }, []);


  const updateProgress = useCallback((docId: number, progress: number | null) => {
    setUploadProgress(prev => {
      if (progress === null) {
        const updated = { ...prev };
        delete updated[docId];
        return updated;
      }
      return { ...prev, [docId]: progress };
    });
  }, []);

  const handleFileUpload = useCallback(async (file: File, folderId: number | null) => {
    const validationResult = validateFile(file);
    if (validationResult) {
      return;
    }

    const newDoc: DocumentData = {
      id: Date.now(),
        name: file.name,
        size: formatFileSize(file.size),
        type: file.name.split('.').pop()?.toUpperCase() || 'FILE',
        date: 'Agora',
        category: 'Novo',
        status: 'processando',
      uploadStatus: 'uploading',
      folderId: folderId || undefined
      };

      setDocuments(prev => [newDoc, ...prev]);
    updateProgress(newDoc.id, 0);

    try {
      const targetFolder = folderId ? folders.find(f => f.id === folderId) : undefined;
      let patientId: string | undefined;
      let folderPath: string | undefined;

      if (targetFolder) {
        const extendedFolder = targetFolder as ExtendedFolder;
        if (extendedFolder.patientId) {
          // Patient folder - use patientId
          patientId = extendedFolder.patientId;
        } else if (targetFolder.name === REFERENCIAS_FOLDER_NAME) {
          // Referências Médicas folder
          folderPath = 'references-medicas';
        } else {
          // Fallback to folder name (for backwards compatibility)
          folderPath = targetFolder.name?.trim();
        }
      }

      const { key, uploadUrl, docId, sqsMessageSent } = await uploadFileToS3(
        file,
        folderPath,
        patientId,
        (progress) => {
          updateProgress(newDoc.id, progress);
        }
      );
      
      const viewUrl = await getPresignedViewUrl(key).catch(() => undefined);
      updateProgress(newDoc.id, null);
      
      // Log SQS message status for debugging
      if (sqsMessageSent !== undefined) {
        if (sqsMessageSent) {
          console.log(`[Conhecimento] Document "${file.name}" - SQS message sent, embedder will process in ~5 seconds`);
        } else {
          console.warn(`[Conhecimento] Document "${file.name}" - SQS message NOT sent, processing relies on S3 trigger`);
        }
      }
      
      // If we have docId, add to appropriate state
      if (docId) {
        // Remove temporary document from legacy state to avoid duplicates
        setDocuments(prev => prev.filter(d => d.id !== newDoc.id));
        
        if (patientId) {
          // Patient document - use new KnowledgeDocument format
          const newDoc: KnowledgeDocument = {
            id: docId,
            s3Key: key,
            filename: file.name,
            dtype: 'KNOWLEDGE_PDF',
            scope: 'PATIENT',
            patientId: patientId,
            status: 'PENDING', // Will be updated when backend processes
            createdAt: new Date().toISOString(),
          };

          // Add to patient docs and start polling if pending
          setPatientDocsByPatientId(prev => ({
            ...prev,
            [patientId]: [...(prev[patientId] || []), newDoc]
          }));
          if (newDoc.status === 'UPLOADING' || newDoc.status === 'PROCESSING' || newDoc.status === 'PENDING') {
            setIsPollingPatientDocs(true);
          }
        } else {
          // Reference document - use legacy format for now
          const documentItem: DocumentItem = {
            id: docId,
            title: file.name,
            d_type: 'KNOWLEDGE_PDF',
            s3_key: key,
            d_status: 'PENDING',
            created_at: new Date().toISOString(),
            size: file.size, // Include file size from upload
          };
          setReferenceDocuments(prev => [...prev, documentItem]);
          // Start polling if document is pending
          if (documentItem.d_status === 'PENDING' || documentItem.d_status === 'PROCESSING') {
            startReferencePolling();
          }
        }
      } else {
        // If no docId, update legacy document state for backward compatibility
        updateDocument(newDoc.id, {
          status: 'ativo',
          uploadStatus: 'complete',
          s3Key: key,
          url: viewUrl || uploadUrl,
        } as Partial<DocumentData> & { d_status?: string });
      }
      
      // Show success notification with processing info if available
      let successMessage = `"${file.name}" foi carregado com sucesso!`;
      if (sqsMessageSent === false) {
        // Only show warning in console, not to user (backend may not have SQS configured)
        console.log(`[Conhecimento] Note: Document processing may take longer (SQS not configured)`);
      }
      showNotification(successMessage, 'success');
      
      // Reload documents for this folder - new implementation will reload automatically via polling
      // Removed setLoadedPatientDocs - no longer needed
    } catch (error) {
      console.error('Erro ao fazer upload para S3:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      updateProgress(newDoc.id, null);
      updateDocument(newDoc.id, { status: 'erro', uploadStatus: 'error' });
      showErrorNotification(`Erro ao fazer upload de "${file.name}"`, errorMessage);
    }
  }, [formatFileSize, folders, updateDocument, updateProgress, validateFile]);

  const createFolder = useCallback(async (_name: string, _withFile?: { file: File; uploadAfter: boolean }) => {
    // Patient folders are now created automatically by backend when patient is created
    // This function is kept for backwards compatibility but should not be used
    showErrorNotification('Operação não disponível', 'Pacientes devem ser criados através do sistema de gestão de pacientes. As pastas são criadas automaticamente.');
    return null;
  }, []);

  const handleFileSelection = useCallback((files: File[]) => {
    const file = files[0];
    if (validateFile(file)) return;
    setPendingFile(file);
    setPendingFiles([]); // Clear batch files
    setFolderModalMode(null);
    setNewFolderName('');
    setSelectedFolderId(null);
  }, [validateFile]);

  // Filter PDF files from a list of files
  const filterPDFs = useCallback((files: File[]): File[] => {
    return files.filter(file => {
      const isPDF = file.type === 'application/pdf' || 
                    file.name.toLowerCase().endsWith('.pdf') ||
                    file.type.includes('pdf');
      return isPDF;
    });
  }, []);

  // Handle folder selection
  const handleFolderSelection = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files);
    const pdfFiles = filterPDFs(fileArray);
    
    if (pdfFiles.length === 0) {
      showErrorNotification('Nenhum PDF encontrado', 'A pasta selecionada não contém arquivos PDF.');
      return;
    }

    // Validate all files before proceeding
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];
    
    pdfFiles.forEach(file => {
      const validation = validateFile(file);
      if (!validation) {
        validFiles.push(file);
      } else if (validation !== 'exists') {
        // Don't add to invalid if it's just a duplicate (exists), we'll skip it
        invalidFiles.push(file.name);
      }
    });

    if (validFiles.length === 0) {
      if (invalidFiles.length > 0) {
        showErrorNotification('Nenhum arquivo válido', `Todos os ${invalidFiles.length} PDF(s) encontrados são inválidos ou já existem.`);
      }
      return;
    }

    if (invalidFiles.length > 0) {
      showNotification(
        `${invalidFiles.length} arquivo(s) ignorado(s) (inválidos ou duplicados), ${validFiles.length} válido(s) serão carregados.`,
        'success'
      );
    }

    setPendingFiles(validFiles);
    setPendingFile(null); // Clear single file
    setFolderModalMode(null);
    setNewFolderName('');
    setSelectedFolderId(null);
  }, [filterPDFs, validateFile]);

  // Batch upload handler
  const handleBatchUpload = useCallback(async (files: File[], folderId: number | null) => {
    if (files.length === 0) return;

    setIsBatchUploading(true);
    setBatchUploadProgress({ total: files.length, completedFiles: 0, currentFileProgress: 0, failed: 0 });

    const targetFolder = folderId ? folders.find(f => f.id === folderId) : undefined;
    let patientId: string | undefined;
    let folderPath: string | undefined;

    if (targetFolder) {
      const extendedFolder = targetFolder as ExtendedFolder;
      if (extendedFolder.patientId) {
        patientId = extendedFolder.patientId;
      } else if (targetFolder.name === REFERENCIAS_FOLDER_NAME) {
        folderPath = 'references-medicas';
      } else {
        folderPath = targetFolder.name?.trim();
      }
    }

    const errors: Array<{ file: string; error: string }> = [];
    let completed = 0;
    let failed = 0;

    // Upload files sequentially to avoid overwhelming the server
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      setBatchUploadProgress(prev => ({
        ...prev,
        currentFile: file.name,
      }));

      try {
        // Create temporary document entry
        const tempDocId = Date.now() + i;
        const newDoc: DocumentData = {
          id: tempDocId,
          name: file.name,
          size: formatFileSize(file.size),
          type: 'PDF',
          date: 'Agora',
          category: 'Novo',
          status: 'processando',
          uploadStatus: 'uploading',
          folderId: folderId || undefined,
        };

        setDocuments(prev => [newDoc, ...prev]);
        
        updateProgress(tempDocId, 0);

        // Upload file with progress tracking
        const { key, docId } = await uploadFileToS3(
          file,
          folderPath,
          patientId,
          (progress) => {
            updateProgress(tempDocId, progress);
            // Update current file progress
            setBatchUploadProgress(prev => ({
              ...prev,
              currentFileProgress: progress,
            }));
          }
        );

        updateProgress(tempDocId, null);

        // Remove temporary document and add to appropriate state
        setDocuments(prev => prev.filter(d => d.id !== tempDocId));

        if (docId) {
          if (patientId) {
            // Patient document
            const newDoc: KnowledgeDocument = {
              id: docId,
              s3Key: key,
              filename: file.name,
              dtype: 'KNOWLEDGE_PDF',
              scope: 'PATIENT',
              patientId: patientId,
              status: 'PENDING',
              createdAt: new Date().toISOString(),
            };

            setPatientDocsByPatientId(prev => ({
              ...prev,
              [patientId]: [...(prev[patientId] || []), newDoc]
            }));

            if (newDoc.status === 'UPLOADING' || newDoc.status === 'PROCESSING' || newDoc.status === 'PENDING') {
              setIsPollingPatientDocs(true);
            }
          } else {
            // Reference document
            const documentItem: DocumentItem = {
              id: docId,
              title: file.name,
              d_type: 'KNOWLEDGE_PDF',
              s3_key: key,
              d_status: 'PENDING',
              created_at: new Date().toISOString(),
              size: file.size,
            };
            
            setReferenceDocuments(prev => [...prev, documentItem]);
            
            if (documentItem.d_status === 'PENDING' || documentItem.d_status === 'PROCESSING') {
              startReferencePolling();
            }
          }
        }

        completed++;
        // Update progress after file completes
        setBatchUploadProgress(prev => ({
          ...prev,
          completedFiles: completed,
          currentFileProgress: 0,
          currentFile: undefined, // Clear current file when done
        }));

        console.log(`[Batch Upload] Successfully uploaded: ${file.name}`);
      } catch (error) {
        failed++;
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        errors.push({ file: file.name, error: errorMessage });
        setBatchUploadProgress(prev => ({
          ...prev,
          failed,
        }));
        console.error(`[Batch Upload] Error uploading ${file.name}:`, error);
      }
    }

    setIsBatchUploading(false);
    setPendingFiles([]);

    // Show final notification
    if (completed > 0 && failed === 0) {
      showNotification(
        `${completed} arquivo(s) carregado(s) com sucesso!`,
        'success'
      );
    } else if (completed > 0 && failed > 0) {
      showErrorNotification(
        'Upload parcialmente concluído',
        `${completed} arquivo(s) carregado(s), ${failed} falharam. Verifique os erros na lista.`
      );
    } else {
      showErrorNotification(
        'Falha no upload',
        `Nenhum arquivo foi carregado. ${failed} falha(s) ocorreu(ram).`
      );
    }

    // Expand target folder if it's a patient folder
    if (folderId) {
      setExpandedFolders(prev => new Set(prev).add(folderId));
    }
  }, [folders, formatFileSize, updateProgress, startReferencePolling]);

  const handleCreateFolderAndUpload = useCallback(async () => {
    if (!pendingFile || !newFolderName.trim()) return;
    await createFolder(newFolderName.trim(), { file: pendingFile, uploadAfter: true });
    setPendingFile(null);
    setFolderModalMode(null);
    setNewFolderName('');
  }, [pendingFile, newFolderName, createFolder]);

  const handleSelectFolderAndUpload = useCallback(async () => {
    if (pendingFiles.length > 0 && selectedFolderId !== null) {
      // Batch upload
      await handleBatchUpload(pendingFiles, selectedFolderId);
      setPendingFiles([]);
      setFolderModalMode(null);
      setSelectedFolderId(null);
    } else if (pendingFile && selectedFolderId !== null) {
      // Single file upload
      await handleFileUpload(pendingFile, selectedFolderId);
      setPendingFile(null);
      setFolderModalMode(null);
      setSelectedFolderId(null);
    }
  }, [pendingFile, pendingFiles, selectedFolderId, handleFileUpload, handleBatchUpload]);

  const handleCancelFolderSelection = useCallback(() => {
    setPendingFile(null);
    setPendingFiles([]);
    setFolderModalMode(null);
    setNewFolderName('');
    setSelectedFolderId(null);
  }, []);

  const handleCreateFolder = useCallback(async () => {
    if (!createFolderName.trim()) return;
    await createFolder(createFolderName.trim());
    setShowCreateFolderModal(false);
    setCreateFolderName('');
  }, [createFolderName, createFolder]);

  const handleRequestDelete = useCallback((doc: DocumentData) => {
    setDocumentToDelete(doc);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!documentToDelete) return;

    try {
      // Always use deleteFileFromS3 when we have an S3 key
      // It deletes from both S3 and database (confirmed by backend implementation)
      // This ensures consistent deletion for both patient and reference documents
      if (!documentToDelete.s3Key) {
        throw new Error('Não foi possível deletar: chave S3 não encontrada');
      }
      
      // deleteFileFromS3 uses POST /s3/interface with action "delete"
      // Backend handles deletion from both S3 and database documents table
      // This works for both patient documents and reference documents
      await deleteFileFromS3(documentToDelete.s3Key);
      
      const folderId = documentToDelete.folderId;
      setDocuments(prev => prev.filter(d => d.id !== documentToDelete.id));
      
      // Reload folder after deletion to ensure consistency
      if (folderId !== undefined && folderId !== null) {
        const folder = folders.find(f => f.id === folderId);
        const extendedFolder = folder as ExtendedFolder | undefined;
        if (extendedFolder?.patientId) {
          // Patient folder - remove from map and reload
          const docId = documentToDelete.s3Key?.split('/').pop()?.replace('.pdf', '') || '';
          if (docId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(docId)) {
            setPatientDocsByPatientId(prev => ({
              ...prev,
              [extendedFolder.patientId!]: (prev[extendedFolder.patientId!] || []).filter(d => d.id !== docId)
            }));
          }
        } else if (folder?.name === REFERENCIAS_FOLDER_NAME) {
          // Referências Médicas folder - reload references
          setReferenciasDocsLoaded(false);
        }
      } else {
        // Document without folderId might be from references - reload to be safe
        setReferenciasDocsLoaded(false);
      }
      
      showNotification(`"${documentToDelete.name}" foi deletado com sucesso!`, 'success');
    } catch (error) {
      console.error('Erro ao deletar arquivo:', error);
      showErrorNotification(`Erro ao deletar "${documentToDelete.name}"`, error instanceof Error ? error.message : 'Erro desconhecido');
    }
    setDocumentToDelete(null);
  }, [documentToDelete, documents, folders, selectedPatientId]);

  const handleCancelDelete = useCallback(() => {
    setDocumentToDelete(null);
  }, []);

  const handleRequestDeleteFolder = useCallback((folder: FolderType) => {
    // Prevent deletion of "Referências médicas" folder
    if (folder.name === REFERENCIAS_FOLDER_NAME) {
      return;
    }
    setFolderToDelete(folder);
    setFolderRemoveConfirmText('');
  }, []);

  const handleConfirmDeleteFolder = useCallback(async () => {
    if (!folderToDelete) return;

    try {
      const extendedFolder = folderToDelete as ExtendedFolder;
      
      // If this is a patient folder, use deletePatient API
      if (extendedFolder.patientId) {
        await deletePatientApi(extendedFolder.patientId);
        
        // Remove from local state
        setFolders(prev => prev.filter(f => f.id !== folderToDelete.id));
        setDocuments(prev => prev.filter(d => d.folderId !== folderToDelete.id));
        // Remove from patientDocsByPatientId map
        setPatientDocsByPatientId(prev => {
          const updated = { ...prev };
          delete updated[extendedFolder.patientId!];
          return updated;
        });
        
        // Dispatch event to notify PatientPop to reload patients
        window.dispatchEvent(new CustomEvent('patientDeleted', { 
          detail: { patientId: extendedFolder.patientId } 
        }));
        
        const displayName = getFolderDisplayName(folderToDelete.name);
        showNotification(`Pasta "${displayName}" foi removida com sucesso!`, 'success');
      } else {
        // For non-patient folders (shouldn't happen for patient folders, but handle gracefully)
        const folderDocuments = documents.filter(doc => doc.folderId === folderToDelete.id);
        for (const doc of folderDocuments) {
          if (doc.s3Key) await deleteFileFromS3(doc.s3Key).catch(console.error);
        }
        setFolders(prev => prev.filter(f => f.id !== folderToDelete.id));
        setDocuments(prev => prev.filter(d => d.folderId !== folderToDelete.id));
        const displayName = getFolderDisplayName(folderToDelete.name);
        showNotification(`Pasta "${displayName}" foi deletada com sucesso!`, 'success');
      }
    } catch (error) {
      console.error('[Conhecimento] Error deleting folder:', error);
      const displayName = getFolderDisplayName(folderToDelete.name);
      showErrorNotification(`Erro ao deletar pasta "${displayName}"`, error instanceof Error ? error.message : 'Erro desconhecido');
    }
    setFolderToDelete(null);
  }, [folderToDelete, documents, getFolderDisplayName]);

  const handleCancelDeleteFolder = useCallback(() => {
    setFolderToDelete(null);
    setFolderRemoveConfirmText('');
  }, []);

  // Track overlays for global dimming
  useEffect(() => {
    if (!pendingFile) return;
    registerOverlay();
    return () => {
      unregisterOverlay();
    };
  }, [pendingFile, registerOverlay, unregisterOverlay]);

  useEffect(() => {
    if (!showCreateFolderModal) return;
    registerOverlay();
    return () => {
      unregisterOverlay();
    };
  }, [showCreateFolderModal, registerOverlay, unregisterOverlay]);

  useEffect(() => {
    if (!documentToDelete) return;
    registerOverlay();
    return () => {
      unregisterOverlay();
    };
  }, [documentToDelete, registerOverlay, unregisterOverlay]);

  useEffect(() => {
    if (!folderToDelete) return;
    registerOverlay();
    return () => {
      unregisterOverlay();
    };
  }, [folderToDelete, registerOverlay, unregisterOverlay]);

  useEffect(() => {
    if (!isBatchUploading) return;
    registerOverlay();
    return () => {
      unregisterOverlay();
    };
  }, [isBatchUploading, registerOverlay, unregisterOverlay]);

  const handleDragStart = useCallback((doc: DocumentData) => setDraggedDocument(doc), []);
  const handleDragEnd = useCallback(() => {
    setDraggedDocument(null);
    setDragOverFolder(null);
  }, []);

  const handleFolderDragOver = useCallback((e: React.DragEvent, folderId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedDocument && draggedDocument.folderId !== folderId) setDragOverFolder(folderId);
  }, [draggedDocument]);

  const handleFolderDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolder(null);
  }, []);

  const handleFolderDrop = useCallback(async (e: React.DragEvent, targetFolderId: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedDocument?.s3Key || draggedDocument.folderId === targetFolderId) {
      setDragOverFolder(null);
      return;
    }

    const targetFolder = folders.find(f => f.id === targetFolderId) as ExtendedFolder | undefined;
    if (!targetFolder) {
      setDragOverFolder(null);
      return;
    }

    // Can only move between patient folders (not to/from Referências Médicas)
    const sourceFolder = draggedDocument.folderId !== undefined 
      ? folders.find(f => f.id === draggedDocument.folderId) as ExtendedFolder | undefined
      : undefined;
    
    if (!targetFolder.patientId) {
      showErrorNotification('Erro ao mover arquivo', 'Não é possível mover arquivos para "Referências Médicas" arrastando.');
      setDragOverFolder(null);
      setDraggedDocument(null);
      return;
    }

    if (sourceFolder?.name === REFERENCIAS_FOLDER_NAME) {
      showErrorNotification('Erro ao mover arquivo', 'Não é possível mover arquivos de "Referências Médicas" desta forma.');
      setDragOverFolder(null);
      setDraggedDocument(null);
      return;
    }

    try {
      // Extract document ID from S3 key
      const s3KeyParts = draggedDocument.s3Key.split('/');
      const filename = s3KeyParts[s3KeyParts.length - 1];
      const possibleDocId = filename.replace('.pdf', '');
      
      // Check if it looks like a UUID (document ID)
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(possibleDocId);
      
      if (isUuid && targetFolder.patientId) {
        // Use new API for moving between patient folders
        await moveDocumentApi(possibleDocId, targetFolder.patientId);
        
        // Update local state
        updateDocument(draggedDocument.id, {
          folderId: targetFolderId,
        });
        
        // Reload both source and target folders - will reload automatically via polling/selectedPatientId change
        // Removed setLoadedPatientDocs - no longer needed
        
        const targetFolderDisplayName = getFolderDisplayName(targetFolder.name);
        showNotification(`"${draggedDocument.name}" foi movido para "${targetFolderDisplayName}"`, 'success');
        setExpandedFolders(prev => new Set(prev).add(targetFolderId));
      } else {
        // Fallback to old method if we can't extract document ID
        const fileName = draggedDocument.s3Key.split('/').pop() || draggedDocument.name;
        const newKey = `${targetFolder.name}/${fileName}`;
        
        await moveFileInS3(draggedDocument.s3Key, newKey, fileName, 'application/pdf');
        const newViewUrl = await getPresignedViewUrl(newKey).catch(() => undefined);
        
        updateDocument(draggedDocument.id, {
          folderId: targetFolderId,
          s3Key: newKey,
          url: newViewUrl || draggedDocument.url
        });
        
        const targetFolderDisplayName = getFolderDisplayName(targetFolder.name);
        showNotification(`"${draggedDocument.name}" foi movido para "${targetFolderDisplayName}"`, 'success');
        setExpandedFolders(prev => new Set(prev).add(targetFolderId));
      }
    } catch (error) {
      console.error('[Conhecimento] Error moving file:', error);
      showErrorNotification(`Erro ao mover "${draggedDocument.name}"`, error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setDraggedDocument(null);
      setDragOverFolder(null);
    }
  }, [draggedDocument, folders, documents, updateDocument, getFolderDisplayName]);

  const normalize = useCallback((text: string) => {
    return text
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .trim();
  }, []);

  // Combine patientDocuments and referenceDocuments with legacy documents
  const allDocuments = useMemo(() => {
    const combined: DocumentData[] = [...documents];
    
    // Add reference documents
    const referenciasFolder = folders.find(f => f.name === REFERENCIAS_FOLDER_NAME);
    if (referenciasFolder) {
      referenceDocuments.forEach(item => {
        combined.push(convertDocumentItemToData(item, referenciasFolder.id));
      });
    }
    
    // Add patient documents from all patients (not just selected one)
    // Map each folder's patientId to its documents
    folders.forEach(folder => {
      const extendedFolder = folder as ExtendedFolder;
      if (extendedFolder.patientId) {
        const docsForPatient = patientDocsByPatientId[extendedFolder.patientId] || [];
        docsForPatient.forEach(doc => {
          // Convert KnowledgeDocument to DocumentItem format
          let d_status: 'PENDING' | 'PROCESSING' | 'READY' | 'ERROR' = 'READY';
          if (doc.status === 'PENDING' || doc.status === 'UPLOADING') {
            d_status = 'PENDING';
          } else if (doc.status === 'PROCESSING') {
            d_status = 'PROCESSING';
          } else if (doc.status === 'ERROR' || doc.status === 'FAILED') {
            d_status = 'ERROR';
          } else if (doc.status === 'READY') {
            d_status = 'READY';
          }

          const documentItem: DocumentItem = {
            id: doc.id,
            title: doc.filename,
            d_type: doc.dtype,
            s3_key: doc.s3Key,
            d_status,
            created_at: doc.createdAt,
            size: doc.size || 0,
          };
          combined.push(convertDocumentItemToData(documentItem, folder.id));
        });
      }
    });
    
    return combined;
  }, [documents, referenceDocuments, patientDocsByPatientId, folders, convertDocumentItemToData]);

  const filteredDocuments = useMemo(() => {
    if (!searchTerm.trim()) return allDocuments;
    const term = normalize(searchTerm);
    return allDocuments.filter(doc => normalize(doc.name).includes(term));
  }, [allDocuments, searchTerm, normalize]);

  const documentsByFolder = useMemo(() => {
    const grouped: Record<number, DocumentData[]> = {};
    const noFolder: DocumentData[] = [];
    filteredDocuments.forEach(doc => {
      if (doc.folderId !== undefined && doc.folderId !== null) {
        if (!grouped[doc.folderId]) grouped[doc.folderId] = [];
        grouped[doc.folderId].push(doc);
      } else {
        noFolder.push(doc);
      }
    });
    return { grouped, noFolder };
  }, [filteredDocuments]);

  const filteredFolders = useMemo(() => {
    if (!searchTerm.trim()) return folders;
    return folders.filter(folder => documentsByFolder.grouped[folder.id]?.length > 0);
  }, [folders, documentsByFolder, searchTerm]);

  // Separate patient folders from "Referências médicas" folder and sort alphabetically
  // Debug: Log when folders state changes
  useEffect(() => {
    console.log('[Conhecimento] Folders state changed:', folders.length, folders);
    const patientFoldersFromState = folders.filter(f => (f as ExtendedFolder).patientId);
    console.log('[Conhecimento] Patient folders in state:', patientFoldersFromState.length, patientFoldersFromState);
  }, [folders]);

  const patientFolders = useMemo(() => {
    // When searching, use filteredFolders (which filters by documents)
    // When not searching, show all folders except Referências
    const foldersToUse = searchTerm.trim() ? filteredFolders : folders;
    const filtered = foldersToUse.filter(folder => folder.name !== REFERENCIAS_FOLDER_NAME);
    const sorted = filtered.sort((a, b) => {
      const nameA = a.name.split('__tag_')[0].toLowerCase();
      const nameB = b.name.split('__tag_')[0].toLowerCase();
      return nameA.localeCompare(nameB);
    });
    console.log('[Conhecimento] patientFolders computed:', sorted.length, 'from', foldersToUse.length, 'folders');
    return sorted;
  }, [filteredFolders, folders, searchTerm]);

  const referenciasFolder = useMemo(() => {
    return folders.find(folder => folder.name === REFERENCIAS_FOLDER_NAME);
  }, [folders]);

  // Construct dynamic title for Referências section (h3 title - keep simple)
  const referenciasTitle = useMemo(() => {
    return 'Referências';
  }, []);

  // Construct dynamic folder name for Referências folder (h4 - with treatment and first name)
  const referenciasFolderName = useMemo(() => {
    if (doctorFirstName) {
      if (doctorTreatment && doctorTreatment !== 'Nenhum') {
        return `Referências ${doctorTreatment} ${doctorFirstName}`;
      }
      return `Referências ${doctorFirstName}`;
    }
    return 'Referências';
  }, [doctorFirstName, doctorTreatment]);

  const toggleFolder = useCallback((folderId: number) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      newSet.has(folderId) ? newSet.delete(folderId) : newSet.add(folderId);
      return newSet;
    });
  }, []);

  useEffect(() => {
    if (searchTerm.trim()) {
      filteredFolders.forEach(folder => {
        if (documentsByFolder.grouped[folder.id]?.length > 0) {
          setExpandedFolders(prev => new Set(prev).add(folder.id));
        }
      });
    }
  }, [searchTerm, filteredFolders, documentsByFolder]);

  // Load patients from database on mount
  useEffect(() => {
    const loadPatients = async () => {
      try {
        setIsLoading(true);
        console.log('[Conhecimento] Loading patients from database...');
        const response = await listMyPatients();
        console.log('[Conhecimento] API response:', response);
        
        const patientsList = response.patients || [];
        console.log('[Conhecimento] Patients list:', patientsList);
        console.log('[Conhecimento] Number of patients:', patientsList.length);
        
        // Patients are stored in folders with patientId property

        // Create folder entries for each patient
        // Validate patient data before creating folders
        const validPatients = patientsList.filter((patient: any) => {
          const isValid = patient && patient.id && patient.full_name;
          if (!isValid) {
            console.warn('[Conhecimento] Invalid patient data, skipping:', patient);
          }
          return isValid;
        });
        
        console.log('[Conhecimento] Valid patients for folder creation:', validPatients.length);
        
        const patientFolders: ExtendedFolder[] = validPatients.map((patient: any, index: number) => {
          const folderName = patient.full_name || `Paciente ${patient.id}`;
          const description = patient.case_description || patient.description || '';
          console.log(`[Conhecimento] Creating folder for patient: ${folderName} (ID: ${patient.id}, Description: ${description})`);
          return {
            id: Date.now() + index,
            name: folderName,
            createdAt: new Date(),
            patientId: patient.id, // Store patient UUID for API calls
            patientDescription: description, // Store patient description
          };
        });

        console.log('[Conhecimento] Created patient folders:', patientFolders);

        // Always include "Referências médicas" folder
        const referenciasFolder: ExtendedFolder = {
          id: Date.now() + 999999,
          name: REFERENCIAS_FOLDER_NAME,
          createdAt: new Date(),
        };

        const allFolders = [referenciasFolder, ...patientFolders];
        console.log('[Conhecimento] Setting folders (total):', allFolders.length, allFolders);
        setFolders(allFolders);
      } catch (error) {
        // Only show error for real server errors (500, etc), not for "no patients" scenarios
        // listMyPatients() already handles 404 and network errors gracefully by returning empty array
        console.error('[Conhecimento] Error loading patients:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        const statusCode = (error as Error & { status?: number }).status;
        
        // Only show error for server errors (5xx), not for client errors (4xx) or network issues
        if (statusCode && statusCode >= 500) {
          console.error('[Conhecimento] Server error loading patients:', error);
          showErrorNotification('Erro ao carregar pacientes', errorMessage);
        } else {
          // For any other case (404, network issues, etc), treat as "no patients"
          // This provides better UX - no error messages for expected scenarios
          console.log('[Conhecimento] No patients available or endpoint not ready - showing empty state');
        }
        
        // Always show Referências Médicas folder, even on error
        setFolders([{
          id: Date.now() + 999999,
          name: REFERENCIAS_FOLDER_NAME,
          createdAt: new Date(),
        }]);
      } finally {
        setIsLoading(false);
      }
    };

    loadPatients();
  }, []);

  // Load documents for all patients on initial mount (to show counts even when folders are collapsed)
  useEffect(() => {
    const loadAllPatientDocuments = async () => {
      // Only load if we have folders
      if (folders.length === 0) return;
      
      // Get all patient folders (those with patientId)
      const patientFoldersList = folders.filter(f => (f as ExtendedFolder).patientId) as ExtendedFolder[];
      
      // Load documents for each patient in parallel
      const loadPromises = patientFoldersList.map(async (folder) => {
        const patientId = folder.patientId!;
        
        // Skip if we already have documents for this patient
        if (patientDocsByPatientId[patientId]) {
          return;
        }
        
        try {
          const docs = await listPatientKnowledgeDocuments(patientId);
          // Update the map - this will trigger allDocuments to update and show correct counts
          setPatientDocsByPatientId(prev => ({
            ...prev,
            [patientId]: docs
          }));
        } catch (err) {
          console.error(`[Conhecimento] Failed to load documents for patient ${patientId}:`, err);
          // Set empty array on error to prevent retries
          setPatientDocsByPatientId(prev => ({
            ...prev,
            [patientId]: []
          }));
        }
      });
      
      // Load all in parallel, but don't wait for all to complete
      Promise.all(loadPromises).catch(err => {
        console.error('[Conhecimento] Error loading some patient documents:', err);
      });
    };
    
    loadAllPatientDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folders.length]); // Only depend on folders.length to load once when folders are set

  // Load doctor data from localStorage for dynamic title
  useEffect(() => {
    const loadDoctorData = async () => {
      try {
        const storedDoctor = localStorage.getItem('oasis_doctor_profile');
        if (storedDoctor) {
          const doctorProfile = JSON.parse(storedDoctor);
          setDoctorFirstName(doctorProfile.firstName || doctorProfile.first_name || '');
          const treatment = doctorProfile.treatment || '';
          if (treatment && ['Dr.', 'Dra.', 'Sr.', 'Sra.'].includes(treatment)) {
            setDoctorTreatment(treatment);
          } else {
            setDoctorTreatment('');
          }
        }
      } catch (error) {
        console.error('[Conhecimento] Erro ao carregar dados do médico:', error);
      }
    };
    
    loadDoctorData();
  }, []);

  // Reload patients when a new patient is created or deleted
  useEffect(() => {
    const handlePatientCreated = async () => {
      try {
        setIsLoading(true);
        const response = await listMyPatients();
        const patientsList = response.patients || [];

        // Create folder entries for each patient
        const patientFolders: ExtendedFolder[] = patientsList.map((patient, index) => ({
          id: Date.now() + index,
          name: patient.full_name,
          createdAt: new Date(),
          patientId: patient.id, // Store patient UUID for API calls
          patientDescription: patient.case_description || patient.description || '', // Store patient description
        }));

        // Always include "Referências médicas" folder
        const referenciasFolder: ExtendedFolder = {
          id: Date.now() + 999999,
          name: REFERENCIAS_FOLDER_NAME,
          createdAt: new Date(),
        };

        setFolders([referenciasFolder, ...patientFolders]);
        
        // Reload documents for all patients to update counts
        const loadAllPatientDocuments = async () => {
          const loadPromises = patientFolders.map(async (folder) => {
            const patientId = folder.patientId!;
            try {
              const docs = await listPatientKnowledgeDocuments(patientId);
              setPatientDocsByPatientId(prev => ({
                ...prev,
                [patientId]: docs
              }));
              // Check if we need to poll for the selected patient
              if (selectedPatientId === patientId && hasPendingDocs(docs)) {
                setIsPollingPatientDocs(true);
              }
            } catch (err) {
              console.error(`[Conhecimento] Failed to load documents for patient ${patientId}:`, err);
            }
          });
          await Promise.all(loadPromises);
        };
        await loadAllPatientDocuments();
      } catch (error) {
        console.error('[Conhecimento] Error reloading patients after creation:', error);
        // Don't show error notification - just log it
      } finally {
        setIsLoading(false);
      }
    };

    const handlePatientDeleted = async () => {
      try {
        setIsLoading(true);
        const response = await listMyPatients();
        const patientsList = response.patients || [];
        const existingPatientIds = new Set(patientsList.map(p => p.id));

        // Update folders and clean up documents in a coordinated way
        setFolders(prevFolders => {
          // Remove documents from deleted patient folders
          setDocuments(prevDocs => {
            return prevDocs.filter(doc => {
              // Keep documents from Referências Médicas (no patientId)
              if (doc.folderId === undefined || doc.folderId === null) {
                return true;
              }
              
              // Find the folder to check if it's a patient folder
              const folder = prevFolders.find(f => f.id === doc.folderId) as ExtendedFolder | undefined;
              if (!folder || !folder.patientId) {
                return true; // Keep non-patient folder documents
              }
              
              // Only keep documents from existing patients
              return existingPatientIds.has(folder.patientId);
            });
          });
          
          // Removed setLoadedPatientDocs - no longer needed
          // Documents will reload automatically when patient folder is expanded

          // Create folder entries for each patient
          const patientFolders: ExtendedFolder[] = patientsList.map((patient, index) => ({
            id: Date.now() + index,
            name: patient.full_name,
            createdAt: new Date(),
            patientId: patient.id, // Store patient UUID for API calls
            patientDescription: patient.case_description || patient.description || '', // Store patient description
          }));

          // Always include "Referências médicas" folder
          const referenciasFolder: ExtendedFolder = {
            id: Date.now() + 999999,
            name: REFERENCIAS_FOLDER_NAME,
            createdAt: new Date(),
          };

          // Return updated folders
          return [referenciasFolder, ...patientFolders];
        });
      } catch (error) {
        console.error('[Conhecimento] Error reloading patients after deletion:', error);
        // Don't show error notification - just log it
      } finally {
        setIsLoading(false);
      }
    };

    window.addEventListener('patientCreated', handlePatientCreated);
    window.addEventListener('patientDeleted', handlePatientDeleted);
    return () => {
      window.removeEventListener('patientCreated', handlePatientCreated);
      window.removeEventListener('patientDeleted', handlePatientDeleted);
    };
  }, []);

  // Load "Referências Médicas" documents on mount (only once when folders are first set)
  useEffect(() => {
    const referenciasFolder = folders.find(f => f.name === REFERENCIAS_FOLDER_NAME);
    
    // Only load if folder exists and hasn't been loaded yet
    if (!referenciasFolder || referenciasDocsLoaded) return;

    const loadReferenciasDocs = async () => {
      try {
        const response = await listReferencesMedicas();
        if (!referenciasFolder) return;

        // Map to DocumentItem format
        const docsArray: DocumentItem[] = (response.items || []).map((item) => {
          return {
            id: item.id || item.documentId || item.s3Key || '',
            title: item.title || item.name || null,
            d_type: item.d_type || 'KNOWLEDGE_PDF',
            s3_key: item.s3_key || item.s3Key || '',
            d_status: item.d_status || item.status || 'READY',
            created_at: item.created_at || item.lastModified || new Date().toISOString(),
            last_error: item.last_error,
            size: item.size || 0, // Include size from API response
          };
        });

        setReferenceDocuments(docsArray);
        setReferenciasDocsLoaded(true);
        
        // If there are pending docs, start polling
        const hasPending = docsArray.some(
          (d) => d.d_status === 'PENDING' || d.d_status === 'PROCESSING'
        );
        if (hasPending) {
          startReferencePolling();
        } else if (!hasPending && isPollingReferenceDocs) {
          console.log('[Conhecimento] No pending reference documents found, stopping polling');
          setIsPollingReferenceDocs(false);
          hasStartedRefPollingRef.current = false;
        }
      } catch (error) {
        // listReferencesMedicas() now handles errors gracefully by returning empty array
        // Only real server errors (500+) will reach here
        const statusCode = (error as Error & { status?: number }).status;
        if (statusCode && statusCode >= 500) {
          console.error('[Conhecimento] Server error loading Referências Médicas:', error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          showErrorNotification('Erro ao carregar Referências Médicas', errorMessage);
        } else {
          // Other errors are handled silently by the API function
          console.log('[Conhecimento] Referências Médicas not available - showing empty state');
        }
        setReferenciasDocsLoaded(true); // Mark as loaded even on error to prevent retries
      }
    };

    loadReferenciasDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folders.length, formatFileSize]); // Only depend on folders.length to avoid infinite loops

  // Load patient documents ONCE when patient changes - NO LOOPS!
  useEffect(() => {
    if (!selectedPatientId) {
      setIsPollingPatientDocs(false);
      return;
    }

    // Check if we already have documents for this patient
    const existingDocs = patientDocsByPatientId[selectedPatientId];
    if (existingDocs) {
      // Check if we need to poll
      if (hasPendingDocs(existingDocs)) {
        setIsPollingPatientDocs(true);
      } else {
        setIsPollingPatientDocs(false);
      }
      return;
    }

    let cancelled = false;

    const loadOnce = async () => {
      try {
        const docs = await listPatientKnowledgeDocuments(selectedPatientId);
        if (cancelled) return;

        // Store documents per patientId
        setPatientDocsByPatientId(prev => ({
          ...prev,
          [selectedPatientId]: docs
        }));

        // If there are pending docs, start polling
        if (hasPendingDocs(docs)) {
          setIsPollingPatientDocs(true);
        } else {
          setIsPollingPatientDocs(false);
        }
      } catch (err: any) {
        console.error('[Conhecimento] Failed to load patient docs', err);
        
        // Handle 403 Forbidden - patient may be archived/deleted (ghost patient fix)
        // listPatientKnowledgeDocuments already returns empty array for 403, but handle explicitly
        if (err?.status === 403 || err?.isForbidden) {
          console.warn('[Conhecimento] Patient is not accessible (may be archived):', selectedPatientId);
          // Store empty array - patient is not accessible
          if (!cancelled) {
            setPatientDocsByPatientId(prev => ({
              ...prev,
              [selectedPatientId]: []
            }));
          }
          setIsPollingPatientDocs(false);
          return;
        }
        
        if (!cancelled) {
          setIsPollingPatientDocs(false);
        }
      }
    };

    loadOnce();

    return () => {
      cancelled = true;
    };
  }, [selectedPatientId, patientDocsByPatientId]); // Include patientDocsByPatientId to check cache

  // Note: patientDocuments state was removed - we now use patientDocsByPatientId directly
  // The conversion from KnowledgeDocument to DocumentItem happens in allDocuments useMemo

  // Controlled polling for reference documents - NO LOOPS, stops automatically
  useEffect(() => {
    if (!isPollingReferenceDocs) {
      return;
    }

    // ✅ FUSÍVEL: evita múltiplos pollers rodando em paralelo
    if (hasStartedRefPollingRef.current) {
      console.log('[Conhecimento] Polling já foi iniciado, ignorando novo useEffect.');
      return;
    }
    hasStartedRefPollingRef.current = true;

    let cancelled = false;
    let timeoutId: number | undefined;

    console.log(
      '[Conhecimento] ✅ Starting reference documents polling... (useEffect triggered, isPollingReferenceDocs=',
      isPollingReferenceDocs,
      ')'
    );

    const poll = async (attempt = 1) => {
      if (cancelled) return;

      console.log(
        `[Conhecimento] Polling reference documents for status updates... (attempt ${attempt}/60)`
      );

      try {
        const response = await listReferencesMedicas();
        if (cancelled) return;

        const docsArray: DocumentItem[] = (response.items || []).map((item) => ({
          id: item.id || item.documentId || item.s3Key || '',
          title: item.title || item.name || null,
          d_type: item.d_type || 'KNOWLEDGE_PDF',
          s3_key: item.s3_key || item.s3Key || '',
          d_status: item.d_status || item.status || 'READY',
          created_at: item.created_at || item.lastModified || new Date().toISOString(),
          last_error: item.last_error,
          size: item.size || 0, // Include size from API response
        }));

        // Update documents that changed status
        setReferenceDocuments(prev => {
          const updated = prev.map(prevDoc => {
            const newDoc = docsArray.find(d => d.id === prevDoc.id);
            if (newDoc && newDoc.d_status !== prevDoc.d_status) {
              console.log(`[Conhecimento] Reference document ${prevDoc.id} status changed: ${prevDoc.d_status} -> ${newDoc.d_status}`);
              return newDoc;
            }
            return prevDoc;
          });
          // Add any new documents
          docsArray.forEach(newDoc => {
            if (!updated.find(d => d.id === newDoc.id)) {
              updated.push(newDoc);
            }
          });
          return updated;
        });

        // Filter documents that are still processing
        // Backend S3 event handler sets status to READY automatically when file is uploaded
        // Polling stops when no documents are PENDING or PROCESSING
        const pending = docsArray.filter((d) =>
          ['PENDING', 'PROCESSING'].includes(d.d_status || '')
        );

        // Stop polling when all documents are READY or ERROR, or after 60 attempts (5 minutes)
        const shouldContinue = pending.length > 0 && attempt < 60;

        console.log(
          `[Conhecimento] Poll result: ${docsArray.length} docs, ${pending.length} pending, shouldContinue=${shouldContinue}, attempt=${attempt}`
        );

        if (!cancelled && shouldContinue) {
          timeoutId = window.setTimeout(() => poll(attempt + 1), 5000);
        } else {
          console.log('[Conhecimento] Stopping reference polling.');
          setIsPollingReferenceDocs(false);
          // 🔄 Libera para um próximo ciclo no futuro (novo upload, etc.)
          hasStartedRefPollingRef.current = false;
        }
      } catch (err) {
        console.error('[Conhecimento] Error while polling reference docs', err);

        if (!cancelled && attempt < 60) {
          timeoutId = window.setTimeout(() => poll(attempt + 1), 5000);
        } else {
          setIsPollingReferenceDocs(false);
          hasStartedRefPollingRef.current = false;
        }
      }
    };

    poll();

    return () => {
      console.log('[Conhecimento] Cleaning up reference polling (useEffect cleanup)');
      cancelled = true;
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      // 👀 IMPORTANTE: NÃO zera hasStartedRefPollingRef aqui!
      // Senão o StrictMode chamaria o effect de novo e criaria outro poller.
    };
  }, [isPollingReferenceDocs]);

  // Controlled polling for patient documents - NO LOOPS, stops automatically
  const POLL_INTERVAL_MS = 5000;

  useEffect(() => {
    if (!selectedPatientId) return;
    if (!isPollingPatientDocs) return;

    console.log('[Conhecimento] Polling patient documents for status updates...');

    let cancelled = false;
    let timeoutId: number | undefined;

    const doPoll = async () => {
      try {
        const docs = await listPatientKnowledgeDocuments(selectedPatientId);
        if (cancelled) return;

        // Update the map
        setPatientDocsByPatientId(prev => ({
          ...prev,
          [selectedPatientId]: docs
        }));

        // Backend S3 event handler sets status to READY automatically when file is uploaded
        // Polling stops when no documents are PENDING or PROCESSING
        if (hasPendingDocs(docs)) {
          // Still has pending docs → schedule next poll
          timeoutId = window.setTimeout(doPoll, POLL_INTERVAL_MS);
        } else {
          // No pending docs → stop polling (all documents are READY or ERROR)
          setIsPollingPatientDocs(false);
        }
      } catch (err: any) {
        console.error('[Conhecimento] Polling error', err);
        
        // Handle 403 Forbidden - patient may be archived/deleted (ghost patient fix)
        // listPatientKnowledgeDocuments already returns empty array for 403, but handle explicitly
        if (err?.status === 403 || err?.isForbidden) {
          console.warn('[Conhecimento] Patient no longer accessible during polling - stopping');
          // Clear documents for this patient and stop polling
          setPatientDocsByPatientId(prev => {
            const updated = { ...prev };
            delete updated[selectedPatientId];
            return updated;
          });
          setIsPollingPatientDocs(false);
          return;
        }
        
        if (!cancelled) {
          // On other errors, try again after interval (network issues, etc.)
          timeoutId = window.setTimeout(doPoll, POLL_INTERVAL_MS);
        }
      }
    };

    // First poll call
    doPoll();

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    };
  }, [selectedPatientId, isPollingPatientDocs]); // NO patientDocs in deps - prevents loops!

  // Detect if files come from a folder selection (have webkitRelativePath with folder structure)
  const isFolderSelection = useCallback((files: FileList | File[]): boolean => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return false;
    
    // Check if files have webkitRelativePath with folder structure (contains '/')
    // When folder is selected, files will have paths like "folder/subfolder/file.pdf"
    const hasRelativePaths = fileArray.some(file => {
      const relativePath = (file as any).webkitRelativePath;
      return relativePath && relativePath.includes('/');
    });
    
    return hasRelativePaths;
  }, []);

  const dragHandlers = useMemo(() => ({
    onDragOver: (e: React.DragEvent) => { 
      e.preventDefault(); 
      setIsDragging(true); 
    },
    onDragLeave: (e: React.DragEvent) => { 
      e.preventDefault(); 
      setIsDragging(false); 
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      
      const files = Array.from(e.dataTransfer.files);
      
      // Detect if dropped items come from a folder (check for webkitRelativePath)
      if (files.length > 0 && isFolderSelection(files)) {
        handleFolderSelection(e.dataTransfer.files);
      } else {
        handleFileSelection(files);
      }
    }
  }), [handleFileSelection, handleFolderSelection, isFolderSelection]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      
      // Detect if this is a folder selection or individual file selection
      if (isFolderSelection(e.target.files)) {
        // Handle as folder selection - filter PDFs and batch upload
        handleFolderSelection(e.target.files);
      } else {
        // Handle as individual file(s) selection
        handleFileSelection(files);
      }
      
      e.target.value = '';
    }
  }, [handleFileSelection, handleFolderSelection, isFolderSelection]);


  if (isLoading) {
    return (
      <div className="flex h-full min-h-[80vh] items-center justify-center bg-white -mt-12">
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 border-4 border-oasis-blue/30 border-t-oasis-blue rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Carregando página...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white relative">
      {/* Batch Upload Progress Modal */}
      {isBatchUploading && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in-0"
        >
          <div 
            className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-lg mx-4 animate-in fade-in-0 zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Carregando arquivos</h3>
              </div>
              
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
                  <span>Progresso geral</span>
                  <span>
                    {batchUploadProgress.completedFiles} / {batchUploadProgress.total} arquivos
                  </span>
                </div>
                <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-oasis-blue transition-all duration-300 ease-out"
                    style={{ 
                      width: `${batchUploadProgress.total > 0 
                        ? Math.round(
                            ((batchUploadProgress.completedFiles * 100 + batchUploadProgress.currentFileProgress) / batchUploadProgress.total)
                          ) 
                        : 0}%` 
                    }}
                  />
                </div>
              </div>

              {batchUploadProgress.currentFile && (
                <div className="mb-4">
                  <p className="text-xs text-slate-500 mb-1">Arquivo atual:</p>
                  <p className="text-sm font-medium text-slate-700 truncate">
                    {batchUploadProgress.currentFile}
                  </p>
                </div>
              )}

              {batchUploadProgress.failed > 0 && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">
                    {batchUploadProgress.failed} arquivo(s) falharam ao carregar
                  </p>
                </div>
              )}

              <div className="mt-6 text-center">
                <div className="inline-block w-8 h-8 border-4 border-oasis-blue/30 border-t-oasis-blue rounded-full animate-spin" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Folder Selection Modal */}
      {(pendingFile || pendingFiles.length > 0) && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in-0"
          onClick={handleCancelFolderSelection}
        >
          <div 
            className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-lg mx-4 animate-in fade-in-0 zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  {pendingFiles.length > 0 ? `Adicionar ${pendingFiles.length} documento(s)` : 'Adicionar documento'}
                </h3>
                <button
                  onClick={handleCancelFolderSelection}
                  className="p-1 rounded-lg group"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4 text-slate-500 group-hover:text-slate-700 transition-colors" />
                </button>
              </div>
              
              <div className="text-sm text-slate-600 mb-6">
                {pendingFiles.length > 0 ? (
                  <div>
                    <p className="font-medium mb-2">{pendingFiles.length} arquivo(s) PDF da pasta selecionada:</p>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {pendingFiles.slice(0, 10).map((file, idx) => (
                        <p key={idx} className="text-xs truncate">• {file.name}</p>
                      ))}
                      {pendingFiles.length > 10 && (
                        <p className="text-xs text-slate-500">... e mais {pendingFiles.length - 10} arquivo(s)</p>
                      )}
                    </div>
                  </div>
                ) : pendingFile ? (
                  <p>
                    Arquivo: <strong>{pendingFile.name}</strong>
                  </p>
                ) : null}
              </div>

              {folderModalMode === null && (
                <div className="space-y-3">
                  {patientFolders.length > 0 ? (
                    <button
                      onClick={() => setFolderModalMode('select')}
                      className="w-full min-h-[60px] p-4 border-2 border-slate-200 rounded-lg hover:border-oasis-blue hover:bg-oasis-blue-50 transition-colors text-left flex items-center space-x-3"
                    >
                      <Folder className="w-5 h-5 text-slate-600" />
                      <div>
                        <p className="font-medium text-slate-900">Adicionar a um diretório de paciente</p>
                      </div>
                    </button>
                  ) : (
                    <div className="min-h-[60px] p-4 border-2 border-slate-200 rounded-lg bg-slate-50 flex items-center justify-center">
                      <p className="text-sm text-slate-600 text-center">Ainda não existem diretórios de pacientes!</p>
                    </div>
                  )}
                  
                  <button
                    onClick={async () => {
                      let refFolder = folders.find(f => f.name === REFERENCIAS_FOLDER_NAME);
                      if (!refFolder) {
                        // Folder should exist - if not, reload patients list
                        console.warn('[Conhecimento] Referências Médicas folder not found, reloading...');
                        // Trigger reload by refreshing patients
                        try {
                          const response = await listMyPatients();
                          const patientsList = response.patients || [];
                          // Patients are stored in folders with patientId property
                          
                          const patientFolders: ExtendedFolder[] = patientsList.map((patient, index) => ({
                            id: Date.now() + index,
                            name: patient.full_name,
                            createdAt: new Date(),
                            patientId: patient.id,
                            patientDescription: patient.case_description || patient.description || '', // Store patient description
                          }));

                          const newRefFolder: ExtendedFolder = {
                            id: Date.now() + 999999,
                            name: REFERENCIAS_FOLDER_NAME,
                            createdAt: new Date(),
                          };

                          setFolders([newRefFolder, ...patientFolders]);
                          refFolder = newRefFolder;
                        } catch (error) {
                          // listMyPatients() already handles 404 and network errors gracefully
                          // Only show error for real server errors (500+)
                          const statusCode = (error as Error & { status?: number }).status;
                          
                          if (statusCode && statusCode >= 500) {
                            console.error('[Conhecimento] Server error reloading patients:', error);
                            const errorMessage = error instanceof Error ? error.message : String(error);
                            showErrorNotification('Erro ao recarregar pacientes', errorMessage);
                          } else {
                            // No patients or endpoint not available - normal scenario, don't show error
                            console.log('[Conhecimento] Could not reload patients - treating as empty state');
                          }
                          return;
                        }
                      }
                      if (refFolder) {
                        if (pendingFiles.length > 0) {
                          await handleBatchUpload(pendingFiles, refFolder.id);
                          setPendingFiles([]);
                        } else if (pendingFile) {
                          await handleFileUpload(pendingFile, refFolder.id);
                          setPendingFile(null);
                        }
                        setFolderModalMode(null);
                        setSelectedFolderId(null);
                      }
                    }}
                    className="w-full min-h-[60px] p-4 border-2 border-slate-200 rounded-lg hover:border-oasis-blue hover:bg-oasis-blue-50 transition-colors text-left flex items-center"
                  >
                    <span className="w-5 flex items-center justify-center flex-shrink-0 mr-3 overflow-visible" style={{ color: '#000000', fontSize: '1.75rem', lineHeight: '1' }}>⚕</span>
                    <div>
                      <p className="font-medium text-slate-900">Adicionar como referência médica</p>
                    </div>
                  </button>
                </div>
              )}

              {folderModalMode === 'select' && (
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-slate-700">Adicionar documento</h4>
                  <div className="max-h-64 overflow-y-auto space-y-2 border border-slate-200 rounded-lg p-2">
                    {patientFolders.map((folder) => {
                      const displayName = folder.name.split('__tag_')[0];
                      const [, tag] = folder.name.split('__tag_');
                      const isSelected = selectedFolderId === folder.id;
                      return (
                        <button
                          key={folder.id}
                          onClick={() => setSelectedFolderId(folder.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left ${
                            isSelected
                              ? 'border-oasis-blue bg-oasis-blue/5'
                              : 'border-slate-200 hover:border-oasis-blue/60 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex-1 min-w-0 pr-3">
                            <p className="text-sm font-medium text-slate-800 truncate">
                              {displayName}
                            </p>
                            {tag && (
                              <p className="mt-1 text-xs text-slate-500 truncate" title={tag}>
                                {tag}
                              </p>
                            )}
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
                    })}
                  </div>
                  <div className="flex items-center justify-end space-x-3 pt-2">
                    <Button variant="outline" onClick={() => { setFolderModalMode(null); setSelectedFolderId(null); }}>
                      Voltar
                    </Button>
                    <Button onClick={handleSelectFolderAndUpload} disabled={selectedFolderId === null} className="bg-oasis-blue hover:bg-oasis-blue-600">
                      Confirmar
                    </Button>
                  </div>
                </div>
              )}

              {folderModalMode === 'create' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Nome da pasta:</label>
                    <input
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="Ex: Protocolos, Diretrizes, etc."
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-oasis-blue focus:border-transparent"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newFolderName.trim()) {
                          handleCreateFolderAndUpload();
                        }
                      }}
                      autoFocus
                    />
                  </div>
                  <div className="flex items-center justify-end space-x-3 pt-2">
                    <Button variant="outline" onClick={() => { setFolderModalMode(null); setNewFolderName(''); }}>
                      Voltar
                    </Button>
                    <Button onClick={handleCreateFolderAndUpload} disabled={!newFolderName.trim()} className="bg-oasis-blue hover:bg-oasis-blue-600">
                      Criar e enviar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {showCreateFolderModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in-0"
          onClick={() => { setShowCreateFolderModal(false); setCreateFolderName(''); }}
        >
          <div 
            className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md mx-4 animate-in fade-in-0 zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Criar pasta</h3>
                <button
                  onClick={() => { setShowCreateFolderModal(false); setCreateFolderName(''); }}
                  className="p-1 rounded-lg group"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4 text-slate-500 group-hover:text-slate-700 transition-colors" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Nome da pasta:</label>
                  <input
                    type="text"
                    value={createFolderName}
                    onChange={(e) => setCreateFolderName(e.target.value)}
                    placeholder="Ex: Nome do paciente"
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-oasis-blue focus:border-transparent"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && createFolderName.trim()) {
                        handleCreateFolder();
                      }
                    }}
                    autoFocus
                  />
                </div>
                <div className="flex items-center justify-end pt-2">
                  <Button
                    onClick={handleCreateFolder}
                    disabled={!createFolderName.trim()}
                    className="bg-oasis-blue hover:bg-oasis-blue-600 text-white"
                  >
                    Criar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      {documentToDelete && (
        <ConfirmationModal
          title="Confirmar exclusão"
          message={`Tem certeza de que deseja deletar <strong>"${documentToDelete.name}"</strong>?`}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      )}

      {folderToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in-0"
          onClick={handleCancelDeleteFolder}
        >
          <div
            className="bg-white rounded-xl border border-slate-200 shadow-xl w-full max-w-md mx-4 animate-in fade-in-0 zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  Confirmar exclusão
                </h3>
                <button
                  onClick={handleCancelDeleteFolder}
                  className="p-1 rounded-lg group"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4 text-slate-500 group-hover:text-slate-700 transition-colors" />
                </button>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                Tem certeza de que deseja remover o paciente{' '}
                <span className="font-semibold">"{getFolderDisplayName(folderToDelete.name)}"</span> e todos os seus documentos?
              </p>
              <p className="text-sm text-slate-600 mb-4">
                Caso sim, digite{' '}
                <span className="font-semibold">deletar permanentemente</span> e delete.
              </p>
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  value={folderRemoveConfirmText}
                  onChange={(e) => setFolderRemoveConfirmText(e.target.value)}
                  placeholder="deletar permanentemente"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-oasis-blue/40"
                />
                <Button
                  variant="destructive"
                  onClick={() => {
                    void handleConfirmDeleteFolder();
                  }}
                  disabled={folderRemoveConfirmText.trim() !== 'deletar permanentemente'}
                  className={
                    folderRemoveConfirmText.trim() === 'deletar permanentemente'
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-red-100 text-red-300 cursor-default hover:bg-red-100'
                  }
                >
                  Deletar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 p-6">
        <div
          className={`mb-6 border-2 border-dashed rounded-xl p-6 transition-colors cursor-pointer flex flex-col items-center ${
            isDragging ? 'border-oasis-blue bg-blue-50' : 'border-slate-300 hover:border-slate-400'
          }`}
          {...dragHandlers}
          onClick={() => {
            // Show a simple prompt or use folder input by default, then detect what was selected
            // Actually, let's use the file input and detect in the handler
            document.getElementById('file-input')?.click();
          }}
        >
          <Upload className="w-8 h-8 text-slate-400 mb-3" />
          <h3 className="text-base font-medium text-slate-900 mb-1 text-center">Enviar documentos</h3>
          <p className="text-sm text-slate-600 mb-3 text-center max-w-md">
            Arraste um arquivo ou uma pasta, ou clique para buscar
          </p>
        </div>

        <div>
          <div className="flex items-center space-x-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar documento ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-72 pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-0 focus:border-slate-200 focus:shadow-none"
              />
            </div>
            <Button
              disabled
              className="bg-success/40 text-white cursor-default"
            >
              Treinar MedChat
            </Button>
          </div>
          
          {/* Pacientes Section */}
          <div className="mb-6">
            {!isLoading && (
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Pacientes</h3>
            )}
            {patientFolders.length > 0 ? (
              <div className="space-y-2">
                {patientFolders.map((folder) => {
                  const folderDocs = documentsByFolder.grouped[folder.id] || [];
                  const isExpanded = expandedFolders.has(folder.id);
                  const isDragOver = dragOverFolder === folder.id && draggedDocument && draggedDocument.folderId !== folder.id;

              return (
                <div key={folder.id} className="border border-slate-200 rounded-lg overflow-visible">
                  <div
                    onDragOver={(e) => handleFolderDragOver(e, folder.id)}
                    onDragLeave={handleFolderDragLeave}
                    onDrop={(e) => handleFolderDrop(e, folder.id)}
                    className={`w-full transition-colors ${isDragOver ? 'bg-blue-100 border-2 border-blue-400 border-dashed' : ''}`}
                  >
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors">
                      <button onClick={() => toggleFolder(folder.id)} className="flex-1 flex items-center space-x-3 text-left min-w-0">
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-600 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />}
                        <Folder className="w-5 h-5 text-oasis-blue flex-shrink-0" />
                        <div className="flex-1 min-w-0 flex items-center gap-4">
                          <div className="min-w-0 flex-1">
                            {(() => {
                              const [patientName] = folder.name.split('__tag_');
                              const extendedFolder = folder as ExtendedFolder;
                              const description = extendedFolder.patientDescription || (() => {
                                const [, tag] = folder.name.split('__tag_');
                                return tag || '';
                              })();
                              return (
                                <>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-medium text-slate-900 truncate">
                                      {patientName}
                                    </h4>
                                    {description && (
                                      <>
                                        <span className="text-slate-400">•</span>
                                        <span className="text-xs text-slate-600 truncate max-w-md" title={description}>
                                          {description}
                                        </span>
                                      </>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    {folderDocs.length} {folderDocs.length === 1 ? 'documento' : 'documentos'}
                                  </p>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      </button>
                      <Menu 
                        items={[{
                          label: 'Deletar',
                          onClick: () => handleRequestDeleteFolder(folder),
                          className: 'text-red-600 hover:bg-red-50'
                        }]}
                        onClose={() => {}}
                      />
          </div>
                    {isDragOver && (
                      <div className="px-4 py-2 text-sm text-blue-600 text-center bg-blue-50">
                        Solte aqui para mover "{draggedDocument.name}" para "{folder.name}"
            </div>
          )}
        </div>

                  {isExpanded && (
                    <div className="bg-white border-t border-slate-200">
                      {folderDocs.length > 0 ? (
                        folderDocs.map((doc) => (
                          <div key={doc.id} className="border-b border-slate-100 last:border-b-0">
                            <DocumentItem
                              doc={doc}
                              onRequestDelete={handleRequestDelete}
                              uploadProgress={uploadProgress[doc.id]}
                              onDragStart={handleDragStart}
                              onDragEnd={handleDragEnd}
                    />
                  </div>
                        ))
                      ) : (
                        <div className="px-4 py-8 text-center text-slate-500 text-sm">Esta pasta está vazia</div>
                      )}
                </div>
                  )}
                </div>
              );
                })}
              </div>
            ) : (
              !isLoading && !searchTerm.trim() && (
                <div className="py-1">
                  <EmptyState
                    icon={UserPlus}
                    title="Nenhum paciente ainda"
                    description="Crie um paciente para ter seu primeiro diretório"
                  />
                </div>
              )
            )}
          </div>

          {/* Referências Section */}
          {referenciasFolder && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">{referenciasTitle}</h3>
              <div className="space-y-2">
                {(() => {
                  const folder = referenciasFolder;
                  const folderDocs = documentsByFolder.grouped[folder.id] || [];
                  const isExpanded = expandedFolders.has(folder.id);
                  const isDragOver = dragOverFolder === folder.id && draggedDocument && draggedDocument.folderId !== folder.id;

                  return (
                    <div key={folder.id} className="border border-slate-200 rounded-lg overflow-visible">
                      <div
                        onDragOver={(e) => handleFolderDragOver(e, folder.id)}
                        onDragLeave={handleFolderDragLeave}
                        onDrop={(e) => handleFolderDrop(e, folder.id)}
                        className={`w-full transition-colors ${isDragOver ? 'bg-blue-100 border-2 border-blue-400 border-dashed' : ''}`}
                      >
                        <div className="flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors">
                          <button onClick={() => toggleFolder(folder.id)} className="flex-1 flex items-center space-x-3 text-left min-w-0">
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-600 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />}
                            <span className="text-oasis-blue text-2xl flex-shrink-0" style={{ fontSize: '1.875rem' }}>⚕</span>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-slate-900 truncate">
                                {folder.name === REFERENCIAS_FOLDER_NAME ? referenciasFolderName : folder.name}
                              </h4>
                              <p className="text-xs text-slate-500">
                                {folderDocs.length} {folderDocs.length === 1 ? 'documento' : 'documentos'}
                              </p>
                            </div>
                          </button>
                        </div>
                        {isDragOver && (
                          <div className="px-4 py-2 text-sm text-blue-600 text-center bg-blue-50">
                            Solte aqui para mover "{draggedDocument?.name}" para "{folder.name}"
                          </div>
                        )}
                        {isExpanded && (
                          <div className="bg-white border-t border-slate-200">
                            {folderDocs.length > 0 ? (
                              folderDocs.map((doc) => (
                                <div key={doc.id} className="border-b border-slate-100 last:border-b-0">
                                  <DocumentItem
                                    doc={doc}
                                    onRequestDelete={handleRequestDelete}
                                    uploadProgress={uploadProgress[doc.id]}
                                    onDragStart={handleDragStart}
                                    onDragEnd={handleDragEnd}
                                  />
                                </div>
                              ))
                            ) : (
                              <div className="px-4 py-8 text-center text-slate-500 text-sm">Esta pasta está vazia</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {documentsByFolder.noFolder.length > 0 && (
            <div className="space-y-2">
              {documentsByFolder.noFolder.map((doc) => (
                <DocumentItem
                  key={doc.id}
                  doc={doc}
                  onRequestDelete={handleRequestDelete}
                  uploadProgress={uploadProgress[doc.id]}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                />
              ))}
            </div>
          )}

          {isLoading && null}
          {!isLoading && searchTerm.trim() && filteredDocuments.length === 0 && patientFolders.length === 0 && !referenciasFolder && (
            <EmptyState icon={FileText} title="Nenhum documento encontrado" description={`Não foram encontrados documentos que correspondam a "${searchTerm}"`} />
          )}
          {!isLoading && !searchTerm.trim() && allDocuments.length === 0 && folders.length === 0 && (
            <div className="mt-16">
              <EmptyState
                icon={FileText}
                title="Nenhum documento ainda"
                description="Carregue aqui os documentos clínicos dos seus pacientes"
              />
            </div>
          )}
        </div>
      </div>

      {/* Unified input that supports both files and folders */}
      <input
        id="file-input"
        type="file"
        multiple
        {...({ webkitdirectory: '' } as any)}
        accept=".pdf,application/pdf"
        onChange={handleFileInput}
        className="hidden"
        aria-label="Selecionar arquivos ou pasta para upload"
      />
    </div>
  );
};

export default Conhecimento;