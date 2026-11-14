// api/onboard-staff.js
// Creates staff login accounts and their profile rows. ADMIN / HOS only.
import {
  onboardingHandler,
  createLoginAccount,
  saveProfile,
  cleanIts,
  text,
} from './_lib/admin.js';

export const config = { maxDuration: 60 };

const STAFF_ROLES = ['ADMIN', 'HOS', 'TEACHER', 'CLASS_TR'];
const OPTIONAL_FIELDS = ['designation', 'phone_number', 'personal_email', 'address'];

async function onboardStaffMember(admin, row) {
  const itsNumber = cleanIts(row.its_number);
  if (!itsNumber) {
    throw new Error('ID number is required and must contain digits only.');
  }

  const role = text(row.role).toUpperCase() || 'TEACHER';
  if (!STAFF_ROLES.includes(role)) {
    throw new Error(`"${text(row.role)}" is not a valid staff role.`);
  }

  // 1. Create the login (or find the existing one)
  const { userId, created } = await createLoginAccount(admin, itsNumber);
  if (!userId) {
    throw new Error('A login already exists for this ID but it has no profile to attach to.');
  }

  // 2. Create or update the profile. Optional columns are only touched when sent.
  const profile = {
    id: userId,
    full_name: text(row.full_name) || 'Staff Member',
    role,
    its_number: itsNumber,
    requires_password_change: true,
  };
  for (const field of OPTIONAL_FIELDS) {
    if (field in row) profile[field] = text(row[field]) || null;
  }

  await saveProfile(admin, profile, { createdNow: created });

  return { its_number: itsNumber, full_name: profile.full_name };
}

export default onboardingHandler({
  rowsKey: 'staff',
  allowedRoles: ['ADMIN', 'HOS'],
  processRow: onboardStaffMember,
});
