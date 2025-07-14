const applicationServerKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  // Log to backend via API
  await logToBackend('subscribeToPushNotifications called');
  await logToBackend(`Environment: ${process.env.NODE_ENV}`);
  await logToBackend(`Service worker support: ${'serviceWorker' in navigator}`);
  await logToBackend(`Push manager support: ${'PushManager' in window}`);
  
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    await logToBackend('Push notifications not supported in this browser');
    console.warn('Push notifications are not supported in this browser');
    return null;
  }

  try {
    await logToBackend('Getting service worker registration...');
    await logToBackend('Checking if service worker is supported...');
    
    if (!navigator.serviceWorker) {
      await logToBackend('❌ Service worker not supported');
      return null;
    }
    
    await logToBackend('✅ Service worker supported, getting registration...');
    
    // Check current registration state
    const currentRegistration = await navigator.serviceWorker.getRegistration();
    await logToBackend(`Current registration: ${currentRegistration ? 'exists' : 'none'}`);
    
    if (currentRegistration) {
      await logToBackend(`Registration state: ${currentRegistration.installing ? 'installing' : ''}${currentRegistration.waiting ? 'waiting' : ''}${currentRegistration.active ? 'active' : ''}`);
    }
    
    // If no registration exists, try to register service worker manually
    if (!currentRegistration) {
      await logToBackend('No service worker registered, attempting manual registration...');
      try {
        const newRegistration = await navigator.serviceWorker.register('/sw.js');
        await logToBackend('✅ Service worker registered manually');
        await logToBackend(`New registration state: ${newRegistration.installing ? 'installing' : ''}${newRegistration.waiting ? 'waiting' : ''}${newRegistration.active ? 'active' : ''}`);
      } catch (registerError) {
        await logToBackend(`❌ Failed to register service worker: ${registerError}`);
        throw new Error(`Failed to register service worker: ${registerError}`);
      }
    }
    
    // Add timeout to prevent hanging
    const registrationPromise = navigator.serviceWorker.ready;
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Service worker registration timeout')), 15000);
    });
    
    await logToBackend('Waiting for service worker ready...');
    const registration = await Promise.race([registrationPromise, timeoutPromise]);
    await logToBackend('✅ Service worker registration obtained');
    
    if (!registration.pushManager) {
      await logToBackend('❌ Push manager unavailable');
      console.warn('Push manager unavailable');
      return null;
    }

    await logToBackend('✅ Push manager available');
    await logToBackend('Checking for existing subscription...');
    const existingSubscription = await registration.pushManager.getSubscription();
    await logToBackend(`Existing subscription check result: ${existingSubscription ? 'Found' : 'Not found'}`);
    
    if (existingSubscription) {
      await logToBackend('Found existing subscription, syncing with server...');
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
        await logToBackend(`Failed to sync existing subscription: ${errorData.error}`);
        console.error('Failed to sync existing subscription:', errorData);
        throw new Error(`Failed to sync subscription: ${errorData.error}`);
      }

      await logToBackend('Existing subscription synced successfully');
      console.log('Existing subscription synced successfully');
      await registerBackgroundSync(registration);
      return existingSubscription;
    }

    await logToBackend('No existing subscription found, creating new one...');
    
    if (!applicationServerKey) {
      await logToBackend('❌ VAPID public key not found');
      console.error('VAPID public key not found');
      return null;
    }

    await logToBackend(`✅ VAPID public key available: ${applicationServerKey.substring(0, 20)}...`);
    await logToBackend('Creating new push subscription...');
    
    let subscription;
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(applicationServerKey)
      });
      await logToBackend('✅ New subscription created successfully');
      await logToBackend('New subscription created, saving to server...');
    } catch (subscribeError) {
      await logToBackend(`❌ Failed to create subscription: ${subscribeError}`);
      throw subscribeError;
    }
    
    const response = await fetch('/api/push-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscription)
    });

    if (!response.ok) {
      const errorData = await response.json();
      await logToBackend(`Failed to save push subscription: ${errorData.error}`);
      console.error('Failed to save push subscription:', errorData);
      throw new Error(`Failed to save push subscription: ${errorData.error}`);
    }

    await logToBackend('Push subscription saved successfully');
    console.log('Push subscription saved successfully');

    await registerBackgroundSync(registration);

    return subscription;
  } catch (error) {
    await logToBackend(`Error in subscribeToPushNotifications: ${error}`);
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
  await logToBackend('requestNotificationPermission called');
  
  if (!('Notification' in window)) {
    await logToBackend('Notifications not supported in this browser');
    console.warn('Notifications not supported');
    return 'denied';
  }

  await logToBackend(`Current notification permission: ${Notification.permission}`);

  if (Notification.permission === 'granted') {
    await logToBackend('Notification permission already granted');
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    await logToBackend('Requesting notification permission...');
    const permission = await Notification.requestPermission();
    await logToBackend(`Notification permission result: ${permission}`);
    return permission;
  }

  await logToBackend('Notification permission denied');
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

async function logToBackend(message: string): Promise<void> {
  try {
    await fetch('/api/client-log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        message: `[PUSH-NOTIFICATIONS] ${message}`,
        timestamp: new Date().toISOString()
      })
    });
  } catch (error) {
    // Silently fail if logging fails
    console.error('Failed to log to backend:', error);
  }
}