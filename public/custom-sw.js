self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body,
      icon: data.icon || '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.primaryKey || 'default'
      },
      actions: [
        {
          action: 'explore', 
          title: 'View Alert',
          icon: '/icons/icon-192x192.png'
        },
        {
          action: 'close', 
          title: 'Dismiss',
          icon: '/icons/icon-192x192.png'
        }
      ],
      tag: data.tag || 'price-alert',
      requireInteraction: true
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/dashboard/tools/price-alert')
    );
  } else if (event.action === 'close') {
    event.notification.close();
  } else {
    event.waitUntil(
      clients.openWindow('/dashboard/tools/price-alert')
    );
  }
});

self.addEventListener('notificationclose', function(event) {
  console.log('Notification closed:', event.notification.tag);
});

self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync for price monitoring
self.addEventListener('sync', function(event) {
  if (event.tag === 'price-alert-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    // Check if there are active price alerts
    const response = await fetch('/api/price-alerts/check-active');
    if (!response.ok) {
      console.error('Failed to check active alerts');
      return;
    }
    
    const alerts = await response.json();
    
    // Process each alert
    for (const alert of alerts) {
      try {
        // Check current price
        const priceResponse = await fetch(`/api/price-alerts/check-price?coin=${alert.coin}&alertId=${alert.id}`);
        if (priceResponse.ok) {
          const result = await priceResponse.json();
          
          // If alert was triggered, the server will handle the push notification
          if (result.triggered) {
            console.log(`Price alert triggered for ${alert.coin}`);
          }
        }
      } catch (error) {
        console.error('Error checking price for alert:', alert.id, error);
      }
    }
  } catch (error) {
    console.error('Background sync error:', error);
  }
}

// Register for periodic background sync (if supported)
if ('serviceWorker' in navigator && 'periodicSync' in window.ServiceWorkerRegistration.prototype) {
  self.addEventListener('periodicsync', function(event) {
    if (event.tag === 'price-alert-periodic') {
      event.waitUntil(doBackgroundSync());
    }
  });
}