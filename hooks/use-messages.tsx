import { useState, useEffect } from 'react';
import { useScrollToBottom } from './use-scroll-to-bottom';
import type { UseChatHelpers } from '@ai-sdk/react';

export function useMessages({
  chatId,
  status,
  scrollToBottom,
}: {
  chatId: string;
  status: UseChatHelpers['status'];
  scrollToBottom: (behavior?: ScrollBehavior) => void;
}) {
  const {
    containerRef,
    endRef,
    isAtBottom,
    onViewportEnter,
    onViewportLeave,
  } = useScrollToBottom();

  const [hasSentMessage, setHasSentMessage] = useState(false);

  useEffect(() => {
    if (chatId) {
      scrollToBottom('instant');
      setHasSentMessage(false);
    }
  }, [chatId, scrollToBottom]);

  useEffect(() => {
    if (status === 'submitted') {
      setHasSentMessage(true);
    }
  }, [status]);

  // Scroll when new messages arrive after submitting
  useEffect(() => {
    if (hasSentMessage && status === 'streaming') {
      // Use a slight delay to ensure the new message is rendered
      const timeoutId = setTimeout(() => {
        scrollToBottom('smooth');
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [hasSentMessage, status, scrollToBottom]);

  return {
    containerRef,
    endRef,
    isAtBottom,
    onViewportEnter,
    onViewportLeave,
    hasSentMessage,
  };
}
