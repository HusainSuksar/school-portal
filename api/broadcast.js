// api/broadcast.js
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

webpush.setVapidDetails(
  'mailto:admin@msbindore.org',
  process.env.VITE_PUBLIC_VAPID_KEY, 
  process.env.PRIVATE_VAPID_KEY      
);

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

    let query = supabaseAdmin.from('push_subscriptions').select('subscription');
    
    if (targetAudience !== 'ALL') {
      query = query.eq('role', targetAudience);
    }

    const { data: subscriptions, error } = await query;
    if (error) throw error;

    // We will store the exact responses from Apple/Google here
    const results = [];

    const pushPromises = subscriptions.map((sub) =>
      webpush.sendNotification(
        sub.subscription,
        JSON.stringify({ title, message, url: '/communication' })
      )
      .then(() => {
        results.push({ status: 'success' });
      })
      .catch((err) => {
        // UNMASK THE SILENT ERROR
        results.push({ 
          status: 'failed', 
          reason: err.body || err.message || err.statusCode 
        });
      })
    );

    await Promise.all(pushPromises);

    // Send the results back to the browser Network tab
    return res.status(200).json({ 
      success: true, 
      total_found: subscriptions.length,
      results: results 
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}