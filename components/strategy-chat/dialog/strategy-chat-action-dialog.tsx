'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import useSWR, { mutate } from 'swr'


import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { useStrategyChat } from './strategy-chat-context'
import { baseCurrencies } from '../data'
import { fetcher, generateUUID } from '@/lib/utils'
import { useRouter } from 'next/navigation'

const strategyFormSchema = z.object({
  strategyName: z.string().min(1, 'Strategy name is required'),
  strategyTypeId: z.string().min(1, 'Strategy type is required'),
  baseCurrency: z.string().min(1, 'Base currency is required'),
  initialCapital_USD: z.string().optional(),
  initialCapital_Currency: z.string().optional(),
}).refine(
  (data) => {
    const usdValue = parseFloat(data.initialCapital_USD || '0') || 0;
    const currencyValue = parseFloat(data.initialCapital_Currency || '0') || 0;
    return usdValue > 0 || currencyValue > 0;
  },
  {
    message: 'At least one initial capital field must have a non-zero value',
    path: ['initialCapital_USD'], // Show error on USD field
  }
)

type StrategyFormData = z.infer<typeof strategyFormSchema>

export function StrategyChatActionDialog() {
  const { open, setOpen, currentRow } = useStrategyChat()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  // Fetch strategy types
  const { data: strategyTypes, error: strategyTypesError } = useSWR('/api/strategy-types', fetcher)

  const form = useForm<StrategyFormData>({
    resolver: zodResolver(strategyFormSchema),
    defaultValues: {
      strategyName: currentRow?.strategyName || '',
      strategyTypeId: currentRow?.strategyTypeId || '',
      baseCurrency: currentRow?.baseCurrency || 'USD',
      initialCapital_USD: currentRow?.initialCapital_USD || '',
      initialCapital_Currency: currentRow?.initialCapital_Currency || '',
    },
  })

  const isOpen = open === 'create' || open === 'edit'
  const isEdit = open === 'edit'

  // Update form values when dialog opens for editing
  useEffect(() => {
    if (isEdit && currentRow) {
      form.reset({
        strategyName: currentRow.strategyName || '',
        strategyTypeId: currentRow.strategyTypeId || '',
        baseCurrency: currentRow.baseCurrency || 'USD',
        initialCapital_USD: currentRow.initialCapital_USD || '',
        initialCapital_Currency: currentRow.initialCapital_Currency || '',
      })
    } else if (open === 'create') {
      form.reset({
        strategyName: '',
        strategyTypeId: '',
        baseCurrency: 'USD',
        initialCapital_USD: '',
        initialCapital_Currency: '',
      })
    }
  }, [open, currentRow, isEdit, form])

  const onSubmit = async (data: StrategyFormData) => {
    setIsSubmitting(true)
    try {
      if (isEdit) {
        // Update existing strategy
        if (!currentRow) {
          toast.error('No strategy selected for editing');
          return;
        }

        const response = await fetch('/api/strategy-chat/update', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: currentRow.id,
            strategyName: data.strategyName,
            baseCurrency: data.baseCurrency,
            initialCapital_USD: data.initialCapital_USD,
            initialCapital_Currency: data.initialCapital_Currency,
          }),
        });

        if (response.ok) {
          toast.success('Strategy updated successfully')
          
          // Refresh the data
          mutate('/api/strategy-chat/list')
          
          setOpen(null)
          form.reset()
        } else {
          const errorData = await response.json().catch(() => ({}))
          toast.error(errorData.message || 'Failed to update strategy')
        }
      } else {
        // Create new strategy
        const usdValue = parseFloat(data.initialCapital_USD || '0') || 0;
        const currencyValue = parseFloat(data.initialCapital_Currency || '0') || 0;

        // Find the selected strategy type
        const selectedStrategyType = strategyTypes?.find((type: any) => type.id === data.strategyTypeId);
        if (!selectedStrategyType) {
          toast.error('Selected strategy type not found');
          return;
        }

        const strategyChatId = generateUUID();
        const messageId = generateUUID();
        const currentDate = new Date();

        // Create the initial message with strategy context
        const initialMessage = `I am creating a ${selectedStrategyType.name} strategy with the following details:
Name: ${data.strategyName}
Base Currency: ${data.baseCurrency}
Initial Capital (USD): ${data.initialCapital_USD || 'Not specified'}
Initial Capital (Currency): ${data.initialCapital_Currency || 'Not specified'}
${selectedStrategyType.description ? `Strategy Type Context: ${selectedStrategyType.description}` : ''}
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

        // Create chat via API
        const strategyChatResponse = await fetch('/api/strategy-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: strategyChatId,
            strategyName: data.strategyName,
            baseCurrency: data.baseCurrency,
            initialCapital_USD: usdValue > 0 ? usdValue : undefined,
            initialCapital_Currency: currencyValue > 0 ? currencyValue : undefined,
            strategyTypeId: data.strategyTypeId,
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
          toast.success('Strategy created successfully')
          
          // Refresh the data
          mutate('/api/strategy-chat/list')
          
          setOpen(null)
          form.reset()
          
          // Navigate to the chat
          router.push(`/dashboard/chat/${strategyChatId}`)
        } else {
          const errorData = await strategyChatResponse.json().catch(() => ({}))
          toast.error(errorData.message || 'Failed to create strategy')
        }
      }
    } catch (error) {
      console.error('Error saving strategy:', error)
      toast.error('Failed to save strategy')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setOpen(null)
    form.reset()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Strategy' : 'Create Strategy'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the strategy details below.'
              : 'Create a new trading strategy. Fill in the details below.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="strategyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Strategy Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter strategy name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="strategyTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Strategy Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select strategy type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {strategyTypes?.length > 0 ? (
                        strategyTypes.map((type: any) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="" disabled>
                          {strategyTypesError ? 'Error loading types' : 'Loading...'}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="baseCurrency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base Currency</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select base currency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {baseCurrencies.map((currency) => (
                        <SelectItem key={currency.value} value={currency.value}>
                          {currency.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="initialCapital_USD"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial Capital (USD)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter initial capital in USD"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="initialCapital_Currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Initial Capital (Currency)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter initial capital in base currency"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || !strategyTypes || strategyTypes.length === 0}
              >
                {isSubmitting ? 'Saving...' : isEdit ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}