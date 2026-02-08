'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import { Calendar, Save, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useShops } from '@/hooks/use-shops';
import { useDailyRegister, useSaveDailyRegister } from '@/hooks/use-daily-register';
import { MainSheet } from '@/components/daily-register/main-sheet';
import { StockSheet } from '@/components/daily-register/stock-sheet';
import { 
  DailyRegisterData, 
  SheetTab, 
  DEFAULT_SHEET_TABS,
} from '@/types/daily-register';
import { cn } from '@/lib/utils';

export default function DailyRegisterPage() {
  // State
  const [selectedShopId, setSelectedShopId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [activeTab, setActiveTab] = useState<string>('trfc');
  const [localData, setLocalData] = useState<DailyRegisterData | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Hooks
  const { data: shops, isLoading: shopsLoading } = useShops();
  
  // Get selected shop details
  const selectedShop = useMemo(() => 
    shops?.find(s => s.id === selectedShopId),
    [shops, selectedShopId]
  );

  // Fetch data from database
  const { 
    data: fetchedData, 
    isLoading: dataLoading,
    error: fetchError,
  } = useDailyRegister(
    selectedShopId,
    selectedShop?.code || '',
    selectedShop?.name || '',
    selectedDate
  );

  // Save mutation
  const saveMutation = useSaveDailyRegister();

  // Sync fetched data to local state
  useEffect(() => {
    if (fetchedData) {
      setLocalData(fetchedData);
      setHasUnsavedChanges(false);
    }
  }, [fetchedData]);

  // Filter tabs based on selected shop
  const availableTabs = useMemo(() => {
    if (!selectedShop) return [DEFAULT_SHEET_TABS[0]];
    
    return DEFAULT_SHEET_TABS.filter(tab => {
      if (tab.type === 'main') return true;
      return tab.shopCode === selectedShop.code;
    });
  }, [selectedShop]);

  // Reset tab when shop changes
  useEffect(() => {
    setActiveTab('trfc');
  }, [selectedShopId]);

  // Handle data changes (local state update)
  const handleDataChange = useCallback((updates: Partial<DailyRegisterData>) => {
    setLocalData(prev => {
      if (!prev) return prev;
      return { ...prev, ...updates };
    });
    setHasUnsavedChanges(true);
  }, []);

  // Save handler
  const handleSave = async () => {
    if (!localData) return;
    
    try {
      await saveMutation.mutateAsync(localData);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Save failed:', error);
    }
  };

  // Check if today
  const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd');

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  return (
    <div className="h-full flex flex-col">
      {/* Header Bar */}
      <div className="flex-shrink-0 border-b bg-background px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Title + Shop + Date */}
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold">Daily Register</h1>
            
            {/* Shop Selector */}
            <Select 
              value={selectedShopId} 
              onValueChange={(value) => {
                if (hasUnsavedChanges) {
                  if (confirm('You have unsaved changes. Discard them?')) {
                    setSelectedShopId(value);
                    setHasUnsavedChanges(false);
                  }
                } else {
                  setSelectedShopId(value);
                }
              }}
              disabled={shopsLoading}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Outlet..." />
              </SelectTrigger>
              <SelectContent>
                {shops?.map((shop) => (
                  <SelectItem key={shop.id} value={shop.id}>
                    {shop.name} ({shop.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date Picker */}
            <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-muted/50">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  if (hasUnsavedChanges) {
                    if (confirm('You have unsaved changes. Discard them?')) {
                      setSelectedDate(e.target.value);
                      setHasUnsavedChanges(false);
                    }
                  } else {
                    setSelectedDate(e.target.value);
                  }
                }}
                max={format(new Date(), 'yyyy-MM-dd')}
                className="bg-transparent border-none outline-none text-sm"
              />
              {isToday && (
                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                  Today
                </span>
              )}
              {!isToday && (
                <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                  Past Date
                </span>
              )}
            </div>
          </div>

          {/* Right: Status + Save Button */}
          <div className="flex items-center gap-3">
            {/* Status indicators */}
            {localData?.id && (
              <span className="text-xs text-muted-foreground">
                ID: {localData.id.slice(0, 8)}...
              </span>
            )}
            
            {hasUnsavedChanges && (
              <span className="text-xs text-amber-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Unsaved changes
              </span>
            )}
            
            {saveMutation.isSuccess && !hasUnsavedChanges && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Saved
              </span>
            )}

            <Button 
              onClick={handleSave} 
              disabled={!localData || saveMutation.isPending || !hasUnsavedChanges}
              size="sm"
              className={cn(
                hasUnsavedChanges && "bg-amber-600 hover:bg-amber-700"
              )}
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {saveMutation.isError && (
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to save: {(saveMutation.error as Error)?.message || 'Unknown error'}
            </AlertDescription>
          </Alert>
        )}

        {fetchError && (
          <Alert variant="destructive" className="mt-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load data: {(fetchError as Error)?.message || 'Unknown error'}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-4">
        {!selectedShopId ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select an outlet to start entering daily data</p>
            </div>
          </div>
        ) : dataLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading register data...</p>
            </div>
          </div>
        ) : !localData ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <p>No data available</p>
          </div>
        ) : (
          <>
            {/* Sheet Content */}
            {activeTab === 'trfc' ? (
              <MainSheet 
                data={localData} 
                onChange={handleDataChange}
                isEditable={isToday}
              />
            ) : (
              <StockSheet
                shopId={selectedShopId}
                shopCode={selectedShop?.code || ''}
                section={availableTabs.find(t => t.id === activeTab)?.section || ''}
                logDate={selectedDate}
                isEditable={isToday}
              />
            )}
          </>
        )}
      </div>

      {/* Sheet Tabs (Bottom) */}
      {selectedShopId && (
        <div className="flex-shrink-0 border-t bg-muted/30 px-2 py-1">
          <div className="flex items-center gap-1 overflow-x-auto">
            {availableTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-t-md border-b-2 transition-colors whitespace-nowrap",
                  activeTab === tab.id
                    ? "bg-background border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-background/50"
                )}
              >
                {tab.shortName}
                {tab.type === 'main' && localData && localData.totalSales > 0 && (
                  <span className="ml-2 text-xs text-green-600">
                    ₹{localData.totalSales.toLocaleString('en-IN')}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}