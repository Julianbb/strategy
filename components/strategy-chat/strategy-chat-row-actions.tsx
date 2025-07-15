'use client'

import { DotsHorizontalIcon } from '@radix-ui/react-icons'
import { Row } from '@tanstack/react-table'
import { Play, Pause, Square, CheckCircle, Trash2, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StrategyChat } from './schema'
import { useState } from 'react'
import { toast } from 'sonner'
import { mutate } from 'swr'
import { useStrategyChat } from './dialog/strategy-chat-context'

interface StrategyChatRowActionsProps {
  row: Row<StrategyChat>
}

export function StrategyChatRowActions({ row }: StrategyChatRowActionsProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const strategy = row.original
  const { setOpen, setCurrentRow } = useStrategyChat()

  const handleStatusChange = async (newStatus: 'active' | 'paused' | 'stopped' | 'completed') => {
    setIsUpdating(true)
    try {
      const response = await fetch('/api/strategy-chat', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: strategy.id,
          status: newStatus,
        }),
      })

      if (response.ok) {
        toast.success('Strategy status updated successfully')
        // Refresh the data
        mutate('/api/strategy-chat/list')
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast.error(errorData.message || 'Failed to update strategy status')
      }
    } catch (error) {
      console.error('Failed to update strategy status:', error)
      toast.error('Failed to update strategy status')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleEdit = () => {
    setCurrentRow(strategy)
    setOpen('edit')
  }

  const handleDelete = () => {
    setCurrentRow(strategy)
    setOpen('delete')
  }

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant='ghost'
            className='data-[state=open]:bg-muted flex size-8 p-0'
            disabled={isUpdating}
          >
            <DotsHorizontalIcon className='size-4' />
            <span className='sr-only'>Open menu</span>
          </Button>
        </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-[160px]'>
        <DropdownMenuItem
          onClick={handleEdit}
          disabled={isUpdating}
        >
          Edit
          <DropdownMenuShortcut>
            <Edit className='size-4' />
          </DropdownMenuShortcut>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        {strategy.status === 'active' && (
          <>
            <DropdownMenuItem
              onClick={() => handleStatusChange('paused')}
              disabled={isUpdating}
            >
              Pause
              <DropdownMenuShortcut>
                <Pause className='size-4' />
              </DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleStatusChange('stopped')}
              disabled={isUpdating}
            >
              Stop
              <DropdownMenuShortcut>
                <Square className='size-4' />
              </DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleStatusChange('completed')}
              disabled={isUpdating}
            >
              Complete
              <DropdownMenuShortcut>
                <CheckCircle className='size-4' />
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          </>
        )}
        
        {strategy.status === 'paused' && (
          <>
            <DropdownMenuItem
              onClick={() => handleStatusChange('active')}
              disabled={isUpdating}
            >
              Resume
              <DropdownMenuShortcut>
                <Play className='size-4' />
              </DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleStatusChange('stopped')}
              disabled={isUpdating}
            >
              Stop
              <DropdownMenuShortcut>
                <Square className='size-4' />
              </DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleStatusChange('completed')}
              disabled={isUpdating}
            >
              Complete
              <DropdownMenuShortcut>
                <CheckCircle className='size-4' />
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          </>
        )}
        
        {strategy.status === 'stopped' && (
          <DropdownMenuItem
            onClick={() => handleStatusChange('active')}
            disabled={isUpdating}
          >
            Restart
            <DropdownMenuShortcut>
              <Play className='size-4' />
            </DropdownMenuShortcut>
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleDelete}
          disabled={isUpdating}
          className='text-red-500!'
        >
          Delete
          <DropdownMenuShortcut>
            <Trash2 className='size-4' />
          </DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    </div>
  )
}