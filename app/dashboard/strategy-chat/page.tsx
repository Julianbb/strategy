'use client'

import { Main } from '@/components/settings/main'
import { columns } from '@/components/strategy-chat/strategy-chat-columns'
import { StrategyChatPrimaryButtons } from '@/components/strategy-chat/strategy-chat-primary-buttons'
import { StrategyChatTable } from '@/components/strategy-chat/strategy-chat-table'
import { StrategyTypeBadges } from '@/components/strategy-chat/strategy-type-badges'
import { strategyChatListSchema } from '@/components/strategy-chat/schema'
import { fetcher } from '@/lib/utils'
import useSWR from 'swr'
import StrategyChatProvider from '@/components/strategy-chat/dialog/strategy-chat-context'
import { StrategyChatDialogs } from '@/components/strategy-chat/dialog/strategy-chat-dialogs'

export default function StrategyChatPage() {
  const { data: strategyChatData, error, isLoading } = useSWR('/api/strategy-chat/list', fetcher)

  if (isLoading) {
    return (
      <StrategyChatProvider>
        <Main>
          <div className='mb-2 flex flex-wrap items-center justify-between space-y-2'>
            <div>
              <h2 className='text-2xl font-bold tracking-tight'>Strategy Chat</h2>
              <p className='text-muted-foreground'>
                Manage your trading strategies and monitor their performance.
              </p>
            </div>
            <StrategyChatPrimaryButtons />
          </div>
          <StrategyTypeBadges />
          <div className='-mx-4 flex-1 overflow-auto px-4 py-1 lg:flex-row lg:space-y-0 lg:space-x-12'>
            <div className='flex items-center justify-center h-32'>
              <div className='text-muted-foreground'>Loading strategies...</div>
            </div>
          </div>
        </Main>
        <StrategyChatDialogs />
      </StrategyChatProvider>
    )
  }

  if (error) {
    return (
      <StrategyChatProvider>
        <Main>
          <div className='mb-2 flex flex-wrap items-center justify-between space-y-2'>
            <div>
              <h2 className='text-2xl font-bold tracking-tight'>Strategy Chat</h2>
              <p className='text-muted-foreground'>
                Manage your trading strategies and monitor their performance.
              </p>
            </div>
            <StrategyChatPrimaryButtons />
          </div>
          <StrategyTypeBadges />
          <div className='-mx-4 flex-1 overflow-auto px-4 py-1 lg:flex-row lg:space-y-0 lg:space-x-12'>
            <div className='flex items-center justify-center h-32'>
              <div className='text-destructive'>Error loading strategies</div>
            </div>
          </div>
        </Main>
        <StrategyChatDialogs />
      </StrategyChatProvider>
    )
  }

  // Parse strategy chat list
  const strategyChatList = strategyChatListSchema.parse(strategyChatData || [])

  return (
    <StrategyChatProvider>
      <Main>
        <div className='mb-2 flex flex-wrap items-center justify-between space-y-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>Strategy Chat</h2>
            <p className='text-muted-foreground'>
              Manage your trading strategies and monitor their performance.
            </p>
          </div>
          <StrategyChatPrimaryButtons />
        </div>
        <StrategyTypeBadges />
        <div className='-mx-4 flex-1 overflow-auto px-4 py-1 lg:flex-row lg:space-y-0 lg:space-x-12'>
          <StrategyChatTable data={strategyChatList} columns={columns} />
        </div>
      </Main>
      <StrategyChatDialogs />
    </StrategyChatProvider>
  )
}