'use client';

import { isToday, isYesterday, subMonths, subWeeks } from 'date-fns';
import { useParams, useRouter } from 'next/navigation';
import type { User } from 'next-auth';
import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  useSidebar,
} from '@/components/ui/sidebar';
import type { StrategyChat } from '@/lib/db/schema';
import { fetcher } from '@/lib/utils';
import { ChatItem } from './sidebar-history-item';
import useSWRInfinite from 'swr/infinite';
import { LoaderIcon } from './icons';

type GroupedChats = {
  today: StrategyChat[];
  yesterday: StrategyChat[];
  lastWeek: StrategyChat[];
  lastMonth: StrategyChat[];
  older: StrategyChat[];
};

export interface ChatHistory {
  chats: Array<StrategyChat>;
  hasMore: boolean;
}

const PAGE_SIZE = 20;

// 将日期分组逻辑提取为独立函数并使用 useMemo 优化
const groupChatsByDate = (chats: StrategyChat[]): GroupedChats => {
  const now = new Date();
  const oneWeekAgo = subWeeks(now, 1);
  const oneMonthAgo = subMonths(now, 1);

  return chats.reduce(
    (groups, chat) => {
      const chatDate = new Date(chat.createdAt);

      if (isToday(chatDate)) {
        groups.today.push(chat);
      } else if (isYesterday(chatDate)) {
        groups.yesterday.push(chat);
      } else if (chatDate > oneWeekAgo) {
        groups.lastWeek.push(chat);
      } else if (chatDate > oneMonthAgo) {
        groups.lastMonth.push(chat);
      } else {
        groups.older.push(chat);
      }

      return groups;
    },
    {
      today: [],
      yesterday: [],
      lastWeek: [],
      lastMonth: [],
      older: [],
    } as GroupedChats,
  );
};

export function getChatHistoryPaginationKey(
  pageIndex: number,
  previousPageData: ChatHistory,
) {
  if (previousPageData && previousPageData.hasMore === false) {
    return null;
  }

  if (pageIndex === 0) return `/api/history?limit=${PAGE_SIZE}`;

  const firstChatFromPage = previousPageData.chats.at(-1);

  if (!firstChatFromPage) return null;

  return `/api/history?ending_before=${firstChatFromPage.id}&limit=${PAGE_SIZE}`;
}

export function SidebarHistory({ user }: { user: User | undefined }) {
  const { setOpenMobile } = useSidebar();
  const { id } = useParams();

  const {
    data: paginatedChatHistories,
    setSize,
    isValidating,
    isLoading,
    mutate,
  } = useSWRInfinite<ChatHistory>(getChatHistoryPaginationKey, fetcher, {
    fallbackData: [],
  });

  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // 使用 useMemo 优化计算
  const { hasReachedEnd, hasEmptyChatHistory, allChats } = useMemo(() => {
    const hasReachedEnd = paginatedChatHistories
      ? paginatedChatHistories.some((page) => page.hasMore === false)
      : false;

    const hasEmptyChatHistory = paginatedChatHistories
      ? paginatedChatHistories.every((page) => page.chats.length === 0)
      : false;

    const allChats = paginatedChatHistories
      ? paginatedChatHistories.flatMap((page) => page.chats)
      : [];

    return { hasReachedEnd, hasEmptyChatHistory, allChats };
  }, [paginatedChatHistories]);

  // 使用 useMemo 优化日期分组
  const groupedChats = useMemo(() => {
    return groupChatsByDate(allChats);
  }, [allChats]);

  // 使用 useCallback 优化删除处理函数
  const handleDelete = useCallback(async () => {
    if (!deleteId) return;

    const deletePromise = fetch(`/api/strategy-chat?id=${deleteId}`, {
      method: 'DELETE',
    });

    toast.promise(deletePromise, {
      loading: 'Deleting chat...',
      success: () => {
        mutate((chatHistories) => {
          if (chatHistories) {
            return chatHistories.map((chatHistory) => ({
              ...chatHistory,
              chats: chatHistory.chats.filter((chat) => chat.id !== deleteId),
            }));
          }
        });

        return 'Chat deleted successfully';
      },
      error: 'Failed to delete chat',
    });

    setShowDeleteDialog(false);

    if (deleteId === id) {
      router.push('/');
    }
  }, [deleteId, mutate, id, router]);

  // 状态更新函数 - 在请求成功后更新UI
  const handleStatusChange = useCallback(async (
    chatId: string, 
    newStatus: 'active' | 'paused' | 'stopped' | 'completed'
  ) => {
    try {
      // 显示加载状态
      toast.loading('Updating strategy status...');
      
      const response = await fetch(`/api/strategy-chat`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: chatId,
          status: newStatus,
        }),
      });

      // 关闭loading toast
      toast.dismiss();

      if (response.ok) {
        // 请求成功后才更新UI
        mutate((chatHistories) => {
          if (!chatHistories) return chatHistories;
          
          return chatHistories.map((chatHistory) => ({
            ...chatHistory, // 创建新的 chatHistory 对象
            chats: chatHistory.chats.map((chat) =>
              chat.id === chatId 
                ? { ...chat, status: newStatus } // 创建新的 chat 对象
                : chat
            ),
          }));
        }, false); // false 表示不重新验证，因为我们已经有了最新数据

        toast.success('Strategy status updated successfully');
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.message || 'Failed to update strategy status');
      }
    } catch (error) {
      toast.dismiss(); // 确保关闭loading toast
      console.error('Failed to update strategy status:', error);
      toast.error('Failed to update strategy status');
    }
  }, [mutate]);

  // 使用 useCallback 优化删除触发函数
  const handleDeleteTrigger = useCallback((chatId: string) => {
    setDeleteId(chatId);
    setShowDeleteDialog(true);
  }, []);

  // 使用 useCallback 优化加载更多函数
  const handleLoadMore = useCallback(() => {
    if (!isValidating && !hasReachedEnd) {
      setSize((size) => size + 1);
    }
  }, [isValidating, hasReachedEnd, setSize]);

  if (!user) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <div className="px-2 text-zinc-500 w-full flex flex-row justify-center items-center text-sm gap-2">
            Login to save and revisit previous chats!
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  if (isLoading) {
    return (
      <SidebarGroup>
        <div className="px-2 py-1 text-xs text-sidebar-foreground/50">
          Today
        </div>
        <SidebarGroupContent>
          <div className="flex flex-col">
            {[44, 32, 28, 64, 52].map((item) => (
              <div
                key={item}
                className="rounded-md h-8 flex gap-2 px-2 items-center"
              >
                <div
                  className="h-4 rounded-md flex-1 max-w-[--skeleton-width] bg-sidebar-accent-foreground/10"
                  style={
                    {
                      '--skeleton-width': `${item}%`,
                    } as React.CSSProperties
                  }
                />
              </div>
            ))}
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  if (hasEmptyChatHistory) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <div className="px-2 text-zinc-500 w-full flex flex-row justify-center items-center text-sm gap-2">
            Your conversations will appear here once you start chatting!
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  // 提取渲染分组的逻辑
  const renderChatGroup = (chats: StrategyChat[], title: string) => {
    if (chats.length === 0) return null;

    return (
      <div key={title}>
        <div className="px-2 py-1 text-xs text-sidebar-foreground/50">
          {title}
        </div>
        {chats.map((chat) => (
          <ChatItem
            key={chat.id}
            chat={chat}
            isActive={chat.id === id}
            onDelete={handleDeleteTrigger}
            onStatusChange={handleStatusChange}
            setOpenMobile={setOpenMobile}
          />
        ))}
      </div>
    );
  };

  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <div className="flex flex-col gap-6">
              {renderChatGroup(groupedChats.today, 'Today')}
              {renderChatGroup(groupedChats.yesterday, 'Yesterday')}
              {renderChatGroup(groupedChats.lastWeek, 'Last 7 days')}
              {renderChatGroup(groupedChats.lastMonth, 'Last 30 days')}
              {renderChatGroup(groupedChats.older, 'Older than last month')}
            </div>
          </SidebarMenu>

          <motion.div onViewportEnter={handleLoadMore} />

          {hasReachedEnd ? (
            <div className="px-2 text-zinc-500 w-full flex flex-row justify-center items-center text-sm gap-2 mt-8">
              You have reached the end of your chat history.
            </div>
          ) : (
            <div className="p-2 text-zinc-500 dark:text-zinc-400 flex flex-row gap-2 items-center mt-8">
              <div className="animate-spin">
                <LoaderIcon />
              </div>
              <div>Loading Chats...</div>
            </div>
          )}
        </SidebarGroupContent>
      </SidebarGroup>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              chat and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}