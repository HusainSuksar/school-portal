// api/notify.js
// Sends an in-app + push notification to specific users.
// Requires a signed-in portal user. Staff may notify anyone; parents may only notify staff.
import webpush from 'web-push';
import {
  getAdminClient,
  requireRole,
  ALL_ROLES,
  STAFF_ROLES,
  isUuid,
  safePath,
  text,
} from './_lib/admin.js';

const MAX_TARGETS = 200;
const MAX_TITLE = 120;
const MAX_MESSAGE = 500;

// Configure Web Push Keys safely
if (process.env.VITE_PUBLIC_VAPID_KEY && process.env.PRIVATE_VAPID_KEY) {
  webpush.setVapidDetails(
    'mailto:admin@msbindore.org',
    process.env.VITE_PUBLIC_VAPID_KEY,
    process.env.PRIVATE_VAPID_KEY
  );
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 0. Only signed-in portal users may send notifications
    const caller = await requireRole(req, res, ALL_ROLES);
    if (!caller) return;

    const supabaseAdmin = getAdminClient();
    const body = req.body || {};

    // Accept `userIds: [...]` or a single `userId`; drop duplicates and anything that is not an id
    const requestedIds = Array.isArray(body.userIds) ? body.userIds : body.userId ? [body.userId] : [];
    const uniqueTargets = [...new Set(requestedIds)].filter(isUuid);

    if (uniqueTargets.length === 0) {
      return res.status(200).json({ success: true, message: 'No targets provided.' });
    }
    if (uniqueTargets.length > MAX_TARGETS) {
      return res.status(400).json({ error: `Too many recipients in one request (max ${MAX_TARGETS}).` });
    }

    const title = text(body.title).slice(0, MAX_TITLE);
    const message = text(body.message).slice(0, MAX_MESSAGE);
    if (!title || !message) {
      return res.status(400).json({ error: 'A title and a message are required.' });
    }
    const url = safePath(body.url || body.redirect_url);

    // Parents can reach school staff (leave requests, support tickets) but not other families
    if (caller.role === 'PARENT') {
      const { data: targets, error: targetError } = await supabaseAdmin
        .from('profiles')
        .select('id, role')
        .in('id', uniqueTargets);
      if (targetError) throw new Error(targetError.message);

      const staffIds = new Set((targets || []).filter((t) => STAFF_ROLES.includes(t.role)).map((t) => t.id));
      if (uniqueTargets.some((id) => !staffIds.has(id))) {
        return res.status(403).json({ error: 'You can only send notifications to school staff.' });
      }
    }

    // 1. Log to the Portal Inbox (in_app_notifications)
    const inAppPayload = uniqueTargets.map((id) => ({
      user_id: id,
      title,
      message,
      redirect_url: url,
    }));
    const { error: insertError } = await supabaseAdmin.from('in_app_notifications').insert(inAppPayload);
    if (insertError) {
      console.error('Failed to insert in_app_notifications:', insertError);
    }

    // 2. Fetch the Mobile Web Push Subscriptions for these specific users
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('subscription')
      .in('user_id', uniqueTargets);

    if (subError) {
      console.error('Failed to fetch push_subscriptions:', subError);
    }

    // 3. Fire the Lock-Screen Push Notifications
    if (subscriptions && subscriptions.length > 0 && process.env.VITE_PUBLIC_VAPID_KEY && process.env.PRIVATE_VAPID_KEY) {
      const pushPromises = subscriptions.map((sub) =>
        webpush.sendNotification(
          sub.subscription,
          JSON.stringify({ title, message, url })
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
