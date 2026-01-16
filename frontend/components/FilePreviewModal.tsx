import React from 'react';
import { X } from 'lucide-react';

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fileUrl: string; // The URL to fetch/display the file
  fileType?: string; // e.g. 'pdf', 'text', 'image' - inferred from extension if not provided
}

export function FilePreviewModal({ isOpen, onClose, title, fileUrl }: FilePreviewModalProps) {
  if (!isOpen) return null;

  const isPdf = title.toLowerCase().endsWith('.pdf');
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(title);
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-4xl h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <h3 className="font-semibold text-lg text-slate-800 truncate pr-4" title={title}>
            {title}
          </h3>
          <div className="flex items-center gap-2">
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-slate-50 relative overflow-hidden">
          {isPdf ? (
            <iframe 
              src={fileUrl} 
              className="w-full h-full border-none"
              title="PDF Preview"
            />
          ) : isImage ? (
             <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
                <img src={fileUrl} alt={title} className="max-w-full max-h-full object-contain shadow-sm" />
             </div>
          ) : (
            // Fallback for text/other: Try to fetch and display or show iframe
             <iframe 
               src={fileUrl} 
               className="w-full h-full border-none bg-white" 
               title="File Preview"
             />
          )}
        </div>
      </div>
    </div>
  );
}
