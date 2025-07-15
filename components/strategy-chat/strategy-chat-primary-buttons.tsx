'use client'

import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStrategyChat } from './dialog/strategy-chat-context'

export function StrategyChatPrimaryButtons() {
  const { setOpen } = useStrategyChat()

  const handleCreateStrategy = () => {
    setOpen('create')
  }

  return (
    <div className='flex gap-2'>
      <Button className='space-x-1' onClick={handleCreateStrategy}>
        <span>Create Strategy</span>
        <Plus size={18} />
      </Button>
    </div>
  )
}