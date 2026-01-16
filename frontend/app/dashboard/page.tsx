"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sidebar } from "../../components/Sidebar";
import { ChatInterface, type Message } from "../../components/ChatInterface";
import { DocumentManager } from "../../components/DocumentManager";
import { ProjectOverview } from "../../components/ProjectOverview";
import { LayoutDashboard, MessageSquare, Files, Play } from 'lucide-react';

type Project = {
  id: string;
  name: string;
};

type Client = {
  id: string;
  name: string;
  logs: string[];
  projects: Project[];
};

export default function DashboardPage() {
  const [clients, setClients] = useState<Client[]>([
    {
      id: "client1",
      name: "Global Bank Corp",
      logs: ["Initial outreach"],
      projects: [
        { id: "proj_global_pay", name: "Payment Gateway Replacement" },
        { id: "proj_global_cloud", name: "Cloud Migration Strategy" },
      ],
    },
    {
      id: "client2",
      name: "TechStart Inc",
      logs: ["Demo scheduled"],
      projects: [
        { id: "proj_start_scale", name: "Series B Scaling Consult" },
      ],
    },
  ]);

  const [selectedClient, setSelectedClient] = useState<Client | null>(clients[0]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(clients[0].projects[0]);
  const [activeTab, setActiveTab] = useState<'overview' | 'chat' | 'documents'>('overview');
  const [projectChats, setProjectChats] = useState<Record<string, Message[]>>({});
  
  // Minimal document state mock
  const [documents, setDocuments] = useState<any[]>([]);

  // Helper to update messages for current project
  const updateCurrentProjectMessages = (action: React.SetStateAction<Message[]>) => {
    if (!selectedProject) return;
    
    setProjectChats(prev => {
      const currentMessages = prev[selectedProject.id] || [];
      const newMessages = typeof action === 'function' 
        ? action(currentMessages)
        : action;
        
      return {
        ...prev,
        [selectedProject.id]: newMessages
      };
    });
  };

  // Function to refresh documents list (called after upload)
  const refreshDocuments = async () => {
    if(!selectedProject) return;
    try {
      const res = await fetch(`http://localhost:8000/api/v1/documents?project_id=${selectedProject.id}`);
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch(e) {
      console.error("Failed to fetch docs", e);
    }
  };

  // Load docs when project changes
  React.useEffect(() => {
    refreshDocuments();
  }, [selectedProject]);

  function addClient() {
    const id = `client${clients.length + 1}`;
    setClients([
      ...clients,
      {
        id,
        name: `New Client ${clients.length + 1}`,
        logs: [],
        projects: [{ id: `proj_${id}_1`, name: "Untitled Engagement" }],
      },
    ]);
  }

  return (
    <div className="flex h-screen bg-slate-100 font-sans">
      <Sidebar 
        clients={clients} 
        selectedProject={selectedProject}
        onSelectProject={(client, project) => {
          setSelectedClient(client);
          setSelectedProject(project);
        }}
        onAddClient={addClient}
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        { selectedProject ? (
          <>
            {/* Top Bar */}
            <header className="bg-white border-b border-slate-200 px-8 py-5 flex justify-between items-center shadow-sm z-10">
              <div>
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                   <span>{selectedClient?.name}</span>
                   <span>/</span>
                   <span>Engagements</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900">{selectedProject.name}</h2>
              </div>
              
              {/* Tab Navigation */}
              <div className="flex bg-slate-100 p-1 rounded-lg items-center gap-1">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'overview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'chat' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <MessageSquare className="w-4 h-4" />
                  Assistant
                </button>
                <div className={`flex items-center rounded-md ${activeTab === 'documents' ? 'bg-white shadow-sm' : ''}`}>
                  <button
                    onClick={() => setActiveTab('documents')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'documents' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <Files className="w-4 h-4" />
                    Documents
                  </button>
                  {selectedProject && (
                    <Link
                      href={`/live/${selectedProject.id}`}
                      className="ml-1 mr-2 px-4 py-2 text-sm font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-2"
                      title="Start live transcription"
                    >
                      <Play className="w-4 h-4" />
                      Start
                    </Link>
                  )}
                </div>
              </div>
            </header>

            {/* Content Area */}
            <main className="flex-1 overflow-y-auto p-8">
              <div className="max-w-7xl mx-auto">
                {activeTab === 'overview' && (
                  <div className="animate-in fade-in duration-300 space-y-6">
                    <ProjectOverview projectName={selectedProject.name} projectId={selectedProject.id} />
                  </div>
                )}
                
                {activeTab === 'chat' && (
                  <div className="animate-in fade-in duration-300">
                    <ChatInterface 
                      key={selectedProject.id}
                      projectId={selectedProject.id} 
                      projectName={selectedProject.name}
                      messages={projectChats[selectedProject.id] || []}
                      setMessages={updateCurrentProjectMessages}
                    />
                  </div>
                )}
                
                {activeTab === 'documents' && (
                  <div className="animate-in fade-in duration-300">
                     <DocumentManager 
                       projectId={selectedProject.id} 
                       documents={documents}
                       onUploadComplete={refreshDocuments}
                     />
                  </div>
                )}
              </div>
            </main>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
             <div className="text-center">
               <Files className="w-16 h-16 mx-auto mb-4 opacity-20" />
               <p>Select a project to begin</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
