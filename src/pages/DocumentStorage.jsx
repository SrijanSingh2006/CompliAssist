import { Download, FileText, Folder, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatBytes, formatDisplayDate } from '../utils/formatters';
import { showToast } from '../utils/toast';
import './DocumentStorage.css';

export function DocumentStorage() {
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const { data, uploadDocument, downloadDocument, deleteDocument } = useApp();
  const documents = data?.documents || [];
  const storage = data?.dashboard?.storage;

  async function handleFileChange(event) {
    const [file] = event.target.files || [];

    if (!file) {
      return;
    }

    setIsUploading(true);

    try {
      const message = await uploadDocument(file);
      showToast(message);
    } catch (error) {
      showToast(error.message);
    } finally {
      event.target.value = '';
      setIsUploading(false);
    }
  }

  async function handleDownload(documentId, name) {
    try {
      await downloadDocument(documentId, name);
      showToast(`Downloaded ${name}.`);
    } catch (error) {
      showToast(error.message);
    }
  }

  async function handleDelete(documentId) {
    try {
      const message = await deleteDocument(documentId);
      showToast(message);
    } catch (error) {
      showToast(error.message);
    }
  }

  return (
    <div className="storage-container">
      <div className="flex justify-between items-center gap-4 storage-header">
        <div>
          <h1 className="text-2xl font-bold">Document Vault</h1>
          <p className="text-secondary mt-1">
            Upload, persist, download, and remove documents from the backend vault.
          </p>
        </div>
        <button
          className="btn-primary flex items-center gap-2"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <Upload size={18} />
          {isUploading ? 'Uploading...' : 'Upload Document'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden-input"
          onChange={handleFileChange}
        />
      </div>

      <div className="stats-grid mb-6">
        <div className="card stat-card">
          <div className="flex-col gap-2">
            <span className="text-sm text-secondary">Storage Used</span>
            <div className="text-xl font-bold">
              {storage?.percentage ?? 0}% ({storage?.usedLabel || '0 B'} /{' '}
              {storage?.limitLabel || '0 B'})
            </div>
          </div>
        </div>
        <div className="card stat-card">
          <div className="flex-col gap-2">
            <span className="text-sm text-secondary">Total Documents</span>
            <div className="text-xl font-bold">{documents.length} Files</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="section-title mb-4">Recent Documents</h3>
        {documents.length === 0 ? (
          <div className="empty-state">
            <Folder size={28} />
            <div>
              <strong>No documents uploaded yet</strong>
              <p>Use the upload button to add compliance certificates, returns, or proof files.</p>
            </div>
          </div>
        ) : (
          <div className="doc-list">
            {documents.map((doc) => (
              <div key={doc.id} className="doc-item">
                <div className="doc-info">
                  <div className="doc-icon">
                    {doc.type === 'PDF' ? (
                      <FileText size={20} className="text-danger" />
                    ) : (
                      <Folder size={20} className="text-primary" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium">{doc.name}</h4>
                    <span className="text-xs text-secondary">
                      {formatBytes(doc.bytes)} | Uploaded {formatDisplayDate(doc.uploadedAt)}
                    </span>
                  </div>
                </div>
                <div className="doc-actions">
                  <button className="btn-icon" onClick={() => handleDownload(doc.id, doc.name)}>
                    <Download size={18} />
                  </button>
                  <button className="btn-icon" onClick={() => handleDelete(doc.id)}>
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
