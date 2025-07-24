'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { usePriceAlerts } from './price-alerts-context';

const SUPPORTED_COINS = ['BTC', 'ETH', 'BNB', 'XRP', 'ADA', 'DOT', 'LINK', 'LTC', 'BCH', 'XLM'];

interface PriceAlert {
  id: string;
  userId: string;
  coin: string;
  targetPrice: string;
  currentPrice: string;
  condition: 'above' | 'below';
  createdAt: Date;
  isActive: boolean;
  triggeredAt?: Date;
}

interface PriceAlertActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRow?: PriceAlert;
}

export function PriceAlertActionDialog({ open, onOpenChange, currentRow }: PriceAlertActionDialogProps) {
  const { fetchAlerts } = usePriceAlerts();
  const [formData, setFormData] = useState({
    coin: '',
    targetPrice: '',
    condition: 'above' as 'above' | 'below'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!currentRow;

  useEffect(() => {
    if (currentRow) {
      setFormData({
        coin: currentRow.coin,
        targetPrice: parseFloat(currentRow.targetPrice).toString(),
        condition: currentRow.condition
      });
    } else {
      setFormData({ coin: '', targetPrice: '', condition: 'above' });
    }
  }, [currentRow]);

  const handleSubmit = async () => {
    if (!formData.coin || !formData.targetPrice) {
      toast.error('Please fill in all fields');
      return;
    }

    const targetPrice = parseFloat(formData.targetPrice);
    if (isNaN(targetPrice) || targetPrice <= 0) {
      toast.error('Please enter a valid target price');
      return;
    }

    setIsSubmitting(true);

    try {
      const priceResponse = await fetch(`/api/prices?baseCurrency=${formData.coin}`);
      if (!priceResponse.ok) {
        toast.error('Failed to fetch current price. Please try again.');
        return;
      }
      
      const priceData = await priceResponse.json();
      if (priceData.error || priceData.currencyPrice === null) {
        toast.error('Failed to fetch current price. Please try again.');
        return;
      }
      
      const currentPrice = priceData.currencyPrice;

      const response = await fetch('/api/price-alerts', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEditing ? {
          id: currentRow.id,
          coin: formData.coin,
          targetPrice,
          currentPrice,
          condition: formData.condition
        } : {
          coin: formData.coin,
          targetPrice,
          currentPrice,
          condition: formData.condition
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${isEditing ? 'update' : 'create'} price alert`);
      }

      await fetchAlerts();
      setFormData({ coin: '', targetPrice: '', condition: 'above' });
      onOpenChange(false);
      toast.success(`Price alert ${isEditing ? 'updated' : 'created'} successfully!`);
    } catch (error) {
      console.error(`Error ${isEditing ? 'updating' : 'creating'} price alert:`, error);
      toast.error(`Failed to ${isEditing ? 'update' : 'create'} price alert. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({ coin: '', targetPrice: '', condition: 'above' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="text-lg md:text-xl">
            {isEditing ? 'Edit Price Alert' : 'Create New Price Alert'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="coin">Cryptocurrency</Label>
              <Select value={formData.coin} onValueChange={(value) => setFormData(prev => ({ ...prev, coin: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select coin" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_COINS.map(coin => (
                    <SelectItem key={coin} value={coin}>{coin}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="targetPrice">Target Price ($)</Label>
              <Input
                id="targetPrice"
                type="number"
                placeholder="0.00"
                value={formData.targetPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, targetPrice: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="condition">Condition</Label>
              <Select value={formData.condition} onValueChange={(value: 'above' | 'below') => setFormData(prev => ({ ...prev, condition: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="above">Above target</SelectItem>
                  <SelectItem value="below">Below target</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 pt-4 sm:justify-end">
            <Button variant="outline" onClick={handleCancel} disabled={isSubmitting} className="order-1 sm:order-1">
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="order-2 sm:order-2">
              {isSubmitting ? (isEditing ? 'Updating...' : 'Creating...') : (isEditing ? 'Update Alert' : 'Create Alert')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}