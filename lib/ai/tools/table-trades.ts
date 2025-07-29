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
      product: z.string().describe('The trading product/symbol (e.g., BTC, ETH for spot. ETHUSDT for perpetual, ETHUSD-20250725-2100-P for options, please remember options with prefix xxxUSD not USDT)'),
      productType: z.enum(['perpetual', 'option', 'spot']).describe('The type of product being traded'),
      side: z.enum(['buy', 'sell']).describe('Whether this is a buy or sell order'),
      optionType: z.enum(['call', 'put']).optional().describe('The options type (required only for options products, remember it is a must parameter for options products)'),
      orderType: z.enum(['market', 'limit', 'stop_loss', 'take_profit']).describe('The type of order executed'),
      priceInCurrency: z.string().optional().describe('The price in the base currency'),
      priceInUSD: z.string().optional().describe('The price converted to USD'),
      amount: z.string().describe('The amount/quantity of the asset traded'),
      feeInCurrency: z.string().optional().describe('The trading fee in the base currency'),
      feeInUSD: z.string().optional().describe('The trading fee converted to USD'),
      platform: z.string().describe('The trading platform where this trade was executed'),
      executedAt: z.string().describe('The date when the trade was executed, if year not given, please use year 2025'),
    }),
    execute: async ({ 
      product,
      productType,
      side,
      optionType,
      orderType,
      priceInCurrency,
      priceInUSD,
      amount,
      feeInCurrency,
      feeInUSD,
      platform,
      executedAt 
    }) => {
      try {
        const executedDate = new Date(executedAt);
        
        
        const trade = await createTrade({
          strategyChatId: strategyChatId,
          userId: session.user?.id || '',
          product,
          productType,
          side,
          optionType,
          orderType,
          priceInCurrency,
          priceInUSD,
          amount,
          feeInCurrency,
          feeInUSD,
          platform,
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
      product: z.string().optional().describe('The updated trading product/symbol, e.g., BTC, ETH for spot. ETHUSDT for perpetual, ETHUSD-20250725-2100-P for options'),
      productType: z.enum(['perpetual', 'option', 'spot']).optional().describe('The updated product type'),
      side: z.enum(['buy', 'sell']).optional().describe('The updated trade side'),
      optionType: z.enum(['call', 'put']).optional().describe('The updated option type'),
      orderType: z.enum(['market', 'limit', 'stop_loss', 'take_profit']).optional().describe('The updated order type'),
      priceInCurrency: z.string().optional().describe('The updated price in the base currency'),
      priceInUSD: z.string().optional().describe('The updated price converted to USD'),
      amount: z.string().optional().describe('The updated amount/quantity'),
      feeInCurrency: z.string().optional().describe('The updated trading fee in the base currency'),
      feeInUSD: z.string().optional().describe('The updated trading fee converted to USD'),
      platform: z.string().optional().describe('The updated trading platform'),
      executedAt: z.string().optional().describe('The updated execution timestamp (ISO format)'),
    }),
    execute: async ({ 
      id,
      product,
      productType,
      side,
      optionType,
      orderType,
      priceInCurrency,
      priceInUSD,
      amount,
      feeInCurrency,
      feeInUSD,
      platform,
      executedAt 
    }) => {
      try {
        const updatedTrade = await updateTradeById({
          id,
          userId: session.user?.id || '',
          product,
          productType,
          side,
          optionType,
          orderType,
          priceInCurrency,
          priceInUSD,
          amount,
          feeInCurrency,
          feeInUSD,
          platform,
          executedAt: executedAt ? new Date(executedAt) : undefined,
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


