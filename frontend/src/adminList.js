// File: adminList.js

const defaultAdmins = ['rt2609@nyu.edu', 'ernestsahakyanux@gmail.com'];
const raw = import.meta.env.VITE_ADMIN_EMAILS || '';

export const ADMIN_EMAILS = [
  ...new Set([
    ...defaultAdmins,
    ...raw.split(','),
  ].map(email => email.trim().toLowerCase()).filter(Boolean)),
];
