'use client';

import { useState,useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useChat } from '@ai-sdk/react';
import useSWR, { useSWRConfig } from 'swr';
import type { Attachment, UIMessage } from 'ai';
import type { VisibilityType } from './visibility-selector';
import type { Session } from 'next-auth';
import type { Vote } from '@/lib/db/schema';
import { MessageCircle, X } from 'lucide-react';
import { PreviewMessage, ThinkingMessage } from './message';
import { Greeting } from './greeting';
import { MultimodalInput } from './multimodal-input';
import { fetcher, fetchWithErrorHandlers, generateUUID } from '@/lib/utils';
import { unstable_serialize } from 'swr/infinite';
import { getChatHistoryPaginationKey } from './sidebar-history';
import { toast } from './toast';
import { useSearchParams } from 'next/navigation';
import { useChatVisibility } from '@/hooks/use-chat-visibility';
import { useAutoResume } from '@/hooks/use-auto-resume';
import { ChatSDKError } from '@/lib/errors';

interface FloatingChatProps {
  id: string;
  strategyChatId: string;
  initialMessages: Array<UIMessage>;
  initialChatModel: string;
  initialVisibilityType: VisibilityType;
  isReadonly: boolean;
  session: Session;
  autoResume: boolean;
}

const FloatingMessages = forwardRef<
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
  }, [messages]); // 如果 messages 很大，考虑只依赖 messages.length
  
  useImperativeHandle(ref, () => ({
    scrollToLastMessage,
  }), [scrollToLastMessage]);
  

  // Gentle scroll to bottom only when new messages arrive and user isn't actively scrolling
  useEffect(() => {
    if (messages.length > prevMessagesLength.current && !isUserScrolling) {
      const container = messagesContainerRef.current;
      if (container) {
        // Scroll to show the last message but not to the very bottom
        const lastMessage = container.lastElementChild?.previousElementSibling;
        if (lastMessage) {
          lastMessage.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      }
    }
    prevMessagesLength.current = messages.length;
  }, [messages.length, isUserScrolling]);

  // Track user scrolling to prevent auto-scroll during manual scrolling
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
      {messages.length === 0 && <Greeting />}

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

FloatingMessages.displayName = 'FloatingMessages';

function FloatingChatContent({
  id,
  strategyChatId,
  initialMessages,
  initialChatModel,
  initialVisibilityType,
  isReadonly,
  autoResume,
  shouldScrollToLast,
}: Omit<FloatingChatProps, 'session'> & { shouldScrollToLast?: boolean }) {
  const { mutate } = useSWRConfig();
  const messagesRef = useRef<{ scrollToLastMessage: () => void }>(null);

  const { visibilityType } = useChatVisibility({
    chatId: id,
    initialVisibilityType,
  });

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
      selectedVisibilityType: visibilityType,
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

  // Scroll to last message when dialog opens
  useEffect(() => {
    if (shouldScrollToLast && messagesRef.current) {
      // Use setTimeout to ensure the component is fully rendered
      setTimeout(() => {
        messagesRef.current?.scrollToLastMessage();
      }, 100);
    }
  }, [shouldScrollToLast]);

  useAutoResume({
    autoResume,
    initialMessages,
    experimental_resume,
    data,
    setMessages,
  });

  return (
    <div className="flex flex-col h-full bg-background min-w-0 max-w-full">
      <FloatingMessages
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
            selectedVisibilityType={visibilityType}
          />
        </div>
      )}
    </div>
  );
}

export function FloatingChat(props: FloatingChatProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldScrollToLast, setShouldScrollToLast] = useState(false);

  const toggleChat = () => {
    if (!isExpanded) {
      // Dialog is being opened, trigger scroll to last message
      setShouldScrollToLast(true);
    }
    setIsExpanded(!isExpanded);
  };

  // Reset scroll flag after it's been used
  useEffect(() => {
    if (shouldScrollToLast) {
      const timer = setTimeout(() => {
        setShouldScrollToLast(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [shouldScrollToLast]);

  return (
    <>
      {/* Floating Chat Button */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isExpanded ? (
          <button
            onClick={toggleChat}
            className="bg-black hover:bg-gray-800 text-white rounded-full p-4 shadow-lg transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            aria-label="Open chat"
          >
            <MessageCircle className="size-6" />
          </button>
        ) : (
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-96 h-[32rem] flex flex-col overflow-hidden">
            {/* Chat Header */}
            <div className="bg-black text-white p-4 flex items-center justify-between rounded-t-xl">
              <div className="flex items-center gap-2">
                <MessageCircle className="size-5" />
                <span className="font-medium">Chat Support</span>
              </div>
              <button
                onClick={toggleChat}
                className="text-white hover:text-gray-200 transition-colors focus:outline-none"
                aria-label="Close chat"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Chat Content */}
            <div className="flex-1 overflow-hidden min-w-0">
              <FloatingChatContent {...props} shouldScrollToLast={shouldScrollToLast} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}


