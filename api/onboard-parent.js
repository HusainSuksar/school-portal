// api/onboard-parent.js
// Creates parent login accounts and links them to student records. ADMIN / HOS only.
import {
  onboardingHandler,
  createLoginAccount,
  saveProfile,
  cleanIts,
  text,
} from './_lib/admin.js';

export const config = { maxDuration: 60 };

// Returns the profile id of the parent, creating the login + profile if needed.
async function getOrCreateParent(admin, parentIts, fatherName, parentPhone) {
  // 1. Reuse the parent if they already have a profile (e.g. a sibling was linked earlier)
  const { data: existingProfile, error: profileError } = await admin
    .from('profiles')
    .select('id')
    .eq('its_number', parentIts)
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);
  if (existingProfile) return existingProfile.id;

  // 2. Create the login
  const { userId, created } = await createLoginAccount(admin, parentIts);
  if (!userId) {
    throw new Error('A login already exists for this parent ID but it has no profile to attach to.');
  }

  // 3. Create the profile
  await saveProfile(
    admin,
    {
      id: userId,
      full_name: `${fatherName || 'Parent'} (Parent)`,
      role: 'PARENT',
      its_number: parentIts,
      phone_number: parentPhone || null,
      requires_password_change: true,
    },
    { createdNow: created }
  );

  return userId;
}

async function linkParentToStudent(admin, row) {
  const studentIts = cleanIts(row.student_its);
  const parentIts = cleanIts(row.parent_its);
  if (!studentIts || !parentIts) {
    throw new Error('Student ID and parent ID are required and must contain digits only.');
  }

  const fatherName = text(row.father_name);
  const motherName = text(row.mother_name);

  // 1. Make sure the student exists before creating any account
  const { data: student, error: studentError } = await admin
    .from('students')
    .select('id, full_name')
    .eq('its_number', studentIts)
    .maybeSingle();
  if (studentError) throw new Error(studentError.message);
  if (!student) throw new Error(`Student with ID ${studentIts} not found in database.`);

  // 2. Get or create the parent account
  const parentId = await getOrCreateParent(admin, parentIts, fatherName, text(row.parent_phone));

  // 3. Link them together
  const { error: updateError } = await admin
    .from('students')
    .update({
      parent_id: parentId,
      father_name: fatherName || null,
      mother_name: motherName || null,
      primary_parent_its: parentIts,
    })
    .eq('its_number', studentIts);
  if (updateError) throw new Error(updateError.message);

  return { student_its: studentIts, parent_its: parentIts, student_name: student.full_name || null };
}

export default onboardingHandler({
  rowsKey: 'links',
  allowedRoles: ['ADMIN', 'HOS'],
  processRow: linkParentToStudent,
});
