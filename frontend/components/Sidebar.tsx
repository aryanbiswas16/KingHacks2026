import React from 'react';
import { 
  FolderOpen, 
  Briefcase, 
  UserCircle, 
  Settings,
  Plus,
  ChevronRight,
  LogOut
} from 'lucide-react';

interface SidebarProps {
  clients: any[];
  selectedProject: any;
  onSelectProject: (client: any, project: any) => void;
  onAddClient: () => void;
}

export function Sidebar({ clients, selectedProject, onSelectProject, onAddClient }: SidebarProps) {
  return (
    <div className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen border-r border-slate-800">
      {/* Logo Area */}
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-lg">B</span>
          </div>
          Beacon
        </h1>
        <p className="text-xs text-slate-500 mt-1">Consulting Intelligence</p>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-6 px-3 space-y-6">
        
        {/* Clients Section */}
        <div>
          <div className="px-3 mb-2 flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Engagements
            </h2>
            <button 
              onClick={onAddClient}
              className="text-slate-500 hover:text-white transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-1">
            {clients.map(client => (
              <div key={client.id} className="mb-4">
                <div className="px-3 py-1 text-sm font-medium text-slate-400 flex items-center gap-2 mb-1">
                   <UserCircle className="w-4 h-4" />
                   {client.name}
                </div>
                <div className="ml-4 pl-2 border-l border-slate-800 space-y-1">
                  {client.projects.map((project: any) => (
                    <button
                      key={project.id}
                      onClick={() => onSelectProject(client, project)}
                      className={`
                        w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between group
                        ${selectedProject?.id === project.id 
                          ? 'bg-blue-600/10 text-blue-400' 
                          : 'hover:bg-slate-800 hover:text-white'}
                      `}
                    >
                      <span className="truncate">{project.name}</span>
                      {selectedProject?.id === project.id && (
                        <ChevronRight className="w-3 h-3" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800">
        <button className="flex items-center gap-3 w-full px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
          <Settings className="w-4 h-4" />
          Settings
        </button>
        <button className="flex items-center gap-3 w-full px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors mt-1">
           <LogOut className="w-4 h-4" />
           Sign Out
        </button>
        
        <div className="mt-4 flex items-center gap-3 px-3">
           <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
             JD
           </div>
           <div>
             <p className="text-sm text-white font-medium">Jane Doe</p>
             <p className="text-xs text-slate-500">Sales Director</p>
           </div>
        </div>
      </div>
    </div>
  );
}
