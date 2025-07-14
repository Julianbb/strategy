const applicationServerKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications are not supported in this browser');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    if (!registration.pushManager) {
      console.warn('Push manager unavailable');
      return null;
    }

    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      console.log('Found existing subscription, syncing with server...');
      
      // Sync existing subscription with server
      const response = await fetch('/api/push-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(existingSubscription)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to sync existing subscription:', errorData);
        throw new Error(`Failed to sync subscription: ${errorData.error}`);
      }

      console.log('Existing subscription synced successfully');
      await registerBackgroundSync(registration);
      return existingSubscription;
    }

    if (!applicationServerKey) {
      console.error('VAPID public key not found');
      return null;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(applicationServerKey)
    });

    const response = await fetch('/api/push-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscription)
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to save push subscription:', errorData);
      throw new Error(`Failed to save push subscription: ${errorData.error}`);
    }

    console.log('Push subscription saved successfully');

    await registerBackgroundSync(registration);

    return subscription;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return null;
  }
}

export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await fetch('/api/push-subscription', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription)
      });
      
      return await subscription.unsubscribe();
    }
    
    return true;
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    return false;
  }
}

export async function checkPushSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (error) {
    console.error('Error checking push subscription:', error);
    return null;
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }

  return Notification.permission;
}

async function registerBackgroundSync(registration: ServiceWorkerRegistration): Promise<void> {
  try {
    // Register background sync for one-time sync
    if ('sync' in registration) {
      await (registration as any).sync.register('price-alert-sync');
      console.log('Background sync registered');
    }

    // Register periodic background sync (if supported)
    if ('periodicSync' in registration) {
      const status = await navigator.permissions.query({ name: 'periodic-background-sync' as any });
      if (status.state === 'granted') {
        await (registration as any).periodicSync.register('price-alert-periodic', {
          minInterval: 60 * 1000, // 1 minute minimum interval
        });
        console.log('Periodic background sync registered');
      }
    }
  } catch (error) {
    console.error('Error registering background sync:', error);
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}