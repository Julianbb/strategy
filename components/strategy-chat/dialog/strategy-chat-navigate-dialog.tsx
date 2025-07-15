'use client'

import { useRouter } from 'next/navigation'
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

export function StrategyChatNavigateDialog() {
  const { open, setOpen, currentRow } = useStrategyChat()
  const router = useRouter()

  const isOpen = open === 'navigate'

  const handleNavigate = () => {
    if (currentRow) {
      router.push(`/dashboard/strategy-chat/${currentRow.id}`)
    }
    setOpen(null)
  }

  const handleClose = () => {
    setOpen(null)
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Open Strategy Chat</AlertDialogTitle>
          <AlertDialogDescription>
            Do you want to open the chat for strategy "{currentRow?.strategyName}"?
            This will take you to the strategy chat page where you can interact with the AI assistant.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleNavigate}>
            Open Chat
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}