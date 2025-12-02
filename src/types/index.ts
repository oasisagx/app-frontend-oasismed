// API Types
export interface ChatSource {
  documentId: string;
  chunkId: string;
  chunkIndex: number;
}

/**
 * Message metadata - stores context selection for USER messages
 */
export interface MessageMetadata {
  selectedReferenceDocumentUuids?: string[];
  selectedPatientDocumentUuids?: string[];
}

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  sources?: ChatSource[]; // Sources/citations for assistant messages
  metadata?: MessageMetadata; // NEW: Context selection metadata (for USER messages)
}

// Folder Types
export interface Folder {
  id: number;
  name: string;
  createdAt: Date;
}

// Document Types
export interface DocumentData {
  id: number; // Frontend display ID (numeric)
  name: string;
  size: string;
  type: string;
  date: string;
  category: string;
  status: string;
  uploadStatus: string;
  folderId?: number; // ID of the folder this document belongs to
  s3Key?: string; // S3 object key for the file
  url?: string; // Presigned URL for viewing/downloading
  documentUuid?: string; // Actual document UUID from backend (for API calls)
}

// New DocumentItem type from backend
export interface DocumentItem {
  id: string; // Document ID (UUID)
  title: string | null;
  d_type: 'KNOWLEDGE_PDF' | 'TRANSCRIPT_RAW' | string;
  s3_key: string;
  d_status: 'PENDING' | 'PROCESSING' | 'READY' | 'ERROR';
  created_at: string;
  last_error?: string; // Optional error message
  size?: number; // File size in bytes from S3
}