// api/broadcast.js
// Sends an announcement notification to everyone, all parents, or all staff. ADMIN / HOS only.
import webpush from 'web-push';
import { getAdminClient, requireRole, text } from './_lib/admin.js';

const AUDIENCES = ['ALL', 'PARENTS', 'STAFF'];
const MAX_TITLE = 120;
const MAX_MESSAGE = 2000;

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
    // 0. Only administrators and heads of school may broadcast
    const caller = await requireRole(req, res, ['ADMIN', 'HOS']);
    if (!caller) return;

    const supabaseAdmin = getAdminClient();
    const body = req.body || {};
    const title = text(body.title).slice(0, MAX_TITLE);
    const message = text(body.message).slice(0, MAX_MESSAGE);
    const targetAudience = text(body.targetAudience) || 'ALL';

    if (!title || !message) {
      return res.status(400).json({ error: 'A title and a message are required.' });
    }
    if (!AUDIENCES.includes(targetAudience)) {
      return res.status(400).json({ error: 'Unknown target audience.' });
    }

    // 1. Fetch matching user profiles and write to in_app_notifications
    let profileQuery = supabaseAdmin.from('profiles').select('id');
    if (targetAudience === 'PARENTS') {
      profileQuery = profileQuery.eq('role', 'PARENT');
    } else if (targetAudience === 'STAFF') {
      profileQuery = profileQuery.in('role', ['TEACHER', 'CLASS_TR', 'ADMIN', 'HOS']);
    }

    const { data: targetProfiles, error: profileErr } = await profileQuery;
    if (profileErr) {
      console.error('Error fetching target profiles for in_app_notifications:', profileErr);
    } else if (targetProfiles && targetProfiles.length > 0) {
      const inAppPayload = targetProfiles.map((p) => ({
        user_id: p.id,
        title,
        message,
        redirect_url: '/communication',
      }));
      const { error: inAppError } = await supabaseAdmin.from('in_app_notifications').insert(inAppPayload);
      if (inAppError) {
        console.error('Error inserting in_app_notifications for broadcast:', inAppError);
      }
    }

    // 2. Fetch push subscriptions matching target audience role mapping
    let query = supabaseAdmin.from('push_subscriptions').select('subscription');
    
    if (targetAudience === 'PARENTS') {
      query = query.eq('role', 'PARENT');
    } else if (targetAudience === 'STAFF') {
      query = query.in('role', ['TEACHER', 'CLASS_TR', 'ADMIN', 'HOS']);
    }

    const { data: subscriptions, error } = await query;
    if (error) throw error;

    // We will store the exact responses from Apple/Google here
    const results = [];

    if (subscriptions && subscriptions.length > 0 && process.env.VITE_PUBLIC_VAPID_KEY && process.env.PRIVATE_VAPID_KEY) {
      const pushPromises = subscriptions.map((sub) =>
        webpush.sendNotification(
          sub.subscription,
          JSON.stringify({ title, message, url: '/communication' })
        )
        .then(() => {
          results.push({ status: 'success' });
        })
        .catch((err) => {
          results.push({ 
            status: 'failed', 
            reason: err.body || err.message || err.statusCode 
          });
        })
      );

      await Promise.all(pushPromises);
    }

    // Send the results back to the browser Network tab
    return res.status(200).json({ 
      success: true, 
      total_found: subscriptions?.length || 0,
      results: results 
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
