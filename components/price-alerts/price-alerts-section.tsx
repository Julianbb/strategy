'use client';

import { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Bell, Plus, X, TrendingUp, TrendingDown, Edit } from 'lucide-react';
import { subscribeToPushNotifications, requestNotificationPermission } from '@/lib/services/push-notifications';
import { usePriceAlerts } from './price-alerts-context';

export function PriceAlertsSection() {
  const { 
    alerts, 
    loading, 
    setOpen, 
    setCurrentRow, 
    fetchAlerts,
    notificationPermission,
    setNotificationPermission
  } = usePriceAlerts();

  useEffect(() => {
    const initializePushNotifications = async () => {
      const permission = await requestNotificationPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        await subscribeToPushNotifications();
      }
    };
    
    initializePushNotifications();
  }, [setNotificationPermission]);

  const handleEnableNotifications = async () => {
    try {
      const permission = await requestNotificationPermission();
      setNotificationPermission(permission);

      if (permission === 'granted') {
        const subscription = await subscribeToPushNotifications();
        if (subscription) {
          toast.success('Push notifications enabled!');
        } else {
          toast.error('Failed to enable push notifications');
        }
      } else {
        if (permission === 'denied') {
          toast.error('Notifications blocked. Please enable in Settings → Safari → Notifications');
        } else {
          toast.error('Push notifications are required for price alerts');
        }
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      toast.error('Failed to enable push notifications');
    }
  };

  const handleCreateAlert = () => {
    setCurrentRow(undefined);
    setOpen('action');
  };

  const handleEditAlert = (alert: any) => {
    setCurrentRow(alert);
    setOpen('action');
  };

  const handleDeleteAlert = async (id: string) => {
    try {
      const response = await fetch(`/api/price-alerts?id=${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete price alert');
      }

      await fetchAlerts();
      toast.success('Price alert deleted');
    } catch (error) {
      console.error('Error deleting price alert:', error);
      toast.error('Failed to delete price alert. Please try again.');
    }
  };

  const toggleAlert = async (id: string) => {
    const alert = alerts.find(a => a.id === id);
    if (!alert) return;

    try {
      const response = await fetch('/api/price-alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          isActive: !alert.isActive
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update price alert');
      }

      await fetchAlerts();
    } catch (error) {
      console.error('Error toggling price alert:', error);
      toast.error('Failed to update price alert. Please try again.');
    }
  };

  const activeAlerts = alerts.filter(alert => alert.isActive);

  if (loading) {
    return (
      <div className="space-y-4 md:space-y-6 p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
          </div>
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-bold">Price Alerts</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Monitor cryptocurrency prices and get notified when they hit your target
          </p>
        </div>
        <Button onClick={handleCreateAlert} className="flex items-center gap-2 w-full sm:w-auto">
          <Plus className="size-4" />
          <span className="hidden sm:inline">Create Alert</span>
          <span className="sm:hidden">New Alert</span>
        </Button>
      </div>

      <div className="grid gap-4">
        <div className="flex items-center gap-2">
          <Bell className="size-4 md:size-5" />
          <h2 className="text-lg md:text-xl font-semibold">Active Alerts ({activeAlerts.length})</h2>
        </div>
        
        {notificationPermission !== 'granted' && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Bell className="size-4 text-amber-600" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-amber-800">
                      Enable push notifications to receive price alerts
                    </span>
                    {notificationPermission === 'denied' && (
                      <span className="text-xs text-amber-700 mt-1">
                        Go to Settings → Safari → Notifications to enable
                      </span>
                    )}
                  </div>
                </div>
                <Button 
                  onClick={handleEnableNotifications}
                  size="sm"
                  className="w-full sm:w-auto"
                  disabled={notificationPermission === 'denied'}
                >
                  {notificationPermission === 'denied' ? 'Blocked' : 'Enable Notifications'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {alerts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 md:py-12 px-4">
              <Bell className="size-10 md:size-12 text-muted-foreground mb-4" />
              <h3 className="text-base md:text-lg font-semibold mb-2 text-center">No price alerts yet</h3>
              <p className="text-sm md:text-base text-muted-foreground text-center mb-4 max-w-md">
                Create your first price alert to get notified when cryptocurrencies reach your target price
              </p>
              <Button onClick={handleCreateAlert} className="w-full sm:w-auto">
                Create Your First Alert
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {alerts.map(alert => (
              <Card key={alert.id} className={`${!alert.isActive ? 'opacity-60' : ''}`}>
                <CardContent className="p-3 md:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-base md:text-lg">{alert.coin}</span>
                        <Badge variant={alert.isActive ? 'default' : 'secondary'} className="text-xs">
                          {alert.isActive ? 'Active' : 'Triggered'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-3 sm:gap-4">
                        <div className="flex items-center gap-2">
                          {alert.condition === 'above' ? (
                            <TrendingUp className="size-3 md:size-4 text-green-500" />
                          ) : (
                            <TrendingDown className="size-3 md:size-4 text-red-500" />
                          )}
                          <span className="text-xs md:text-sm text-muted-foreground">
                            {alert.condition} ${parseFloat(alert.targetPrice).toFixed(2)}
                          </span>
                        </div>
                        
                        <div className="text-xs md:text-sm">
                          <span className="text-muted-foreground">Current: </span>
                          <span className="font-medium">${parseFloat(alert.currentPrice).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleAlert(alert.id)}
                        className="text-xs px-2 py-1 h-auto"
                      >
                        {alert.isActive ? 'Pause' : 'Resume'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditAlert(alert)}
                        className="p-1 h-auto"
                      >
                        <Edit className="size-3 md:size-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteAlert(alert.id)}
                        className="p-1 h-auto"
                      >
                        <X className="size-3 md:size-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}