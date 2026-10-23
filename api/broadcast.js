// api/broadcast.js
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

if (process.env.VITE_PUBLIC_VAPID_KEY && process.env.PRIVATE_VAPID_KEY) {
  webpush.setVapidDetails(
    'mailto:admin@msbindore.org',
    process.env.VITE_PUBLIC_VAPID_KEY, 
    process.env.PRIVATE_VAPID_KEY      
  );
}

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY 
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { title, message, targetAudience } = req.body;

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
