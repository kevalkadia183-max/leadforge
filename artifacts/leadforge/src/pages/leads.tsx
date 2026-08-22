import React, { useState } from 'react';
import { Link } from 'wouter';
import { Users, Loader2, Filter, Search, ShieldAlert, BarChart2, Mail, ExternalLink, RefreshCw, BadgeInfo, CheckCircle, Clock, XCircle } from 'lucide-react';
import {
  useGetLeadAcquisitionConfig,
  useGetLeadAcquisitionDashboard,
  useListLeads,
  getListLeadsQueryKey,
  getGetLeadAcquisitionDashboardQueryKey,
  type ListLeadsParams
} from '@workspace/api-client-react';
import { Button, Input, Select, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Badge } from '@/components/ui';
import { format } from 'date-fns';
import { LeadCreateDialog } from '@/components/leads/lead-create-dialog';
import { LeadImportDialog } from '@/components/leads/lead-import-dialog';

export function PipelineBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    new: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    contacted: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    qualified: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    proposal: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
    won: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    lost: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800",
    archived: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border capitalize ${styles[status] || styles.new}`}>
      {status}
    </span>
  );
}

export function ScoreBadge({ score, band }: { score?: number | null, band?: string | null }) {
  if (score === undefined || score === null) {
    return <span className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">Unscored</span>;
  }
  const isHigh = band === 'high' || score >= 80;
  const isMedium = band === 'medium' || (score >= 50 && score < 80);
  const colorClass = isHigh 
    ? "text-emerald-700 bg-emerald-50 border border-emerald-200" 
    : isMedium 
      ? "text-amber-700 bg-amber-50 border border-amber-200"
      : "text-slate-700 bg-slate-50 border border-slate-200";
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold ${colorClass}`}>
      {score}
    </span>
  );
}

export function WebsiteBadge({ status, url }: { status: string, url?: string | null }) {
  const ui = {
    unknown: { icon: <RefreshCw size={12} />, label: "Unverified", color: "text-slate-500" },
    has_website: { icon: <CheckCircle size={12} />, label: "Has Website", color: "text-emerald-600" },
    no_website: { icon: <XCircle size={12} />, label: "No Website", color: "text-rose-600" },
    placeholder: { icon: <Clock size={12} />, label: "Placeholder", color: "text-amber-600" },
    outdated: { icon: <BadgeInfo size={12} />, label: "Outdated", color: "text-amber-600" },
  }[status] || { icon: <BadgeInfo size={12} />, label: status, color: "text-muted-foreground" };
  
  return (
    <div className="flex flex-col gap-0.5 items-start relative z-10">
      <div className={`flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide ${ui.color}`}>
        {ui.icon} {ui.label}
      </div>
      {url && (
        <a 
          href={url.startsWith('http') ? url : `https://${url}`} 
          target="_blank" 
          rel="noreferrer"
          className="text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 truncate max-w-[150px]"
        >
          {url.replace(/^https?:\/\//, '')} <ExternalLink size={10} />
        </a>
      )}
    </div>
  );
}

export default function Leads() {
  const { data: config, isLoading: configLoading, error: configError, refetch: refetchConfig } = useGetLeadAcquisitionConfig();
  
  const [search, setSearch] = useState('');
  const [pipelineFilter, setPipelineFilter] = useState('all');
  const [websiteFilter, setWebsiteFilter] = useState('all');
  const [suppressedFilter, setSuppressedFilter] = useState('false');
  const [pageOffset, setPageOffset] = useState(0);
  const limit = 20;
  
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPageOffset(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const params: ListLeadsParams = { 
    search: debouncedSearch || undefined, 
    pipelineStatus: pipelineFilter === 'all' ? undefined : (pipelineFilter as any),
    websiteStatus: websiteFilter === 'all' ? undefined : (websiteFilter as any),
    suppressed: suppressedFilter === 'all' ? undefined : (suppressedFilter as any),
    offset: pageOffset,
    limit: limit
  };
  
  const { data: leadsData, isLoading: leadsLoading, error: leadsError, refetch: refetchLeads } = useListLeads(params, {
    query: {
      enabled: !!config?.enabled,
      queryKey: getListLeadsQueryKey(params)
    }
  });

  if (configLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (configError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-destructive p-8">
        <ShieldAlert size={32} className="mb-4" />
        <p className="font-medium">Failed to load configuration.</p>
        <Button onClick={() => refetchConfig()} variant="outline" className="mt-4">Retry</Button>
      </div>
    );
  }

  if (!config?.enabled) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8">
        <Users size={48} className="opacity-20 mb-4" />
        <h2 className="text-xl font-medium text-foreground mb-2">Acquisition Disabled</h2>
        <p className="mb-6 max-w-md text-center text-sm">
          Lead acquisition is currently disabled. Enable it in settings to start managing leads.
        </p>
        <Link href="/settings" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2">
          Go to Settings
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-muted/10">
      <header className="px-6 py-4 border-b border-border bg-card shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Leads</h1>
          <p className="text-muted-foreground text-sm">Search, filter, and manage your acquisition targets.</p>
        </div>
        <div className="flex items-center gap-2">
          {config?.discoveryProvider && !config.discoveryProvider.configured && (
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded shadow-sm mr-2 uppercase tracking-wide">
              <ShieldAlert size={12} />
              Provider Not Configured
            </div>
          )}
          <LeadImportDialog />
          <LeadCreateDialog />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="max-w-6xl mx-auto space-y-4">
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input 
                placeholder="Search business, email, location..." 
                className="pl-9 h-10 bg-card border-border shadow-sm" 
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select 
                className="h-10 w-[140px] bg-card border-border shadow-sm text-sm"
                value={pipelineFilter}
                onChange={e => { setPipelineFilter(e.target.value); setPageOffset(0); }}
                aria-label="Pipeline Status"
              >
                <option value="all">Pipeline (All)</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="proposal">Proposal</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
                <option value="archived">Archived</option>
              </Select>
              <Select 
                className="h-10 w-[140px] bg-card border-border shadow-sm text-sm"
                value={websiteFilter}
                onChange={e => { setWebsiteFilter(e.target.value); setPageOffset(0); }}
                aria-label="Website Status"
              >
                <option value="all">Website (All)</option>
                <option value="unknown">Unverified</option>
                <option value="has_website">Has Website</option>
                <option value="no_website">No Website</option>
                <option value="placeholder">Placeholder</option>
                <option value="outdated">Outdated</option>
              </Select>
              <Select 
                className="h-10 w-[140px] bg-card border-border shadow-sm text-sm"
                value={suppressedFilter}
                onChange={e => { setSuppressedFilter(e.target.value); setPageOffset(0); }}
                aria-label="Contactable Status"
              >
                <option value="all">Any Contact Status</option>
                <option value="false">Contactable Only</option>
                <option value="true">Do Not Contact</option>
              </Select>
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-lg shadow-sm flex flex-col overflow-hidden">
            <div className="relative overflow-x-auto min-h-[400px]">
              {leadsError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-destructive p-8">
                  <ShieldAlert size={32} className="mb-4" />
                  <p className="font-medium">Failed to load leads.</p>
                  <Button onClick={() => refetchLeads()} variant="outline" className="mt-4">Retry</Button>
                </div>
              ) : leadsLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground bg-background/50 backdrop-blur-sm z-10">
                  <Loader2 size={24} className="animate-spin text-primary mb-2" />
                  <span className="text-sm font-medium tracking-wide">Loading workspace...</span>
                </div>
              ) : leadsData?.leads && leadsData.leads.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="w-[300px]">Business</TableHead>
                      <TableHead>Pipeline & Score</TableHead>
                      <TableHead>Website</TableHead>
                      <TableHead className="w-[150px]">Added</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leadsData.leads.map((lead) => (
                      <TableRow key={lead.id} className="group relative">
                        <TableCell>
                          <Link href={`/leads/${lead.id}`} className="absolute inset-0 focus:outline-none">
                            <span className="sr-only">View {lead.businessName}</span>
                          </Link>
                          <div className="font-semibold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                            {lead.businessName}
                            {lead.suppressionSummary?.suppressed && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-200">
                                DNC
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-2 gap-y-1">
                            {lead.city && <span>{lead.city}{lead.region ? `, ${lead.region}` : ''}</span>}
                            {lead.category && <span className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-medium">{lead.category}</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-2 relative z-10 items-start">
                            <PipelineBadge status={lead.pipelineStatus} />
                            <ScoreBadge score={lead.scoreSummary?.score} band={lead.scoreSummary?.band} />
                          </div>
                        </TableCell>
                        <TableCell>
                          <WebsiteBadge status={lead.websiteStatus} url={lead.websiteUrl} />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(lead.createdAt), 'MMM d, yyyy')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground p-8">
                  <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <Search size={20} className="opacity-50" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-1">No leads found</h3>
                  <p className="text-sm">Try adjusting your filters or importing new targets.</p>
                </div>
              )}
            </div>
            
            {leadsData && leadsData.total > 0 && (
              <div className="p-3 border-t border-border bg-muted/30 flex items-center justify-between text-sm">
                <span className="text-muted-foreground font-medium text-xs uppercase tracking-wide">
                  Showing {leadsData.offset + 1}-{Math.min(leadsData.offset + leadsData.limit, leadsData.total)} of {leadsData.total}
                </span>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs bg-card shadow-sm"
                    disabled={leadsData.offset === 0}
                    onClick={() => setPageOffset(Math.max(0, leadsData.offset - leadsData.limit))}
                  >
                    Prev
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs bg-card shadow-sm"
                    disabled={leadsData.offset + leadsData.limit >= leadsData.total}
                    onClick={() => setPageOffset(leadsData.offset + leadsData.limit)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
