import { useState } from 'react';
import { Settings, ShieldAlert, Loader2, Mail, MessageSquare, MapPin, Activity, CheckCircle2, XCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetProviderSettings,
  useUpdateProviderSetting,
  useListProviderAuditEvents,
  getGetProviderSettingsQueryKey,
  getListProviderAuditEventsQueryKey,
  type ProviderCapability,
  type ProviderCapabilitySetting,
  type ProviderSettingUpdate,
  type ProviderAuditEvent
} from '@workspace/api-client-react';

import { Button, Switch, Input, Label } from '@/components/ui';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'System fault detected.';
}

function CapabilityIcon({ capability }: { capability: string }) {
  switch (capability) {
    case 'email': return <Mail className="text-blue-600" />;
    case 'whatsapp': return <MessageSquare className="text-emerald-600" />;
    case 'discovery': return <MapPin className="text-amber-600" />;
    case 'website_analysis': return <Activity className="text-indigo-600" />;
    default: return <Settings className="text-muted-foreground" />;
  }
}

function CapabilityCard({ 
  setting, 
  onSave 
}: { 
  setting: ProviderCapabilitySetting,
  onSave: (capability: ProviderCapability, data: ProviderSettingUpdate) => Promise<void> 
}) {
  const [isSaving, setIsSaving] = useState(false);
  const { capability, displayName, enabled, availability, message, config, quota } = setting;
  
  const [waTemplateName, setWaTemplateName] = useState(config?.whatsappTemplateName || '');
  const [waTemplateLanguage, setWaTemplateLanguage] = useState(config?.whatsappTemplateLanguage || '');
  
  const handleToggle = async (checked: boolean) => {
    setIsSaving(true);
    try {
      await onSave(capability, { enabled: checked });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleWhatsAppSave = async () => {
    setIsSaving(true);
    try {
      await onSave(capability, { 
        config: { 
          whatsappTemplateName: waTemplateName.trim() || null, 
          whatsappTemplateLanguage: waTemplateLanguage.trim() || null,
          requireExplicitConsent: true
        } 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const canToggle = setting.providerKey != null;

  return (
    <div className={`bg-card border ${enabled ? 'border-primary/30 ring-1 ring-primary/5' : 'border-border'} rounded-xl shadow-sm overflow-hidden flex flex-col transition-colors`}>
      <div className="p-5 flex-1 flex flex-col gap-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${enabled ? 'bg-primary/10' : 'bg-muted/50'}`}>
              <CapabilityIcon capability={capability} />
            </div>
            <div>
              <h3 className="font-bold text-base text-foreground tracking-tight">
                {displayName || capability.replace('_', ' ')}
              </h3>
              <div className="flex items-center gap-1.5 mt-1.5">
                {availability === 'available' && <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded"><CheckCircle2 size={10} className="mr-1" /> Online</span>}
                {availability === 'disabled' && <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded"><XCircle size={10} className="mr-1" /> Offline</span>}
                {availability === 'not_configured' && <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded"><ShieldAlert size={10} className="mr-1" /> Unconfigured</span>}
                {availability === 'rate_limited' && <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded"><Activity size={10} className="mr-1" /> Throttled</span>}
                {availability === 'unavailable' && <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded"><XCircle size={10} className="mr-1" /> Disconnected</span>}
              </div>
            </div>
          </div>
          
          {canToggle && (
            <div className="flex items-center gap-2">
              {isSaving && <Loader2 size={14} className="animate-spin text-muted-foreground" />}
              <Switch 
                checked={enabled} 
                onCheckedChange={handleToggle} 
                disabled={isSaving}
              />
            </div>
          )}
        </div>

        {message && (
          <div className="text-sm font-medium text-muted-foreground bg-muted/20 p-3 rounded-lg border border-border/50">
            {message}
          </div>
        )}

        {quota && (
          <div className="bg-muted/10 border border-border rounded-lg p-3 mt-auto">
            <div className="flex justify-between items-end mb-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Rate Limit Buffer</span>
              <span className="text-xs font-mono font-bold text-foreground">{quota.used} / {quota.limit}</span>
            </div>
            <div className="w-full h-2 bg-muted/50 rounded-full overflow-hidden">
              <div 
                className={`h-full ${quota.used >= quota.limit ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                style={{ width: `${Math.min(100, (quota.used / quota.limit) * 100)}%` }}
              />
            </div>
            <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-2 text-right">
              Flushes {format(new Date(quota.windowEndsAt), 'MMM d, HH:mm')}
            </div>
          </div>
        )}
      </div>

      {capability === 'whatsapp' && (
        <div className="bg-muted/10 border-t border-border p-5 space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Compliance & Routing</div>
          <div className="grid gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Approved Template Routing Key</Label>
              <Input 
                value={waTemplateName} 
                onChange={e => setWaTemplateName(e.target.value)} 
                placeholder="e.g. outreach_intro_v1"
                maxLength={128}
                className="h-9 bg-card font-mono text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Locale Code</Label>
              <Input 
                value={waTemplateLanguage} 
                onChange={e => setWaTemplateLanguage(e.target.value)} 
                placeholder="e.g. en_US"
                maxLength={16}
                className="h-9 bg-card font-mono text-xs"
              />
            </div>
            <div className="flex items-start gap-3 bg-card p-3 rounded-lg border border-border">
              <Switch checked={true} disabled className="mt-0.5 opacity-50" />
              <div className="grid gap-1">
                <Label className="text-sm font-bold opacity-70">Mandatory Consent Gate</Label>
                <p className="text-xs text-muted-foreground leading-relaxed">System strictly enforces explicit documented consent before pushing to WA node.</p>
              </div>
            </div>
          </div>
          <Button 
            size="sm" 
            className="w-full font-bold uppercase tracking-wider text-xs h-9 mt-2" 
            onClick={handleWhatsAppSave} 
            disabled={isSaving}
          >
            {isSaving && <Loader2 size={14} className="animate-spin mr-2" />}
            Commit WA Config
          </Button>
        </div>
      )}
    </div>
  );
}

function AuditLog() {
  const { data, isLoading, error, refetch } = useListProviderAuditEvents({ limit: 50 }, {
    query: { queryKey: getListProviderAuditEventsQueryKey({ limit: 50 }) }
  });

  if (isLoading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-primary" size={24} />
        <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Syncing log...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 text-destructive p-6 rounded-xl flex flex-col items-center text-center gap-3">
        <ShieldAlert size={24} />
        <div>
          <div className="font-bold tracking-tight">Audit log unavailable</div>
          <p className="text-sm mt-1 opacity-90">{getErrorMessage(error)}</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => refetch()} className="bg-white">Retry Connection</Button>
      </div>
    );
  }

  if (!data?.items || data.items.length === 0) {
    return (
      <div className="text-center p-12 bg-muted/5 rounded-xl border border-border border-dashed">
        <Activity className="mx-auto mb-3 opacity-20" size={32} />
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Log empty</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.items.map((event: ProviderAuditEvent) => (
        <div key={event.id} className="text-sm bg-card border border-border p-4 rounded-lg flex gap-4 items-start shadow-sm transition-colors hover:bg-muted/10">
          <div className="mt-0.5 shrink-0">
            {event.outcome === 'success' ? (
              <CheckCircle2 size={18} className="text-emerald-500" />
            ) : (
              <XCircle size={18} className="text-rose-500" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 mb-1">
              <span className="font-bold text-foreground capitalize tracking-wide flex items-center gap-2">
                {event.capability} <span className="text-muted-foreground/30">/</span> {event.eventType.replace(/_/g, ' ')}
              </span>
              <span className="text-[10px] font-mono font-medium text-muted-foreground whitespace-nowrap uppercase tracking-wider">
                {format(new Date(event.occurredAt), 'MMM d, HH:mm:ss')}
              </span>
            </div>
            {event.detail && (
              <p className="text-muted-foreground text-xs leading-relaxed font-mono mt-1.5 break-words bg-muted/20 p-2 rounded">{event.detail}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: settingsData, isLoading: settingsLoading, error: settingsError, refetch: refetchSettings } = useGetProviderSettings({
    query: { queryKey: getGetProviderSettingsQueryKey() }
  });

  const updateSetting = useUpdateProviderSetting();

  const handleSaveSetting = async (capability: ProviderCapability, data: ProviderSettingUpdate) => {
    try {
      await updateSetting.mutateAsync({ capability, data });
      queryClient.invalidateQueries({ queryKey: getGetProviderSettingsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListProviderAuditEventsQueryKey({ limit: 50 }) });
      toast({
        title: "Node Updated",
        description: `${capability} protocol re-initialized.`,
      });
    } catch (err) {
      toast({
        title: "Update Halted",
        description: getErrorMessage(err),
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-muted/10">
      <header className="px-6 py-4 border-b border-border bg-card shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Infrastructure</h1>
          <p className="text-muted-foreground text-sm">Provider routing, limits, and compliance logs.</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-3 gap-8">
          
          <div className="xl:col-span-2 space-y-6">
            <h2 className="text-lg font-bold tracking-tight border-b border-border pb-2">Active Protocols</h2>
            
            {settingsLoading ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3">
                <Loader2 className="animate-spin text-primary" size={32} />
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Probing nodes...</span>
              </div>
            ) : settingsError ? (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive p-8 rounded-xl flex flex-col items-center justify-center text-center gap-4">
                <ShieldAlert size={32} />
                <div>
                  <h3 className="font-bold tracking-tight text-lg mb-1">Infrastructure link severed</h3>
                  <p className="text-sm font-medium opacity-90">{getErrorMessage(settingsError)}</p>
                </div>
                <Button onClick={() => refetchSettings()} variant="outline" className="bg-white">Re-establish</Button>
              </div>
            ) : settingsData?.capabilities.length === 0 ? (
              <div className="bg-muted/20 border border-dashed border-border p-12 rounded-xl text-center">
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">No protocols detected</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {settingsData?.capabilities.map((setting: ProviderCapabilitySetting) => (
                  <CapabilityCard 
                    key={setting.capability} 
                    setting={setting} 
                    onSave={handleSaveSetting} 
                  />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <h2 className="text-lg font-bold tracking-tight border-b border-border pb-2">Compliance Log</h2>
            <div className="bg-card rounded-xl border border-border shadow-sm p-5 min-h-[500px]">
              <AuditLog />
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
