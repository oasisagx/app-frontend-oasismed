/**
 * Storage API Service
 * This module handles all communication with the backend for storage operations
 * The frontend should never manipulate S3 keys directly - all operations go through the backend
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

if (!API_BASE_URL) {
  console.error(
    '[Storage API] VITE_API_BASE_URL não está configurada. Configure no arquivo .env e reinicie o servidor.'
  );
}

export interface StorageItem {
  id?: string; // Document ID from database (optional)
  name: string;
  type: 'DOCUMENT' | 'FOLDER';
  dType?: 'KNOWLEDGE_PDF' | string;
  uploadedAt?: string; // ISO timestamp
  lastModified?: string; // ISO timestamp (for S3 objects)
  size: number;
  status?: 'READY' | 'PENDING' | 'PROCESSING' | 'ERROR';
  url?: string; // Pre-signed URL for viewing
  s3Key?: string; // Full S3 key (for backend operations)
  uiKey?: string; // UI-friendly key (without clinic/doctor prefixes)
  documentId?: string; // Document ID from database (UUID)
  // New fields matching DocumentItem format
  title?: string | null;
  d_type?: 'KNOWLEDGE_PDF' | 'TRANSCRIPT_RAW' | string;
  s3_key?: string;
  d_status?: 'PENDING' | 'PROCESSING' | 'READY' | 'ERROR';
  created_at?: string;
  last_error?: string;
}

export interface StorageListResponse {
  items: StorageItem[];
  objects?: StorageItem[]; // Alternative format from /s3/interface
  patients?: string[]; // List of patient IDs
  hasReferenciasMedicas?: boolean; // Whether "Referências Médicas" folder exists
}

// New clean types for knowledge documents (no polling, pure data)
export type DocumentStatus = 'UPLOADING' | 'PROCESSING' | 'READY' | 'FAILED' | 'PENDING' | 'ERROR';

export interface KnowledgeDocument {
  id: string;
  s3Key: string;
  filename: string;
  dtype: string;      // 'KNOWLEDGE_PDF'
  scope: 'PATIENT' | 'REFERENCES';
  patientId?: string;
  status: DocumentStatus;
  createdAt: string;
  size?: number;      // File size in bytes from S3
}

/**
 * Get authentication token from Amplify
 */
async function getAuthToken(): Promise<string> {
  const { fetchAuthSession } = await import('aws-amplify/auth');
  const session = await fetchAuthSession();
  const idToken = session.tokens?.idToken?.toString();

  if (!idToken) {
    throw new Error('Sessão expirada. Por favor, faça login novamente.');
  }

  return idToken;
}

/**
 * Get API base URL
 */
function getApiBaseUrl(): string {
  if (!API_BASE_URL) {
    throw new Error('VITE_API_BASE_URL não está configurada');
  }
  return API_BASE_URL;
}

/**
 * Get auth header for API requests
 */
async function getAuthHeader(): Promise<{ Authorization: string }> {
  const token = await getAuthToken();
  return { Authorization: `Bearer ${token}` };
}

/**
 * Post to S3 interface endpoint - pure function, no state, no polling
 * 
 * Handles 403 Forbidden errors for archived/deleted patients gracefully
 */
async function postS3Interface(payload: any): Promise<any> {
  const url = `${getApiBaseUrl()}/s3/interface`;
  
  console.log(
    '[S3 Interface] POST',
    url,
    `- scope=${payload.scope}, patientId=${payload.patientId || 'N/A'}, dType=${payload.dType || 'N/A'}`
  );

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(await getAuthHeader()),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('[S3 Interface] Error', res.status, text);
    
    // Handle 403 Forbidden - patient may be archived/deleted (ghost patient fix)
    if (res.status === 403) {
      const error = new Error(`Acesso negado: Paciente pode ter sido removido ou você não tem permissão.`);
      (error as Error & { status?: number; isForbidden?: boolean }).status = 403;
      (error as Error & { status?: number; isForbidden?: boolean }).isForbidden = true;
      throw error;
    }
    
    throw new Error(`S3 interface error ${res.status}: ${text}`);
  }

  return res.json();
}

/**
 * List patient knowledge documents - PURE FUNCTION, no polling, no state
 * Returns array of KnowledgeDocument
 * 
 * CRITICAL: This function does NOT do any polling or state management.
 * It just calls the API and returns the data.
 * 
 * Handles 403 errors gracefully for archived/deleted patients (ghost patient fix).
 * Returns empty array if patient is not accessible.
 */
export async function listPatientKnowledgeDocuments(
  patientId: string
): Promise<KnowledgeDocument[]> {
  if (!patientId || typeof patientId !== 'string' || patientId.trim() === '') {
    throw new Error('patientId é obrigatório para listar documentos do paciente');
  }

  console.log('[S3 List] Requesting patient documents for patientId:', patientId);

  try {
    const data = await postS3Interface({
      action: 'LIST',
      scope: 'PATIENT',
      patientId: patientId.trim(),
      dType: 'KNOWLEDGE_PDF',
    });

    // Support multiple response formats: documents, items, or data
    const rawDocs = data.documents || data.items || data.data || [];

    // Map to KnowledgeDocument format
    const docs: KnowledgeDocument[] = rawDocs.map((item: any) => ({
      id: item.id || item.documentId || item.key || '',
      s3Key: item.s3_key || item.s3Key || item.key || '',
      filename: item.title || item.name || item.filename || 'Unknown',
      dtype: item.d_type || item.dtype || 'KNOWLEDGE_PDF',
      scope: 'PATIENT' as const,
      patientId: patientId,
      status: (item.d_status || item.status || 'READY').toUpperCase() as DocumentStatus,
      createdAt: item.created_at || item.createdAt || item.lastModified || new Date().toISOString(),
      size: item.size || 0, // Include size from API response
    }));

    return docs;
  } catch (error: any) {
    // Handle 403 Forbidden - patient may be archived/deleted (ghost patient fix)
    // Backend now filters archived patients from list, so this shouldn't happen often
    if (error?.status === 403 || error?.isForbidden) {
      console.warn(`[S3 List] Patient ${patientId} is not accessible (may be archived):`, error.message);
      // Return empty array instead of throwing - allows UI to gracefully handle missing patient
      return [];
    }
    // Re-throw other errors
    throw error;
  }
}

/**
 * ⚠️ DEPRECATED: Do not use this function without explicit scope
 * 
 * Use instead:
 * - listReferencesMedicas() for "Referências Médicas" folder
 * - listPatientFiles(patientId) for patient-specific files
 * 
 * The backend requires an explicit scope. This function is kept for backward compatibility
 * but should not be called directly.
 */
export async function listAllFiles(): Promise<StorageListResponse> {
  console.warn('[StorageAPI] listAllFiles() is deprecated. Use listReferencesMedicas() or listPatientFiles(patientId) instead.');
  
  // Return empty result to avoid breaking existing code
  // But warn that explicit scope functions should be used
  return {
    items: [],
    objects: [],
    patients: [],
    hasReferenciasMedicas: false,
  };
}

/**
 * List files in "Referências Médicas" folder
 * Uses the unified /s3/interface endpoint with scope: "REFERENCES"
 * 
 * This is called when showing the global references folder (no patient selected).
 * 
 * CRITICAL: This function MUST use scope: 'REFERENCES' without patientId.
 * Do NOT use this for patient-specific documents - use listPatientFiles(patientId) instead.
 */
export async function listReferencesMedicas(): Promise<StorageListResponse> {
  try {
    const token = await getAuthToken();
    const url = `${API_BASE_URL}/s3/interface`;

    console.log('[S3 List] Requesting reference documents (REFERENCES scope)');
    console.log(`POST ${url} - scope=REFERENCES, dType=KNOWLEDGE_PDF`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'LIST',
        scope: 'REFERENCES', // CRITICAL: Must be REFERENCES for global references
        dType: 'KNOWLEDGE_PDF',
        // NOTE: Do NOT include patientId for REFERENCES scope
      }),
    });

    const text = await response.text();
    
    // 404 means endpoint not implemented yet - return empty array (no error)
    if (response.status === 404) {
      console.log('[storageApi] References endpoint not implemented yet - returning empty array');
      return {
        items: [],
        objects: [],
        hasReferenciasMedicas: false,
      };
    }
    
    if (!response.ok) {
      // For other errors, check if it's a server error (5xx) or client error (4xx)
      if (response.status >= 500) {
        // Server error - throw to be handled by caller
        let errorMessage = `Erro ao listar objetos: ${response.status}`;
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = `${errorMessage}\nResposta: ${text}`;
        }
        const error = new Error(errorMessage);
        (error as Error & { status?: number }).status = response.status;
        throw error;
      } else {
        // Client error (4xx except 404) - treat as empty (endpoint might not be ready)
        console.log('[storageApi] References endpoint returned client error - returning empty array');
        return {
          items: [],
          objects: [],
          hasReferenciasMedicas: false,
        };
      }
    }

    const data = JSON.parse(text) as {
      bucket?: string;
      prefix?: string;
      items: Array<{ 
        id?: string;  // Document ID (UUID)
        title?: string | null;
        d_type?: 'KNOWLEDGE_PDF' | 'TRANSCRIPT_RAW' | string;
        s3_key?: string;
        key?: string;  // Legacy field
        name?: string;  // Legacy field
        size?: number; 
        lastModified?: string | null;
        uiKey?: string;
        url?: string;
        documentId?: string;  // Legacy field
        d_status?: 'PENDING' | 'PROCESSING' | 'READY' | 'ERROR';
        status?: 'READY' | 'PENDING' | 'PROCESSING' | 'ERROR';  // Legacy field
        created_at?: string;
        last_error?: string;
      }>;
      hasReferenciasMedicas?: boolean;
    };

    // Map backend response to StorageItem format (supporting both new and legacy formats)
    const items: StorageItem[] = (data.items || []).map(item => ({
      id: item.id || item.documentId || item.key || '',
      name: item.title || item.name || 'Unknown',
      type: 'DOCUMENT' as const,
      size: item.size || 0,
      lastModified: item.lastModified || item.created_at || undefined,
      s3Key: item.s3_key || item.key || '',
      uiKey: item.uiKey || item.s3_key || item.key || '',
      url: item.url,
      status: item.d_status || item.status || 'READY',
      documentId: item.id || item.documentId,
      // New DocumentItem fields
      title: item.title || item.name || null,
      d_type: item.d_type || 'KNOWLEDGE_PDF',
      s3_key: item.s3_key || item.key || '',
      d_status: item.d_status || item.status || 'READY',
      created_at: item.created_at || item.lastModified || undefined,
      last_error: item.last_error,
    }));

    return {
      items,
      objects: items,
      hasReferenciasMedicas: data.hasReferenciasMedicas !== undefined ? data.hasReferenciasMedicas : true,
    };
  } catch (error) {
    // Network errors or auth errors - return empty array for better UX
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.log('[storageApi] Network error loading references - returning empty array');
      return {
        items: [],
        objects: [],
        hasReferenciasMedicas: false,
      };
    }
    // Re-throw server errors (5xx)
    throw error;
  }
}

/**
 * List files in a patient folder
 * Uses the unified /s3/interface endpoint with scope: "PATIENT" and patientId
 * 
 * This is called when listing docs for a specific patient (on the patient knowledge screen).
 * 
 * CRITICAL: This function MUST use scope: 'PATIENT' with patientId to list patient-specific documents.
 * Do NOT use this for "Referências Médicas" - use listReferencesMedicas() instead.
 */
export async function listPatientFiles(patientId: string): Promise<StorageListResponse> {
  if (!patientId || typeof patientId !== 'string' || patientId.trim() === '') {
    console.error('[S3 List] Invalid patientId provided:', patientId);
    throw new Error('patientId é obrigatório para listar documentos do paciente');
  }

  try {
    const token = await getAuthToken();
    const url = `${API_BASE_URL}/s3/interface`;

    console.log('[S3 List] Requesting patient documents for patientId:', patientId);
    console.log(`POST ${url} - scope=PATIENT, patientId=${patientId}, dType=KNOWLEDGE_PDF`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'LIST',
        scope: 'PATIENT', // CRITICAL: Must be PATIENT for patient documents
        patientId: patientId.trim(), // CRITICAL: Must be provided for PATIENT scope
        dType: 'KNOWLEDGE_PDF',
      }),
    });

    const text = await response.text();
    
    // 404 means endpoint not implemented yet or patient has no files - return empty array (no error)
    if (response.status === 404) {
      console.log('[storageApi] Patient files endpoint not implemented or patient has no files - returning empty array');
      return {
        items: [],
      };
    }
    
    if (!response.ok) {
      // For other errors, check if it's a server error (5xx) or client error (4xx)
      if (response.status >= 500) {
        // Server error - throw to be handled by caller
        let errorMessage = `Erro ao listar objetos: ${response.status}`;
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = `${errorMessage}\nResposta: ${text}`;
        }
        const error = new Error(errorMessage);
        (error as Error & { status?: number }).status = response.status;
        throw error;
      } else {
        // Client error (4xx except 404) - treat as empty (patient might not have files yet)
        console.log('[storageApi] Patient files endpoint returned client error - returning empty array');
        return {
          items: [],
        };
      }
    }

    const data = JSON.parse(text) as {
      items?: Array<{ 
        id?: string;  // Document ID (UUID) - NEW format
        title?: string | null;  // Document title - NEW format
        d_type?: 'KNOWLEDGE_PDF' | 'TRANSCRIPT_RAW' | string;  // NEW format
        s3_key?: string;  // S3 key - NEW format
        key?: string;  // Legacy field
        name?: string;  // Legacy field
        size?: number; 
        lastModified?: string | null;  // Backend may return null if LastModified is None
        uiKey?: string;
        url?: string;
        documentId?: string;  // Legacy field - Document ID from database
        d_status?: 'PENDING' | 'PROCESSING' | 'READY' | 'ERROR';  // NEW format - Document status
        status?: 'READY' | 'PENDING' | 'PROCESSING' | 'ERROR';  // Legacy field - Document status
        created_at?: string;  // NEW format
        last_error?: string;  // NEW format
      }>;
      documents?: Array<any>;  // Alternative response format
    };

    // Support both 'items' and 'documents' response formats
    const rawItems = data.items || data.documents || [];

    // Map backend response to StorageItem format (supporting both new and legacy formats)
    const items: StorageItem[] = rawItems.map(item => ({
      id: item.id || item.documentId || item.key || '',
      name: item.title || item.name || 'Unknown',
      type: 'DOCUMENT' as const,
      size: item.size || 0,
      lastModified: item.lastModified || item.created_at || undefined,  // Convert null to undefined for consistency
      s3Key: item.s3_key || item.key || '',
      uiKey: item.uiKey || item.s3_key || item.key || '',
      url: item.url,
      status: item.d_status || item.status || 'READY',  // Prefer new d_status field, fallback to legacy status
      documentId: item.id || item.documentId,  // Prefer new id field, fallback to documentId
      // New DocumentItem fields
      title: item.title || item.name || null,
      d_type: item.d_type || 'KNOWLEDGE_PDF',
      s3_key: item.s3_key || item.key || '',
      d_status: item.d_status || item.status || 'READY',
      created_at: item.created_at || item.lastModified || undefined,
      last_error: item.last_error,
    }));

    return {
      items,
    };
  } catch (error) {
    // Network errors or auth errors - return empty array for better UX
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.log('[storageApi] Network error loading patient files - returning empty array');
      return {
        items: [],
      };
    }
    // Re-throw server errors (5xx)
    throw error;
  }
}

/**
 * Get pre-signed URL for viewing/downloading a document
 * 
 * Can accept either:
 * - documentId (UUID): Uses /documents/{id}/download-url endpoint
 * - S3 key (string): Uses /s3/interface with action: "get"
 */
export async function getDocumentDownloadUrl(documentIdOrKey: string): Promise<string> {
  const token = await getAuthToken();
  
  // Check if it looks like a UUID (document ID) or an S3 key
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(documentIdOrKey);
  
  if (isUuid) {
    // Use document ID endpoint
    const url = `${API_BASE_URL}/documents/${encodeURIComponent(documentIdOrKey)}/download-url`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.message || `Erro ao obter URL de download: ${response.status} ${response.statusText}`;
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data.url || data.downloadUrl;
  } else {
    // Use unified S3 interface endpoint
    const url = `${API_BASE_URL}/s3/interface`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        action: 'get',
        key: documentIdOrKey, // Can be uiKey or full S3 key
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || `Erro ao obter URL de download: ${response.status} ${response.statusText}`;
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.url;
  }
}

/**
 * Move a document from one patient folder to another
 */
export async function moveDocument(
  documentId: string,
  targetPatientId: string
): Promise<void> {
  const token = await getAuthToken();
  const url = `${API_BASE_URL}/storage/move-document`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      documentId,
      targetPatientId,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.message || `Erro ao mover documento: ${response.status} ${response.statusText}`;
    throw new Error(errorMessage);
  }
}

/**
 * Delete a document
 */
export async function deleteDocument(documentId: string): Promise<void> {
  const token = await getAuthToken();
  const url = `${API_BASE_URL}/documents/${encodeURIComponent(documentId)}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.message || `Erro ao deletar documento: ${response.status} ${response.statusText}`;
    throw new Error(errorMessage);
  }
}

/**
 * Delete this doctor's relationship with a patient and all their files
 * IMPORTANT: This does NOT delete the patient from the clinic.
 * It only:
 * - Deletes THIS doctor's files for the patient (from S3)
 * - Removes/archives the doctor-patient relationship (patient_doctors)
 * - Deletes THIS doctor's documents and chats for the patient
 * The patient record and other doctors' data remain untouched.
 * 
 * API Gateway Route Required:
 * DELETE /patients/{patientId}
 * 
 * This matches the standard REST pattern and should be configured in API Gateway as:
 * - Route: /patients/{patientId} (where {patientId} is the path parameter)
 * - Method: DELETE
 * - Integration: Lambda function
 * 
 * ⚠️ IMPORTANT: Make sure the route DELETE /patients/{patientId} is configured in API Gateway!
 */
export async function deletePatient(patientId: string): Promise<void> {
  const token = await getAuthToken();
  
  // Use standard REST route: DELETE /patients/{patientId}
  // This matches the API Gateway route: /patients/{patientId}
  const url = `${API_BASE_URL}/patients/${encodeURIComponent(patientId)}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    // Provide helpful error message if route is not found (404)
    if (response.status === 404) {
      throw new Error(
        `Rota não encontrada: DELETE /patients/{patientId} não está configurada no API Gateway.\n\n` +
        `Por favor, configure a rota DELETE /patients/{patientId} no API Gateway.\n` +
        `Status: ${response.status}`
      );
    }
    
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.message || `Erro ao remover paciente: ${response.status} ${response.statusText}`;
    throw new Error(errorMessage);
  }
}

/**
 * List all patients associated with this doctor
 * Returns only patients where a patient_doctors relationship exists and is not archived
 * 
 * Returns empty array if no patients exist or if endpoint returns 404 (not implemented yet)
 */
export async function listMyPatients(): Promise<{ patients: Array<{
  id: string;
  patient_code: string;
  full_name: string;
  email?: string;
  phone?: string;
  cpf?: string;
  birth_date?: string;
  case_description?: string;
  description?: string;
  is_primary: boolean;
}> }> {
  const token = await getAuthToken();
  const url = `${API_BASE_URL}/me/patients`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    // 404 means endpoint not implemented yet - return empty array (no error)
    if (response.status === 404) {
      console.log('[storageApi] Patients endpoint not implemented yet - returning empty array');
      return { patients: [] };
    }

    // Handle 403 Forbidden - should not happen with backend fix, but handle gracefully
    if (response.status === 403) {
      console.warn('[storageApi] 403 Forbidden when listing patients - may indicate auth issue');
      // Return empty array to allow UI to continue working
      return { patients: [] };
    }

    // 200 with empty array or valid data - return as is
    if (response.ok) {
      const data = await response.json();
      console.log('[storageApi] listMyPatients API response data (raw):', JSON.stringify(data, null, 2));
      console.log('[storageApi] listMyPatients API response type:', typeof data, 'isArray:', Array.isArray(data));
      
      // Handle different response formats
      // Backend might return: { patients: [...] } or just [...] or { data: [...] }
      let patientsArray: any[] = [];
      
      if (Array.isArray(data)) {
        // Direct array response
        patientsArray = data;
        console.log('[storageApi] Response is direct array');
      } else if (data && typeof data === 'object') {
        // Object response - check common property names
        patientsArray = data.patients || data.data || data.items || [];
        console.log('[storageApi] Response is object, extracted from:', 
          data.patients ? 'patients' : data.data ? 'data' : data.items ? 'items' : 'none');
      }
      
      // Validate that we have an array
      if (!Array.isArray(patientsArray)) {
        console.error('[storageApi] Invalid response format - patientsArray is not an array:', patientsArray);
        return { patients: [] };
      }
      
      console.log('[storageApi] Extracted patients array:', patientsArray);
      console.log('[storageApi] Number of patients:', patientsArray.length);
      
      // Validate patient structure - ensure each has required fields
      const validPatients = patientsArray.filter((p: any) => {
        const isValid = p && typeof p === 'object' && p.id && p.full_name;
        if (!isValid) {
          console.warn('[storageApi] Invalid patient object:', p);
        }
        return isValid;
      });
      
      console.log('[storageApi] Valid patients after filtering:', validPatients.length);
      
      // Backend now filters archived patients automatically (ghost patient fix)
      // No need to filter on frontend - backend handles it
      return { patients: validPatients };
    }

    // Other errors (500, etc) - throw error
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.message || `Erro ao listar pacientes: ${response.status} ${response.statusText}`;
    const error = new Error(errorMessage);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  } catch (error) {
    // Network errors or other fetch failures - check if it's a real error or just unavailable
    if (error instanceof TypeError && error.message.includes('fetch')) {
      // Network error - might be CORS or endpoint not available yet
      console.log('[storageApi] Network error or endpoint unavailable - returning empty array');
      return { patients: [] };
    }
    // Re-throw real errors (status codes like 500, etc)
    throw error;
  }
}

/**
 * Create a new patient in the database
 * Backend will automatically create the patient folder in S3
 * 
 * @param patientData - Patient data to create
 * @returns Created patient with ID from database
 */
export async function createPatient(patientData: {
  full_name: string;
  email?: string;
  phone?: string;
  cpf?: string;
  birth_date?: string; // ISO format or YYYY-MM-DD
  tag?: string; // Description/case description
}): Promise<{
  id: string;
  patient_code: string;
  full_name: string;
  cpf?: string;
  birth_date?: string;
  is_primary: boolean;
}> {
  const token = await getAuthToken();
  const url = `${API_BASE_URL}/patients`;

  // Convert date from DD/MM/YYYY to YYYY-MM-DD if needed
  let birthDateFormatted: string | undefined = undefined;
  if (patientData.birth_date) {
    const dobDigits = patientData.birth_date.replace(/\D/g, '');
    if (dobDigits.length === 8) {
      // DD/MM/YYYY -> YYYY-MM-DD
      const day = dobDigits.slice(0, 2);
      const month = dobDigits.slice(2, 4);
      const year = dobDigits.slice(4, 8);
      birthDateFormatted = `${year}-${month}-${day}`;
    } else {
      // Assume already in YYYY-MM-DD format
      birthDateFormatted = patientData.birth_date;
    }
  }

  // Format phone (remove formatting)
  const phoneDigits = patientData.phone?.replace(/\D/g, '') || undefined;
  
  // Format CPF (remove formatting)
  const cpfDigits = patientData.cpf?.replace(/\D/g, '') || undefined;

  const requestBody = {
    full_name: patientData.full_name,
    email: patientData.email || undefined,
    phone: phoneDigits,
    cpf: cpfDigits,
    birth_date: birthDateFormatted,
    // Note: tag/description might need to be stored in a separate field
    // or as metadata - adjust based on backend schema
    description: patientData.tag || undefined,
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || `Erro ao criar paciente: ${response.status} ${response.statusText}`;
      const error = new Error(errorMessage);
      (error as Error & { status?: number }).status = response.status;
      throw error;
    }

    const data = await response.json();
    
    // Backend should return the created patient
    // Adjust based on actual backend response format
    return {
      id: data.id || data.patient_id,
      patient_code: data.patient_code || data.code || '',
      full_name: data.full_name || patientData.full_name,
      cpf: data.cpf || cpfDigits,
      birth_date: data.birth_date || birthDateFormatted,
      is_primary: data.is_primary || false,
    };
  } catch (error) {
    console.error('[storageApi] Error creating patient:', error);
    if (error instanceof Error && (error as Error & { status?: number }).status) {
      throw error;
    }
    throw new Error(`Erro ao criar paciente: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Update an existing patient in the database
 * 
 * Backend API Contract:
 * - Endpoint: PUT /patients/{patientId} (also supports /me/patients/{patientId})
 * - Supports both camelCase and snake_case field names
 * - Allows clearing fields by sending empty strings
 * - Case description accepts: case_description, caseDescription, or description
 * 
 * Request body can use either format:
 * {
 *   "fullName": "João Silva" | "full_name": "João Silva",
 *   "birthDate": "1985-03-15" | "birth_date": "1985-03-15",
 *   "caseDescription": "Descrição" | "case_description": "Descrição" | "description": "Descrição"
 * }
 * 
 * @param patientId - Patient UUID
 * @param patientData - Patient data to update
 * @returns Updated patient data
 */
export async function updatePatient(
  patientId: string,
  patientData: {
    full_name?: string;
    email?: string;
    phone?: string;
    cpf?: string;
    birth_date?: string; // ISO format or YYYY-MM-DD
    case_description?: string; // Description/case description
    description?: string; // Alternative field name
  }
): Promise<{
  id: string;
  patient_code: string;
  full_name: string;
  email?: string;
  phone?: string;
  cpf?: string;
  birth_date?: string;
  case_description?: string;
  description?: string;
  is_primary: boolean;
}> {
  const token = await getAuthToken();
  // Backend supports both /patients/{id} and /me/patients/{id}
  const url = `${API_BASE_URL}/patients/${encodeURIComponent(patientId)}`;

  // Convert date from DD/MM/YYYY to YYYY-MM-DD format for database
  // Accepts both DD/MM/YYYY (from UI) and YYYY-MM-DD (already formatted)
  let birthDateFormatted: string | undefined = undefined;
  if (patientData.birth_date) {
    // Check if already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(patientData.birth_date)) {
      birthDateFormatted = patientData.birth_date;
    } else {
      // Assume DD/MM/YYYY format and convert to YYYY-MM-DD
      const dobDigits = patientData.birth_date.replace(/\D/g, '');
      if (dobDigits.length === 8) {
        const day = dobDigits.slice(0, 2);
        const month = dobDigits.slice(2, 4);
        const year = dobDigits.slice(4, 8);
        birthDateFormatted = `${year}-${month}-${day}`;
      } else if (dobDigits.length > 0) {
        // Invalid format - log warning but try to use as-is
        console.warn('[storageApi] Invalid date format, expected DD/MM/YYYY:', patientData.birth_date);
        birthDateFormatted = patientData.birth_date;
      }
    }
  }

  // Format phone (remove formatting) - allow empty string to clear field
  const phoneDigits = patientData.phone !== undefined 
    ? (patientData.phone ? patientData.phone.replace(/\D/g, '') : '')
    : undefined;
  
  // Format CPF (remove formatting) - allow empty string to clear field
  const cpfDigits = patientData.cpf !== undefined
    ? (patientData.cpf ? patientData.cpf.replace(/\D/g, '') : '')
    : undefined;

  // Build request body - backend supports both camelCase and snake_case
  // We send both formats to ensure maximum compatibility
  const requestBody: Record<string, unknown> = {};
  
  // full_name / fullName - backend accepts both
  if (patientData.full_name !== undefined) {
    const nameValue = patientData.full_name || '';
    requestBody.full_name = nameValue;
    requestBody.fullName = nameValue; // camelCase format
  }
  
  // email - allow empty string to clear field
  if (patientData.email !== undefined) {
    requestBody.email = patientData.email || '';
  }
  
  // phone - allow empty string to clear field
  if (phoneDigits !== undefined) {
    requestBody.phone = phoneDigits; // Already formatted (digits only or empty string)
  }
  
  // cpf - allow empty string to clear field
  if (cpfDigits !== undefined) {
    requestBody.cpf = cpfDigits; // Already formatted (digits only or empty string)
  }
  
  // birth_date / birthDate - backend accepts both
  if (birthDateFormatted !== undefined) {
    const dateValue = birthDateFormatted || '';
    requestBody.birth_date = dateValue;
    requestBody.birthDate = dateValue; // camelCase format
  }
  
  // case_description / caseDescription / description
  // Backend accepts all three formats: case_description, caseDescription, or description
  const caseDescription = patientData.case_description || patientData.description;
  if (caseDescription !== undefined) {
    const descValue = caseDescription || ''; // Allow empty string to clear field
    requestBody.case_description = descValue; // snake_case (primary)
    requestBody.caseDescription = descValue; // camelCase
    requestBody.description = descValue; // Legacy field name
  }

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || `Erro ao atualizar paciente: ${response.status} ${response.statusText}`;
      const error = new Error(errorMessage);
      (error as Error & { status?: number }).status = response.status;
      throw error;
    }

    const data = await response.json();
    
    // Backend should return the updated patient
    return {
      id: data.id || patientId,
      patient_code: data.patient_code || data.code || '',
      full_name: data.full_name || patientData.full_name || '',
      email: data.email || patientData.email,
      phone: data.phone || phoneDigits,
      cpf: data.cpf || cpfDigits,
      birth_date: data.birth_date || birthDateFormatted,
      case_description: data.case_description || data.description || caseDescription,
      description: data.description || data.case_description || caseDescription,
      is_primary: data.is_primary || false,
    };
  } catch (error) {
    console.error('[storageApi] Error updating patient:', error);
    if (error instanceof Error && (error as Error & { status?: number }).status) {
      throw error;
    }
    throw new Error(`Erro ao atualizar paciente: ${error instanceof Error ? error.message : String(error)}`);
  }
}

