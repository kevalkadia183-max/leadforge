import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  Button, Textarea, Label
} from '@/components/ui';
import { Download, Loader2, AlertTriangle } from 'lucide-react';
import { useImportLeads, getListLeadsQueryKey, getGetLeadAcquisitionDashboardQueryKey, type LeadImportItem } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

function parseCSVRow(text: string): string[] {
  let inQuote = false;
  let current = '';
  const result: string[] = [];
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuote) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuote = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuote = true;
      } else if (char === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }
  result.push(current.trim());
  return result;
}

export function LeadImportDialog() {
  const [open, setOpen] = useState(false);
  const [csvData, setCsvData] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const importLeads = useImportLeads();

  const handleImport = async () => {
    setError(null);
    if (!csvData.trim()) {
      setError('Please paste CSV data');
      return;
    }

    try {
      const lines = csvData.trim().split('\n');
      if (lines.length < 2) {
        throw new Error('CSV must have a header row and at least one data row');
      }
      if (lines.length > 101) {
        throw new Error('Maximum 100 leads allowed per import');
      }

      const headers = parseCSVRow(lines[0].toLowerCase());
      const businessNameIdx = headers.indexOf('businessname') !== -1 ? headers.indexOf('businessname') : headers.indexOf('name');
      
      if (businessNameIdx === -1) {
        throw new Error('CSV must contain a "businessName" or "name" column');
      }

      const items: LeadImportItem[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const values = parseCSVRow(line);
        const businessName = values[businessNameIdx];
        
        if (!businessName) continue;
        
        const item: LeadImportItem = { businessName };

        const emailIdx = headers.indexOf('email');
        if (emailIdx !== -1 && values[emailIdx]) item.email = values[emailIdx];

        const phoneIdx = headers.indexOf('phone');
        if (phoneIdx !== -1 && values[phoneIdx]) item.phone = values[phoneIdx];

        const urlIdx = headers.indexOf('websiteurl') !== -1 ? headers.indexOf('websiteurl') : headers.indexOf('website');
        if (urlIdx !== -1 && values[urlIdx]) item.websiteUrl = values[urlIdx];

        const categoryIdx = headers.indexOf('category');
        if (categoryIdx !== -1 && values[categoryIdx]) item.category = values[categoryIdx];
        
        const cityIdx = headers.indexOf('city');
        if (cityIdx !== -1 && values[cityIdx]) item.city = values[cityIdx];

        items.push(item);
      }

      if (items.length === 0) {
        throw new Error('No valid leads found in CSV');
      }

      const res = await importLeads.mutateAsync({
        data: { items }
      });

      toast({
        title: 'Import complete',
        description: `Successfully imported ${res.created} leads. Skipped ${res.skipped}.`,
      });
      
      setCsvData('');
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: getListLeadsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetLeadAcquisitionDashboardQueryKey() });
    } catch (err: any) {
      setError(err.message || 'Failed to parse or import CSV');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 bg-card shadow-sm border-border">
          <Download size={16} /> Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Import Targets</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>Paste CSV Data</Label>
            <div className="text-xs text-muted-foreground mb-2 p-3 bg-muted/30 rounded border border-border flex gap-2">
              <BadgeInfo size={14} className="shrink-0 text-primary mt-0.5" />
              <div>
                Required: <code className="bg-background px-1 border border-border rounded font-mono">businessName</code><br/>
                Optional: <code className="bg-background px-1 border border-border rounded font-mono">email, phone, websiteUrl, city, category</code>
              </div>
            </div>
            <Textarea 
              placeholder="businessName,email,city&#10;Acme Corp,contact@acme.com,Seattle" 
              className="min-h-[250px] font-mono text-sm leading-relaxed" 
              value={csvData}
              onChange={e => setCsvData(e.target.value)}
            />
          </div>
          
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={importLeads.isPending || !csvData.trim()}>
              {importLeads.isPending && <Loader2 size={16} className="animate-spin mr-2" />}
              Process Import
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BadgeInfo(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}
