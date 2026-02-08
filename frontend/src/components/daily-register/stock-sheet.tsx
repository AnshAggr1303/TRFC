'use client';

import { Package } from 'lucide-react';

interface StockSheetProps {
  shopId: string;
  shopCode: string;
  section: string;
  logDate: string;
  isEditable: boolean;
}

export function StockSheet({ shopId, shopCode, section, logDate, isEditable }: StockSheetProps) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center py-12 text-muted-foreground">
        <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-medium">Stock Sheet: {shopCode} - {section}</h3>
        <p className="text-sm mt-2">
          Inventory tracking coming soon...
        </p>
      </div>
    </div>
  );
}