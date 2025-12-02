/**
 * Upload file to S3 with progress tracking using XMLHttpRequest
 * 
 * IMPORTANT: The Content-Type header MUST match exactly what was used
 * to generate the presigned URL. No Authorization header, no custom headers.
 */
function uploadToS3WithProgress(
  uploadUrl: string,
  file: File,
  contentType: string, // Must match the Content-Type used to sign the presigned URL
  onProgress: (percent: number) => void
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl, true);

    // ✅ Use the EXACT Content-Type that was used to generate the presigned URL
    // The signature includes this header, so it must match exactly
    xhr.setRequestHeader("Content-Type", contentType);

    // ❌ DO NOT add Authorization header (presigned URLs don't need it)
    // ❌ DO NOT add any custom x-* headers (they would break the signature)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
      } else {
        reject(new Error(`S3 upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network error during S3 upload"));
    };

    xhr.send(file);
  });
}


/**
 * Upload file to S3 via backend presigned URL
 * Simplified model: backend → presigned URL → PUT direct to S3
 * 
 * @param file - File to upload
 * @param onProgressOrFolderPath - Optional: Progress callback OR folder path (for backward compatibility)
 * @param folderPathOrPatientId - Optional: Folder path OR patientId (if first param was onProgress)
 * @param onProgress - Optional: Progress callback (0-100) - only used if first param is not a function
 */
export async function uploadFileToS3(
  file: File,
  onProgressOrFolderPath?: ((percent: number) => void) | string,
  folderPathOrPatientId?: string,
  onProgress?: (percent: number) => void
) {
  // Handle backward compatibility: detect if second param is a function (onProgress) or string (folderPath)
  let folderPath: string | undefined;
  let patientId: string | undefined;
  let progressCallback: ((percent: number) => void) | undefined;

  if (typeof onProgressOrFolderPath === 'function') {
    // Old signature: uploadFileToS3(file, onProgress, folderPath)
    progressCallback = onProgressOrFolderPath;
    folderPath = folderPathOrPatientId;
  } else {
    // New signature: uploadFileToS3(file, folderPath?, patientId?, onProgress?)
    folderPath = onProgressOrFolderPath;
    patientId = folderPathOrPatientId;
    progressCallback = onProgress;
  }
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
  
  if (!apiBaseUrl) {
    throw new Error(
      "VITE_API_BASE_URL não está configurada.\n\n" +
      "Por favor, configure a variável de ambiente VITE_API_BASE_URL no arquivo .env e reinicie o servidor."
    );
  }

  // Get JWT token for authentication
  const { fetchAuthSession } = await import('aws-amplify/auth');
  const session = await fetchAuthSession();
  const idToken = session.tokens?.idToken?.toString();

  if (!idToken) {
    throw new Error('Sessão expirada. Por favor, faça login novamente.');
  }

  console.log("[S3 Upload] Requesting presigned URL from backend...");

  // Build request body - backend expects 'upload' action (not GET_UPLOAD_URL)
  const body: Record<string, unknown> = {
    action: "upload", // Backend expects 'upload' action
    filename: file.name, // Backend expects 'filename', not 'title'
    contentType: file.type || "application/octet-stream",
    dType: "KNOWLEDGE_PDF",
  };

  // CRITICAL: Determine scope explicitly - PATIENT or REFERENCES
  // For patient folder upload, use patientId with PATIENT scope
  // For "Referências Médicas", use REFERENCES scope
  if (patientId) {
    // Explicit patientId takes precedence - PATIENT scope
    body.scope = "PATIENT";
    body.patientId = patientId;
    console.log(`[S3 Upload] Using PATIENT scope with patientId: ${patientId}`);
  } else if (folderPath && folderPath.trim()) {
    // Check if folderPath is "Referências Médicas" or variants
    const folderPathLower = folderPath.toLowerCase().trim();
    if (folderPathLower.includes("referências") || folderPathLower.includes("referencias") || folderPathLower === "references-medicas") {
      body.scope = "REFERENCES";
      console.log(`[S3 Upload] Using REFERENCES scope for folder: ${folderPath}`);
    } else {
      // If folderPath looks like a patient ID (UUID), use patientId
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidPattern.test(folderPath.trim())) {
        body.scope = "PATIENT";
        body.patientId = folderPath.trim();
        console.log(`[S3 Upload] Detected UUID in folderPath, using PATIENT scope with patientId: ${folderPath}`);
      } else {
        // Default to REFERENCES if we can't determine
        body.scope = "REFERENCES";
        console.warn(`[S3 Upload] Could not determine scope from folderPath "${folderPath}", defaulting to REFERENCES`);
      }
    }
  } else {
    // No patientId and no folderPath - default to REFERENCES
    body.scope = "REFERENCES";
    console.warn(`[S3 Upload] No patientId or folderPath provided, defaulting to REFERENCES scope`);
  }

  // Ensure scope is always set
  if (!body.scope) {
    throw new Error('SCOPE não determinado: é necessário fornecer patientId ou folderPath válido');
  }

  // 1) Request presigned URL from backend
  const res = await fetch(`${apiBaseUrl}/s3/interface`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[S3 Upload] Backend error:", res.status, text);
    
    // Support error messages up to 2000 characters (backend increased limit from 1000 to 2000)
    let errorMessage = `Erro ao obter presigned URL: ${res.status}`;
    try {
      const errorData = JSON.parse(text);
      errorMessage = errorData.message || errorMessage;
      // Support error messages up to 2000 characters
      if (errorData.details) {
        const details = errorData.details.length > 2000 
          ? `${errorData.details.substring(0, 2000)}... (truncated)`
          : errorData.details;
        errorMessage += `\n${details}`;
      }
    } catch {
      // If not JSON, truncate to 2000 chars
      const truncatedText = text.length > 2000 
        ? `${text.substring(0, 2000)}... (truncated)`
        : text;
      errorMessage += `\nResposta: ${truncatedText}`;
    }
    
    throw new Error(errorMessage);
  }

  const data = await res.json();
  const uploadUrl: string = data.uploadUrl;
  const key: string = data.key || data.s3_key;
  const docId: string | undefined = data.docId || data.documentId;
  const sqsMessageSent: boolean | undefined = data.sqsMessageSent;

  if (!uploadUrl || !key) {
    throw new Error(
      `Resposta da API inválida: uploadUrl ou key não encontrados.\n` +
      `Resposta recebida: ${JSON.stringify(data)}`
    );
  }

  // Log SQS message status for debugging
  if (sqsMessageSent !== undefined) {
    if (sqsMessageSent) {
      console.log("[S3 Upload] ✅ SQS message sent - embedder will process document in ~5 seconds");
    } else {
      console.warn("[S3 Upload] ⚠️ SQS message NOT sent - document processing relies on S3 trigger (PDF_INGEST_QUEUE_URL may not be configured)");
    }
  }

  // Get the Content-Type that was used to sign the presigned URL
  // Backend should return this, otherwise use what we sent
  const contentTypeForUpload = data.contentType || body.contentType || file.type || "application/octet-stream";

  console.log("[S3 Upload] Uploading file to S3 using presigned URL...");
  console.log("[S3 Upload] S3 Key:", key);
  console.log("[S3 Upload] Content-Type:", contentTypeForUpload);

  // 2) Upload directly to S3 using presigned URL
  // Use XMLHttpRequest if progress tracking is needed, otherwise use simple fetch
  if (progressCallback) {
    // Use XMLHttpRequest for progress tracking
    await uploadToS3WithProgress(uploadUrl, file, contentTypeForUpload, progressCallback);
  } else {
    // Simple fetch-based upload (no progress tracking)
    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": contentTypeForUpload, // ✅ Must match what was used to sign the presigned URL
        // ❌ NO Authorization header (presigned URLs don't need it)
        // ❌ NO custom x-* headers (they would break the signature)
      },
      body: file,
    });

    if (!putRes.ok) {
      const text = await putRes.text();
      console.error("[S3 Upload] S3 PUT error:", putRes.status, text);
      // Support error messages up to 2000 characters
      const truncatedText = text.length > 2000 
        ? `${text.substring(0, 2000)}... (truncated, ${text.length} chars)`
        : text;
      throw new Error(
        `Erro ao enviar arquivo ao S3: ${putRes.status} - ${truncatedText}`
      );
    }
  }

  console.log("[S3 Upload] Upload concluído com sucesso!");
  return { key, uploadUrl, docId, sqsMessageSent };
}

/**
 * Get a presigned URL for viewing/downloading a file from S3
 */
export async function getPresignedViewUrl(key: string): Promise<string> {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  
  if (!baseUrl) {
    throw new Error(
      "VITE_API_BASE_URL não está configurada.\n\n" +
      "Por favor, configure a variável de ambiente VITE_API_BASE_URL no arquivo .env e reinicie o servidor de desenvolvimento."
    );
  }

  const url = `${baseUrl}/s3/interface`;

  console.log("[S3 Get URL] Requesting presigned view URL for key:", key);

  try {
    // Get JWT token for authentication
    const { fetchAuthSession } = await import('aws-amplify/auth');
    const session = await fetchAuthSession();
    const idToken = session.tokens?.idToken?.toString();

    if (!idToken) {
      throw new Error('Sessão expirada. Por favor, faça login novamente.');
    }

    // Request presigned GET URL from API Gateway
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        action: "get",
        key,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      let errorMessage = `Erro ao obter URL de visualização: ${res.status} ${res.statusText}`;
      
      try {
        const errorData = JSON.parse(text);
        errorMessage = errorData.message || errorMessage;
        if (errorData.details) {
          errorMessage += `\n${errorData.details}`;
        }
      } catch {
        errorMessage += `\nResposta: ${text}`;
      }
      
      console.error("[S3 Get URL] Failed to get presigned URL:", res.status, text);
      throw new Error(errorMessage);
    }

    const data = await res.json();
    const { url: viewUrl, expiresIn } = data;

    if (!viewUrl) {
      console.error("[S3 Get URL] Invalid API response:", data);
      throw new Error(
        `Resposta da API inválida: url não encontrado.\n` +
        `Resposta recebida: ${JSON.stringify(data)}`
      );
    }

    console.log("[S3 Get URL] Received presigned view URL for key:", key);
    if (expiresIn) {
      console.log(`[S3 Get URL] URL expires in ${expiresIn} seconds (${Math.round(expiresIn / 60)} minutes)`);
    }
    return viewUrl;
  } catch (error) {
    // Re-throw with better context if it's already our formatted error
    if (error instanceof Error && error.message.includes('Erro')) {
      throw error;
    }
    // Otherwise, wrap it in a more user-friendly message
    console.error("[S3 Get URL] Unexpected error:", error);
    throw new Error(
      `Erro inesperado ao obter URL de visualização: ${error instanceof Error ? error.message : String(error)}\n\n` +
      `Por favor, verifique o console do navegador para mais detalhes.`
    );
  }
}

/**
 * Delete a file from S3 and database using the unified S3 interface endpoint
 * Backend handles deletion from both S3 and database directly
 * Works for both patient documents and global references
 */
export async function deleteFileFromS3(key: string) {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  
  if (!baseUrl) {
    throw new Error(
      "VITE_API_BASE_URL não está configurada.\n\n" +
      "Por favor, configure a variável de ambiente VITE_API_BASE_URL no arquivo .env e reinicie o servidor de desenvolvimento."
    );
  }

  const url = `${baseUrl}/s3/interface`;

  console.log("[S3 Delete] Requesting deletion for key:", key);

  try {
    // Get JWT token for authentication
    const { fetchAuthSession } = await import('aws-amplify/auth');
    const session = await fetchAuthSession();
    const idToken = session.tokens?.idToken?.toString();

    if (!idToken) {
      throw new Error('Sessão expirada. Por favor, faça login novamente.');
    }

    // Call unified S3 interface endpoint - backend handles S3 + DB deletion
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        action: "delete",
        key,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      let errorMessage = `Erro ao deletar arquivo: ${res.status} ${res.statusText}`;
      
      try {
        const errorData = JSON.parse(text);
        errorMessage = errorData.message || errorMessage;
        if (errorData.details) {
          errorMessage += `\n${errorData.details}`;
        }
      } catch {
        errorMessage += `\nResposta: ${text}`;
      }
      
      console.error("[S3 Delete] Failed to delete:", res.status, text);
      throw new Error(errorMessage);
    }

    const data = await res.json();
    
    // Backend returns: { message, deleted, s3_key, documentId, s3ObjectsDeleted }
    // Backend has already deleted from S3 and database - no second call needed
    console.log("[S3 Delete] File deleted successfully from S3 and database. Key:", key);
    console.log("[S3 Delete] Response:", data);
    
    return data;
  } catch (error) {
    // Re-throw with better context if it's already our formatted error
    if (error instanceof Error && error.message.includes('Erro')) {
      throw error;
    }
    // Otherwise, wrap it in a more user-friendly message
    console.error("[S3 Delete] Unexpected error:", error);
    throw new Error(
      `Erro inesperado ao deletar arquivo: ${error instanceof Error ? error.message : String(error)}\n\n` +
      `Por favor, verifique o console do navegador para mais detalhes.`
    );
  }
}

/**
 * Move a file within S3 from one location to another
 * Since backend may not handle move correctly, we implement it in the frontend:
 * 1. Download file from oldKey to buffer
 * 2. Upload file from buffer to newKey
 * 3. Delete file from oldKey
 */
export async function moveFileInS3(oldKey: string, newKey: string, filename: string, contentType: string = "application/pdf"): Promise<void> {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  
  if (!baseUrl) {
    throw new Error(
      "VITE_API_BASE_URL não está configurada.\n\n" +
      "Por favor, configure a variável de ambiente VITE_API_BASE_URL no arquivo .env e reinicie o servidor de desenvolvimento."
    );
  }

  console.log("[S3 Move] Starting file move from:", oldKey, "to:", newKey);
  console.log("[S3 Move] Filename:", filename, "ContentType:", contentType);

  let fileBuffer: Blob | null = null;

  try {
    // Step 1: Download file from oldKey to buffer
    console.log("[S3 Move] Step 1: Downloading file from old location...");
    const getViewUrl = await getPresignedViewUrl(oldKey);
    const downloadRes = await fetch(getViewUrl);
    
    if (!downloadRes.ok) {
      throw new Error(
        `Erro ao baixar arquivo do local antigo: ${downloadRes.status} ${downloadRes.statusText}`
      );
    }

    fileBuffer = await downloadRes.blob();
    console.log("[S3 Move] File downloaded successfully. Size:", fileBuffer.size, "bytes");

    // Step 2: Convert blob to File object for upload
    const file = new File([fileBuffer], filename, { type: contentType });

    // Step 3: Upload file to newKey
    console.log("[S3 Move] Step 2: Uploading file to new location...");
    
    // Extract folder path from newKey (everything except the filename)
    const newKeyParts = newKey.split('/');
    const folderPath = newKeyParts.length > 1 
      ? newKeyParts.slice(0, -1).join('/') 
      : undefined;

    const { key: uploadedKey } = await uploadFileToS3(file, undefined, folderPath);
    
    // Verify the uploaded key matches the expected newKey
    if (uploadedKey !== newKey) {
      console.warn(`[S3 Move] Warning: Uploaded key (${uploadedKey}) does not match expected newKey (${newKey})`);
      // This might be okay if backend normalizes folder names - continue anyway
    }
    
    console.log("[S3 Move] File uploaded successfully to new location:", uploadedKey);

    // Step 4: Delete file from oldKey
    console.log("[S3 Move] Step 3: Deleting file from old location...");
    await deleteFileFromS3(oldKey);
    console.log("[S3 Move] File deleted successfully from old location");

    console.log("[S3 Move] File moved successfully from:", oldKey, "to:", newKey);
    
  } catch (error) {
    // If upload to new location failed but file was downloaded, we still have it in buffer
    // If upload succeeded but delete failed, the file exists in both places (we'll handle this)
    
    if (error instanceof Error && error.message.includes('Erro')) {
      // Re-throw with context
      throw new Error(
        `Erro ao mover arquivo: ${error.message}\n\n` +
        `Arquivo pode estar em estado inconsistente. Verifique no S3.`
      );
    }
    
    console.error("[S3 Move] Unexpected error:", error);
    throw new Error(
      `Erro inesperado ao mover arquivo: ${error instanceof Error ? error.message : String(error)}\n\n` +
      `Por favor, verifique o console do navegador para mais detalhes.`
    );
  }
}

/**
 * Folder placeholder constant - used to mark empty folders in S3
 * This file is created when an empty folder is created and deleted when files are added
 */
export const FOLDER_PLACEHOLDER_NAME = 'folder.txt';

/**
 * List all documents from S3 via API Gateway
 * Returns objects with key, size, lastModified, and presigned URL
 */
export interface S3Object {
  key: string;
  size: number;
  lastModified: string;
  url?: string; // Presigned URL for viewing/downloading
  isPlaceholder?: boolean; // True if this is a folder placeholder
}

/**
 * Create a placeholder file in S3 to mark an empty folder
 * 
 * NOTE: "Referências Médicas" folder is automatically created by backend when clinic_user is created.
 * Patient folders are automatically created by backend when patient is created.
 * 
 * This function should rarely be needed, but is kept for edge cases where a placeholder is needed.
 */
export async function createFolderPlaceholder(folderName: string): Promise<void> {
  // For "Referências Médicas": Backend already creates _placeholder.txt automatically
  // No need to create via frontend
  if (folderName === "Referências médicas" || folderName.toLowerCase().includes("referências") || folderName.toLowerCase().includes("referencias")) {
    console.log(`[S3 Create Folder] "Referências Médicas" folder is created automatically by backend. Skipping placeholder creation.`);
    return;
  }

  // Create a small text file as placeholder
  const placeholderContent = `This file marks an empty folder: ${folderName}`;
  const placeholderBlob = new Blob([placeholderContent], { type: 'text/plain' });
  const placeholderFile = new File([placeholderBlob], FOLDER_PLACEHOLDER_NAME, { type: 'text/plain' });

  console.log(`[S3 Create Folder] Creating placeholder for folder: ${folderName}`);

  try {
    // Upload placeholder file using the same upload function
    // Use folderPath to indicate where to create the placeholder
    await uploadFileToS3(placeholderFile, folderName);
    console.log(`[S3 Create Folder] Placeholder created successfully`);
  } catch (error) {
    console.error('[S3 Create Folder] Error creating folder placeholder:', error);
    // Don't throw - placeholder creation is not critical
    // Backend should handle folder creation automatically
  }
}

/**
 * Delete a folder placeholder from S3
 */
export async function deleteFolderPlaceholder(folderName: string): Promise<void> {
  const placeholderKey = `${folderName}/${FOLDER_PLACEHOLDER_NAME}`;
  console.log(`[S3 Delete Folder Placeholder] Deleting placeholder: ${placeholderKey}`);
  
  try {
    await deleteFileFromS3(placeholderKey);
    console.log(`[S3 Delete Folder Placeholder] Placeholder deleted successfully: ${placeholderKey}`);
  } catch (error) {
    console.error('[S3 Delete Folder Placeholder] Error deleting placeholder:', error);
    // Don't throw - placeholder might not exist or already be deleted
    // This is not critical for folder deletion
  }
}

export async function listDocumentsFromS3(): Promise<S3Object[]> {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  
  if (!baseUrl) {
    throw new Error(
      "VITE_API_BASE_URL não está configurada.\n\n" +
      "Por favor, configure a variável de ambiente VITE_API_BASE_URL no arquivo .env e reinicie o servidor de desenvolvimento."
    );
  }

  const url = `${baseUrl}/s3/interface`;

  console.log("[S3 List] Requesting list of objects from S3");

  try {
    // Get JWT token for authentication
    const { fetchAuthSession } = await import('aws-amplify/auth');
    const session = await fetchAuthSession();
    const idToken = session.tokens?.idToken?.toString();

    if (!idToken) {
      throw new Error('Sessão expirada. Por favor, faça login novamente.');
    }

    // Request list from API Gateway
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        action: "list",
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("[S3 List] Failed to list objects:", res.status, text);
      throw new Error(
        `Erro ao listar objetos: ${res.status} ${res.statusText}\n` +
        `Resposta: ${text}`
      );
    }

    const data = await res.json();
    
    // Defensive: Accept both response shapes - "objects" and "items"
    // Backend may return either format, so we handle both
    const objects = Array.isArray(data.objects)
      ? data.objects
      : Array.isArray(data.items)
        ? data.items
        : null;

    if (!objects) {
      console.error("[S3 List] Invalid API response:", data);
      throw new Error(
        "Resposta da API inválida: objects não é um array.\n" +
        "Resposta recebida: " + JSON.stringify(data)
      );
    }

    // Mark placeholder files
    const objectsWithPlaceholderFlag = objects.map((obj: S3Object) => {
      const keyParts = obj.key.split('/');
      const fileName = keyParts[keyParts.length - 1];
      return {
        ...obj,
        isPlaceholder: fileName === FOLDER_PLACEHOLDER_NAME
      };
    });

    console.log(`[S3 List] Retrieved ${objects.length} objects from S3`);
    return objectsWithPlaceholderFlag;
  } catch (error) {
    // Re-throw with better context if it's already our formatted error
    if (error instanceof Error && error.message.includes('Erro')) {
      throw error;
    }
    // Otherwise, wrap it in a more user-friendly message
    console.error("[S3 List] Unexpected error:", error);
    throw new Error(
      `Erro inesperado ao listar objetos: ${error instanceof Error ? error.message : String(error)}\n\n` +
      `Por favor, verifique o console do navegador para mais detalhes.`
    );
  }
}


