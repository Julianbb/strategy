'use client';

import { useState } from 'react';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { generateUUID } from '@/lib/utils';

interface StrategyType {
  id: string;
  name: string;
  description?: string;
}

interface CreateStrategyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  strategyType: StrategyType | null;
}

interface StrategyFormData {
  name: string;
  baseCurrency: string;
  initialCapital_USD: string;
  initialCapital_Currency: string;
}

export function CreateStrategyDialog({ 
  open, 
  onOpenChange, 
  strategyType 
}: CreateStrategyDialogProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<StrategyFormData>({
    name: '',
    baseCurrency: 'ETH',
    initialCapital_USD: '',
    initialCapital_Currency: ''
  });

  // Auto-fill name with chatTitle when strategyType changes
  React.useEffect(() => {
    if (strategyType && open) {
      const currentDate = new Date();
      const chatTitle = `${strategyType.name} Strategy - ${currentDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })}`;
      setFormData(prev => ({ ...prev, name: chatTitle }));
    }
  }, [strategyType, open]);
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!strategyType || !formData.name.trim()) return;

    // Check that at least one initial capital field has a non-zero value
    const usdValue = parseFloat(formData.initialCapital_USD) || 0;
    const currencyValue = parseFloat(formData.initialCapital_Currency) || 0;
    if (usdValue === 0 && currencyValue === 0) {
      alert('Please enter a non-zero value for at least one initial capital field.');
      return;
    }

    setIsCreating(true);

    try {
      const strategyChatId = generateUUID();
      const messageId = generateUUID();
      const currentDate = new Date();
      const chatTitle = formData.name;

      // Create the initial message with strategy context
      const initialMessage = `I am creating a ${strategyType.name} strategy with the following details:
      Name: ${formData.name}
      Base Currency: ${formData.baseCurrency}
      Initial Capital (USD): ${formData.initialCapital_USD}
      Initial Capital (Currency): ${formData.initialCapital_Currency}
      ${strategyType.description ? `Strategy Type Context: ${strategyType.description}` : ''}
      you don't need to do anything right now. but I will have a conversation with you, please use tool to help me interact with every single trade happened within this strategy,
      Please follow these rules:
      1. Each trade involves only one product.
      2. Each trade uses only one pricing currency—either crypto or USD. No conversion is needed.
        * If priced in USD, leave the crypto fields empty.
        * If priced in crypto, leave the USD fields empty.
        * For example, if I say the price is 0.2 ETH, it's crypto-based: set priceInCurrency = 0.2, ignore priceInUSD.
          If I say the price is 2300 USD, it's USD-based: set priceInUSD = 2300, ignore priceInCurrency.
        * Same logic applies to costInCurrency/costInUSD, and feeInCurrency/feeInUSD.
      3. If there are any required parameters I forgot to give you, ask me again.
      `;

      // Create chat first (required for strategy foreign key reference)
      const strategyChatResponse = await fetch('/api/strategy-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: strategyChatId,
          strategyName: formData.name,
          baseCurrency: formData.baseCurrency,
          initialCapital_USD: parseFloat(formData.initialCapital_USD) || undefined,
          initialCapital_Currency: parseFloat(formData.initialCapital_Currency) || undefined,
          strategyTypeId: strategyType.id,
          message: {
            id: messageId,
            createdAt: currentDate,
            role: 'user',
            content: initialMessage,
            parts: [
              {
                text: initialMessage,
                type: 'text'
              }
            ]
          }
        }),
      });
     
      if (strategyChatResponse.ok) {
        // Reset form and close dialog
        setFormData({ name: '', baseCurrency: 'ETH', initialCapital_USD: '', initialCapital_Currency: '' });
        onOpenChange(false);
        
        // Navigate to the chat
        router.push(`/chat/${strategyChatId}`);
      } else {
        console.error('Failed to create strategy or chat');
      }
    } catch (error) {
      console.error('Error creating strategy:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setFormData({ name: '', baseCurrency: 'ETH', initialCapital_USD: '', initialCapital_Currency: '' });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            Create New {strategyType?.name} Strategy
          </DialogTitle>
          <DialogDescription>
            Fill in the details below to create your new strategy. This will start a chat session to help you develop it.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="strategy-name" className="block text-sm font-medium mb-1">
              Strategy Name *
            </label>
            <Input
              id="strategy-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter your strategy name"
              required
              disabled={isCreating}
            />
          </div>

          <div>
            <label htmlFor="base-currency" className="block text-sm font-medium mb-1">
              Base Currency *
            </label>
            <select
              id="base-currency"
              value={formData.baseCurrency}
              onChange={(e) => setFormData({ ...formData, baseCurrency: e.target.value })}
              className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
              disabled={isCreating}
              required
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="JPY">JPY</option>
              <option value="BTC">BTC</option>
              <option value="ETH">ETH</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="initial-capital-usd" className="block text-sm font-medium mb-1">
                Initial Capital (USD)
              </label>
              <Input
                id="initial-capital-usd"
                type="number"
                min="0"
                step="0.01"
                value={formData.initialCapital_USD}
                onChange={(e) => setFormData({ ...formData, initialCapital_USD: e.target.value })}
                placeholder="1000.00"
                disabled={isCreating}
              />
            </div>

            <div>
              <label htmlFor="initial-capital-currency" className="block text-sm font-medium mb-1">
                Initial Capital ({formData.baseCurrency})
              </label>
              <Input
                id="initial-capital-currency"
                type="number"
                min="0"
                step="0.01"
                value={formData.initialCapital_Currency}
                onChange={(e) => setFormData({ ...formData, initialCapital_Currency: e.target.value })}
                placeholder="1000.00"
                disabled={isCreating}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isCreating || !formData.name.trim() || ((!formData.initialCapital_USD || parseFloat(formData.initialCapital_USD) === 0) && (!formData.initialCapital_Currency || parseFloat(formData.initialCapital_Currency) === 0))}
            >
              {isCreating ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}