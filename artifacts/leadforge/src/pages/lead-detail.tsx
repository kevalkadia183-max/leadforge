import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Users, Loader2, ArrowLeft, ShieldAlert, BadgeInfo,
  ExternalLink, RefreshCw, X, Activity, Link as LinkIcon, Edit,
  ShieldCheck, AlertTriangle
} from 'lucide-react';
import {
  useGetLead,
  useUpdateLead,
  useScoreLeadNow,
  useSuppressLead,
  useUnsuppressLead,
  getGetLeadQueryKey,
  getListLeadsQueryKey,
  getGetLeadAcquisitionDashboardQueryKey
} from '@workspace/api-client-react';
import { Button, Input, Select, Textarea, Label, Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { PipelineBadge, ScoreBadge, WebsiteBadge } from '@/pages/leads';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';
import { LeadOutreach } from '@/components/leads/lead-outreach';

export default function LeadDetail({ leadId }: { leadId: string }) {
  const [, setLocation] = useLocation();
  const { data: detail, isLoading, error: leadError, refetch } = useGetLead(leadId, {
    query: { queryKey: getGetLeadQueryKey(leadId) }
  });

  const [isEditing, setIsEditing] = useState(false);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-muted/10 h-full">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (leadError) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-destructive p-8 bg-muted/10 h-full">
        <ShieldAlert size={32} className="mb-4" />
        <p className="font-medium">Failed to load target details.</p>
        <Button onClick={() => refetch()} variant="outline" className="mt-4">Retry</Button>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 bg-muted/10 h-full">
        <Users size={48} className="opacity-20 mb-4" />
        <h2 className="text-xl font-medium text-foreground mb-2">Target Not Found</h2>
        <p className="mb-6">The lead you're looking for doesn't exist.</p>
        <Button onClick={() => setLocation('/leads')}>Back to Leads</Button>
      </div>
    );
  }

  const { lead, sources, activities } = detail;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-muted/10">
      <header className="px-6 py-4 border-b border-border bg-card shrink-0 flex items-center justify-between gap-4 sticky top-0 z-10">
        <div className="flex items-center gap-4 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => setLocation('/leads')} className="shrink-0 -ml-2 text-muted-foreground">
            <ArrowLeft size={18} />
          </Button>
          <div className="flex items-center gap-3 truncate">
            <h1 className="text-xl font-bold tracking-tight truncate">{lead.businessName}</h1>
            <PipelineBadge status={lead.pipelineStatus} />
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isEditing && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="gap-2 bg-card shadow-sm">
              <Edit size={16} /> Edit Target
            </Button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar relative">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {(lead.sourceProvider || lead.sourceReference || lead.sourceState) && (
            <div className="bg-muted/30 border border-border rounded-lg p-3 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <BadgeInfo size={16} />
                <span>Provider Source:</span>
                {lead.sourceProvider && (
                  <span className="font-medium text-foreground">{lead.sourceProvider}</span>
                )}
                {lead.sourceState && (
                  <span className="px-2 py-0.5 rounded bg-muted/50 text-[10px] uppercase font-bold tracking-wider">
                    {lead.sourceState}
                  </span>
                )}
              </div>
              {lead.sourceReference && (
                <div className="text-muted-foreground text-xs font-mono bg-background border border-border px-2 py-1 rounded">
                  Ref: {lead.sourceReference}
                </div>
              )}
            </div>
          )}

          {lead.suppressionSummary.suppressed && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-start gap-3 flex-1 text-rose-800">
                <ShieldAlert className="shrink-0 mt-0.5 text-rose-600" size={20} />
                <div>
                  <h3 className="font-bold mb-1 tracking-tight">
                    {lead.suppressionSummary.reason?.startsWith('Outreach opt-out')
                      ? 'Permanently Opted Out'
                      : 'Do Not Contact'}
                  </h3>
                  <p className="text-sm font-medium opacity-90">{lead.suppressionSummary.reason || "Suppressed by system or user."}</p>
                  {lead.suppressionSummary.suppressedAt && (
                    <p className="text-[11px] mt-1 opacity-70 uppercase tracking-wide">
                      Since {format(new Date(lead.suppressionSummary.suppressedAt), 'MMM d, yyyy')}
                    </p>
                  )}
                </div>
              </div>
              <UnsuppressButton leadId={lead.id} isPermanent={lead.suppressionSummary.reason?.startsWith('Outreach opt-out')} />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
            <div className="lg:col-span-2 space-y-6">
              {isEditing ? (
                <EditLeadForm lead={lead} onCancel={() => setIsEditing(false)} onSaved={() => setIsEditing(false)} />
              ) : (
                <Tabs defaultValue="details" className="w-full">
                  <TabsList className="w-full grid grid-cols-2 mb-6 bg-card border border-border shadow-sm p-1 rounded-lg">
                    <TabsTrigger value="details" className="rounded-md">Fact Sheet</TabsTrigger>
                    <TabsTrigger value="outreach" className="rounded-md">Outreach Sandbox</TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="space-y-6 mt-0 focus-visible:outline-none">
                    <div className="border border-border rounded-xl bg-card shadow-sm overflow-hidden">
                      <div className="p-4 border-b border-border bg-muted/20 font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                        Profile Data
                      </div>
                      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8">
                        <DetailItem label="Business Name" value={lead.businessName} />
                        <DetailItem label="Category" value={lead.category} />
                        <DetailItem label="Email" value={lead.email} />
                        <DetailItem label="Phone" value={lead.phone} />
                        <DetailItem label="Website" value={<WebsiteBadge status={lead.websiteStatus} url={lead.websiteUrl} />} />
                        <DetailItem label="Listing URL" value={
                          lead.listingUrl ? (
                            <a href={lead.listingUrl.startsWith('http') ? lead.listingUrl : `https://${lead.listingUrl}`} target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium inline-flex items-center gap-1">
                              External Profile <ExternalLink size={14} />
                            </a>
                          ) : null
                        } />
                        <DetailItem label="Address" value={[lead.address, lead.city, lead.region, lead.postalCode, lead.country].filter(Boolean).join(', ')} />
                        <DetailItem label="Reputation" value={
                          (lead.rating !== undefined && lead.rating !== null) ? `${lead.rating} rating (${lead.reviewCount || 0} reviews)` : null
                        } />
                        <div className="sm:col-span-2">
                          <DetailItem label="Known Services" value={lead.services} />
                        </div>
                        <div className="sm:col-span-2">
                          <DetailItem label="Analyst Notes" value={lead.description} />
                        </div>
                      </div>
                    </div>

                    {sources.length > 0 && (
                      <div className="border border-border rounded-xl bg-card shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-border bg-muted/20 font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                          <LinkIcon size={16} /> Data Provenance
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left">
                            <thead className="bg-muted/10 border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                              <tr>
                                <th className="px-4 py-3 font-medium">Fact Field</th>
                                <th className="px-4 py-3 font-medium">Value Captured</th>
                                <th className="px-4 py-3 font-medium">Source / Trust</th>
                                <th className="px-4 py-3 font-medium">Recorded</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {sources.map(s => (
                                <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                                  <td className="px-4 py-3 font-medium text-foreground">{s.fieldName}</td>
                                  <td className="px-4 py-3 text-muted-foreground truncate max-w-[200px]" title={s.value || ''}>{s.value || '-'}</td>
                                  <td className="px-4 py-3">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider bg-secondary text-secondary-foreground uppercase">
                                      {s.provenance}
                                    </span>
                                    {s.provider && <span className="ml-2 text-xs text-muted-foreground">via {s.provider}</span>}
                                  </td>
                                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                                    {format(new Date(s.recordedAt), 'MMM d, yyyy')}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {activities.length > 0 && (
                      <div className="border border-border rounded-xl bg-card shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-border bg-muted/20 font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                          <Activity size={16} /> Audit Log
                        </div>
                        <div className="p-5 space-y-5">
                          {activities.map((act, i) => (
                            <div key={act.id} className="relative pl-6">
                              {i !== activities.length - 1 && (
                                <div className="absolute left-[9px] top-4 bottom-[-20px] w-px bg-border"></div>
                              )}
                              <div className="absolute left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-card"></div>
                              <div className="text-sm">
                                <span className="font-semibold text-foreground capitalize">{act.activityType.replace(/_/g, ' ')}</span>
                                <span className="text-muted-foreground ml-3 text-xs tracking-wide uppercase">
                                  {format(new Date(act.occurredAt), 'MMM d, h:mm a')}
                                </span>
                              </div>
                              {act.note && <div className="text-sm text-muted-foreground mt-2 bg-muted/30 border border-border/50 p-2.5 rounded-md">{act.note}</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="outreach" className="mt-0 focus-visible:outline-none">
                    <LeadOutreach leadId={leadId} lead={lead} sources={sources} />
                  </TabsContent>
                </Tabs>
              )}
            </div>

            <div className="space-y-6">
              <div className="border border-border rounded-xl bg-card shadow-sm overflow-hidden">
                <div className="p-4 border-b border-border bg-muted/20 font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center justify-between">
                  <span>Score Diagnostics</span>
                  <ScoreLeadButton leadId={lead.id} />
                </div>
                <div className="p-5 flex flex-col items-center">
                  <div className="mb-5">
                    <ScoreBadge score={lead.scoreSummary.score} band={lead.scoreSummary.band} />
                  </div>

                  {lead.scoreSummary.reasons.length > 0 ? (
                    <div className="w-full space-y-2">
                      <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 border-b border-border pb-1">Calculation Vectors</h4>
                      {lead.scoreSummary.reasons.map((r, i) => (
                        <div key={i} className="flex justify-between items-center text-sm py-1.5">
                          <span className="text-foreground">{r.label}</span>
                          <span className={`font-mono text-xs font-medium ${r.points >= 0 ? "text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded" : "text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded"}`}>
                            {r.points > 0 ? '+' : ''}{r.points}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-4 bg-muted/20 w-full rounded-md border border-border border-dashed">
                      No score reasons computed.
                    </div>
                  )}
                </div>
              </div>

              {!lead.suppressionSummary.suppressed && (
                <div className="border border-rose-200 rounded-xl bg-rose-50/30 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-rose-200 font-semibold text-sm uppercase tracking-wide text-rose-800 flex items-center gap-2">
                    Suppression Controls
                  </div>
                  <div className="p-5">
                    <p className="text-sm text-rose-700/90 mb-4 font-medium leading-relaxed">
                      Mark target as Do Not Contact if they have opted out or fall outside acquisition parameters.
                    </p>
                    <SuppressForm leadId={lead.id} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string, value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="text-sm font-medium text-foreground">{value || <span className="text-muted-foreground/40 font-normal italic">Unspecified</span>}</div>
    </div>
  );
}

function ScoreLeadButton({ leadId }: { leadId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const scoreLead = useScoreLeadNow();

  const handleScore = async () => {
    try {
      await scoreLead.mutateAsync({ leadId });
      queryClient.invalidateQueries({ queryKey: getGetLeadQueryKey(leadId) });
      queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetLeadAcquisitionDashboardQueryKey() });
      toast({ title: 'Diagnostics Refreshed', description: 'Target score metrics updated.' });
    } catch (err: any) {
      toast({ title: 'Recalculation Failed', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-7 text-[10px] gap-1.5 px-2.5 font-bold uppercase tracking-wide bg-card shadow-sm"
      onClick={handleScore}
      disabled={scoreLead.isPending}
    >
      {scoreLead.isPending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
      Recalculate
    </Button>
  );
}

function UnsuppressButton({ leadId, isPermanent }: { leadId: string, isPermanent?: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const unsuppress = useUnsuppressLead();

  if (isPermanent) {
    return (
      <Button
        variant="outline"
        className="border-rose-300 text-rose-700 bg-rose-100 cursor-not-allowed font-medium opacity-80"
        disabled
      >
        <ShieldAlert size={16} className="mr-2" />
        Permanent Hold
      </Button>
    );
  }

  const handleUnsuppress = async () => {
    try {
      await unsuppress.mutateAsync({ leadId });
      queryClient.invalidateQueries({ queryKey: getGetLeadQueryKey(leadId) });
      queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetLeadAcquisitionDashboardQueryKey() });
      toast({ title: 'Hold Lifted', description: 'Target restored to contactable status.' });
    } catch (err: any) {
      toast({ title: 'Action Failed', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Button
      variant="outline"
      className="border-rose-300 text-rose-700 bg-white hover:bg-rose-50 font-medium shadow-sm"
      onClick={handleUnsuppress}
      disabled={unsuppress.isPending}
    >
      {unsuppress.isPending ? <Loader2 size={16} className="animate-spin mr-2" /> : <ShieldCheck size={16} className="mr-2" />}
      Lift Hold
    </Button>
  );
}

function SuppressForm({ leadId }: { leadId: string }) {
  const [reason, setReason] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const suppress = useSuppressLead();

  const handleSuppress = async () => {
    if (!reason.trim()) {
      toast({ title: 'Justification required', variant: 'destructive' });
      return;
    }
    try {
      await suppress.mutateAsync({ leadId, data: { reason } });
      setReason('');
      queryClient.invalidateQueries({ queryKey: getGetLeadQueryKey(leadId) });
      queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetLeadAcquisitionDashboardQueryKey() });
      toast({ title: 'Hold Applied', description: 'Target removed from contact lists.' });
    } catch (err: any) {
      toast({ title: 'Action Failed', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-3">
      <Input
        placeholder="Enter justification for DNC status..."
        value={reason}
        onChange={e => setReason(e.target.value)}
        className="bg-white border-rose-200 focus-visible:ring-rose-500"
      />
      <Button
        variant="destructive"
        className="w-full font-bold uppercase tracking-wide text-xs"
        onClick={handleSuppress}
        disabled={suppress.isPending || !reason.trim()}
      >
        {suppress.isPending ? <Loader2 size={14} className="animate-spin mr-2" /> : <ShieldAlert size={14} className="mr-2" />}
        Execute DNC Hold
      </Button>
    </div>
  );
}

const updateLeadSchema = z.object({
  businessName: z.string().min(1, 'Business name is required').max(300),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().max(50).optional().or(z.literal('')),
  websiteUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  listingUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  category: z.string().max(128).optional().or(z.literal('')),
  city: z.string().max(128).optional().or(z.literal('')),
  region: z.string().max(128).optional().or(z.literal('')),
  country: z.string().max(64).optional().or(z.literal('')),
  postalCode: z.string().max(20).optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  description: z.string().max(2000).optional().or(z.literal('')),
  services: z.string().max(1000).optional().or(z.literal('')),
  rating: z.union([z.literal(''), z.coerce.number().min(0).max(5).optional()]),
  reviewCount: z.union([z.literal(''), z.coerce.number().min(0).optional()]),
  pipelineStatus: z.enum(['new', 'contacted', 'qualified', 'proposal', 'won', 'lost', 'archived']),
  websiteStatus: z.enum(['unknown', 'has_website', 'no_website', 'placeholder', 'outdated']),
});

type UpdateLeadForm = z.infer<typeof updateLeadSchema>;

function EditLeadForm({ lead, onCancel, onSaved }: { lead: any, onCancel: () => void, onSaved: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateLead = useUpdateLead();

  const form = useForm<UpdateLeadForm>({
    resolver: zodResolver(updateLeadSchema),
    defaultValues: {
      businessName: lead.businessName || '',
      email: lead.email || '',
      phone: lead.phone || '',
      websiteUrl: lead.websiteUrl || '',
      listingUrl: lead.listingUrl || '',
      category: lead.category || '',
      city: lead.city || '',
      region: lead.region || '',
      country: lead.country || '',
      postalCode: lead.postalCode || '',
      address: lead.address || '',
      description: lead.description || '',
      services: lead.services || '',
      rating: lead.rating ?? '',
      reviewCount: lead.reviewCount ?? '',
      pipelineStatus: lead.pipelineStatus,
      websiteStatus: lead.websiteStatus,
    },
  });

  const onSubmit = async (data: UpdateLeadForm) => {
    try {
      const patchData: Record<string, any> = {};
      let hasChanges = false;

      Object.entries(data).forEach(([k, v]) => {
        let formValue = v as any;
        if (k !== 'businessName' && k !== 'pipelineStatus' && k !== 'websiteStatus') {
          if (v === '' || v === undefined || (typeof v === 'number' && isNaN(v))) {
            formValue = null;
          }
        }

        let originalValue = lead[k];
        if (originalValue === undefined) originalValue = null;

        if (k === 'rating' || k === 'reviewCount') {
          if (formValue !== null) formValue = Number(formValue);
          if (originalValue !== null) originalValue = Number(originalValue);
        }

        if (formValue !== originalValue) {
          patchData[k] = formValue;
          hasChanges = true;
        }
      });

      if (!hasChanges) {
        onSaved();
        return;
      }

      await updateLead.mutateAsync({
        leadId: lead.id,
        data: patchData,
      });

      toast({ title: 'Target Updated', description: 'Data saved successfully.' });

      queryClient.invalidateQueries({ queryKey: getGetLeadQueryKey(lead.id) });
      queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetLeadAcquisitionDashboardQueryKey() });

      onSaved();
    } catch (err: any) {
      toast({ title: 'Update Failed', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="border border-primary/30 rounded-xl bg-card shadow-md overflow-hidden ring-1 ring-primary/5">
      <div className="p-4 border-b border-border bg-primary/5 font-semibold text-sm uppercase tracking-wide flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary">
          <Edit size={16} /> Edit Target Profile
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground" onClick={onCancel}><X size={14} /></Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <FormField control={form.control} name="businessName" render={({ field }) => (
              <FormItem><FormLabel>Business Name *</FormLabel><FormControl><Input {...field} className="bg-muted/10 font-medium" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem><FormLabel>Category</FormLabel><FormControl><Input {...field} className="bg-muted/10" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} className="bg-muted/10" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem><FormLabel>Phone</FormLabel><FormControl><Input type="tel" {...field} className="bg-muted/10" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="websiteUrl" render={({ field }) => (
              <FormItem><FormLabel>Website URL</FormLabel><FormControl><Input type="url" {...field} className="bg-muted/10 font-mono text-xs" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="listingUrl" render={({ field }) => (
              <FormItem><FormLabel>External Profile URL</FormLabel><FormControl><Input type="url" {...field} className="bg-muted/10 font-mono text-xs" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="websiteStatus" render={({ field }) => (
              <FormItem><FormLabel>Website Verification</FormLabel>
                <Select {...field} className="bg-muted/10">
                  <option value="unknown">Unverified (Requires check)</option>
                  <option value="has_website">Confirmed Active</option>
                  <option value="no_website">Confirmed None</option>
                  <option value="placeholder">Placeholder Only</option>
                  <option value="outdated">Severely Outdated</option>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem className="sm:col-span-2"><FormLabel>Street Address</FormLabel><FormControl><Input {...field} className="bg-muted/10" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="city" render={({ field }) => (
              <FormItem><FormLabel>City</FormLabel><FormControl><Input {...field} className="bg-muted/10" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="region" render={({ field }) => (
              <FormItem><FormLabel>Region / State</FormLabel><FormControl><Input {...field} className="bg-muted/10" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="postalCode" render={({ field }) => (
              <FormItem><FormLabel>Postal Code</FormLabel><FormControl><Input {...field} className="bg-muted/10" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="country" render={({ field }) => (
              <FormItem><FormLabel>Country Code</FormLabel><FormControl><Input {...field} className="bg-muted/10 font-mono uppercase" maxLength={2} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="rating" render={({ field }) => (
              <FormItem><FormLabel>Reputation Score (0-5)</FormLabel><FormControl><Input type="number" step="0.1" min="0" max="5" {...field} className="bg-muted/10" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="reviewCount" render={({ field }) => (
              <FormItem><FormLabel>Volume of Reviews</FormLabel><FormControl><Input type="number" min="0" {...field} className="bg-muted/10" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="services" render={({ field }) => (
              <FormItem className="sm:col-span-2"><FormLabel>Vector Tags / Services (comma separated)</FormLabel><FormControl><Input {...field} className="bg-muted/10 font-mono text-xs" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="pipelineStatus" render={({ field }) => (
              <FormItem className="sm:col-span-2"><FormLabel>Pipeline State</FormLabel>
                <Select {...field} className="bg-muted/10 font-semibold text-primary">
                  <option value="new">New / Unworked</option>
                  <option value="contacted">Contact Initiated</option>
                  <option value="qualified">Qualified Opportunity</option>
                  <option value="proposal">Proposal Active</option>
                  <option value="won">Closed Won</option>
                  <option value="lost">Closed Lost</option>
                  <option value="archived">Archived / Passed</option>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem className="sm:col-span-2"><FormLabel>Analyst Notes</FormLabel><FormControl><Textarea {...field} className="bg-muted/10" /></FormControl><FormMessage /></FormItem>
            )} />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button type="submit" disabled={updateLead.isPending} className="font-bold uppercase tracking-wide text-xs px-6">
              {updateLead.isPending && <Loader2 size={14} className="animate-spin mr-2" />}
              Commit Update
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
