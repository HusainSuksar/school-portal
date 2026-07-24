// api/broadcast.js
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// Configure Web Push with Environment Variables
webpush.setVapidDetails(
  'mailto:admin@msbindore.org',
  process.env.VITE_PUBLIC_VAPID_KEY, // We use the same public key
  process.env.PRIVATE_VAPID_KEY      // SECRET: Kept hidden on Vercel
);

// Initialize Supabase Admin Client to bypass Row Level Security
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // SECRET: Not your anon key!
);

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { title, message, targetAudience } = req.body;

    // 1. Fetch target subscriptions from the database
    let query = supabaseAdmin.from('push_subscriptions').select('subscription');
    
    // If not sending to ALL, filter by the specific role
    if (targetAudience !== 'ALL') {
      query = query.eq('role', targetAudience);
    }

    const { data: subscriptions, error } = await query;
    if (error) throw error;

    // 2. Trigger payloads directly to Apple APNs & Google FCM
    const pushPromises = subscriptions.map((sub) =>
      webpush.sendNotification(
        sub.subscription,
        JSON.stringify({ title, message, url: '/communication' })
      ).catch((err) => {
        // If a subscription expired or is invalid, you can log it or delete it here
        console.error('Push delivery failed for a device:', err.statusCode);
      })
    );

    await Promise.all(pushPromises);

    return res.status(200).json({ success: true, message: 'Pushes sent!' });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}