'use client';

import { usePriceAlerts } from './price-alerts-context';
import { PriceAlertActionDialog } from './price-alert-action-dialog';

export function PriceAlertsDialogs() {
  const { 
    open, 
    setOpen, 
    currentRow, 
    setCurrentRow
  } = usePriceAlerts();

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen ? open : null);
    if (!isOpen) {
      setTimeout(() => setCurrentRow(undefined), 500);
    }
  };

  return (
    <>
      <PriceAlertActionDialog
        key={`action-${currentRow?.id || 'new'}`}
        open={open === 'action'}
        onOpenChange={handleOpenChange}
        currentRow={currentRow}
      />
    </>
  );
}