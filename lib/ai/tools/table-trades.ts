import { tool } from 'ai';
import { z } from 'zod';
import { Session } from 'next-auth';

import { createTrade } from '@/lib/db/queries';

export interface CreateTradeProps {
  session: Session;
  strategyChatId:string;
}

export const createTradeWithSession = ({ session, strategyChatId }: CreateTradeProps) =>
  tool({
    description: 'Create a new trade record with user session context',
    parameters: z.object({
      product: z.string().describe('The trading product/symbol (e.g., BTC, ETH)'),
      side: z.enum(['buy', 'sell']).describe('Whether this is a buy or sell order'),
      orderType: z.enum(['market', 'limit', 'stop_loss', 'take_profit']).describe('The type of order executed'),
      priceInCurrency: z.string().optional().describe('The price in the base currency'),
      priceInUSD: z.string().optional().describe('The price converted to USD'),
      amount: z.string().describe('The amount/quantity of the asset traded'),
      costInCurrency: z.string().optional().describe('The total cost in the base currency'),
      costInUSD: z.string().optional().describe('The total cost converted to USD'),
      feeInCurrency: z.string().optional().describe('The trading fee in the base currency'),
      feeInUSD: z.string().optional().describe('The trading fee converted to USD'),
      executedAt: z.string().describe('The timestamp when the trade was executed (ISO format)'),
    }),
    execute: async ({ 
      product,
      side,
      orderType,
      priceInCurrency,
      priceInUSD,
      amount,
      costInCurrency,
      costInUSD,
      feeInCurrency,
      feeInUSD,
      executedAt 
    }) => {
      try {
        const executedDate = new Date(executedAt);
        
        
        const trade = await createTrade({
          strategyChatId: strategyChatId,
          userId: session.user?.id || '',
          product,
          side,
          orderType,
          priceInCurrency,
          priceInUSD,
          amount,
          costInCurrency,
          costInUSD,
          feeInCurrency,
          feeInUSD,
          executedAt: executedDate,
        });

        return {
          success: true,
          trade: trade[0],
          message: `Successfully created ${side} trade for ${amount} ${product}`,
        };
      } catch (error) {
        return {
          success: false,
          error: 'Failed to create trade',
          details: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  });


