'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { mutate } from 'swr'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

import { useStrategyChat } from './strategy-chat-context'

export function StrategyChatDeleteDialog() {
  const { open, setOpen, currentRow } = useStrategyChat()
  const [isDeleting, setIsDeleting] = useState(false)

  const isOpen = open === 'delete'

  const handleDelete = async () => {
    if (!currentRow) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/strategy-chat?strategyChatId=${currentRow.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Strategy deleted successfully')
        // Refresh the data
        mutate('/api/strategy-chat/list')
        setOpen(null)
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast.error(errorData.message || 'Failed to delete strategy')
      }
    } catch (error) {
      console.error('Failed to delete strategy:', error)
      toast.error('Failed to delete strategy')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleClose = () => {
    setOpen(null)
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the strategy
            &quot;{currentRow?.strategyName}&quot; and all associated data including trades,
            messages, and performance history.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Delete Strategy'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}