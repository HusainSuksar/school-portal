// api/_lib/admin.js
// Server-only helpers shared by the onboarding endpoints.
// Vercel does not expose files under an underscore-prefixed folder as routes.
import { createClient } from '@supabase/supabase-js';

// Largest number of rows one request may carry. The pages send smaller batches.
export const MAX_BATCH = 50;

// Password given to newly provisioned accounts (users must change it on first login).
const DEFAULT_PASSWORD = process.env.DEFAULT_ACCOUNT_PASSWORD || '786110';

let adminClient;

// Service-role client (bypasses RLS). Built lazily so a missing env var produces
// a readable error instead of crashing the function at import time.
export function getAdminClient() {
  if (!adminClient) {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('Server is missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
    }
    adminClient = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return adminClient;
}

// Verifies the caller's Supabase access token and checks their profile role.
// Sends the 401/403/500 response itself and returns null when the caller may not proceed.
export async function requireRole(req, res, allowedRoles) {
  const header = req.headers?.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    res.status(401).json({ error: 'You must be signed in to do this.' });
    return null;
  }

  const admin = getAdminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) {
    res.status(401).json({ error: 'Your session is invalid or has expired. Please sign in again.' });
    return null;
  }

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle();

  if (profileError) {
    console.error('Role lookup failed:', profileError);
    res.status(500).json({ error: 'Could not verify your permissions.' });
    return null;
  }

  if (!allowedRoles.includes(profile?.role)) {
    res.status(403).json({ error: 'You do not have permission to do this.' });
    return null;
  }

  return { id: data.user.id, role: profile.role };
}

// Trimmed string, or '' for null/undefined.
export function text(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

// ITS numbers are numeric IDs. Returns the cleaned value, or '' if it is not one.
export function cleanIts(value) {
  const its = text(value);
  return /^\d{1,12}$/.test(its) ? its : '';
}

function isDuplicateUserError(error) {
  return (
    error?.code === 'email_exists' ||
    /already (exists|registered|been registered)/i.test(error?.message || '')
  );
}

// Creates the login account for an ITS number using the proxy email format.
// Returns { userId, created }. If the login already exists, userId is taken from
// the matching profile (null when there is no profile to resolve it from).
export async function createLoginAccount(admin, itsNumber) {
  const { data, error } = await admin.auth.admin.createUser({
    email: `${itsNumber}@msb.local`,
    password: DEFAULT_PASSWORD,
    email_confirm: true,
  });

  if (!error) {
    return { userId: data?.user?.id || null, created: true };
  }
  if (!isDuplicateUserError(error)) {
    throw new Error(error.message);
  }

  const { data: existingProfile, error: lookupError } = await admin
    .from('profiles')
    .select('id')
    .eq('its_number', itsNumber)
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);

  return { userId: existingProfile?.id || null, created: false };
}

// Writes the profile row. If that fails for an account created in this same
// request, the new login is removed again so the row can simply be retried.
export async function saveProfile(admin, profile, { createdNow }) {
  const { error } = await admin.from('profiles').upsert(profile);
  if (!error) return;

  if (createdNow) {
    // Best effort: a failed cleanup must never hide the original error.
    try {
      const { error: cleanupError } = await admin.auth.admin.deleteUser(profile.id);
      if (cleanupError) throw cleanupError;
    } catch (cleanupError) {
      console.error(`Could not roll back login for ${profile.its_number}:`, cleanupError);
    }
  }
  throw new Error(error.message);
}

// Runs `processRow` over each row in order and collects a per-row outcome.
export async function processRows(rows, processRow) {
  const results = [];
  for (let index = 0; index < rows.length; index++) {
    try {
      const details = await processRow(rows[index] || {});
      results.push({ index, ok: true, ...details });
    } catch (err) {
      results.push({ index, ok: false, error: err?.message || 'Unknown error.' });
    }
  }
  const successCount = results.filter((r) => r.ok).length;
  return { results, successCount, errorCount: results.length - successCount };
}

// Shared request wrapper: POST only, role check, batch validation, error handling.
export function onboardingHandler({ rowsKey, allowedRoles, processRow }) {
  return async function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
      const caller = await requireRole(req, res, allowedRoles);
      if (!caller) return;

      const rows = req.body?.[rowsKey];
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ error: `Request must include a non-empty "${rowsKey}" list.` });
      }
      if (rows.length > MAX_BATCH) {
        return res.status(400).json({ error: `Too many records in one request (max ${MAX_BATCH}).` });
      }

      const admin = getAdminClient();
      const summary = await processRows(rows, (row) => processRow(admin, row, caller));
      return res.status(200).json(summary);
    } catch (err) {
      console.error(`Onboarding API error (${rowsKey}):`, err);
      return res.status(500).json({ error: err?.message || 'Internal error.' });
    }
  };
}
