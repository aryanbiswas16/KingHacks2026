import React from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import { formatDate } from '../lib/dateUtils';

interface Document {
  name: string;
  status: string;
  id?: string;
  file_type?: string;
  file_size?: number;
  size_formatted?: string;
  is_transcript?: boolean;
  uploaded_at?: string;
}

interface DocumentManagerProps {
  projectId: string;
  documents: Document[];
  onUploadComplete: () => void;
}

export function DocumentManager({ projectId, documents, onUploadComplete }: DocumentManagerProps) {
  const [isUploading, setIsUploading] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = React.useState<{ id: string; name: string } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = React.useState(false);
  const [isResetting, setIsResetting] = React.useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("project_id", projectId);
    
    Array.from(e.target.files).forEach((file) => {
      formData.append("files", file);
    });

    try {
      // Assuming proxy or CORS is set up. passing full URL for safety given current context
      const response = await fetch("http://localhost:8000/api/v1/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        onUploadComplete();
      } else {
        console.error("Upload failed");
      }
    } catch (error) {
      console.error("Error uploading:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteClick = (documentId: string, documentName: string) => {
    setDeleteConfirm({ id: documentId, name: documentName });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;

    const { id: documentId, name: documentName } = deleteConfirm;
    setDeletingId(documentId);
    
    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/documents?project_id=${projectId}&document_id=${documentId}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        setDeleteConfirm(null);
        onUploadComplete();
      } else {
        console.error("Delete failed");
        alert("Failed to delete document");
      }
    } catch (error) {
      console.error("Error deleting:", error);
      alert("Error deleting document");
    } finally {
      setDeletingId(null);
    }
  };

  const handleResetProject = async () => {
    setIsResetting(true);
    try {
      const response = await fetch(`http://localhost:8000/api/v1/reset?project_id=${projectId}`, {
        method: "DELETE"
      });
      
      if (response.ok) {
        setShowResetConfirm(false);
        onUploadComplete(); // Refresh list (should be empty now)
        alert("Project memory has been reset.");
      } else {
        console.error("Reset failed");
        alert("Failed to reset project memory");
      }
    } catch (error) {
      console.error("Error resetting:", error);
      alert("Error resetting project");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      {/* Privacy Notice Banner */}
      <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
        <span className="text-lg">🔒</span>
        <div className="flex-1">
          <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide">Privacy Protection Active</p>
          <p className="text-xs text-blue-700 mt-1">Sensitive information in documents is handled according to enterprise security and privacy standards. All data is processed securely.</p>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Project Documents
        </h3>
        <div className="flex gap-2">
           <button 
             onClick={() => setShowResetConfirm(true)}
             disabled={isResetting || isUploading}
             className="flex items-center gap-2 bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
             title="Hard Reset Project Memory"
           >
             {isResetting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
             ) : (
                <RefreshCw className="w-4 h-4" />
             )}
             Reset Memory
           </button>
           <div className="relative">
             <input
               type="file"
               multiple
               onChange={handleFileUpload}
               className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
               disabled={isUploading}
             />
             <button 
               disabled={isUploading}
               className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
             >
               {isUploading ? (
                 <Loader2 className="w-4 h-4 animate-spin" />
               ) : (
                 <Upload className="w-4 h-4" />
               )}
               Upload Files
             </button>
           </div>
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-300">
          <p className="text-slate-500 text-sm">No documents uploaded yet.</p>
          <p className="text-slate-400 text-xs mt-1">Upload strategy memos, transcripts, or sales data.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Documents Section */}
          {documents.filter(d => !d.is_transcript).length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-3 px-1">
                Documents ({documents.filter(d => !d.is_transcript).length})
              </h4>
              <div className="space-y-2">
                {documents
                  .filter(d => !d.is_transcript)
                  .sort((a, b) => {
                    if (a.uploaded_at && b.uploaded_at) {
                      return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
                    }
                    return 0;
                  })
                  .map((doc, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg hover:border-blue-200 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="bg-gradient-to-br from-blue-100 to-blue-50 p-2 rounded border border-blue-200 min-w-fit">
                          <span className="text-xs font-bold text-blue-600">
                            {doc.file_type || 'FILE'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{doc.name}</p>
                          <div className="flex gap-3 mt-1">
                            {doc.uploaded_at && (
                              <p className="text-xs text-slate-500">
                                {formatDate(doc.uploaded_at)}
                              </p>
                            )}
                            {doc.size_formatted && (
                              <p className="text-xs text-slate-500">
                                {doc.size_formatted}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        {doc.status === 'failed' ? (
                          <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                            <AlertCircle className="w-3 h-3" /> Failed
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                            <CheckCircle className="w-3 h-3" /> Indexed
                          </span>
                        )}
                        <button
                          onClick={() => handleDeleteClick(doc.id || '', doc.name)}
                          disabled={deletingId === doc.id}
                          className="ml-2 p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          title="Delete document"
                        >
                          {deletingId === doc.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Meeting Transcripts Section */}
          {documents.filter(d => d.is_transcript).length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-3 px-1">
                Meeting Transcripts ({documents.filter(d => d.is_transcript).length})
              </h4>
              <div className="space-y-2">
                {documents
                  .filter(d => d.is_transcript)
                  .sort((a, b) => {
                    if (a.uploaded_at && b.uploaded_at) {
                      return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
                    }
                    return 0;
                  })
                  .map((doc, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg hover:border-blue-200 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="bg-gradient-to-br from-purple-100 to-purple-50 p-2 rounded border border-purple-200 min-w-fit">
                          <span className="text-xs font-bold text-purple-600">
                            {doc.file_type || 'FILE'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{doc.name}</p>
                          <div className="flex gap-3 mt-1">
                            {doc.uploaded_at && (
                              <p className="text-xs text-slate-500">
                                {formatDate(doc.uploaded_at)}
                              </p>
                            )}
                            {doc.size_formatted && (
                              <p className="text-xs text-slate-500">
                                {doc.size_formatted}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        {doc.status === 'failed' ? (
                          <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                            <AlertCircle className="w-3 h-3" /> Failed
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                            <CheckCircle className="w-3 h-3" /> Indexed
                          </span>
                        )}
                        <button
                          onClick={() => handleDeleteClick(doc.id || '', doc.name)}
                          disabled={deletingId === doc.id}
                          className="ml-2 p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          title="Delete document"
                        >
                          {deletingId === doc.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Delete Document?"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm(null)}
        isLoading={deletingId === deleteConfirm?.id}
      />

      <ConfirmDialog
        isOpen={showResetConfirm}
        title="Reset Project Memory?"
        message="This will permanently delete the AI Assistant, all conversation history, and documents from Backboard IO for this project. This cannot be undone."
        confirmText="Reset Everything"
        cancelText="Cancel"
        isDangerous={true}
        onConfirm={handleResetProject}
        onCancel={() => setShowResetConfirm(false)}
        isLoading={isResetting}
      />
    </div>
  );
}
