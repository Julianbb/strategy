'use client';

import { usePriceCompare } from '../price-compare-context';
import { AddProductDialog } from './add-product-dialog';

export function PriceCompareDialogs() {
  const { open, setOpen } = usePriceCompare();

  return (
    <>
      <AddProductDialog 
        open={open === 'add-product'} 
        onOpenChange={(isOpen) => setOpen(isOpen ? 'add-product' : null)} 
      />
    </>
  );
}