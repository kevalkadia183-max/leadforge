import React from 'react';
import { useGetLeadAcquisitionDashboard, getGetLeadAcquisitionDashboardQueryKey } from '@workspace/api-client-react';
import { Users, BarChart2, ShieldAlert, BadgeInfo, Target, Crosshair, ArrowUpRight, TrendingUp } from 'lucide-react';
import { Link } from 'wouter';
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
  const { data: dashboard, isLoading, error } = useGetLeadAcquisitionDashboard({
    query: { queryKey: getGetLeadAcquisitionDashboardQueryKey() }
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-muted/10 h-full">
        <Loader2 className="animate-spin text-primary mb-4" size={32} />
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Aggregating telemetry...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-destructive p-8 bg-muted/10 h-full">
        <ShieldAlert size={48} className="mb-4 opacity-80" />
        <h2 className="text-xl font-bold tracking-tight mb-2">Telemetry Offline</h2>
        <p className="font-medium opacity-80">Dashboard data feed could not be established.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-muted/10">
      <header className="px-6 py-6 border-b border-border bg-card shrink-0 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">Acquisition Overview</h1>
          <p className="text-muted-foreground text-sm font-medium">System telemetry and active target metrics.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/leads" className="inline-flex items-center justify-center rounded-md text-xs font-bold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 gap-2">
            <Target size={14} /> Open Targets
          </Link>
          <Link href="/outreach" className="inline-flex items-center justify-center rounded-md text-xs font-bold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 gap-2">
            <Crosshair size={14} /> Command Center
          </Link>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="max-w-6xl mx-auto space-y-8">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard 
              title="Total Targets" 
              value={dashboard?.totalLeads || 0} 
              icon={<Users size={20} />} 
            />
            <MetricCard 
              title="Avg Global Score" 
              value={dashboard?.averageScore ? dashboard.averageScore.toFixed(1) : '0.0'} 
              icon={<BarChart2 size={20} />} 
              valueClass="text-primary"
            />
            <MetricCard 
              title="New Inflow" 
              value={dashboard?.pipelineCounts?.new || 0} 
              icon={<BadgeInfo size={20} />} 
              valueClass="text-blue-600 dark:text-blue-400"
            />
            <MetricCard 
              title="DNC Locks" 
              value={dashboard?.suppressedLeads || 0} 
              icon={<ShieldAlert size={20} />} 
              valueClass="text-rose-600 dark:text-rose-400"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-border bg-muted/20 font-bold uppercase tracking-widest text-xs text-muted-foreground flex items-center justify-between">
                Pipeline Distribution
              </div>
              <div className="p-6 flex-1 flex flex-col justify-center">
                <div className="space-y-4">
                  <PipelineRow label="Contact Initiated" value={dashboard?.pipelineCounts?.contacted || 0} total={dashboard?.totalLeads || 1} color="bg-purple-500" />
                  <PipelineRow label="Qualified Opportunity" value={dashboard?.pipelineCounts?.qualified || 0} total={dashboard?.totalLeads || 1} color="bg-amber-500" />
                  <PipelineRow label="Proposal Active" value={dashboard?.pipelineCounts?.proposal || 0} total={dashboard?.totalLeads || 1} color="bg-indigo-500" />
                  <PipelineRow label="Closed Won" value={dashboard?.pipelineCounts?.won || 0} total={dashboard?.totalLeads || 1} color="bg-emerald-500" />
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
              <div className="p-4 border-b border-border bg-primary/5 font-bold uppercase tracking-widest text-xs text-primary flex items-center justify-between">
                Quick Actions
              </div>
              <div className="p-6 grid gap-4 grid-cols-1 sm:grid-cols-2 flex-1 content-start">
                <Link href="/leads?pipelineStatus=new" className="flex flex-col gap-2 p-4 border border-border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors group">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
                    <ArrowUpRight size={16} />
                  </div>
                  <div className="font-bold text-sm">Work New Targets</div>
                  <div className="text-xs text-muted-foreground font-medium">Review unprocessed inbound leads.</div>
                </Link>
                
                <Link href="/outreach?status=draft" className="flex flex-col gap-2 p-4 border border-border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors group">
                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                    <ShieldAlert size={16} />
                  </div>
                  <div className="font-bold text-sm">Auth Pending Drafts</div>
                  <div className="text-xs text-muted-foreground font-medium">Review payloads waiting for transmission clearance.</div>
                </Link>
                
                <Link href="/outreach?status=reviewed" className="flex flex-col gap-2 p-4 border border-border rounded-lg hover:border-primary/50 hover:bg-primary/5 transition-colors group">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <TrendingUp size={16} />
                  </div>
                  <div className="font-bold text-sm">Push Cleared Drafts</div>
                  <div className="text-xs text-muted-foreground font-medium">Stage authorized payloads into Gmail relay.</div>
                </Link>

                <Link href="/leads?suppressed=true" className="flex flex-col gap-2 p-4 border border-border rounded-lg hover:border-rose-500/50 hover:bg-rose-50 transition-colors group">
                  <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center">
                    <ShieldAlert size={16} />
                  </div>
                  <div className="font-bold text-sm">Audit DNC Locks</div>
                  <div className="text-xs text-muted-foreground font-medium">Review permanently severed targets.</div>
                </Link>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, valueClass = "" }: { title: string, value: string | number, icon: React.ReactNode, valueClass?: string }) {
  return (
    <div className="p-5 rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{title}</span>
        <div className="text-muted-foreground/40 bg-muted/20 p-2 rounded-lg">{icon}</div>
      </div>
      <div className={`text-3xl font-black tracking-tighter ${valueClass}`}>{value}</div>
    </div>
  );
}

function PipelineRow({ label, value, total, color }: { label: string, value: number, total: number, color: string }) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-4">
      <div className="w-40 text-sm font-bold truncate shrink-0">{label}</div>
      <div className="flex-1 h-3 bg-muted/30 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${percent}%` }} />
      </div>
      <div className="w-16 text-right">
        <span className="font-bold text-foreground">{value}</span>
        <span className="text-xs font-medium text-muted-foreground ml-1">({percent}%)</span>
      </div>
    </div>
  );
}
