'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { usePriceCompare, ProductType } from '../price-compare-context';

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddProductDialog({ open, onOpenChange }: AddProductDialogProps) {
  const { addProduct } = usePriceCompare();
  
  const [formData, setFormData] = useState({
    type: 'spot' as ProductType,
    baseCurrency: 'ETH' as 'ETH' | 'BTC',
    expiryDate: '',
    strikePrice: '',
    optionType: 'CALL' as 'CALL' | 'PUT'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.type === 'option') {
      if (!formData.expiryDate || !formData.strikePrice) {
        toast.error('Please fill in all required fields for options');
        return;
      }
    }

    const productData = {
      type: formData.type,
      baseCurrency: formData.baseCurrency,
      ...(formData.type === 'option' && {
        expiryDate: formData.expiryDate,
        strikePrice: parseFloat(formData.strikePrice),
        optionType: formData.optionType
      })
    };

    addProduct(productData);
    toast.success('Product added successfully');
    
    // Reset form
    setFormData({
      type: 'spot',
      baseCurrency: 'ETH',
      expiryDate: '',
      strikePrice: '',
      optionType: 'CALL'
    });
    
    onOpenChange(false);
  };

  const handleReset = () => {
    setFormData({
      type: 'spot',
      baseCurrency: 'ETH',
      expiryDate: '',
      strikePrice: '',
      optionType: 'CALL'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Product</DialogTitle>
          <DialogDescription>
            Add a new product to compare its price movements
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Product Type</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value: ProductType) => {
                  setFormData(prev => ({ ...prev, type: value }));
                }}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spot">Spot</SelectItem>
                  <SelectItem value="option">Option</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="baseCurrency">Base Currency</Label>
              <Select 
                value={formData.baseCurrency} 
                onValueChange={(value: 'ETH' | 'BTC') => {
                  setFormData(prev => ({ ...prev, baseCurrency: value }));
                }}
              >
                <SelectTrigger id="baseCurrency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ETH">ETH</SelectItem>
                  <SelectItem value="BTC">BTC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.type === 'option' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiryDate">Expiry Date</Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      expiryDate: e.target.value 
                    }))}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="strikePrice">Strike Price ($)</Label>
                  <Input
                    id="strikePrice"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.strikePrice}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      strikePrice: e.target.value 
                    }))}
                    placeholder="Enter strike price"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="optionType">Option Type</Label>
                <Select 
                  value={formData.optionType} 
                  onValueChange={(value: 'CALL' | 'PUT') => {
                    setFormData(prev => ({ ...prev, optionType: value }));
                  }}
                >
                  <SelectTrigger id="optionType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CALL">CALL</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
            >
              Reset
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              Add Product
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}