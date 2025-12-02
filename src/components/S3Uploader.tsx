import { useState } from "react";
import { uploadFileToS3 } from "../lib/uploadToS3";

export function S3Uploader() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setStatus(null);
  };

  const onUploadClick = async () => {
    if (!file) {
      setStatus("Select a file first");
      return;
    }

    try {
      setStatus("Uploading...");
      const { key } = await uploadFileToS3(file);
      setStatus(`Uploaded successfully as ${key}`);
    } catch (err) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'Upload failed, check console';
      setStatus(errorMessage);
    }
  };

  return (
    <div>
      <input type="file" onChange={onFileChange} />
      <button onClick={onUploadClick} disabled={!file}>
        Upload
      </button>
      {status && <p>{status}</p>}
    </div>
  );
}

