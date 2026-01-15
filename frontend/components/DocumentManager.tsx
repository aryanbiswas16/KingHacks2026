import React from 'react';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Loader2 
} from 'lucide-react';

interface Document {
  name: string;
  status: string;
  id?: string;
}

interface DocumentManagerProps {
  projectId: string;
  documents: Document[];
  onUploadComplete: () => void;
}

export function DocumentManager({ projectId, documents, onUploadComplete }: DocumentManagerProps) {
  const [isUploading, setIsUploading] = React.useState(false);

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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Project Documents
        </h3>
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

      <div className="space-y-3">
        {documents.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-300">
            <p className="text-slate-500 text-sm">No documents uploaded yet.</p>
            <p className="text-slate-400 text-xs mt-1">Upload strategy memos, transcripts, or sales data.</p>
          </div>
        ) : (
          <div className="grid gap-3">
             {documents.map((doc, idx) => (
              <div 
                key={idx} 
                className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg hover:border-blue-200 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <FileText className="w-5 h-5 text-slate-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">{doc.name}</p>
                    <p className="text-xs text-slate-500 uppercase">{doc.status || 'Processed'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   {doc.status === 'failed' ? (
                       <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                           <AlertCircle className="w-3 h-3" /> Failed
                       </span>
                   ) : (
                       <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                           <CheckCircle className="w-3 h-3" /> Indexed
                       </span>
                   )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
