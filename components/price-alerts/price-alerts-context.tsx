'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface PriceAlert {
  id: string;
  userId: string;
  coin: string;
  targetPrice: string;
  currentPrice: string;
  condition: 'above' | 'below';
  createdAt: Date;
  isActive: boolean;
  triggeredAt?: Date;
}

type DialogType = 'action' | 'delete' | null;

interface PriceAlertsContextType {
  alerts: PriceAlert[];
  loading: boolean;
  open: DialogType;
  setOpen: (type: DialogType) => void;
  currentRow?: PriceAlert;
  setCurrentRow: (row?: PriceAlert) => void;
  fetchAlerts: () => Promise<void>;
  notificationPermission: NotificationPermission;
  setNotificationPermission: (permission: NotificationPermission) => void;
}

const PriceAlertsContext = createContext<PriceAlertsContextType | undefined>(undefined);

export function PriceAlertsProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<DialogType>(null);
  const [currentRow, setCurrentRow] = useState<PriceAlert | undefined>();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/price-alerts');
      if (response.ok) {
        const data = await response.json();
        setAlerts(data.map((alert: any) => ({
          ...alert,
          createdAt: new Date(alert.createdAt),
          triggeredAt: alert.triggeredAt ? new Date(alert.triggeredAt) : undefined
        })));
      }
    } catch (error) {
      console.error('Failed to fetch price alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);



  const value = {
    alerts,
    loading,
    open,
    setOpen,
    currentRow,
    setCurrentRow,
    fetchAlerts,
    notificationPermission,
    setNotificationPermission,
  };

  return (
    <PriceAlertsContext.Provider value={value}>
      {children}
    </PriceAlertsContext.Provider>
  );
}

export function usePriceAlerts() {
  const context = useContext(PriceAlertsContext);
  if (context === undefined) {
    throw new Error('usePriceAlerts must be used within a PriceAlertsProvider');
  }
  return context;
}