// api/notify.js
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// Configure Web Push Keys
webpush.setVapidDetails(
  'mailto:admin@msbindore.org',
  process.env.VITE_PUBLIC_VAPID_KEY,
  process.env.PRIVATE_VAPID_KEY
);

// Initialize Admin Database Client (Bypasses RLS)
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { userIds, title, message, url } = req.body;

    // Remove any duplicate IDs or nulls
    const uniqueTargets = [...new Set(userIds)].filter(Boolean);

    if (uniqueTargets.length === 0) {
      return res.status(200).json({ success: true, message: 'No targets provided.' });
    }

    // 1. Log to the Portal Inbox (in_app_notifications)
    const inAppPayload = uniqueTargets.map((id) => ({
      user_id: id,
      title,
      message,
      redirect_url: url || '/',
    }));
    await supabaseAdmin.from('in_app_notifications').insert(inAppPayload);

    // 2. Fetch the Mobile Web Push Subscriptions for these specific users
    const { data: subscriptions } = await supabaseAdmin
      .from('push_subscriptions')
      .select('subscription')
      .in('user_id', uniqueTargets);

    // 3. Fire the Lock-Screen Push Notifications
    if (subscriptions && subscriptions.length > 0) {
      const pushPromises = subscriptions.map((sub) =>
        webpush.sendNotification(
          sub.subscription,
          JSON.stringify({ title, message, url: url || '/' })
        ).catch((err) => console.error('Push delivery failed for device:', err.statusCode))
      );
      await Promise.all(pushPromises);
    }

    return res.status(200).json({ success: true, deliveries: uniqueTargets.length });
  } catch (error) {
    console.error('Notification API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}