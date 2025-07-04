import type { StrategyChat } from '@/lib/db/schema';
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from './ui/sidebar';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  CheckCircleFillIcon,
  GlobeIcon,
  LockIcon,
  MoreHorizontalIcon,
  ShareIcon,
  TrashIcon,
} from './icons';
import { Play, Pause, Square, CheckCircle, Loader2 } from 'lucide-react';
import { memo, useState } from 'react';

const getStatusIcon = (status: string, isUpdating?: boolean) => {
  if (isUpdating) {
    return <Loader2 className="size-3 text-gray-400 animate-spin" />;
  }
  
  switch (status) {
    case 'active':
      return <Play className="size-3 text-green-500" />;
    case 'paused':
      return <Pause className="size-3 text-yellow-500" />;
    case 'stopped':
      return <Square className="size-3 text-red-500" />;
    case 'completed':
      return <CheckCircle className="size-3 text-blue-500" />;
    default:
      return <Play className="size-3 text-gray-500" />;
  }
};

const PureChatItem = ({
  chat,
  isActive,
  onDelete,
  onStatusChange,
  setOpenMobile,
}: {
  chat: StrategyChat;
  isActive: boolean;
  onDelete: (chatId: string) => void;
  onStatusChange: (chatId: string, status: 'active' | 'paused' | 'stopped' | 'completed') => Promise<void>;
  setOpenMobile: (open: boolean) => void;
}) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus: 'active' | 'paused' | 'stopped' | 'completed') => {
    setIsUpdating(true);
    try {
      await onStatusChange(chat.id, newStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive}>
        <Link href={`/chat/${chat.id}`} onClick={() => setOpenMobile(false)}>
          {getStatusIcon(chat.status, isUpdating)}
          <span>{chat.strategyName}</span>
        </Link>
      </SidebarMenuButton>

      <DropdownMenu modal={true}>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction
            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground mr-0.5"
            showOnHover={!isActive}
          >
            <MoreHorizontalIcon />
            <span className="sr-only">More</span>
          </SidebarMenuAction>
        </DropdownMenuTrigger>

        <DropdownMenuContent side="bottom" align="end">
          {chat.status === 'active' && (
            <>
              <DropdownMenuItem
                className="cursor-pointer"
                disabled={isUpdating}
                onSelect={() => handleStatusChange('paused')}
              >
                <Pause className="size-4" />
                <span>Pause</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                disabled={isUpdating}
                onSelect={() => handleStatusChange('stopped')}
              >
                <Square className="size-4" />
                <span>Stop</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                disabled={isUpdating}
                onSelect={() => handleStatusChange('completed')}
              >
                <CheckCircle className="size-4" />
                <span>Complete</span>
              </DropdownMenuItem>
            </>
          )}
          
          {chat.status === 'paused' && (
            <>
              <DropdownMenuItem
                className="cursor-pointer"
                disabled={isUpdating}
                onSelect={() => handleStatusChange('active')}
              >
                <Play className="size-4" />
                <span>Resume</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                disabled={isUpdating}
                onSelect={() => handleStatusChange('stopped')}
              >
                <Square className="size-4" />
                <span>Stop</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                disabled={isUpdating}
                onSelect={() => handleStatusChange('completed')}
              >
                <CheckCircle className="size-4" />
                <span>Complete</span>
              </DropdownMenuItem>
            </>
          )}
          
          {chat.status === 'stopped' && (
            <DropdownMenuItem
              className="cursor-pointer"
              disabled={isUpdating}
              onSelect={() => handleStatusChange('active')}
            >
              <Play className="size-4" />
              <span>Restart</span>
            </DropdownMenuItem>
          )}
          
          <DropdownMenuItem
            className="cursor-pointer text-destructive focus:bg-destructive/15 focus:text-destructive dark:text-red-500"
            disabled={isUpdating}
            onSelect={() => onDelete(chat.id)}
          >
            <TrashIcon />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
};

// 修复 memo 比较函数，确保当 chat 对象的属性发生变化时能够重新渲染
export const ChatItem = memo(PureChatItem, (prevProps, nextProps) => {
  // 如果 isActive 状态改变，需要重新渲染
  if (prevProps.isActive !== nextProps.isActive) {
    return false;
  }
  
  // 如果 chat 对象的 id 不同，需要重新渲染
  if (prevProps.chat.id !== nextProps.chat.id) {
    return false;
  }
  
  // 如果 chat 的 status 改变，需要重新渲染
  if (prevProps.chat.status !== nextProps.chat.status) {
    return false;
  }
  
  // 如果 chat 的 strategyName 改变，需要重新渲染
  if (prevProps.chat.strategyName !== nextProps.chat.strategyName) {
    return false;
  }
  
  // 检查回调函数是否改变（虽然通常它们应该是稳定的）
  if (prevProps.onDelete !== nextProps.onDelete || 
      prevProps.onStatusChange !== nextProps.onStatusChange ||
      prevProps.setOpenMobile !== nextProps.setOpenMobile) {
    return false;
  }
  
  // 如果所有关键属性都相同，则不需要重新渲染
  return true;
});