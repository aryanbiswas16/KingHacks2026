import React from 'react';
import { X, Info } from 'lucide-react';

interface ResponsibleAINoticeProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ResponsibleAINotice({ isOpen, onClose }: ResponsibleAINoticeProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Info className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-slate-900">Responsible AI & Usage Notice</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <p className="text-slate-700 leading-relaxed">
            This AI assistant is designed to support enterprise users by summarizing and analyzing documents and meeting transcripts provided by the user.
          </p>

          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900">Important Limitations:</h3>
            <ul className="space-y-2 ml-4">
              <li className="text-slate-700 flex gap-3">
                <span className="text-blue-600 font-bold flex-shrink-0">•</span>
                <span>AI-generated responses may be incomplete, outdated, or inaccurate.</span>
              </li>
              <li className="text-slate-700 flex gap-3">
                <span className="text-blue-600 font-bold flex-shrink-0">•</span>
                <span>All insights should be reviewed and validated by a human decision-maker.</span>
              </li>
              <li className="text-slate-700 flex gap-3">
                <span className="text-blue-600 font-bold flex-shrink-0">•</span>
                <span>Responses are grounded in uploaded materials, with citations shown when available.</span>
              </li>
              <li className="text-slate-700 flex gap-3">
                <span className="text-blue-600 font-bold flex-shrink-0">•</span>
                <span>The system does not access external data sources or make autonomous decisions.</span>
              </li>
            </ul>
          </div>

          <div className="space-y-3 bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h3 className="font-semibold text-slate-900">Data Handling:</h3>
            <p className="text-slate-700 text-sm leading-relaxed">
              Uploaded files are processed only for the purpose of generating responses and are not reused beyond the session.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900 leading-relaxed">
              <strong>Acknowledgment:</strong> By using this tool, you acknowledge that AI outputs are advisory and not a substitute for professional judgment.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white flex justify-end gap-3 p-6 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
}
