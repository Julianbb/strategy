'use client';

import { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useChat } from '@ai-sdk/react';
import useSWR, { useSWRConfig } from 'swr';
import type { Attachment, UIMessage } from 'ai';
import type { Session } from 'next-auth';
import type { Vote } from '@/lib/db/schema';

import { PreviewMessage, ThinkingMessage } from './message';
import { MultimodalInput } from './multimodal-input';
import { fetcher, fetchWithErrorHandlers, generateUUID } from '@/lib/utils';
import { unstable_serialize } from 'swr/infinite';
import { getChatHistoryPaginationKey } from './sidebar-history';
import { toast } from './toast';
import { useSearchParams } from 'next/navigation';
import { useAutoResume } from '@/hooks/use-auto-resume';
import { ChatSDKError } from '@/lib/errors';

interface MobileChatProps {
  id: string;
  strategyChatId: string;
  initialMessages: Array<UIMessage>;
  initialChatModel: string;
  isReadonly: boolean;
  session: Session;
  autoResume: boolean;
}

const MobileChatMessages = forwardRef<
  { scrollToLastMessage: () => void },
  {
    chatId: string;
    status: any;
    votes: Array<Vote> | undefined;
    messages: Array<UIMessage>;
    setMessages: any;
    reload: any;
    isReadonly: boolean;
  }
>(({ chatId, status, votes, messages, setMessages, reload, isReadonly }, ref) => {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const prevMessagesLength = useRef(messages.length);
  
  const scrollToLastMessage = useCallback(() => {
    const container = messagesContainerRef.current;
    if (container && messages.length > 0) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);
  
  useImperativeHandle(ref, () => ({
    scrollToLastMessage,
  }), [scrollToLastMessage]);

  // Auto-scroll to new messages
  useEffect(() => {
    if (messages.length > prevMessagesLength.current && !isUserScrolling) {
      const container = messagesContainerRef.current;
      if (container) {
        const lastMessage = container.lastElementChild?.previousElementSibling;
        if (lastMessage) {
          lastMessage.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      }
    }
    prevMessagesLength.current = messages.length;
  }, [messages.length, isUserScrolling]);

  // Track user scrolling
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    let scrollTimeout: NodeJS.Timeout;
    
    const handleScroll = () => {
      setIsUserScrolling(true);
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        setIsUserScrolling(false);
      }, 1000);
    };

    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, []);

  return (
    <div
      ref={messagesContainerRef}
      className="flex flex-col min-w-0 gap-6 flex-1 overflow-y-auto overflow-x-hidden p-4 relative max-w-full"
    >
      {messages.map((message, index) => (
        <PreviewMessage
          key={message.id}
          chatId={chatId}
          message={message}
          isLoading={status === 'streaming' && messages.length - 1 === index}
          vote={
            votes
              ? votes.find((vote) => vote.messageId === message.id)
              : undefined
          }
          setMessages={setMessages}
          reload={reload}
          isReadonly={isReadonly}
          requiresScrollPadding={false}
        />
      ))}

      {status === 'submitted' &&
        messages.length > 0 &&
        messages[messages.length - 1].role === 'user' && <ThinkingMessage />}
    </div>
  );
});

MobileChatMessages.displayName = 'MobileChatMessages';

export function MobileChat({
  id,
  strategyChatId,
  initialMessages,
  initialChatModel,
  isReadonly,
  session,
  autoResume,
}: MobileChatProps) {
  const { mutate } = useSWRConfig();
  const messagesRef = useRef<{ scrollToLastMessage: () => void }>(null);

  const {
    messages,
    setMessages,
    handleSubmit,
    input,
    setInput,
    append,
    status,
    stop,
    reload,
    experimental_resume,
    data,
  } = useChat({
    id,
    initialMessages,
    experimental_throttle: 100,
    sendExtraMessageFields: true,
    generateId: generateUUID,
    fetch: fetchWithErrorHandlers,
    experimental_prepareRequestBody: (body) => ({
      id,
      strategyChatId,
      message: body.messages.at(-1),
      selectedChatModel: initialChatModel,
    }),
    onFinish: () => {
      mutate(unstable_serialize(getChatHistoryPaginationKey));
    },
    onError: (error) => {
      if (error instanceof ChatSDKError) {
        toast({
          type: 'error',
          description: error.message,
        });
      }
    },
  });

  const searchParams = useSearchParams();
  const query = searchParams.get('query');
  const [hasAppendedQuery, setHasAppendedQuery] = useState(false);

  useEffect(() => {
    if (query && !hasAppendedQuery) {
      append({
        role: 'user',
        content: query,
      });

      setHasAppendedQuery(true);
      window.history.replaceState({}, '', `/chat/${id}`);
    }
  }, [query, append, hasAppendedQuery, id]);

  const { data: votes } = useSWR<Array<Vote>>(
    messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
    fetcher,
  );

  const [attachments, setAttachments] = useState<Array<Attachment>>([]);

  useAutoResume({
    autoResume,
    initialMessages,
    experimental_resume,
    data,
    setMessages,
  });

  return (
    <div className="flex flex-col h-full bg-background min-w-0 max-w-full">
      <MobileChatMessages
        ref={messagesRef}
        chatId={id}
        status={status}
        votes={votes}
        messages={messages}
        setMessages={setMessages}
        reload={reload}
        isReadonly={isReadonly}
      />

      {!isReadonly && (
        <div className="border-t border-gray-200 p-3">
          <MultimodalInput
            chatId={id}
            input={input}
            setInput={setInput}
            handleSubmit={handleSubmit}
            status={status}
            stop={stop}
            attachments={attachments}
            setAttachments={setAttachments}
            messages={messages}
            setMessages={setMessages}
            append={append}
          />
        </div>
      )}
    </div>
  );
}