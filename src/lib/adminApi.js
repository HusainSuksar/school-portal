// src/lib/adminApi.js
// Browser-side calls to the admin-only server endpoints in /api.
// The service role key lives on the server; the browser only sends the
// signed-in user's own access token so the server can check who is asking.
import { postAsCurrentUser } from './apiClient';
import { ID_LABEL } from '../config/school';

const BATCH_SIZE = 10;

async function postRows(path, body) {
  const payload = await postAsCurrentUser(path, body);
  if (!payload || !Array.isArray(payload.results)) {
    throw new Error('Onboarding service is not reachable. When running locally, start the app with "vercel dev".');
  }
  return payload;
}

// Sends rows in small batches and returns one { ok, error?, ... } result per row,
// in the same order. If a request fails outright, that batch and everything after
// it are reported as failed with the reason.
async function sendInBatches(path, rowsKey, rows) {
  const results = [];
  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    try {
      const payload = await postRows(path, { [rowsKey]: rows.slice(start, start + BATCH_SIZE) });
      results.push(...payload.results);
    } catch (err) {
      for (let i = start; i < rows.length; i++) {
        results.push({ ok: false, error: err.message });
      }
      break;
    }
  }
  return results;
}

// rows: [{ its_number, full_name, role, designation?, phone_number?, personal_email?, address? }]
export function onboardStaff(rows) {
  return sendInBatches('/api/onboard-staff', 'staff', rows);
}

// rows: [{ student_its, parent_its, father_name?, mother_name?, parent_phone? }]
export function linkParents(rows) {
  return sendInBatches('/api/onboard-parent', 'links', rows);
}

// "First issue: …" text for bulk status messages.
export function describeFirstFailure(rows, results, itsField) {
  const index = results.findIndex((r) => !r.ok);
  if (index === -1) return '';
  const its = rows[index]?.[itsField];
  return ` First issue${its ? ` (${ID_LABEL} ${its})` : ''}: ${results[index].error}`;
}
