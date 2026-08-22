import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Loader2, Mail, MessageSquare, ExternalLink,
  RefreshCw, CheckCircle, AlertTriangle, X, Trash2, ShieldCheck, ChevronRight,
  ShieldAlert
} from 'lucide-react';
import {
  useGetLeadOutreach,
  useCreateOutreachDraft,
  useUpdateOutreachDraft,
  useReviewOutreachDraft,
  useCreateOutreachGmailDraft,
  useDiscardOutreachDraft,
  useMarkOutreachReply,
  useOptOutLeadOutreach,
  getGetLeadOutreachQueryKey,
  getListOutreachDraftsQueryKey,
  getListLeadsQueryKey,
  getGetLeadQueryKey,
  getGetLeadAcquisitionDashboardQueryKey
} from '@workspace/api-client-react';
import { Button, Input, Select, Textarea, Label, Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

const createDraftSchema = z.object({
  channel: z.enum(['email', 'whatsapp']),
  selectedFields: z.array(z.string()).min(1, 'Select at least one field to ground the draft.'),
  confirmImportedFields: z.array(z.string()).optional(),
});

type CreateDraftForm = z.infer<typeof createDraftSchema>;

export function LeadOutreach({ leadId, lead, sources }: { leadId: string, lead: any, sources: any[] }) {
  const { data: outreachSummary, isLoading, error, refetch } = useGetLeadOutreach(leadId, {
    query: { queryKey: getGetLeadOutreachQueryKey(leadId) }
  });

  if (isLoading) {
    return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>;
  }

  if (error) {
    return (
      <div className="p-8 text-center text-destructive border border-destructive/20 rounded-xl bg-destructive/5 flex flex-col items-center">
        <AlertTriangle className="mb-3" size={28} />
        <p className="font-medium">Failed to load execution context.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4 bg-white">Retry Connection</Button>
      </div>
    );
  }

  if (!outreachSummary) return null;

  return (
    <div className="space-y-8">
      {outreachSummary.suppressed || outreachSummary.optedOut ? (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-rose-800 shadow-sm flex items-start gap-4">
          <ShieldCheck className="shrink-0 text-rose-600 mt-1" size={24} />
          <div>
            <h3 className="font-bold text-lg mb-1 tracking-tight">Execution Blocked</h3>
            <p className="text-sm font-medium opacity-90 leading-relaxed">
              {outreachSummary.blockedReason || 'This target is under permanent hold or opt-out restriction. All outbound queues halted.'}
            </p>
          </div>
        </div>
      ) : (
        <CreateDraftCard leadId={leadId} lead={lead} sources={sources} />
      )}

      {outreachSummary.drafts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <h3 className="font-bold text-lg tracking-tight">Active Transmissions</h3>
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-bold">{outreachSummary.drafts.length}</span>
          </div>
          <div className="space-y-4">
            {outreachSummary.drafts.map(draft => (
              <DraftCard key={draft.id} draft={draft} leadId={leadId} isBlocked={outreachSummary.suppressed || outreachSummary.optedOut} />
            ))}
          </div>
        </div>
      )}
      
      {!outreachSummary.suppressed && !outreachSummary.optedOut && (
        <OptOutForm leadId={leadId} />
      )}

      {outreachSummary.history.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-bold text-lg tracking-tight border-b border-border pb-2">Transmission Log</h3>
          <div className="bg-card border border-border rounded-xl shadow-sm p-6 space-y-6">
            {outreachSummary.history.map((evt, i) => (
              <div key={evt.id} className="relative pl-8">
                <div className="absolute left-[7px] top-1.5 w-2 h-2 rounded-full bg-primary ring-4 ring-card"></div>
                {i !== outreachSummary.history.length - 1 && (
                  <div className="absolute left-2 top-4 bottom-[-24px] w-px bg-border"></div>
                )}
                <div className="text-sm">
                  <div className="font-bold text-foreground capitalize tracking-wide">{evt.eventType.replace(/_/g, ' ')}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                      {new Date(evt.occurredAt).toLocaleString()}
                    </span>
                    {evt.performedBy && (
                      <span className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-wider">
                        OP: {evt.performedBy}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CreateDraftCard({ leadId, lead, sources }: { leadId: string, lead: any, sources: any[] }) {
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createDraft = useCreateOutreachDraft();

  const form = useForm<CreateDraftForm>({
    resolver: zodResolver(createDraftSchema),
    defaultValues: {
      channel: 'email',
      selectedFields: ['businessName'],
      confirmImportedFields: [],
    }
  });

  const availableFields = [
    { key: 'businessName', label: 'Entity Name', val: lead.businessName },
    { key: 'category', label: 'Sector', val: lead.category },
    { key: 'city', label: 'Operating Base', val: lead.city },
    { key: 'region', label: 'Territory', val: lead.region },
    { key: 'websiteUrl', label: 'Digital Presence', val: lead.websiteUrl },
    { key: 'services', label: 'Service Vectors', val: lead.services },
    { key: 'description', label: 'Analyst Profile', val: lead.description },
  ].filter(f => !!f.val);

  const watchSelected = form.watch('selectedFields') || [];
  const watchConfirm = form.watch('confirmImportedFields') || [];

  const getBestSource = (key: string) => {
    const fieldSources = sources.filter(s => s.fieldName === key);
    if (!fieldSources.length) return null;
    const verified = fieldSources.find(s => s.provenance === 'verified');
    if (verified) return verified;
    const userProvided = fieldSources.find(s => s.provenance === 'user_provided');
    if (userProvided) return userProvided;
    return fieldSources[0];
  };

  const onSubmit = async (data: CreateDraftForm) => {
    const finalSelectedFields = Array.from(new Set([...data.selectedFields, 'businessName']));

    const unconfirmedFields = finalSelectedFields.filter(key => {
      const src = getBestSource(key);
      const needsConfirm = !src || (src.provenance !== 'user_provided' && src.provenance !== 'verified');
      return needsConfirm && !watchConfirm.includes(key);
    });
    
    if (unconfirmedFields.length > 0) {
      toast({ title: 'Verification Halt', description: 'Confirm unverified facts before assembly.', variant: 'destructive' });
      return;
    }

    const actualData = {
      ...data,
      selectedFields: finalSelectedFields,
      confirmImportedFields: data.confirmImportedFields?.filter(k => finalSelectedFields.includes(k)) || []
    };

    try {
      await createDraft.mutateAsync({ leadId, data: actualData as any });
      toast({ title: 'Assembly Complete', description: 'Payload generated and staged.' });
      queryClient.invalidateQueries({ queryKey: getGetLeadOutreachQueryKey(leadId) });
      queryClient.invalidateQueries({ queryKey: getListOutreachDraftsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetLeadQueryKey(leadId) });
      setIsCreating(false);
      form.reset();
    } catch (err: any) {
      toast({ title: 'Assembly Failed', description: err.message, variant: 'destructive' });
    }
  };

  if (!isCreating) {
    return (
      <Button onClick={() => setIsCreating(true)} className="w-full gap-3 border-dashed border-2 py-10 bg-card hover:bg-muted/10 text-primary hover:text-primary transition-all font-bold text-lg shadow-sm" variant="outline">
        <Mail size={24} /> Initialize Draft Assembly
      </Button>
    );
  }

  return (
    <div className="border border-primary/20 rounded-xl bg-card shadow-lg overflow-hidden ring-1 ring-primary/5">
      <div className="p-5 border-b border-border bg-primary/5 font-bold uppercase tracking-widest text-primary text-sm flex items-center justify-between">
        <span className="flex items-center gap-2"><Mail size={18} /> Assembly Sequence</span>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:bg-primary/10 hover:text-primary rounded-full" onClick={() => setIsCreating(false)}>
          <X size={16} />
        </Button>
      </div>
      <div className="p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField control={form.control} name="channel" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Transmission Vector</FormLabel>
                <Select {...field} className="bg-muted/10 max-w-xs font-semibold h-11">
                  <option value="email">SMTP / Email Relay</option>
                  <option value="whatsapp">WhatsApp Secure</option>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <div className="space-y-4">
              <div>
                <Label className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Context Grounding</Label>
                <p className="text-sm text-foreground/70 mt-1 font-medium leading-relaxed max-w-3xl">Inject these verified facts directly into the generation matrix. The output will deterministically reference selected data points.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableFields.map(f => {
                  const src = getBestSource(f.key);
                  const needsConfirm = !src || (src.provenance !== 'user_provided' && src.provenance !== 'verified');
                  const isSelected = watchSelected.includes(f.key) || f.key === 'businessName';
                  const isConfirmed = watchConfirm.includes(f.key);
                  const displayProvenance = src ? src.provenance : 'unverified';

                  return (
                    <div key={f.key} className={`flex flex-col gap-2 p-4 border rounded-xl transition-colors ${isSelected ? 'bg-primary/5 border-primary/30 shadow-sm' : 'bg-card border-border hover:bg-muted/30'}`}>
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          className="mt-1 w-4 h-4 rounded border-primary accent-primary"
                          checked={isSelected}
                          disabled={f.key === 'businessName'}
                          onChange={(e) => {
                            if (f.key === 'businessName') return;
                            const newSel = e.target.checked 
                              ? [...watchSelected, f.key] 
                              : watchSelected.filter(k => k !== f.key);
                            form.setValue('selectedFields', newSel);
                            if (!e.target.checked && needsConfirm) {
                              form.setValue('confirmImportedFields', watchConfirm.filter(k => k !== f.key));
                            }
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm flex flex-wrap items-center gap-2 mb-1">
                            {f.label}
                            {f.key === 'businessName' && (
                              <span className="text-[9px] uppercase tracking-widest font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">Locked</span>
                            )}
                            <span className={`text-[9px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded-full ml-auto ${src ? 'bg-secondary text-secondary-foreground' : 'bg-amber-100 text-amber-700'}`}>
                              {displayProvenance}
                            </span>
                          </div>
                          <div className="text-muted-foreground text-xs font-mono truncate" title={f.val}>{f.val}</div>
                        </div>
                      </div>
                      
                      {isSelected && needsConfirm && (
                        <div className="mt-2 ml-7 flex items-start gap-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                          <input
                            type="checkbox"
                            className="mt-0.5 w-3.5 h-3.5 rounded border-amber-500 accent-amber-600 shrink-0 cursor-pointer"
                            checked={isConfirmed}
                            onChange={(e) => {
                              const newConf = e.target.checked 
                                ? [...watchConfirm, f.key] 
                                : watchConfirm.filter(k => k !== f.key);
                              form.setValue('confirmImportedFields', newConf);
                            }}
                          />
                          <div className="text-xs font-medium text-amber-900 leading-tight">
                            I verify this {displayProvenance} fact is accurate for transmission.
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {form.formState.errors.selectedFields?.message && (
                <p className="text-sm font-bold text-destructive flex items-center gap-1.5 mt-2 bg-destructive/10 p-2 rounded-md">
                  <AlertTriangle size={14} />
                  {form.formState.errors.selectedFields.message}
                </p>
              )}
            </div>

            <Button type="submit" disabled={createDraft.isPending} className="w-full h-12 text-sm font-bold uppercase tracking-widest">
              {createDraft.isPending && <Loader2 size={16} className="animate-spin mr-2" />}
              Commence Generation
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}

export function DraftCard({ draft, leadId, isBlocked }: { draft: any, leadId: string, isBlocked?: boolean }) {
  const [isEditing, setIsEditing] = useState(false);
  const [subject, setSubject] = useState(draft.subject || '');
  const [body, setBody] = useState(draft.body || '');
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const updateDraft = useUpdateOutreachDraft();
  const reviewDraft = useReviewOutreachDraft();
  const createGmail = useCreateOutreachGmailDraft();
  const discardDraft = useDiscardOutreachDraft();
  const markReply = useMarkOutreachReply();

  const handleUpdate = async () => {
    try {
      await updateDraft.mutateAsync({ leadId, draftId: draft.id, data: { subject, body } });
      toast({ title: 'Payload Saved', description: 'Draft modified successfully.' });
      setIsEditing(false);
    } catch (err: any) {
      toast({ title: 'Update Failed', description: err.message, variant: 'destructive' });
    } finally {
      queryClient.invalidateQueries({ queryKey: getGetLeadOutreachQueryKey(leadId) });
      queryClient.invalidateQueries({ queryKey: getListOutreachDraftsQueryKey() });
    }
  };

  const handleAction = async (actionFn: any, successMsg: string, desc: string) => {
    try {
      await actionFn.mutateAsync({ leadId, draftId: draft.id });
      toast({ title: successMsg, description: desc });
    } catch (err: any) {
      toast({ title: 'Execution Failed', description: err.message, variant: 'destructive' });
    } finally {
      queryClient.invalidateQueries({ queryKey: getGetLeadOutreachQueryKey(leadId) });
      queryClient.invalidateQueries({ queryKey: getListOutreachDraftsQueryKey() });
    }
  };

  const isDiscarded = draft.status === 'discarded';
  const isReplied = draft.status === 'replied';
  
  return (
    <div className={`border border-border rounded-xl bg-card shadow-sm overflow-hidden transition-all ${isDiscarded ? 'opacity-60 grayscale-[0.5]' : ''} ${draft.reviewed && draft.gmailState === 'none' ? 'ring-2 ring-emerald-500/20' : ''}`}>
      <div className="p-4 border-b border-border bg-muted/10 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {draft.channel === 'email' ? <Mail className="text-blue-600" size={18} /> : <MessageSquare className="text-emerald-600" size={18} />}
            <span className="font-bold tracking-wide uppercase text-xs text-foreground">{draft.channel}</span>
          </div>
          <div className="w-px h-4 bg-border"></div>
          <DraftStatusBadge status={draft.status} reviewed={draft.reviewed} gmailState={draft.gmailState} channel={draft.channel} />
          <div className="w-px h-4 bg-border hidden sm:block"></div>
          <span className="text-[10px] font-mono font-medium text-muted-foreground uppercase tracking-wider hidden sm:block">
            INIT: {new Date(draft.createdAt).toLocaleDateString()}
          </span>
        </div>
        
        {!isDiscarded && !isReplied && !isBlocked && (
          <div className="flex items-center gap-2">
            {draft.gmailState === 'none' && !isEditing && (
              <Button size="sm" variant="outline" className="h-8 px-3 text-xs font-bold uppercase tracking-wider bg-card shadow-sm" onClick={() => setIsEditing(true)}>
                Modify
              </Button>
            )}
            
            {!draft.reviewed && draft.gmailState === 'none' && !isEditing && (
              <Button size="sm" className="h-8 px-4 text-xs font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm" 
                onClick={() => handleAction(reviewDraft, 'Clearance Granted', 'Draft approved for transmission.')}
                disabled={reviewDraft.isPending}>
                {reviewDraft.isPending && <Loader2 size={14} className="animate-spin mr-2" />}
                Authorize
              </Button>
            )}

            {draft.reviewed && draft.channel === 'email' && draft.gmailState !== 'created' && draft.gmailState !== 'requesting' && (
              <Button size="sm" className="h-8 px-4 text-xs font-bold uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                onClick={async () => {
                  try {
                    await createGmail.mutateAsync({ leadId, draftId: draft.id });
                    toast({ title: 'Relay Staged', description: 'Draft pushed to Gmail outbox.' });
                  } catch (err: any) {
                    toast({ title: 'Relay Failed', description: err.message, variant: 'destructive' });
                  } finally {
                    queryClient.invalidateQueries({ queryKey: getGetLeadOutreachQueryKey(leadId) });
                    queryClient.invalidateQueries({ queryKey: getListOutreachDraftsQueryKey() });
                  }
                }}
                disabled={createGmail.isPending}>
                {createGmail.isPending && <Loader2 size={14} className="animate-spin mr-2" />}
                {draft.gmailState === 'failed' ? 'Retry Relay' : 'Push to Gmail'}
              </Button>
            )}

            {draft.channel === 'email' && draft.gmailState === 'requesting' && (
              <Button size="sm" variant="outline" className="h-8 px-3 text-xs font-bold uppercase tracking-wider shadow-sm"
                onClick={async () => {
                  try {
                    await createGmail.mutateAsync({ leadId, draftId: draft.id });
                    toast({ title: 'Status Polled', description: 'Relay state synchronized.' });
                  } catch (err: any) {
                    toast({ title: 'Poll Failed', description: err.message, variant: 'destructive' });
                  } finally {
                    queryClient.invalidateQueries({ queryKey: getGetLeadOutreachQueryKey(leadId) });
                    queryClient.invalidateQueries({ queryKey: getListOutreachDraftsQueryKey() });
                  }
                }}
                disabled={createGmail.isPending}>
                {createGmail.isPending ? <Loader2 size={14} className="animate-spin mr-2" /> : <RefreshCw size={14} className="mr-2" />}
                Poll Status
              </Button>
            )}

            {draft.channel === 'whatsapp' && (
              <Button size="sm" className="h-8 px-3 text-xs font-bold uppercase tracking-wider bg-muted text-muted-foreground hover:bg-muted cursor-not-allowed" disabled>
                WA Offline
              </Button>
            )}

            {(draft.gmailState === 'created' || (draft.reviewed && draft.channel === 'whatsapp')) && (
              <Button size="sm" variant="outline" className="h-8 px-3 text-xs font-bold uppercase tracking-wider border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 shadow-sm"
                onClick={() => handleAction(markReply, 'Interception Logged', 'Manual reply event recorded.')}
                disabled={markReply.isPending}>
                Log Reply
              </Button>
            )}

            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:bg-rose-100 hover:text-rose-700 rounded-md ml-1"
              onClick={() => {
                if (confirm('Terminate this transmission sequence?')) {
                  handleAction(discardDraft, 'Sequence Terminated', 'Draft permanently discarded.');
                }
              }}
              disabled={discardDraft.isPending}>
              <Trash2 size={16} />
            </Button>
          </div>
        )}
      </div>

      <div className="p-6">
        {isEditing ? (
          <div className="space-y-6">
            {draft.reviewed && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-sm font-medium flex gap-3 items-start">
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                <div>Editing this payload revokes clearance. You must re-authorize before transmission.</div>
              </div>
            )}
            {draft.channel === 'email' && (
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Subject Line</Label>
                <Input value={subject} onChange={e => setSubject(e.target.value)} className="font-semibold text-lg py-6 bg-muted/10 border-border shadow-sm focus-visible:ring-primary" />
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Payload Body</Label>
              <Textarea value={body} onChange={e => setBody(e.target.value)} className="min-h-[250px] font-mono text-sm bg-muted/10 border-border shadow-sm leading-relaxed p-4 focus-visible:ring-primary" />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="ghost" onClick={() => { setIsEditing(false); setSubject(draft.subject||''); setBody(draft.body||''); }} className="font-bold uppercase text-xs tracking-wider">Abort</Button>
              <Button onClick={handleUpdate} disabled={updateDraft.isPending} className="font-bold uppercase text-xs tracking-wider px-6 shadow-sm">
                {updateDraft.isPending && <Loader2 size={14} className="animate-spin mr-2" />}
                Commit Changes
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {draft.channel === 'email' && (
              <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-6 border-b border-border pb-4">
                <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground mt-1 w-24">Subject:</span>
                <span className="font-bold text-lg text-foreground leading-tight">{draft.subject}</span>
              </div>
            )}
            <div className="whitespace-pre-wrap text-foreground font-mono text-sm leading-relaxed bg-muted/5 p-5 rounded-lg border border-border/50 shadow-inner">
              {draft.body}
            </div>
            
            {draft.failureReason && (
              <div className="mt-4 pt-4 border-t border-border flex items-start gap-3 text-rose-700 text-sm font-medium bg-rose-50 p-4 rounded-lg">
                <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                <span className="leading-relaxed">System Halt: {draft.failureReason}</span>
              </div>
            )}
            {draft.factSnapshot && draft.factSnapshot.length > 0 && (
              <div className="mt-6 pt-4 border-t border-border">
                <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                  <CheckCircle size={12} /> Matrix Injections
                </div>
                <div className="flex flex-wrap gap-2">
                  {draft.factSnapshot.map((fact: any, i: number) => (
                    <span key={i} className="inline-flex items-center pl-2 pr-3 py-1 rounded bg-secondary text-secondary-foreground text-xs shadow-sm border border-border/50">
                      <span className="font-bold uppercase tracking-wider text-[9px] mr-2 opacity-70">{fact.fieldName}:</span>
                      <span className="font-medium truncate max-w-[200px]">{fact.value}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function DraftStatusBadge({ status, reviewed, gmailState, channel }: { status: string, reviewed: boolean, gmailState: string, channel: string }) {
  if (status === 'discarded') {
    return <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded"><X size={12} /> Terminated</span>;
  }
  if (status === 'replied') {
    return <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-100 px-2 py-0.5 rounded"><CheckCircle size={12} /> Intercepted</span>;
  }
  if (status === 'gmail_draft_created' || gmailState === 'created') {
    return <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded"><ExternalLink size={12} /> Staged in Relay</span>;
  }
  if (gmailState === 'requesting') {
    return <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded"><Loader2 size={12} className="animate-spin" /> Relay Pending</span>;
  }
  if (gmailState === 'failed') {
    return <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-100 px-2 py-0.5 rounded"><AlertTriangle size={12} /> Relay Halt</span>;
  }
  if (reviewed) {
    return <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded"><CheckCircle size={12} /> Cleared</span>;
  }
  return <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2 py-0.5 rounded"><AlertTriangle size={12} /> Awaiting Auth</span>;
}

function OptOutForm({ leadId }: { leadId: string }) {
  const [reason, setReason] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const optOut = useOptOutLeadOutreach();

  const handleOptOut = async () => {
    if (!reason.trim()) {
      toast({ title: 'Justification required', variant: 'destructive' });
      return;
    }
    if (!confirm('CRITICAL: This permanently severs all acquisition sequences for this target. Proceed?')) {
      return;
    }
    
    try {
      await optOut.mutateAsync({ leadId, data: { reason } });
      toast({ title: 'Severance Complete', description: 'Target permanently locked out of outbound queues.' });
      queryClient.invalidateQueries({ queryKey: getGetLeadOutreachQueryKey(leadId) });
      queryClient.invalidateQueries({ queryKey: getListOutreachDraftsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetLeadQueryKey(leadId) });
      queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetLeadAcquisitionDashboardQueryKey() });
      setReason('');
    } catch (err: any) {
      toast({ title: 'Severance Failed', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="border border-rose-200 rounded-xl bg-rose-50/50 shadow-sm mt-8 overflow-hidden">
      <div className="p-4 border-b border-rose-200 bg-rose-100/50 font-bold text-sm uppercase tracking-wide text-rose-800 flex items-center gap-2">
        <ShieldAlert size={16} /> Permanent Severance
      </div>
      <div className="p-5">
        <p className="text-sm text-rose-800/90 font-medium leading-relaxed mb-5">
          Execute a permanent outbound lock on this target. Irreversible. Use only for explicit opt-outs or strict compliance failures.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Input 
            placeholder="Log justification..." 
            value={reason} 
            onChange={e => setReason(e.target.value)} 
            className="bg-white border-rose-200 focus-visible:ring-rose-500 flex-1 h-10"
          />
          <Button 
            variant="destructive" 
            className="h-10 px-6 font-bold uppercase tracking-wider text-xs shrink-0"
            onClick={handleOptOut}
            disabled={optOut.isPending || !reason.trim()}
          >
            {optOut.isPending && <Loader2 size={14} className="animate-spin mr-2" />}
            Execute Lock
          </Button>
        </div>
      </div>
    </div>
  );
}
