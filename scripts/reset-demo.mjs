// scripts/reset-demo.mjs
// Resets the Supabase project to a clean demo: deletes ALL data, ALL logins and
// uploaded avatars, then creates one demo login per role plus a small set of
// sample data so every dashboard has something to show.
//
// Dry run (reads only, changes nothing):
//   node --env-file=.env --env-file=.env.local scripts/reset-demo.mjs
//
// Real run (cannot be undone). Pass the project ref the dry run prints:
//   node --env-file=.env --env-file=.env.local scripts/reset-demo.mjs --wipe=<project-ref>
//
// Needs VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and DEMO_PASSWORD (the
// password shared by the demo logins, at least 8 characters).
import { writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { SCHOOL_NAME, LOGIN_EMAIL_DOMAIN } from '../src/config/school.js';

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Run with --env-file=.env --env-file=.env.local');
  process.exit(1);
}

const projectRef = new URL(url).hostname.split('.')[0];
const wipeArg = process.argv.find((arg) => arg.startsWith('--wipe='));
const wipeRef = wipeArg ? wipeArg.slice('--wipe='.length) : null;
const LOGINS_FILE = 'demo-logins.md';

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Every table, children before the tables they reference, with its primary key.
// Profiles are not listed: they are removed when their login is deleted.
const TABLES = [
  ['ticket_replies', 'id'],
  ['support_tickets', 'id'],
  ['in_app_notifications', 'id'],
  ['push_subscriptions', 'id'],
  ['announcements', 'id'],
  ['academic_calendar', 'id'],
  ['communication_logs', 'id'],
  ['leave_requests', 'id'],
  ['student_leaves', 'id'],
  ['lesson_plans', 'id'],
  ['lesson_templates', 'id'],
  ['syllabus_tracker', 'id'],
  ['attendance_records', 'id'],
  ['attendance_registers', 'id'],
  ['attendance', 'id'],
  ['behavior_logs', 'id'],
  ['grades', 'id'],
  ['teacher_timetables', 'id'],
  ['class_subjects', 'id'],
  ['students', 'id'],
  ['classes', 'id'],
  ['subjects', 'id'],
  ['ticket_assignments', 'section_id'],
  ['point_rules', 'id'],
  ['time_slots', 'id'],
  ['system_settings', 'id'],
];

const AVATAR_BUCKET = 'avatars';

// ---------------------------------------------------------------- demo content

const DEMO_USERS = [
  { key: 'admin', id: '10000001', role: 'ADMIN', label: 'Administrator', name: 'Alex Morgan', designation: 'School Administrator' },
  { key: 'hos', id: '10000002', role: 'HOS', label: 'Head of School', name: 'Priya Nair', designation: 'Head of School' },
  { key: 'classTeacher', id: '10000003', role: 'CLASS_TR', label: 'Class Teacher', name: 'Sara Thomas', designation: 'Class Teacher, Class 5' },
  { key: 'teacher', id: '10000004', role: 'TEACHER', label: 'Subject Teacher', name: 'Rahul Mehta', designation: 'Mathematics & Science Teacher' },
  { key: 'parent', id: '10000005', role: 'PARENT', label: 'Parent', name: 'Daniel Joseph (Parent)', designation: null },
];

const SUBJECTS = ['English', 'Mathematics', 'Science', 'Social Studies', 'Hindi', 'Computer Science', 'Art', 'Physical Education'];

// The database only allows letter grades for Class 1-4 and marks for the rest.
const CLASSES = Array.from({ length: 10 }, (_, i) => ({
  class_name: `Class ${i + 1}`,
  grading_system: i < 4 ? 'Letter_Grades' : 'Numeric_Marks',
}));

// Slot ids are referenced by the timetable pages; P0 is the locked opening slot.
const TIME_SLOTS = [
  { id: 'P0', label: 'Assembly', start_time: '08:00', end_time: '08:15', is_break: false },
  { id: 'P1', label: 'Period 1', start_time: '08:15', end_time: '08:55', is_break: false },
  { id: 'P2', label: 'Period 2', start_time: '08:55', end_time: '09:35', is_break: false },
  { id: 'B1', label: 'Short Break', start_time: '09:35', end_time: '09:50', is_break: true },
  { id: 'P3', label: 'Period 3', start_time: '09:50', end_time: '10:30', is_break: false },
  { id: 'P4', label: 'Period 4', start_time: '10:30', end_time: '11:10', is_break: false },
  { id: 'B2', label: 'Lunch Break', start_time: '11:10', end_time: '11:40', is_break: true },
  { id: 'P5', label: 'Period 5', start_time: '11:40', end_time: '12:20', is_break: false },
  { id: 'P6', label: 'Period 6', start_time: '12:20', end_time: '13:00', is_break: false },
].map((slot, index) => ({ ...slot, sort_order: index + 1 }));

// Section ids are fixed: the Help Centre routes tickets by them.
const TICKET_SECTIONS = [
  { section_id: 'PRE_PRIMARY', section_name: 'Pre-Primary Section', owner: 'hos' },
  { section_id: 'PRIMARY', section_name: 'Primary Section (Class 1-4)', owner: 'classTeacher' },
  { section_id: 'MIDDLE', section_name: 'Middle Section (Class 5-8)', owner: 'classTeacher' },
  { section_id: 'HIGH', section_name: 'High School (Class 9-12)', owner: 'hos' },
];

// "Tashjee" (merit) and "Tanbeeh" (demerit) are the two point types the database accepts.
const POINT_RULES = [
  { type: 'Tashjee', reason: 'Excellent homework', points: 5 },
  { type: 'Tashjee', reason: 'Helping a classmate', points: 3 },
  { type: 'Tashjee', reason: 'Active class participation', points: 2 },
  { type: 'Tashjee', reason: 'Neat uniform', points: 2 },
  { type: 'Tanbeeh', reason: 'Disrupting the class', points: 5 },
  { type: 'Tanbeeh', reason: 'Incomplete homework', points: 3 },
  { type: 'Tanbeeh', reason: 'Late to class', points: 2 },
];

// First student in each list is a child of the demo parent.
const STUDENTS = {
  'Class 5': ['Aarav Joseph', 'Diya Sharma', 'Kabir Singh', 'Meera Iyer', 'Rohan Das', 'Sana Khan', 'Vivaan Rao', 'Zoya Fernandes'],
  'Class 2': ['Anaya Joseph', 'Dev Kapoor', 'Ishaan Verma', 'Tara Menon'],
};

// ---------------------------------------------------------------- helpers

function fail(step, error) {
  throw new Error(`${step}: ${error?.message || error}`);
}

async function countRows(table) {
  const { count, error } = await admin.from(table).select('*', { count: 'exact', head: true });
  if (error) fail(`count ${table}`, error);
  return count ?? 0;
}

async function listAllUsers() {
  const users = [];
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 500 });
    if (error) fail('list logins', error);
    users.push(...data.users);
    if (data.users.length < 500) break;
  }
  return users;
}

async function listAvatarFiles() {
  const { data, error } = await admin.storage.from(AVATAR_BUCKET).list('', { limit: 1000 });
  if (error) return []; // bucket missing: nothing to remove
  return (data || []).filter((item) => item.id).map((item) => item.name);
}

async function insert(table, rows) {
  const { data, error } = await admin.from(table).insert(rows).select();
  if (error) fail(`insert ${table}`, error);
  return data;
}

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

// The most recent `count` weekdays, oldest first, ending today or the last weekday.
function recentWeekdays(count) {
  const days = [];
  const cursor = new Date();
  while (days.length < count) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) days.unshift(isoDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return days;
}

function daysFromNow(offset) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offset);
  return isoDate(date);
}

// ---------------------------------------------------------------- report

async function report() {
  console.log(`Supabase project: ${projectRef}  (${new URL(url).hostname})`);
  console.log('\nRows per table:');
  let total = 0;
  for (const [table] of [...TABLES, ['profiles']]) {
    const count = await countRows(table);
    total += count;
    console.log(`  ${table.padEnd(22)} ${count}`);
  }
  const users = await listAllUsers();
  const avatars = await listAvatarFiles();
  console.log(`\nLogins: ${users.length}`);
  console.log(`Avatar files: ${avatars.length}`);
  return { total, users, avatars };
}

// ---------------------------------------------------------------- wipe

async function wipe(users, avatars) {
  for (const [table, key] of TABLES) {
    const { error, count } = await admin.from(table).delete({ count: 'exact' }).not(key, 'is', null);
    if (error) fail(`delete ${table}`, error);
    console.log(`  cleared ${table} (${count ?? 0})`);
  }

  // Deleting a login also removes its profile row.
  let removed = 0;
  const queue = [...users];
  async function worker() {
    for (let user = queue.pop(); user; user = queue.pop()) {
      const { error } = await admin.auth.admin.deleteUser(user.id);
      if (error) fail(`delete login ${user.id}`, error);
      removed++;
      if (removed % 100 === 0) console.log(`  deleted ${removed} logins...`);
    }
  }
  await Promise.all(Array.from({ length: 5 }, worker));
  console.log(`  deleted ${removed} logins`);

  const leftover = await countRows('profiles');
  if (leftover > 0) fail('wipe', `${leftover} profile rows remain after deleting logins`);

  if (avatars.length > 0) {
    const { error } = await admin.storage.from(AVATAR_BUCKET).remove(avatars);
    if (error) fail('remove avatars', error);
    console.log(`  removed ${avatars.length} avatar files`);
  }
}

// ---------------------------------------------------------------- seed

async function createDemoUsers(password) {
  const ids = {};
  for (const user of DEMO_USERS) {
    const { data, error } = await admin.auth.admin.createUser({
      email: `${user.id}@${LOGIN_EMAIL_DOMAIN}`,
      password,
      email_confirm: true,
    });
    if (error) fail(`create login ${user.label}`, error);
    ids[user.key] = data.user.id;

    // A database trigger has already added a placeholder profile; fill it in.
    const { error: profileError } = await admin.from('profiles').upsert({
      id: data.user.id,
      full_name: user.name,
      role: user.role,
      its_number: user.id,
      designation: user.designation,
      requires_password_change: false,
    });
    if (profileError) fail(`profile ${user.label}`, profileError);
  }
  return ids;
}

async function seed(password) {
  const users = await createDemoUsers(password);
  console.log(`  created ${DEMO_USERS.length} logins`);

  await insert('system_settings', [{ school_name: SCHOOL_NAME }]);
  await insert('time_slots', TIME_SLOTS);
  await insert('point_rules', POINT_RULES);
  await insert(
    'ticket_assignments',
    TICKET_SECTIONS.map(({ owner, ...section }) => ({ ...section, teacher_id: users[owner] }))
  );

  const subjects = Object.fromEntries((await insert('subjects', SUBJECTS.map((name) => ({ name })))).map((s) => [s.name, s.id]));
  const classes = Object.fromEntries(
    (
      await insert(
        'classes',
        CLASSES.map((c) => ({ ...c, class_teacher_id: c.class_name === 'Class 5' ? users.classTeacher : null }))
      )
    ).map((c) => [c.class_name, c.id])
  );

  // Who teaches what in the two classes that have students.
  const teaching = [
    ['Class 5', 'English', users.classTeacher],
    ['Class 5', 'Social Studies', users.classTeacher],
    ['Class 5', 'Mathematics', users.teacher],
    ['Class 5', 'Science', users.teacher],
    ['Class 2', 'English', users.teacher],
    ['Class 2', 'Mathematics', users.classTeacher],
  ];
  await insert(
    'class_subjects',
    teaching.map(([className, subject, teacherId]) => ({
      class_id: classes[className],
      subject_id: subjects[subject],
      teacher_id: teacherId,
    }))
  );

  const parent = DEMO_USERS.find((u) => u.key === 'parent');
  const studentRows = [];
  let nextStudentId = 20000001;
  for (const [className, names] of Object.entries(STUDENTS)) {
    names.forEach((fullName, index) => {
      const isDemoChild = index === 0;
      studentRows.push({
        its_number: String(nextStudentId++),
        full_name: fullName,
        class_id: classes[className],
        roll_no: String(index + 1),
        parent_id: isDemoChild ? users.parent : null,
        primary_parent_its: isDemoChild ? parent.id : null,
        father_name: isDemoChild ? 'Daniel Joseph' : null,
        mother_name: isDemoChild ? 'Maria Joseph' : null,
      });
    });
  }
  const students = await insert('students', studentRows);
  const inClass = (className) => students.filter((s) => s.class_id === classes[className]);
  console.log(`  created ${students.length} students in ${Object.keys(STUDENTS).length} classes`);

  // One week of attendance with a few absences.
  const attendance = [];
  recentWeekdays(5).forEach((date, dayIndex) => {
    students.forEach((student, studentIndex) => {
      const roll = (dayIndex * 7 + studentIndex * 3) % 17;
      attendance.push({
        student_id: student.id,
        class_id: student.class_id,
        date,
        status: roll === 0 ? 'Absent' : roll === 5 ? 'Late' : 'Present',
        recorded_by: users.classTeacher,
      });
    });
  });
  await insert('attendance', attendance);

  const class5 = inClass('Class 5');
  await insert('behavior_logs', [
    { student_id: class5[0].id, teacher_id: users.teacher, log_type: 'Tashjee', points: 5, reason: 'Excellent homework' },
    { student_id: class5[0].id, teacher_id: users.classTeacher, log_type: 'Tashjee', points: 2, reason: 'Active class participation' },
    { student_id: class5[1].id, teacher_id: users.classTeacher, log_type: 'Tashjee', points: 3, reason: 'Helping a classmate' },
    { student_id: class5[2].id, teacher_id: users.teacher, log_type: 'Tanbeeh', points: 2, reason: 'Late to class' },
    { student_id: class5[3].id, teacher_id: users.teacher, log_type: 'Tashjee', points: 2, reason: 'Neat uniform' },
    { student_id: class5[4].id, teacher_id: users.classTeacher, log_type: 'Tanbeeh', points: 3, reason: 'Incomplete homework' },
  ]);

  // Term 1 results: marks for Class 5, letter grades for Class 2.
  const grades = [];
  class5.forEach((student, index) => {
    [['English', users.classTeacher, 78], ['Mathematics', users.teacher, 85], ['Science', users.teacher, 72]].forEach(
      ([subject, teacherId, base]) => {
        grades.push({
          student_id: student.id,
          class_id: student.class_id,
          subject_id: subjects[subject],
          term: 'Term 1',
          numeric_mark: Math.min(100, base + ((index * 5) % 14)),
          teacher_id: teacherId,
        });
      }
    );
  });
  inClass('Class 2').forEach((student, index) => {
    [['English', users.teacher], ['Mathematics', users.classTeacher]].forEach(([subject, teacherId], subjectIndex) => {
      grades.push({
        student_id: student.id,
        class_id: student.class_id,
        subject_id: subjects[subject],
        term: 'Term 1',
        letter_grade: ['A', 'B', 'A', 'B'][(index + subjectIndex) % 4],
        teacher_id: teacherId,
      });
    });
  });
  await insert('grades', grades);

  await insert('teacher_timetables', [
    { teacher_id: users.teacher, day_of_week: 'Monday', slot_id: 'P1', class_id: classes['Class 5'], subject: 'Mathematics' },
    { teacher_id: users.teacher, day_of_week: 'Monday', slot_id: 'P3', class_id: classes['Class 2'], subject: 'English' },
    { teacher_id: users.teacher, day_of_week: 'Tuesday', slot_id: 'P2', class_id: classes['Class 5'], subject: 'Science' },
    { teacher_id: users.teacher, day_of_week: 'Wednesday', slot_id: 'P1', class_id: classes['Class 5'], subject: 'Mathematics' },
    { teacher_id: users.teacher, day_of_week: 'Thursday', slot_id: 'P4', class_id: classes['Class 5'], subject: 'Science' },
    { teacher_id: users.teacher, day_of_week: 'Friday', slot_id: 'P2', class_id: classes['Class 2'], subject: 'English' },
    { teacher_id: users.classTeacher, day_of_week: 'Monday', slot_id: 'P2', class_id: classes['Class 5'], subject: 'English' },
    { teacher_id: users.classTeacher, day_of_week: 'Tuesday', slot_id: 'P1', class_id: classes['Class 5'], subject: 'Social Studies' },
    { teacher_id: users.classTeacher, day_of_week: 'Wednesday', slot_id: 'P3', class_id: classes['Class 2'], subject: 'Mathematics' },
    { teacher_id: users.classTeacher, day_of_week: 'Thursday', slot_id: 'P1', class_id: classes['Class 5'], subject: 'English' },
    { teacher_id: users.classTeacher, day_of_week: 'Friday', slot_id: 'P5', class_id: classes['Class 5'], subject: 'Social Studies' },
  ]);

  await insert('syllabus_tracker', [
    { class_id: classes['Class 5'], subject: 'Mathematics', teacher_id: users.teacher, total_units: 12, completed_units: 5 },
    { class_id: classes['Class 5'], subject: 'Science', teacher_id: users.teacher, total_units: 10, completed_units: 4 },
    { class_id: classes['Class 5'], subject: 'English', teacher_id: users.classTeacher, total_units: 10, completed_units: 6 },
  ]);

  await insert('lesson_templates', [
    {
      title: 'Standard 40-minute lesson',
      description: 'Use for a regular single-period lesson.',
      content_structure: '1. Recap of the last lesson (5 mins)\n2. New concept (15 mins)\n3. Guided practice (15 mins)\n4. Summary and homework (5 mins)',
      created_by: users.admin,
    },
  ]);

  await insert('announcements', [
    {
      title: 'Welcome to the school portal',
      message: 'Attendance, marks, notices and leave requests are now available here for parents and staff.',
      target_audience: 'ALL',
      created_by: users.admin,
    },
    {
      title: 'Parent-teacher meeting',
      message: 'The Term 1 parent-teacher meeting will be held next Saturday from 9:00 am. Please check the calendar for the date.',
      target_audience: 'PARENTS',
      created_by: users.hos,
    },
    {
      title: 'Staff meeting on Friday',
      message: 'All teaching staff are requested to meet in the staff room after Period 6 this Friday.',
      target_audience: 'STAFF',
      created_by: users.hos,
    },
  ]);

  await insert('academic_calendar', [
    { event_name: 'Parent-Teacher Meeting', event_date: daysFromNow(7), event_type: 'Event', created_by: users.admin },
    { event_name: 'Annual Sports Day', event_date: daysFromNow(16), event_type: 'Event', created_by: users.admin },
    { event_name: 'School Holiday', event_date: daysFromNow(24), event_type: 'Holiday', created_by: users.admin },
  ]);
}

function writeLoginsFile(password) {
  const rows = DEMO_USERS.map((u) => `| ${u.label} | ${u.id} | ${u.name} |`).join('\n');
  const text = `# Demo logins

Created by \`scripts/reset-demo.mjs\` on ${new Date().toISOString().slice(0, 10)}. This file is not committed to git.

Password for every login: \`${password}\`

| Role | ID number | Name |
|---|---|---|
${rows}

Sign in with the ID number and the password. Anyone holding a login can change
its password from the Profile page; run the reset script again to restore these.
`;
  writeFileSync(LOGINS_FILE, text);
}

// ---------------------------------------------------------------- main

const { total, users, avatars } = await report();

if (!wipeRef) {
  console.log(`\nDry run only: nothing was changed.`);
  console.log(`A real run would permanently delete ${total} rows, ${users.length} logins and ${avatars.length} avatar files,`);
  console.log(`then create ${DEMO_USERS.length} demo logins with sample data.`);
  console.log(`To do it: add --wipe=${projectRef}`);
  process.exit(0);
}

if (wipeRef !== projectRef) {
  console.error(`\n--wipe=${wipeRef} does not match this project (${projectRef}). Nothing was changed.`);
  process.exit(1);
}
const password = process.env.DEMO_PASSWORD || '';
if (password.length < 8) {
  console.error('\nSet DEMO_PASSWORD (at least 8 characters) in .env.local first. Nothing was changed.');
  process.exit(1);
}

console.log('\nDeleting everything...');
await wipe(users, avatars);
console.log('\nCreating demo data...');
await seed(password);
writeLoginsFile(password);
console.log(`\nDone. Demo logins are listed in ${LOGINS_FILE}.`);
