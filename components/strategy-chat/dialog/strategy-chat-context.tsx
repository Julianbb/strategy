'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { StrategyChat } from '../schema'

interface StrategyType {
  id: string
  name: string
  description?: string
  createdAt: string
}

type DialogType = 'create' | 'edit' | 'delete' | 'navigate' | 'strategy-type-create' | 'strategy-type-edit' | 'strategy-type-delete' | null

interface StrategyChatContextType {
  open: DialogType
  setOpen: (open: DialogType) => void
  currentRow: StrategyChat | null
  setCurrentRow: (row: StrategyChat | null) => void
  strategyTypes: StrategyType[]
  strategyTypesLoading: boolean
  currentStrategyType?: StrategyType
  setCurrentStrategyType: (row?: StrategyType) => void
  fetchStrategyTypes: () => Promise<void>
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
  const [strategyTypes, setStrategyTypes] = useState<StrategyType[]>([])
  const [strategyTypesLoading, setStrategyTypesLoading] = useState(true)
  const [currentStrategyType, setCurrentStrategyType] = useState<StrategyType | undefined>()

  const fetchStrategyTypes = async () => {
    try {
      const response = await fetch('/api/strategy-types')
      if (response.ok) {
        const data = await response.json()
        setStrategyTypes(data)
      }
    } catch (error) {
      console.error('Error fetching strategy types:', error)
    } finally {
      setStrategyTypesLoading(false)
    }
  }

  useEffect(() => {
    fetchStrategyTypes()
  }, [])

  return (
    <StrategyChatContext.Provider
      value={{
        open,
        setOpen,
        currentRow,
        setCurrentRow,
        strategyTypes,
        strategyTypesLoading,
        currentStrategyType,
        setCurrentStrategyType,
        fetchStrategyTypes,
      }}
    >
      {children}
    </StrategyChatContext.Provider>
  )
}