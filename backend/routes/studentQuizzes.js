// File: routes/studentQuizzes.js
import express from 'express';
import supabase from '../supabaseClient.js';

const router = express.Router();

// GET quizzes visible to a student based on their group
router.get('/:clerk_user_id', async (req, res) => {
  const clerk_user_id = req.authUserId;

  // 1. Fetch student info
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('id, group_id')
    .eq('clerk_user_id', clerk_user_id)
    .maybeSingle();

  if (studentError || !student) {
    return res.status(404).json({ error: 'Student not found' });
  }

  // 2. Fetch quizzes assigned to this group
  const { data: quizLinks, error: linkError } = await supabase
    .from('quiz_groups')
    .select('quiz_id')
    .eq('group_id', student.group_id);

  if (linkError) {
    return res.status(500).json({ error: linkError.message });
  }

  const quizIds = quizLinks.map(q => q.quiz_id);

  // 3. Fetch quiz data
  const { data: quizzes, error: quizError } = await supabase
    .from('quizzes')
    .select('*')
    .in('quiz_id', quizIds);

  if (quizError) {
    return res.status(500).json({ error: quizError.message });
  }

  res.json(quizzes);
});

export default router;
