import { clerkClient, getAuth } from '@clerk/express';
import supabase from '../supabaseClient.js';

export const ADMIN_EMAILS = new Set([
  'rt2609@nyu.edu',
  'ernestsahakyanux@gmail.com',
  ...(process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean),
]);

async function getVerifiedPrimaryEmail(userId) {
  const user = await clerkClient.users.getUser(userId);
  const primaryEmail = user.emailAddresses?.find(
    (email) => email.id === user.primaryEmailAddressId,
  );
  const isVerified = primaryEmail?.verification?.status === 'verified';
  return isVerified ? primaryEmail.emailAddress.toLowerCase() : null;
}

async function getTeacherAccess(userId) {
  const email = await getVerifiedPrimaryEmail(userId);

  let query = supabase
    .from('teachers')
    .select('*')
    .or(`clerk_user_id.eq.${userId}${email ? `,email.ilike.${email}` : ''}`)
    .limit(1);

  const { data, error } = await query;
  if (error) throw error;

  const teacher = data?.[0] || null;
  if (teacher && !teacher.clerk_user_id) {
    const { data: updated, error: updateError } = await supabase
      .from('teachers')
      .update({ clerk_user_id: userId })
      .eq('id', teacher.id)
      .select()
      .maybeSingle();
    if (updateError) throw updateError;
    return { teacher: updated, email };
  }

  return { teacher, email };
}

export async function getRequester(req) {
  const { userId } = getAuth(req);
  if (!userId) return null;

  const { teacher, email } = await getTeacherAccess(userId);
  const isAdmin = email ? ADMIN_EMAILS.has(email) : false;
  const isApprovedTeacher = Boolean(teacher && teacher.is_new !== true);

  return {
    userId,
    email,
    teacher,
    isAdmin,
    isApprovedTeacher,
    canManageStudents: isAdmin || isApprovedTeacher,
  };
}

export function requireAuthenticated(req, res, next) {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  req.authUserId = userId;
  return next();
}

export async function requireTeacher(req, res, next) {
  try {
    const requester = await getRequester(req);
    if (!requester) return res.status(401).json({ error: 'Unauthorized' });
    if (!requester.canManageStudents) {
      return res.status(403).json({ error: 'Approved teacher access required' });
    }
    req.authUserId = requester.userId;
    req.authUserEmail = requester.email;
    req.teacher = requester.teacher;
    req.isAdmin = requester.isAdmin;
    return next();
  } catch (error) {
    console.error('Teacher lookup failed:', error.message);
    return res.status(500).json({ error: 'Unable to verify access' });
  }
}

export async function requireAdmin(req, res, next) {
  try {
    const requester = await getRequester(req);
    if (!requester) return res.status(401).json({ error: 'Unauthorized' });
    if (!requester.isAdmin) return res.status(403).json({ error: 'Admin access required' });
    req.authUserId = requester.userId;
    req.authUserEmail = requester.email;
    req.teacher = requester.teacher;
    req.isAdmin = true;
    return next();
  } catch (error) {
    console.error('Admin lookup failed:', error.message);
    return res.status(500).json({ error: 'Unable to verify admin access' });
  }
}
