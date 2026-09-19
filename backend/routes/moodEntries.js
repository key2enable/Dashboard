// backend/routes/moodEntries.js
// Consolidated per-student mood tracking.
//
// IMPORTANT: POST /kiosk is intentionally NOT behind Clerk auth — it's
// called from a shared, unauthenticated door-screen device that a
// student taps/scans. Do not add requireAuth to it. Its protection
// model is instead: (1) a random qr_token instead of a guessable
// student id, (2) a closed set of valid mood values, (3) rate
// limiting, (4) no sensitive data in the response.
import express from 'express';
import rateLimit from 'express-rate-limit';
import supabase from '../supabaseClient.js';
import requireTeacher from './requireTeacher.js';

const router = express.Router();

const VALID_MOODS = ['happy', 'sad', 'tired', 'excited', 'calm'];

function monthLabel(date) {
  return `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
}

// Kiosk writes are rate-limited per IP. A single classroom device
// will never legitimately fire more than a few requests a minute.
const kioskLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many mood check-ins from this device. Please wait a moment.' },
});

// POST /mood-entries/kiosk
// Body: { qr_token, mood }
// Public (no login) — this is the door-screen endpoint.
router.post('/kiosk', kioskLimiter, async (req, res) => {
  const { qr_token, mood } = req.body;

  if (!qr_token || typeof qr_token !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid qr_token' });
  }
  if (!VALID_MOODS.includes(mood)) {
    return res.status(400).json({ error: 'Invalid mood value' });
  }

  // Look up the student by their QR token, never by raw id.
  const { data: student, error: studentErr } = await supabase
    .from('students')
    .select('id, name, group_id')
    .eq('qr_token', qr_token)
    .maybeSingle();

  if (studentErr) {
    console.error('[mood-kiosk] lookup error:', studentErr.message);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
  if (!student) {
    // Deliberately vague — don't reveal whether the token format was
    // valid, just unknown, to avoid helping someone enumerate tokens.
    return res.status(404).json({ error: 'Card not recognized. Please ask a teacher for help.' });
  }

  const now = new Date();
  const entryDate = now.toISOString().split('T')[0];

  const { error: upsertErr } = await supabase
    .from('mood_entries')
    .upsert(
      {
        student_id: student.id,
        group_id: student.group_id,
        mood,
        entry_date: entryDate,
        month: monthLabel(now),
      },
      { onConflict: 'student_id,entry_date' }
    );

  if (upsertErr) {
    console.error('[mood-kiosk] upsert error:', upsertErr.message);
    return res.status(500).json({ error: 'Could not save your mood. Please try again.' });
  }

  // Return just enough for a friendly "Thanks, Alex!" confirmation
  // screen — first name only, nothing else about the student.
  const firstName = student.name?.split(' ')[0] || 'there';
  res.json({ ok: true, firstName, mood });
});

// GET /mood-entries/roster-qr?group_id=...&clerk_user_id=...
// Teacher-only. Returns the QR token for each student in one of the
// requesting teacher's own groups, for printing physical cards.
router.get('/roster-qr', requireTeacher, async (req, res) => {
  const { group_id } = req.query;
  if (!group_id) return res.status(400).json({ error: 'Missing group_id' });

  // Confirm this teacher actually owns this group before returning tokens.
  const { data: link, error: linkErr } = await supabase
    .from('group_teachers')
    .select('group_id')
    .eq('teacher_id', req.teacher.id)
    .eq('group_id', group_id)
    .maybeSingle();

  if (linkErr) return res.status(500).json({ error: linkErr.message });
  if (!link) return res.status(403).json({ error: 'Forbidden' });

  const { data: students, error } = await supabase
    .from('students')
    .select('id, name, qr_token')
    .eq('group_id', group_id)
    .order('name', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(students);
});

// GET /mood-entries/individual?student_id=...&week_start=YYYY-MM-DD&clerk_user_id=...
// Teacher-only. Per-day moods for one student across a week, scoped
// to a student that actually belongs to one of this teacher's groups.
router.get('/individual', requireTeacher, async (req, res) => {
  const { student_id, week_start } = req.query;
  if (!student_id || !week_start) {
    return res.status(400).json({ error: 'Missing student_id or week_start' });
  }

  const { data: student, error: studentErr } = await supabase
    .from('students')
    .select('id, name, group_id, group_teachers:groups(id)')
    .eq('id', student_id)
    .maybeSingle();

  if (studentErr) return res.status(500).json({ error: studentErr.message });
  if (!student) return res.status(404).json({ error: 'Student not found' });

  const { data: ownsGroup, error: ownErr } = await supabase
    .from('group_teachers')
    .select('group_id')
    .eq('teacher_id', req.teacher.id)
    .eq('group_id', student.group_id)
    .maybeSingle();

  if (ownErr) return res.status(500).json({ error: ownErr.message });
  if (!ownsGroup) return res.status(403).json({ error: 'Forbidden' });

  const start = new Date(week_start);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const { data: entries, error } = await supabase
    .from('mood_entries')
    .select('mood, entry_date')
    .eq('student_id', student_id)
    .gte('entry_date', start.toISOString().split('T')[0])
    .lte('entry_date', end.toISOString().split('T')[0])
    .order('entry_date', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  res.json({ student_id: student.id, name: student.name, entries });
});

export default router;
