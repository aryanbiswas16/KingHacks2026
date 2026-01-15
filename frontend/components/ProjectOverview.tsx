import React from 'react';
import { 
  Users, 
  Target, 
  TrendingUp, 
  ShieldAlert, 
  DollarSign,
  Calendar
} from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
}

function MetricCard({ label, value, icon: Icon, color }: MetricCardProps) {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
      <div>
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">{label}</p>
        <h4 className="text-xl font-bold text-slate-900">{value}</h4>
      </div>
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
  );
}

export function ProjectOverview({ projectName }: { projectName: string }) {
  // Mock data - in a real app, fetch from context endpoint
  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          label="Deal Size" 
          value="$1.5M ARR" 
          icon={DollarSign} 
          color="bg-emerald-500" 
        />
        <MetricCard 
          label="Sales Stage" 
          value="Negotiation" 
          icon={TrendingUp} 
          color="bg-blue-500" 
        />
        <MetricCard 
          label="Timeline" 
          value="Q2 2026" 
          icon={Calendar} 
          color="bg-purple-500" 
        />
        <MetricCard 
          label="Risk Level" 
          value="Medium" 
          icon={ShieldAlert} 
          color="bg-amber-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stakeholders */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
           <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
             <Users className="w-5 h-5 text-blue-600" />
             Key Stakeholders
           </h3>
           <div className="space-y-4">
             {[
               { name: 'Sarah Chen', role: 'CTO', stance: 'Champion', color: 'text-green-600 bg-green-50' },
               { name: 'Elena V.', role: 'CISO', stance: 'Blocker', color: 'text-red-600 bg-red-50' },
               { name: 'Jordan', role: 'Sales Lead', stance: 'Owner', color: 'text-blue-600 bg-blue-50' },
             ].map((person, i) => (
               <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50">
                 <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                     {person.name.charAt(0)}
                   </div>
                   <div>
                     <p className="text-sm font-medium text-slate-900">{person.name}</p>
                     <p className="text-xs text-slate-500">{person.role}</p>
                   </div>
                 </div>
                 <span className={`text-xs font-medium px-2 py-1 rounded-full ${person.color}`}>
                   {person.stance}
                 </span>
               </div>
             ))}
           </div>
        </div>

        {/* Next Steps / Strategy */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
           <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
             <Target className="w-5 h-5 text-purple-600" />
             Recommended Actions
           </h3>
           <div className="space-y-3">
             {[
               "Address Elena's security concerns with compliance doc",
               "Send developer experience summary to Sarah",
               "Schedule final pricing review"
             ].map((action, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-700 leading-relaxed">{action}</p>
                </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
}
