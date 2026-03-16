import { useState, useCallback, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, CheckCircle, XCircle, Loader, FileText } from 'lucide-react';
import { api } from '../../api/client';
import { useQueryClient } from '@tanstack/react-query';

type ImportType = 'vulnerabilities' | 'breaches';

interface JobStatus {
  id: number;
  filename: string;
  format: string;
  type: string;
  status: 'pending' | 'processing' | 'done' | 'failed';
  records_total: number;
  records_imported: number;
  error_message: string | null;
}

export function ImportWizard() {
  const [type, setType] = useState<ImportType>('vulnerabilities');
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const eventSourceRef = useRef<EventSource | null>(null);

  // Cleanup EventSource on unmount
  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;

    setError(null);
    setUploading(true);
    setJobStatus(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const { data } = await api.post('/imports/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const jobId = data.jobId;

      // Use SSE for real-time status updates
      eventSourceRef.current?.close();
      const es = new EventSource(`/api/imports/${jobId}/stream`);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        const status = JSON.parse(event.data) as JobStatus;
        setJobStatus(status);
        if (status.status === 'done' || status.status === 'failed') {
          es.close();
          eventSourceRef.current = null;
          setUploading(false);
          if (status.status === 'done') {
            queryClient.invalidateQueries();
          }
        }
      };

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;
        setUploading(false);
      };
    } catch (err: unknown) {
      setUploading(false);
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setError(msg);
    }
  }, [type, queryClient]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'application/json': ['.json'] },
    maxFiles: 1,
    disabled: uploading,
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Type selector */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Import Type</h3>
        <div className="flex gap-3">
          {(['vulnerabilities', 'breaches'] as ImportType[]).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-colors capitalize ${
                type === t
                  ? 'border-sky-500 bg-sky-500/10 text-sky-400'
                  : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Field mapping reference */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Expected Fields</h3>
        <p className="text-xs text-gray-500 mb-3">
          Column headers are mapped automatically (case-insensitive). Required fields are marked *.
        </p>
        {type === 'vulnerabilities' ? (
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            {[
              ['cve_id *', 'CVE-2024-1234'],
              ['title', 'Vulnerability name'],
              ['severity', 'CRITICAL / HIGH / MEDIUM / LOW'],
              ['cvss_score', '9.8'],
              ['description', 'Text description'],
              ['countries', 'US, GB, DE'],
              ['published_at', '2024-01-15'],
              ['patch_available', 'true / false'],
            ].map(([field, example]) => (
              <div key={field} className="flex flex-col gap-0.5 bg-gray-800/50 rounded p-2">
                <span className="text-sky-400">{field}</span>
                <span className="text-gray-500">{example}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            {[
              ['organization *', 'Company name'],
              ['domain', 'example.com'],
              ['country', 'United States'],
              ['breach_date', '2024-01-15'],
              ['records_affected', '1000000'],
              ['breach_types', 'Passwords, Emails'],
              ['description', 'Text description'],
              ['is_verified', 'true / false'],
            ].map(([field, example]) => (
              <div key={field} className="flex flex-col gap-0.5 bg-gray-800/50 rounded p-2">
                <span className="text-sky-400">{field}</span>
                <span className="text-gray-500">{example}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-sky-500 bg-sky-500/5'
            : 'border-gray-700 hover:border-gray-600 bg-gray-900'
        } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          {uploading ? (
            <Loader size={32} className="text-sky-400 animate-spin" />
          ) : (
            <Upload size={32} className="text-gray-500" />
          )}
          <div>
            <p className="text-sm text-gray-300 font-medium">
              {isDragActive ? 'Drop file here' : 'Drag & drop CSV or JSON file'}
            </p>
            <p className="text-xs text-gray-500 mt-1">or click to select — max 50MB</p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
          <XCircle size={16} /> {error}
        </div>
      )}

      {/* Job status */}
      {jobStatus && (
        <div className={`card border ${
          jobStatus.status === 'done'
            ? 'border-green-500/30'
            : jobStatus.status === 'failed'
            ? 'border-red-500/30'
            : 'border-gray-700'
        }`}>
          <div className="flex items-center gap-3">
            {jobStatus.status === 'done' && <CheckCircle size={18} className="text-green-400" />}
            {jobStatus.status === 'failed' && <XCircle size={18} className="text-red-400" />}
            {['pending', 'processing'].includes(jobStatus.status) && (
              <Loader size={18} className="text-sky-400 animate-spin" />
            )}
            <FileText size={18} className="text-gray-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-200">{jobStatus.filename}</p>
              <p className="text-xs text-gray-500 capitalize">{jobStatus.status}</p>
            </div>
            {jobStatus.status === 'done' && (
              <span className="text-sm font-mono text-green-400">
                {jobStatus.records_imported} / {jobStatus.records_total} imported
              </span>
            )}
          </div>
          {jobStatus.error_message && (
            <p className="mt-2 text-xs text-red-400">{jobStatus.error_message}</p>
          )}
          {['pending', 'processing'].includes(jobStatus.status) && (
            <div className="mt-3 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-sky-500 rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
