import React, { useState } from 'react';
import { Link } from 'wouter';
import {
  Mail, MessageSquare, Loader2, Filter, 
  Search, AlertTriangle, FileText, X
} from 'lucide-react';
import {
  useListOutreachDrafts,
  getListOutreachDraftsQueryKey,
  useGetLeadOutreach,
  getGetLeadOutreachQueryKey,
  ListOutreachDraftsParams
} from '@workspace/api-client-react';
import { Button, Input, Select, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui';
import { format } from 'date-fns';
import { DraftCard, DraftStatusBadge } from '@/components/leads/lead-outreach';

export default function Outreach() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
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

  const params: ListOutreachDraftsParams = { 
    search: debouncedSearch || undefined, 
    status: statusFilter === 'all' ? undefined : statusFilter as any,
    channel: channelFilter === 'all' ? undefined : channelFilter as any,
    offset: pageOffset,
    limit: limit
  };

  const { data: listData, isLoading, error, refetch } = useListOutreachDrafts(params, {
    query: {
      queryKey: getListOutreachDraftsQueryKey(params)
    }
  });

  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-muted/10">
      <header className="px-6 py-4 border-b border-border bg-card shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Command Center</h1>
          <p className="text-muted-foreground text-sm">Review, authorize, and push fact-grounded transmissions.</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="max-w-7xl mx-auto space-y-4">
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input 
                placeholder="Search recipient or entity..." 
                className="pl-9 h-10 bg-card border-border shadow-sm" 
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select 
                className="h-10 w-[160px] bg-card border-border shadow-sm text-sm"
                value={channelFilter}
                onChange={e => { setChannelFilter(e.target.value); setPageOffset(0); }}
                aria-label="Channel"
              >
                <option value="all">Vector (All)</option>
                <option value="email">SMTP/Email</option>
                <option value="whatsapp">WhatsApp</option>
              </Select>
              <Select 
                className="h-10 w-[200px] bg-card border-border shadow-sm text-sm"
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPageOffset(0); }}
                aria-label="Status"
              >
                <option value="all">State (All)</option>
                <option value="draft">Awaiting Auth</option>
                <option value="reviewed">Cleared</option>
                <option value="gmail_draft_created">Relay Staged</option>
                <option value="replied">Intercepted</option>
                <option value="discarded">Terminated</option>
              </Select>
            </div>
          </div>
          
          <div className="bg-card border border-border rounded-lg shadow-sm flex flex-col overflow-hidden">
            <div className="relative overflow-x-auto min-h-[500px]">
              {error ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-destructive p-8">
                  <AlertTriangle size={32} className="mb-4" />
                  <p className="font-medium">Command link failed.</p>
                  <Button onClick={() => refetch()} variant="outline" className="mt-4">Reconnect</Button>
                </div>
              ) : isLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground bg-background/50 backdrop-blur-sm z-10">
                  <Loader2 size={24} className="animate-spin text-primary mb-2" />
                  <span className="text-sm font-medium tracking-wide">Syncing queues...</span>
                </div>
              ) : listData?.drafts && listData.drafts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="w-[300px]">Target Entity & Recipient</TableHead>
                      <TableHead className="w-[200px]">State Vector</TableHead>
                      <TableHead className="hidden md:table-cell">Payload Preview</TableHead>
                      <TableHead className="w-[150px]">T-Minus (Update)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {listData.drafts.map((draft) => (
                      <TableRow key={draft.id} className="group relative hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => setSelectedLeadId(draft.leadId)}>
                        <TableCell>
                          <div className="font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                            {draft.leadBusinessName || 'Unknown Entity'}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5 font-medium">
                            {draft.channel === 'email' ? <Mail size={12} /> : <MessageSquare size={12} />}
                            <span className="truncate max-w-[200px]">{draft.recipientDisplay || 'UNCONFIGURED DEST'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-2 relative z-10 items-start">
                            <span className={`inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded border ${draft.channel === 'email' ? 'text-blue-700 bg-blue-50 border-blue-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'}`}>
                              {draft.channel === 'email' ? <Mail size={10} /> : <MessageSquare size={10} />} {draft.channel}
                            </span>
                            <DraftStatusBadge status={draft.status} reviewed={draft.reviewed} gmailState={draft.gmailState} channel={draft.channel} />
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell relative z-10">
                          {draft.channel === 'email' && draft.subject ? (
                            <div className="text-xs font-bold mb-1 truncate max-w-[250px] lg:max-w-[400px]">
                              SUBJ: {draft.subject}
                            </div>
                          ) : null}
                          <div className="text-xs text-muted-foreground line-clamp-2 font-mono max-w-[250px] lg:max-w-[400px] leading-relaxed">
                            {draft.body}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-mono font-medium text-muted-foreground whitespace-nowrap">
                          {format(new Date(draft.updatedAt), 'MMM d, HH:mm')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground p-8">
                  <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <FileText size={20} className="opacity-50" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-1">Queue Empty</h3>
                  <p className="text-sm">No transmissions awaiting orders.</p>
                </div>
              )}
            </div>
            
            {listData && listData.total > 0 && (
              <div className="p-3 border-t border-border bg-muted/30 flex items-center justify-between text-sm">
                <span className="text-muted-foreground font-medium text-xs uppercase tracking-wide">
                  Showing {listData.offset + 1}-{Math.min(listData.offset + listData.limit, listData.total)} of {listData.total}
                </span>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs bg-card shadow-sm"
                    disabled={listData.offset === 0}
                    onClick={() => setPageOffset(Math.max(0, listData.offset - listData.limit))}
                  >
                    Prev
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs bg-card shadow-sm"
                    disabled={listData.offset + listData.limit >= listData.total}
                    onClick={() => setPageOffset(listData.offset + listData.limit)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <OutreachDetailPanel leadId={selectedLeadId} onClose={() => setSelectedLeadId(null)} />
    </div>
  );
}

function OutreachDetailPanel({ leadId, onClose }: { leadId: string | null, onClose: () => void }) {
  const { data: outreachSummary, isLoading, error } = useGetLeadOutreach(leadId || '', {
    query: {
      enabled: !!leadId,
      queryKey: getGetLeadOutreachQueryKey(leadId || '')
    }
  });

  return (
    <Sheet open={!!leadId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl md:max-w-2xl overflow-y-auto custom-scrollbar p-0 border-l border-border bg-muted/5">
        <SheetHeader className="p-6 border-b border-border bg-card sticky top-0 z-20 flex flex-col items-start gap-4">
          <SheetTitle className="text-xl font-bold tracking-tight flex items-center justify-between w-full">
            <span>Transmission Control</span>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-muted-foreground"><X size={18}/></Button>
          </SheetTitle>
          {leadId && (
            <Link href={`/leads/${leadId}`} className="inline-flex items-center justify-center rounded-md text-xs font-bold uppercase tracking-widest transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-4">
              Open Full Target Profile
            </Link>
          )}
        </SheetHeader>
        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center p-12"><Loader2 className="animate-spin text-primary" size={32} /></div>
          ) : error ? (
            <div className="text-center text-destructive p-8 font-medium">Link failure. Target context unreachable.</div>
          ) : outreachSummary ? (
            <div className="space-y-8">
              {outreachSummary.suppressed || outreachSummary.optedOut ? (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-rose-800 shadow-sm flex items-start gap-4">
                  <AlertTriangle className="shrink-0 text-rose-600 mt-1" size={24} />
                  <div>
                    <h3 className="font-bold text-lg mb-1 tracking-tight">Execution Blocked</h3>
                    <p className="text-sm font-medium opacity-90 leading-relaxed">
                      {outreachSummary.blockedReason || 'This target is under permanent hold. All outbound queues halted.'}
                    </p>
                  </div>
                </div>
              ) : null}

              {outreachSummary.drafts.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-border pb-2">
                    <h3 className="font-bold text-lg tracking-tight">Active Matrix</h3>
                  </div>
                  {outreachSummary.drafts.map((draft) => (
                    <DraftCard key={draft.id} draft={draft} leadId={leadId!} isBlocked={outreachSummary.suppressed || outreachSummary.optedOut} />
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground text-sm font-medium italic p-8 text-center bg-card border border-border border-dashed rounded-xl">
                  No active sequences in matrix.
                </div>
              )}
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
