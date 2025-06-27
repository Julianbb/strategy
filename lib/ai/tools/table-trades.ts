import { tool } from 'ai';
import { z } from 'zod';
import { Session } from 'next-auth';

import { createTrade, deleteTradeById, updateTradeById } from '@/lib/db/queries';

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

export interface DeleteTradeProps {
  session: Session;
}

export const deleteTradeWithSession = ({ session }: DeleteTradeProps) =>
  tool({
    description: 'Delete a trade record by ID with user session context',
    parameters: z.object({
      id: z.string().describe('The unique identifier of the trade to delete'),
    }),
    execute: async ({ id }) => {
      try {
        const deletedTrade = await deleteTradeById({
          id,
          userId: session.user?.id || '',
        });

        if (!deletedTrade) {
          return {
            success: false,
            error: 'Trade not found or unauthorized',
            message: 'No trade found with the specified ID, or you do not have permission to delete it',
          };
        }

        return {
          success: true,
          trade: deletedTrade,
          message: `Successfully deleted ${deletedTrade.side} trade for ${deletedTrade.amount} ${deletedTrade.product}`,
        };
      } catch (error) {
        return {
          success: false,
          error: 'Failed to delete trade',
          details: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  });

export interface UpdateTradeProps {
  session: Session;
}

export const updateTradeWithSession = ({ session }: UpdateTradeProps) =>
  tool({
    description: 'Update a trade record with pricing information using user session context',
    parameters: z.object({
      id: z.string().describe('The unique identifier of the trade to update'),
      priceInCurrency: z.string().optional().describe('The updated price in the base currency'),
      priceInUSD: z.string().optional().describe('The updated price converted to USD'),
      costInCurrency: z.string().optional().describe('The updated total cost in the base currency'),
      costInUSD: z.string().optional().describe('The updated total cost converted to USD'),
      feeInCurrency: z.string().optional().describe('The updated trading fee in the base currency'),
      feeInUSD: z.string().optional().describe('The updated trading fee converted to USD'),
    }),
    execute: async ({ 
      id,
      priceInCurrency,
      priceInUSD,
      costInCurrency,
      costInUSD,
      feeInCurrency,
      feeInUSD 
    }) => {
      try {
        const updatedTrade = await updateTradeById({
          id,
          userId: session.user?.id || '',
          priceInCurrency,
          priceInUSD,
          costInCurrency,
          costInUSD,
          feeInCurrency,
          feeInUSD,
        });

        if (!updatedTrade) {
          return {
            success: false,
            error: 'Trade not found or unauthorized',
            message: 'No trade found with the specified ID, or you do not have permission to update it',
          };
        }

        return {
          success: true,
          trade: updatedTrade,
          message: `Successfully updated ${updatedTrade.side} trade for ${updatedTrade.amount} ${updatedTrade.product}`,
        };
      } catch (error) {
        return {
          success: false,
          error: 'Failed to update trade',
          details: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  });


