import React from 'react';
import {
  Users,
  Target,
  TrendingUp,
  ShieldAlert,
  DollarSign,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Clock
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

type OverviewData = {
  summary: string;
  highlights: string[];
  metrics: Array<{ label: string; value: string; icon: React.ElementType; color: string }>;
  stakeholders: Array<{ name: string; role: string; stance: string; color: string }>;
  actions: string[];
  risks: Array<{ label: string; severity: 'Low' | 'Medium' | 'High' }>
  timeline: Array<{ label: string; date: string; status: 'done' | 'in-progress' | 'upcoming' }>;
};

const projectOverviews: Record<string, OverviewData> = {
  proj_global_pay: {
    summary: 'Replace legacy payment gateway with a PCI-compliant, high-availability platform to reduce failed transactions and fraud exposure.',
    highlights: ['$1.5M ARR expansion', 'PCI & SOC2 alignment', 'Target go-live Q2 2026'],
    metrics: [
      { label: 'Deal Size', value: '$1.5M ARR', icon: DollarSign, color: 'bg-emerald-500' },
      { label: 'Sales Stage', value: 'Negotiation', icon: TrendingUp, color: 'bg-blue-500' },
      { label: 'Timeline', value: 'Q2 2026', icon: Calendar, color: 'bg-purple-500' },
      { label: 'Risk Level', value: 'Medium', icon: ShieldAlert, color: 'bg-amber-500' },
    ],
    stakeholders: [
      { name: 'Sarah Chen', role: 'CTO', stance: 'Champion', color: 'text-green-600 bg-green-50' },
      { name: 'Elena V.', role: 'CISO', stance: 'Blocker', color: 'text-red-600 bg-red-50' },
      { name: 'Jordan', role: 'Sales Lead', stance: 'Owner', color: 'text-blue-600 bg-blue-50' },
    ],
    actions: [
      "Address Elena's security concerns with compliance doc",
      'Send developer experience summary to Sarah',
      'Schedule final pricing review'
    ],
    risks: [
      { label: 'Fraud tooling integration scope creep', severity: 'Medium' },
      { label: 'PCI audit timeline dependency', severity: 'High' },
    ],
    timeline: [
      { label: 'Discovery complete', date: 'Jan 08', status: 'done' },
      { label: 'Security review', date: 'Feb 02', status: 'in-progress' },
      { label: 'Commercial terms', date: 'Mar 05', status: 'upcoming' },
    ],
  },
  proj_global_cloud: {
    summary: 'Define cloud migration strategy and phased modernization plan to reduce infra cost and improve release velocity.',
    highlights: ['24% infra savings target', 'Hybrid -> cloud plan', 'Pilot in Q3 2026'],
    metrics: [
      { label: 'Deal Size', value: '$980K ARR', icon: DollarSign, color: 'bg-emerald-500' },
      { label: 'Sales Stage', value: 'Solutioning', icon: TrendingUp, color: 'bg-blue-500' },
      { label: 'Timeline', value: 'Q3 2026', icon: Calendar, color: 'bg-purple-500' },
      { label: 'Risk Level', value: 'Low', icon: ShieldAlert, color: 'bg-emerald-500' },
    ],
    stakeholders: [
      { name: 'Priya Rao', role: 'VP Infrastructure', stance: 'Champion', color: 'text-green-600 bg-green-50' },
      { name: 'Marco L.', role: 'FinOps', stance: 'Influencer', color: 'text-amber-600 bg-amber-50' },
      { name: 'Nate Ford', role: 'CIO', stance: 'Decision Maker', color: 'text-blue-600 bg-blue-50' },
    ],
    actions: [
      'Finalize workload classification matrix',
      'Validate migration waves with app owners',
      'Deliver TCO model to finance'
    ],
    risks: [
      { label: 'Legacy app dependencies', severity: 'Medium' },
      { label: 'Vendor lock-in perception', severity: 'Low' },
    ],
    timeline: [
      { label: 'App inventory', date: 'Jan 12', status: 'done' },
      { label: 'Wave planning', date: 'Feb 14', status: 'in-progress' },
      { label: 'Pilot kickoff', date: 'Apr 10', status: 'upcoming' },
    ],
  },
  proj_start_scale: {
    summary: 'Scale GTM and internal ops to support Series B growth with repeatable sales process and analytics foundation.',
    highlights: ['Headcount plan approved', 'Pipeline coverage 3.2x', 'Series B target in Q4'],
    metrics: [
      { label: 'Deal Size', value: '$420K ARR', icon: DollarSign, color: 'bg-emerald-500' },
      { label: 'Sales Stage', value: 'Discovery', icon: TrendingUp, color: 'bg-blue-500' },
      { label: 'Timeline', value: 'Q4 2026', icon: Calendar, color: 'bg-purple-500' },
      { label: 'Risk Level', value: 'High', icon: ShieldAlert, color: 'bg-red-500' },
    ],
    stakeholders: [
      { name: 'Maya Singh', role: 'CEO', stance: 'Champion', color: 'text-green-600 bg-green-50' },
      { name: 'Andre K.', role: 'Head of Sales', stance: 'Owner', color: 'text-blue-600 bg-blue-50' },
      { name: 'Liam Q.', role: 'Investor Rep', stance: 'Skeptic', color: 'text-red-600 bg-red-50' },
    ],
    actions: [
      'Define ICP and segmentation',
      'Implement CRM hygiene and reporting',
      'Launch enablement for new SDR team'
    ],
    risks: [
      { label: 'Pipeline conversion volatility', severity: 'High' },
      { label: 'Hiring plan delays', severity: 'Medium' },
    ],
    timeline: [
      { label: 'ICP workshops', date: 'Jan 20', status: 'in-progress' },
      { label: 'CRM dashboards', date: 'Feb 18', status: 'upcoming' },
      { label: 'Enablement rollout', date: 'Mar 25', status: 'upcoming' },
    ],
  },
};

const fallbackOverview = (projectName: string): OverviewData => ({
  summary: `${projectName} engagement overview and priorities.`,
  highlights: ['Engagement in progress', 'Stakeholder alignment', 'Next steps queued'],
  metrics: [
    { label: 'Deal Size', value: '$250K ARR', icon: DollarSign, color: 'bg-emerald-500' },
    { label: 'Sales Stage', value: 'Discovery', icon: TrendingUp, color: 'bg-blue-500' },
    { label: 'Timeline', value: 'TBD', icon: Calendar, color: 'bg-purple-500' },
    { label: 'Risk Level', value: 'Low', icon: ShieldAlert, color: 'bg-emerald-500' },
  ],
  stakeholders: [
    { name: 'Primary Sponsor', role: 'Stakeholder', stance: 'Champion', color: 'text-green-600 bg-green-50' },
    { name: 'Ops Lead', role: 'Stakeholder', stance: 'Influencer', color: 'text-amber-600 bg-amber-50' },
    { name: 'Procurement', role: 'Stakeholder', stance: 'Reviewer', color: 'text-blue-600 bg-blue-50' },
  ],
  actions: ['Confirm success criteria', 'Align timeline and milestones', 'Validate commercial terms'],
  risks: [
    { label: 'Scope clarity pending', severity: 'Medium' },
  ],
  timeline: [
    { label: 'Discovery', date: 'TBD', status: 'in-progress' },
    { label: 'Solutioning', date: 'TBD', status: 'upcoming' },
    { label: 'Decision', date: 'TBD', status: 'upcoming' },
  ],
});

function RiskBadge({ severity }: { severity: 'Low' | 'Medium' | 'High' }) {
  const styles = {
    Low: 'text-green-700 bg-green-50 border-green-200',
    Medium: 'text-amber-700 bg-amber-50 border-amber-200',
    High: 'text-red-700 bg-red-50 border-red-200',
  }[severity];

  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${styles}`}>
      {severity}
    </span>
  );
}

function TimelineDot({ status }: { status: 'done' | 'in-progress' | 'upcoming' }) {
  const styles = {
    done: 'bg-emerald-500',
    'in-progress': 'bg-blue-500',
    upcoming: 'bg-slate-300',
  }[status];

  return <span className={`w-2.5 h-2.5 rounded-full ${styles}`} />;
}

export function ProjectOverview({ projectName, projectId }: { projectName: string; projectId: string }) {
  const data = projectOverviews[projectId] ?? fallbackOverview(projectName);

  return (
    <div className="space-y-6">
      {/* Hero Summary */}
      <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Engagement Snapshot</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-2">{projectName}</h3>
            <p className="text-sm text-slate-600 mt-2 max-w-2xl">{data.summary}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.highlights.map((item, i) => (
              <span key={i} className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-full px-3 py-1">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.metrics.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            icon={metric.icon}
            color={metric.color}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stakeholders */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm lg:col-span-2">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Key Stakeholders
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.stakeholders.map((person, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
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

        {/* Timeline */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-600" />
            Timeline
          </h3>
          <div className="space-y-4">
            {data.timeline.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TimelineDot status={item.status} />
                  <p className="text-sm text-slate-700 font-medium">{item.label}</p>
                </div>
                <span className="text-xs text-slate-500">{item.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recommended Actions */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" />
            Recommended Actions
          </h3>
          <div className="space-y-3">
            {data.actions.map((action, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5" />
                <p className="text-sm text-slate-700 leading-relaxed">{action}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Risks & Signals */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Risks & Signals
          </h3>
          <div className="space-y-3">
            {data.risks.map((risk, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-slate-100">
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  {risk.label}
                </div>
                <RiskBadge severity={risk.severity} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
