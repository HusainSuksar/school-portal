// src/config/school.js
// All school branding lives here. To rebrand the portal for a school, change
// SCHOOL_NAME (and the labels below if needed) and replace the artwork in
// public/: logo.svg, login-bg.svg, favicon.svg, pwa-192x192.png,
// pwa-512x512.png and apple-touch-icon.png.
//
// This file is also imported by vite.config.js (page title and PWA manifest),
// so keep it plain JavaScript with no browser-only code.

export const SCHOOL_NAME = 'Demo School';

export const SCHOOL = {
  name: SCHOOL_NAME,
  // Second line of the login heading.
  portalName: 'Academic Portal',
  // Browser tab title and installed-app name.
  appTitle: `${SCHOOL_NAME} Portal`,
  // Name under the home-screen icon; keep it short.
  appShortName: 'School Portal',
  appDescription: 'School Operations & Communication Portal',
  // Who to contact for login help (login page footer).
  officeName: 'School Administration Office',
  logo: '/logo.svg',
  loginBackground: '/login-bg.svg',
};

// What this school calls the number that identifies each student, parent and
// staff member (for example "ID", "Admission No." or "Roll No."). These are
// display labels only: database columns, API fields and CSV headers keep
// their existing names.
export const ID_LABEL = 'ID';
export const ID_LABEL_FULL = 'ID Number';

// Logins are stored as "<ID number>@<this domain>"; people only ever type the
// ID number. Changing this stops every existing login from working, so only
// change it on an empty database. api/_lib/admin.js holds the same value.
export const LOGIN_EMAIL_DOMAIN = 'school.local';

// Show the Hijri (Islamic calendar) date next to the Gregorian date on the
// login page and in the Academic Calendar. Set to true for schools that
// follow both calendars.
export const SHOW_HIJRI_DATE = false;
