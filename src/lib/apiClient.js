// src/lib/apiClient.js
// Calls to the portal's own server endpoints in /api.
// Every call carries the signed-in user's access token so the server can check who is asking.
import { supabase } from './supabase';

// POSTs JSON as the current user. Resolves with the parsed response (null if it was not JSON),
// rejects with a readable Error when the user is signed out or the server refuses.
export async function postAsCurrentUser(path, body) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Your session has expired. Please sign in again.');
  }

  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    // Not JSON: the API route is not being served (e.g. plain `vite` dev server).
  }

  if (!res.ok) {
    throw new Error(payload?.error || `Request to ${path} failed (${res.status}).`);
  }
  return payload;
}

// In-app + push notification to specific users.
// body: { userIds: [...] | userId, title, message, url }
export function notifyUsers(body) {
  return postAsCurrentUser('/api/notify', body);
}

// Announcement notification to an audience (ADMIN / HOS only).
// body: { title, message, targetAudience: 'ALL' | 'PARENTS' | 'STAFF' }
export function sendBroadcast(body) {
  return postAsCurrentUser('/api/broadcast', body);
}
