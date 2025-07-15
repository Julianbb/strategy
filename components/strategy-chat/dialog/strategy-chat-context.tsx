'use client'

import { createContext, useContext, useState } from 'react'
import { StrategyChat } from '../schema'

type DialogType = 'create' | 'edit' | 'delete' | 'navigate' | null

interface StrategyChatContextType {
  open: DialogType
  setOpen: (open: DialogType) => void
  currentRow: StrategyChat | null
  setCurrentRow: (row: StrategyChat | null) => void
}

const StrategyChatContext = createContext<StrategyChatContextType | undefined>(undefined)

export function useStrategyChat() {
  const context = useContext(StrategyChatContext)
  if (!context) {
    throw new Error('useStrategyChat must be used within a StrategyChatProvider')
  }
  return context
}

interface StrategyChatProviderProps {
  children: React.ReactNode
}

export default function StrategyChatProvider({ children }: StrategyChatProviderProps) {
  const [open, setOpen] = useState<DialogType>(null)
  const [currentRow, setCurrentRow] = useState<StrategyChat | null>(null)

  return (
    <StrategyChatContext.Provider
      value={{
        open,
        setOpen,
        currentRow,
        setCurrentRow,
      }}
    >
      {children}
    </StrategyChatContext.Provider>
  )
}