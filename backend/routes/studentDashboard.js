// routes/studentDashboard.js
import express from 'express';
import supabase from '../supabaseClient.js';

const router = express.Router();

router.get('/lessons', async (req, res) => {
  const { month, language } = req.query;
  const clerk_user_id = req.authUserId;

  console.log("🟡 Incoming request:", { clerk_user_id, month, language });

  // Check for missing params
  if (!clerk_user_id || !month || !language) {
    console.error("❌ Missing required parameters");
    return res.status(400).json({ error: 'Missing clerk_user_id, month, or language' });
  }

  try {
    // Get the student by clerk_user_id
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('id, group_id')
      .eq('clerk_user_id', clerk_user_id)
      .maybeSingle();

    if (studentError || !studentData) {
      console.error("❌ Student lookup failed:", studentError || "No student found");
      return res.status(404).json({ error: 'Student not found' });
    }

    const { id: student_id, group_id } = studentData;
    console.log("✅ Found student:", { student_id, group_id });

    // Validate group_id
    if (!group_id) {
      console.error("❌ Student is not assigned to any group.");
      return res.status(400).json({ error: 'Student is not assigned to any group' });
    }

    // Fetch lesson plans
    const { data: lessonData, error: lessonError } = await supabase
      .from('lesson_plans')
      .select('category, content, week, group_id')
      .eq('month', month)
      .eq('language', language)
      .eq('group_id', group_id);

    if (lessonError) {
      console.error("❌ Failed to fetch lesson plans:", lessonError);
      return res.status(500).json({ error: lessonError.message });
    }

    console.log(`✅ ${lessonData.length} lesson(s) found`);
    res.json(lessonData);
  } catch (err) {
    console.error("🔥 Unexpected server error:", err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /student-dashboard/:clerk_user_id
router.get('/:clerk_user_id', async (req, res) => {
  const clerk_user_id = req.authUserId;

  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('id, name, group_id, groups(name)')
    .eq('clerk_user_id', clerk_user_id)
    .single();

  if (studentError) return res.status(500).json({ error: studentError.message });

  const month = new Date().toLocaleString('default', { month: 'long' }) + ' ' + new Date().getFullYear();

  const { data: attendanceEntries } = await supabase
    .from('attendance_entries')
    .select('status')
    .eq('student_id', student.id)
    .like('date', `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-%`);

  const presentDays = attendanceEntries.filter(e => e.status === 'P').length;
  const totalDays = attendanceEntries.length;
  const attendancePercent = totalDays ? Math.round((presentDays / totalDays) * 100) : 0;

  const { data: assessmentScores } = await supabase
    .from('assessment_scores')
    .select('raw_score, max_score')
    .eq('student_id', student.id)
    .eq('month', month);

  const totalRaw = assessmentScores.reduce((sum, r) => sum + (r.raw_score || 0), 0);
  const totalMax = assessmentScores.reduce((sum, r) => sum + (r.max_score || 0), 0);
  const assessmentPercent = totalMax ? Math.round((totalRaw / totalMax) * 100) : 0;

  const { data: moods } = await supabase
    .from('mood_entries')
    .select('mood')
    .eq('student_id', student.id);

  const moodCount = {};
  moods.forEach(({ mood }) => moodCount[mood] = (moodCount[mood] || 0) + 1);
  const mood = Object.entries(moodCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown';

  res.json({
    name: student.name,
    group: student.groups.name,
    attendancePercent,
    assessmentPercent,
    mood
  });
});

// ✅ GET /student/reports?student_id=...&month=...
router.get('/reports', async (req, res) => {
  const { student_id, month } = req.query;

  if (!student_id || !month) {
    return res.status(400).json({ error: 'Missing student_id or month' });
  }

  try {
    const { data, error } = await supabase
      .from('ai_reports')
      .select('content, teacher_comment')
      .eq('student_id', student_id)
      .eq('month', month)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });

    res.json(data || {});
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});



export default router;
