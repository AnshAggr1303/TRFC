'use client';

import { useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useShops, useOpeningCash, useExistingLog } from '@/hooks/use-shops';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import type { WizardData } from '@/types/daily-closing';

interface StepShopDateProps {
  data: WizardData;
  onUpdate: (updates: Partial<WizardData>) => void;
  onValidChange?: (isValid: boolean) => void;
}

export function StepShopDate({ data, onUpdate, onValidChange }: StepShopDateProps) {
  const { data: shops, isLoading: shopsLoading, error: shopsError } = useShops();
  const { data: openingCash, isLoading: cashLoading } = useOpeningCash(data.shopId, data.logDate);
  const { data: existingLog, isLoading: logLoading } = useExistingLog(data.shopId, data.logDate);

  // Update opening cash when it changes
  useEffect(() => {
    if (openingCash !== undefined) {
      onUpdate({ openingCash });
    }
  }, [openingCash]);

  // Update existing log ID if found
  useEffect(() => {
    if (existingLog) {
      onUpdate({ existingLogId: existingLog.id });
    } else {
      onUpdate({ existingLogId: undefined });
    }
  }, [existingLog]);

  // Validation
  useEffect(() => {
    const isValid = !!data.shopId && !!data.logDate && !existingLog;
    onValidChange?.(isValid);
  }, [data.shopId, data.logDate, existingLog, onValidChange]);

  const handleShopChange = (shopId: string) => {
    const shop = shops?.find(s => s.id === shopId);
    if (shop) {
      onUpdate({
        shopId: shop.id,
        shopName: shop.name,
        shopCode: shop.code,
      });
    }
  };

  const handleDateChange = (date: string) => {
    // Prevent future dates
    const today = new Date().toISOString().split('T')[0];
    if (date > today) {
      return;
    }
    onUpdate({ logDate: date });
  };

  // Calculate max date (today)
  const maxDate = new Date().toISOString().split('T')[0];
  
  // Calculate min date (30 days ago - reasonable limit)
  const minDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  if (shopsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (shopsError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load shops. Please refresh the page.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Shop Selection */}
      <div className="space-y-2">
        <Label htmlFor="shop">Select Shop *</Label>
        <Select value={data.shopId} onValueChange={handleShopChange}>
          <SelectTrigger id="shop" className="w-full">
            <SelectValue placeholder="Choose a shop..." />
          </SelectTrigger>
          <SelectContent>
            {shops?.map((shop) => (
              <SelectItem key={shop.id} value={shop.id}>
                <span className="font-medium">{shop.name}</span>
                <span className="ml-2 text-muted-foreground">({shop.code})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date Selection */}
      <div className="space-y-2">
        <Label htmlFor="date">Closing Date *</Label>
        <Input
          id="date"
          type="date"
          value={data.logDate}
          onChange={(e) => handleDateChange(e.target.value)}
          max={maxDate}
          min={minDate}
          className="w-full"
        />
        <p className="text-sm text-muted-foreground">
          Select the date for which you are closing. Defaults to today.
        </p>
      </div>

      {/* Status Messages */}
      {data.shopId && data.logDate && (
        <div className="space-y-3">
          {/* Existing Log Warning */}
          {logLoading ? (
            <Skeleton className="h-12 w-full" />
          ) : existingLog ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                A daily log already exists for <strong>{data.shopName}</strong> on{' '}
                <strong>{new Date(data.logDate).toLocaleDateString('en-IN')}</strong>.
                {existingLog.status === 'draft' ? (
                  <span className="block mt-1">
                    Status: <strong>Draft</strong> - You can edit the existing log.
                  </span>
                ) : (
                  <span className="block mt-1">
                    Status: <strong>{existingLog.status}</strong> - This log is locked.
                  </span>
                )}
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                No existing log found. You can create a new daily closing for{' '}
                <strong>{data.shopName}</strong> on{' '}
                <strong>{new Date(data.logDate).toLocaleDateString('en-IN')}</strong>.
              </AlertDescription>
            </Alert>
          )}

          {/* Opening Cash Info */}
          {!existingLog && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {cashLoading ? (
                  'Loading opening cash...'
                ) : (
                  <>
                    Opening Cash: <strong>₹{(openingCash ?? 0).toLocaleString('en-IN')}</strong>
                    {openingCash === 0 && (
                      <span className="block text-sm text-muted-foreground mt-1">
                        No previous closing found. Starting with ₹0.
                      </span>
                    )}
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Selected Summary */}
      {data.shopId && (
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Summary</h4>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-muted-foreground">Shop:</dt>
            <dd className="font-medium">{data.shopName} ({data.shopCode})</dd>
            <dt className="text-muted-foreground">Date:</dt>
            <dd className="font-medium">
              {new Date(data.logDate).toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </dd>
            <dt className="text-muted-foreground">Opening Cash:</dt>
            <dd className="font-medium">₹{(data.openingCash ?? 0).toLocaleString('en-IN')}</dd>
          </dl>
        </div>
      )}
    </div>
  );
}