'use client';

import { useStrategyTypes } from './strategy-types-context';
import { StrategyTypeActionDialog } from './strategy-type-action-dialog';
import { StrategyTypeDeleteDialog } from './strategy-type-delete-dialog';
import { CreateStrategyDialog } from './create-strategy-dialog';

export function StrategyTypesDialogs() {
  const { 
    open, 
    setOpen, 
    currentRow, 
    setCurrentRow, 
    fetchStrategyTypes 
  } = useStrategyTypes();

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen ? open : null);
    if (!isOpen) {
      setTimeout(() => setCurrentRow(undefined), 500);
    }
  };

  const handleSuccess = () => {
    fetchStrategyTypes();
  };

  return (
    <>
      <StrategyTypeActionDialog
        key={`create-${currentRow?.id || 'new'}`}
        open={open === 'create'}
        onOpenChange={handleOpenChange}
        currentRow={currentRow}
        onSuccess={handleSuccess}
      />

      <StrategyTypeDeleteDialog
        key={`delete-${currentRow?.id || 'none'}`}
        open={open === 'delete'}
        onOpenChange={handleOpenChange}
        currentRow={currentRow}
        onSuccess={handleSuccess}
      />

      <CreateStrategyDialog
        key={`create-strategy-${currentRow?.id || 'none'}`}
        open={open === 'create-strategy'}
        onOpenChange={handleOpenChange}
        strategyType={currentRow || null}
      />
    </>
  );
}