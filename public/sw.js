// public/sw.js

// 1. Listen for background Push events from APNs / FCM
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'New Announcement';
    const options = {
      body: data.message || data.body || '',
      icon: '/pwa-192x192.png',
      badge: '/favicon.ico',
      vibrate: [200, 100, 200],
      data: { url: data.url || '/communication' }
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (err) {
    console.error('Error rendering push notification:', err);
  }
});

// 2. Handle tapping on the notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/communication';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});