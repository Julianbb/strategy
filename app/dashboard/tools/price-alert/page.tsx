
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { fetchSpotPrice } from '@/lib/3party/okxapi'
import { Bell, Plus, X, TrendingUp, TrendingDown, Edit } from 'lucide-react'
import { subscribeToPushNotifications, requestNotificationPermission } from '@/lib/push-notifications'

interface PriceAlert {
  id: string
  userId: string
  coin: string
  targetPrice: string
  currentPrice: string
  condition: 'above' | 'below'
  createdAt: Date
  isActive: boolean
  triggeredAt?: Date
}

const SUPPORTED_COINS = ['BTC', 'ETH', 'BNB', 'XRP', 'ADA', 'DOT', 'LINK', 'LTC', 'BCH', 'XLM']

export default function PriceAlert() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingAlert, setEditingAlert] = useState<PriceAlert | null>(null)
  const [formData, setFormData] = useState({
    coin: '',
    targetPrice: '',
    condition: 'above' as 'above' | 'below'
  })
  const [editFormData, setEditFormData] = useState({
    coin: '',
    targetPrice: '',
    condition: 'above' as 'above' | 'below'
  })

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await fetch('/api/price-alerts')
        if (response.ok) {
          const data = await response.json()
          setAlerts(data.map((alert: any) => ({
            ...alert,
            createdAt: new Date(alert.createdAt),
            triggeredAt: alert.triggeredAt ? new Date(alert.triggeredAt) : undefined
          })))
        }
      } catch (error) {
        console.error('Failed to fetch price alerts:', error)
      }
    }
    
    fetchAlerts()
  }, [])

  useEffect(() => {
    if (alerts.length === 0) return

    const interval = setInterval(async () => {
      const updatedAlerts = await Promise.all(
        alerts.map(async (alert) => {
          if (!alert.isActive) return alert

          const currentPrice = await fetchSpotPrice(alert.coin)
          if (currentPrice === null) return alert

          const targetPrice = parseFloat(alert.targetPrice)
          const shouldTrigger = 
            (alert.condition === 'above' && currentPrice >= targetPrice) ||
            (alert.condition === 'below' && currentPrice <= targetPrice)

          if (shouldTrigger) {
            // Send push notification via server
            try {
              await fetch('/api/send-push-notification', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  coin: alert.coin,
                  currentPrice,
                  targetPrice,
                  condition: alert.condition
                })
              })
            } catch (error) {
              console.error('Failed to send push notification:', error)
            }
            
            toast.success(`Price Alert Triggered!`, {
              description: `${alert.coin} is now ${alert.condition} $${targetPrice}`
            })

            // Update alert in database
            try {
              await fetch('/api/price-alerts', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: alert.id,
                  currentPrice: currentPrice,
                  isActive: false,
                  triggeredAt: new Date().toISOString()
                })
              })
            } catch (error) {
              console.error('Failed to update price alert:', error)
            }

            return { ...alert, isActive: false, currentPrice: currentPrice.toString(), triggeredAt: new Date() }
          }

          // Update current price in database
          try {
            await fetch('/api/price-alerts', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: alert.id,
                currentPrice: currentPrice
              })
            })
          } catch (error) {
            console.error('Failed to update current price:', error)
          }

          return { ...alert, currentPrice: currentPrice.toString() }
        })
      )

      setAlerts(updatedAlerts)
    }, 30000) // Check every 30 seconds

    return () => clearInterval(interval)
  }, [alerts])

  useEffect(() => {
    const initializePushNotifications = async () => {
      const permission = await requestNotificationPermission()
      if (permission === 'granted') {
        await subscribeToPushNotifications()
      }
    }
    
    initializePushNotifications()
  }, [])

  const handleCreateAlert = async () => {
    if (!formData.coin || !formData.targetPrice) {
      toast.error('Please fill in all fields')
      return
    }

    const targetPrice = parseFloat(formData.targetPrice)
    if (isNaN(targetPrice) || targetPrice <= 0) {
      toast.error('Please enter a valid target price')
      return
    }

    const currentPrice = await fetchSpotPrice(formData.coin)
    if (currentPrice === null) {
      toast.error('Failed to fetch current price. Please try again.')
      return
    }

    try {
      const response = await fetch('/api/price-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coin: formData.coin,
          targetPrice,
          currentPrice,
          condition: formData.condition
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create price alert')
      }

      const newAlert = await response.json()
      setAlerts(prev => [...prev, {
        ...newAlert,
        createdAt: new Date(newAlert.createdAt),
        triggeredAt: newAlert.triggeredAt ? new Date(newAlert.triggeredAt) : undefined
      }])
      
      setFormData({ coin: '', targetPrice: '', condition: 'above' })
      setIsDialogOpen(false)
      
      toast.success('Price alert created successfully!')
    } catch (error) {
      console.error('Error creating price alert:', error)
      toast.error('Failed to create price alert. Please try again.')
    }
  }

  const handleDeleteAlert = async (id: string) => {
    try {
      const response = await fetch(`/api/price-alerts?id=${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete price alert')
      }

      setAlerts(prev => prev.filter(alert => alert.id !== id))
      toast.success('Price alert deleted')
    } catch (error) {
      console.error('Error deleting price alert:', error)
      toast.error('Failed to delete price alert. Please try again.')
    }
  }

  const toggleAlert = async (id: string) => {
    const alert = alerts.find(a => a.id === id)
    if (!alert) return

    try {
      const response = await fetch('/api/price-alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          isActive: !alert.isActive
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update price alert')
      }

      setAlerts(prev => 
        prev.map(alert => 
          alert.id === id ? { ...alert, isActive: !alert.isActive } : alert
        )
      )
    } catch (error) {
      console.error('Error toggling price alert:', error)
      toast.error('Failed to update price alert. Please try again.')
    }
  }

  const handleEditAlert = async () => {
    if (!editingAlert || !editFormData.coin || !editFormData.targetPrice) {
      toast.error('Please fill in all fields')
      return
    }

    const targetPrice = parseFloat(editFormData.targetPrice)
    if (isNaN(targetPrice) || targetPrice <= 0) {
      toast.error('Please enter a valid target price')
      return
    }

    const currentPrice = await fetchSpotPrice(editFormData.coin)
    if (currentPrice === null) {
      toast.error('Failed to fetch current price. Please try again.')
      return
    }

    try {
      const response = await fetch('/api/price-alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingAlert.id,
          coin: editFormData.coin,
          targetPrice,
          currentPrice,
          condition: editFormData.condition
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update price alert')
      }

      setAlerts(prev => 
        prev.map(alert => 
          alert.id === editingAlert.id ? { 
            ...alert, 
            coin: editFormData.coin,
            targetPrice: targetPrice.toString(),
            currentPrice: currentPrice.toString(),
            condition: editFormData.condition
          } : alert
        )
      )
      
      setIsEditDialogOpen(false)
      setEditingAlert(null)
      setEditFormData({ coin: '', targetPrice: '', condition: 'above' })
      
      toast.success('Price alert updated successfully!')
    } catch (error) {
      console.error('Error updating price alert:', error)
      toast.error('Failed to update price alert. Please try again.')
    }
  }

  const openEditDialog = (alert: PriceAlert) => {
    setEditingAlert(alert)
    setEditFormData({
      coin: alert.coin,
      targetPrice: parseFloat(alert.targetPrice).toString(),
      condition: alert.condition
    })
    setIsEditDialogOpen(true)
  }

  const activeAlerts = alerts.filter(alert => alert.isActive)

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl md:text-2xl font-bold">Price Alerts</h1>
          <p className="text-sm md:text-base text-muted-foreground">Monitor cryptocurrency prices and get notified when they hit your target</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2 w-full sm:w-auto">
              <Plus className="size-4" />
              <span className="hidden sm:inline">Create Alert</span>
              <span className="sm:hidden">New Alert</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-md mx-auto">
            <DialogHeader>
              <DialogTitle className="text-lg md:text-xl">Create New Price Alert</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="coin">Cryptocurrency</Label>
                  <Select value={formData.coin} onValueChange={(value) => setFormData(prev => ({ ...prev, coin: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select coin" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_COINS.map(coin => (
                        <SelectItem key={coin} value={coin}>{coin}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="targetPrice">Target Price ($)</Label>
                  <Input
                    id="targetPrice"
                    type="number"
                    placeholder="0.00"
                    value={formData.targetPrice}
                    onChange={(e) => setFormData(prev => ({ ...prev, targetPrice: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="condition">Condition</Label>
                  <Select value={formData.condition} onValueChange={(value: 'above' | 'below') => setFormData(prev => ({ ...prev, condition: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="above">Above target</SelectItem>
                      <SelectItem value="below">Below target</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 pt-4 sm:justify-end">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="order-1 sm:order-1">Cancel</Button>
                <Button onClick={handleCreateAlert} className="order-2 sm:order-2">Create Alert</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="w-[95vw] max-w-md mx-auto">
            <DialogHeader>
              <DialogTitle className="text-lg md:text-xl">Edit Price Alert</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="edit-coin">Cryptocurrency</Label>
                  <Select value={editFormData.coin} onValueChange={(value) => setEditFormData(prev => ({ ...prev, coin: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select coin" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_COINS.map(coin => (
                        <SelectItem key={coin} value={coin}>{coin}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="edit-targetPrice">Target Price ($)</Label>
                  <Input
                    id="edit-targetPrice"
                    type="number"
                    placeholder="0.00"
                    value={editFormData.targetPrice}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, targetPrice: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="edit-condition">Condition</Label>
                  <Select value={editFormData.condition} onValueChange={(value: 'above' | 'below') => setEditFormData(prev => ({ ...prev, condition: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="above">Above target</SelectItem>
                      <SelectItem value="below">Below target</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 pt-4 sm:justify-end">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="order-1 sm:order-1">Cancel</Button>
                <Button onClick={handleEditAlert} className="order-2 sm:order-2">Update Alert</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>


      <div className="grid gap-4">
        <div className="flex items-center gap-2">
          <Bell className="size-4 md:size-5" />
          <h2 className="text-lg md:text-xl font-semibold">Active Alerts ({activeAlerts.length})</h2>
        </div>
        
        {alerts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 md:py-12 px-4">
              <Bell className="w-10 h-10 md:size-12 text-muted-foreground mb-4" />
              <h3 className="text-base md:text-lg font-semibold mb-2 text-center">No price alerts yet</h3>
              <p className="text-sm md:text-base text-muted-foreground text-center mb-4 max-w-md">
                Create your first price alert to get notified when cryptocurrencies reach your target price
              </p>
              <Button onClick={() => setIsDialogOpen(true)} className="w-full sm:w-auto">
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
                        onClick={() => openEditDialog(alert)}
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
  )
}