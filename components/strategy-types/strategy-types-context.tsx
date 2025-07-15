'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface StrategyType {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

type DialogType = 'create' | 'delete' | 'create-strategy' | null;

interface StrategyTypesContextType {
  strategyTypes: StrategyType[];
  loading: boolean;
  open: DialogType;
  setOpen: (type: DialogType) => void;
  currentRow?: StrategyType;
  setCurrentRow: (row?: StrategyType) => void;
  fetchStrategyTypes: () => Promise<void>;
}

const StrategyTypesContext = createContext<StrategyTypesContextType | undefined>(undefined);

export function StrategyTypesProvider({ children }: { children: ReactNode }) {
  const [strategyTypes, setStrategyTypes] = useState<StrategyType[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<DialogType>(null);
  const [currentRow, setCurrentRow] = useState<StrategyType | undefined>();

  const fetchStrategyTypes = async () => {
    try {
      const response = await fetch('/api/strategy-types');
      if (response.ok) {
        const data = await response.json();
        setStrategyTypes(data);
      }
    } catch (error) {
      console.error('Error fetching strategy types:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStrategyTypes();
  }, []);

  const value = {
    strategyTypes,
    loading,
    open,
    setOpen,
    currentRow,
    setCurrentRow,
    fetchStrategyTypes,
  };

  return (
    <StrategyTypesContext.Provider value={value}>
      {children}
    </StrategyTypesContext.Provider>
  );
}

export function useStrategyTypes() {
  const context = useContext(StrategyTypesContext);
  if (context === undefined) {
    throw new Error('useStrategyTypes must be used within a StrategyTypesProvider');
  }
  return context;
}