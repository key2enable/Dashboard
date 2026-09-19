// routes/student_answers.js
import express from 'express';
import supabase from '../supabaseClient.js';
import { getRequester, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

async function canAccessStudent(req, studentId) {
  const requester = await getRequester(req);
  if (requester?.canManageStudents) return true;

  const { data: student, error } = await supabase
    .from('students')
    .select('id')
    .eq('id', studentId)
    .eq('clerk_user_id', req.authUserId)
    .maybeSingle();
  if (error) throw error;
  return Boolean(student);
}

async function getAnswerResult(questionId, answerId, quizId) {
  const { data: question, error: questionError } = await supabase
    .from('questions')
    .select('question_id')
    .eq('question_id', questionId)
    .eq('quiz_id', quizId)
    .maybeSingle();
  if (questionError) throw questionError;
  if (!question) return null;

  const { data: answer, error: answerError } = await supabase
    .from('answers')
    .select('is_correct')
    .eq('answer_id', answerId)
    .eq('question_id', questionId)
    .maybeSingle();
  if (answerError) throw answerError;
  return answer;
}

// GET all student answers
router.get('/', async (req, res) => {
  try {
    const requester = await getRequester(req);
    if (!requester?.canManageStudents) {
      return res.status(403).json({ error: 'Approved teacher access required' });
    }
    const { data, error } = await supabase
      .from('student_answers')
      .select('*')
      .order('response_id', { ascending: true });

    if (error) return res.status(500).json({ error: 'Unable to retrieve answers' });
    return res.json(data);
  } catch (error) {
    console.error('Unable to retrieve answers:', error.message);
    return res.status(500).json({ error: 'Unable to retrieve answers' });
  }
});

// GET answers by student and quiz
router.get('/student/:student_id/quiz/:quiz_id', async (req, res) => {
  const { student_id, quiz_id } = req.params;
  if (!(await canAccessStudent(req, student_id))) return res.status(403).json({ error: 'Forbidden' });

  const { data, error } = await supabase
    .from('student_answers')
    .select('*')
    .eq('student_id', student_id)
    .eq('quiz_id', quiz_id);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET a single response by ID
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('student_answers')
    .select('*')
    .eq('response_id', req.params.id)
    .maybeSingle();

  if (error || !data) {
    return res.status(404).json({ error: 'Response not found' });
  }
  if (!(await canAccessStudent(req, data.student_id))) return res.status(403).json({ error: 'Forbidden' });

  res.json(data);
});

// POST create a new student answer
router.post('/', async (req, res) => {
  const {
    response_id,
    student_id,
    quiz_id,
    question_id,
    answer_id,
  } = req.body;

  if (
    typeof response_id !== 'number' ||
    !student_id ||
    !quiz_id ||
    typeof question_id !== 'number' ||
    typeof answer_id !== 'number'
  ) {
    return res.status(400).json({ error: 'Missing or invalid required fields' });
  }
  if (!(await canAccessStudent(req, student_id))) return res.status(403).json({ error: 'Forbidden' });

  const answer = await getAnswerResult(question_id, answer_id, quiz_id);
  if (!answer) return res.status(400).json({ error: 'Answer does not belong to this question or quiz' });

  const { data, error } = await supabase
    .from('student_answers')
    .insert([
      {
        response_id,
        student_id,
        quiz_id,
        question_id,
        answer_id,
        is_correct: answer.is_correct,
      },
    ])
    .select();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json(data[0]);
});

// PUT update a student's answer
router.put('/:id', async (req, res) => {
  const { answer_id } = req.body;
  const { data: existing, error: lookupError } = await supabase
    .from('student_answers')
    .select('student_id, quiz_id, question_id')
    .eq('response_id', req.params.id)
    .maybeSingle();
  if (lookupError || !existing) return res.status(404).json({ error: 'Response not found' });
  if (!(await canAccessStudent(req, existing.student_id))) return res.status(403).json({ error: 'Forbidden' });
  if (typeof answer_id !== 'number') return res.status(400).json({ error: 'Missing or invalid answer_id' });

  const answer = await getAnswerResult(existing.question_id, answer_id, existing.quiz_id);
  if (!answer) return res.status(400).json({ error: 'Answer does not belong to this question or quiz' });

  const { error } = await supabase
    .from('student_answers')
    .update({ answer_id, is_correct: answer.is_correct })
    .eq('response_id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// DELETE a student answer
router.delete('/:id', requireAdmin, async (req, res) => {
  const { data: existing, error: lookupError } = await supabase
    .from('student_answers')
    .select('student_id')
    .eq('response_id', req.params.id)
    .maybeSingle();
  if (lookupError || !existing) return res.status(404).json({ error: 'Response not found' });
  if (!(await canAccessStudent(req, existing.student_id))) return res.status(403).json({ error: 'Forbidden' });
  const { error } = await supabase
    .from('student_answers')
    .delete()
    .eq('response_id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

export default router;
