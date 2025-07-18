import type { CoreAssistantMessage, CoreToolMessage, UIMessage } from 'ai';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { ChatSDKError, type ErrorCode } from './errors';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fetcher = async (url: string) => {
  const response = await fetch(url);

  if (!response.ok) {
    const { code, cause } = await response.json();
    throw new ChatSDKError(code as ErrorCode, cause);
  }

  return response.json();
};

export async function fetchWithErrorHandlers(
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  try {
    const response = await fetch(input, init);

    if (!response.ok) {
      const { code, cause } = await response.json();
      throw new ChatSDKError(code as ErrorCode, cause);
    }

    return response;
  } catch (error: unknown) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new ChatSDKError('offline:chat');
    }

    throw error;
  }
}

export function getLocalStorage(key: string) {
  if (typeof window !== 'undefined') {
    return JSON.parse(localStorage.getItem(key) || '[]');
  }
  return [];
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

type ResponseMessageWithoutId = CoreToolMessage | CoreAssistantMessage;
type ResponseMessage = ResponseMessageWithoutId & { id: string };

export function getMostRecentUserMessage(messages: Array<UIMessage>) {
  const userMessages = messages.filter((message) => message.role === 'user');
  return userMessages.at(-1);
}


export function getTrailingMessageId({
  messages,
}: {
  messages: Array<ResponseMessage>;
}): string | null {
  const trailingMessage = messages.at(-1);

  if (!trailingMessage) return null;

  return trailingMessage.id;
}

export function sanitizeText(text: string) {
  return text.replace('<has_function_call>', '');
}





export const convertInstrumentFlexible = (instrument: string) => {
  return instrument.replace(/(\w+)-(\d{4})(\d{2})(\d{2})-(\d+)-([CP])/, (match, symbol, year, month, day, strike, type) => {
    // 将4位年份转换为2位年份
    const shortYear = year.slice(-2);
    
    // 处理symbol：在货币对中间添加连字符
    // 假设都是6位的货币对格式 (如 ETHUSD, BTCUSD)
    let formattedSymbol = symbol;
    if (symbol.length === 6) {
      // 前3位-后3位 (ETH-USD)
      formattedSymbol = `${symbol.slice(0, 3)}-${symbol.slice(3)}`;
    } else if (symbol.length === 7) {
      // 处理特殊情况，如 BTCUSDT -> BTC-USDT
      formattedSymbol = `${symbol.slice(0, 3)}-${symbol.slice(3)}`;
    }
    
    return `${formattedSymbol}-${shortYear}${month}${day}-${strike}-${type}`;
  });
};




export function calculateDaysSinceStarted(strategyChat: { startedAt: Date; endedAt?: Date | null; status: string }) {
  const startTime = new Date(strategyChat.startedAt).getTime();
  const endTime = (strategyChat.status === 'completed' || strategyChat.status === 'stopped') && strategyChat.endedAt
    ? new Date(strategyChat.endedAt).getTime()
    : new Date().getTime();
  return Math.floor((endTime - startTime) / (1000 * 60 * 60 * 24));
}