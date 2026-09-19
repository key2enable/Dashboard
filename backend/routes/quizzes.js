import express from 'express';
import supabase from '../supabaseClient.js';
import { v4 as uuidv4 } from 'uuid';
import { getRequester, requireAdmin, requireTeacher } from '../middleware/auth.js';

const router = express.Router();

// GET all quizzes (basic info)
router.get('/', async (_req, res) => {
  const { data, error } = await supabase
    .from('quizzes')
    .select('quiz_id, quiz_name, folder_id')
    .order('quiz_name', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET single quiz with questions and full answers
router.get('/:id', async (req, res) => {
  const quiz_id = req.params.id;
  const requester = await getRequester(req);
  const canSeeCorrectAnswers = Boolean(requester?.canManageStudents);

  const { data: quiz, error: quizErr } = await supabase
    .from('quizzes')
    .select('quiz_id, quiz_name')
    .eq('quiz_id', quiz_id)
    .maybeSingle();

  if (quizErr || !quiz) return res.status(404).json({ error: 'Quiz not found' });

  const { data: questions, error: qErr } = await supabase
    .from('questions')
    .select('question_id, question_text, media_url')
    .eq('quiz_id', quiz_id);

  if (qErr) return res.status(500).json({ error: qErr.message });

  const questionIds = questions.map(q => q.question_id);

  const { data: answers, error: aErr } = await supabase
    .from('answers')
    .select('answer_id, question_id, answer_text, is_correct, image_url')
    .in('question_id', questionIds);

  if (aErr) return res.status(500).json({ error: aErr.message });

  const slides = questions.map(q => {
    const qAnswers = answers.filter(a => a.question_id === q.question_id);

    return {
      question_id: q.question_id,
      text: q.question_text,
      image: q.media_url || null,
      answers: qAnswers.map(a => ({
        answer_id: a.answer_id,
        answer_text: a.answer_text,
        ...(canSeeCorrectAnswers ? { is_correct: a.is_correct } : {}),
        image: a.image_url || null,
      })),
      ...(canSeeCorrectAnswers ? {
        correct: qAnswers
          .map((a, i) => (a.is_correct ? i : null))
          .filter(i => i !== null),
      } : {}),
    };
  });

  res.json({
    quiz_id: quiz.quiz_id,
    title: quiz.quiz_name,
    slides,
  });
});

// POST create new quiz
router.post('/', requireTeacher, async (req, res) => {
  const { title, slides, folder_id } = req.body;
  const quiz_id = uuidv4();

  const { data: quiz, error: quizError } = await supabase
    .from('quizzes')
    .insert([{ quiz_id, quiz_name: title, folder_id: folder_id || null }])
    .select()
    .single();

  if (quizError) {
    console.error('❌ Error inserting quiz:', quizError);
    return res.status(500).json({ error: quizError.message });
  }

  for (const q of slides) {
    const { data: question, error: questionError } = await supabase
      .from('questions')
      .insert([{
        quiz_id,
        question_text: q.text,
        media_url: q.image || null,
      }])
      .select()
      .single();

    if (questionError) {
      console.error('❌ Error inserting question:', questionError);
      return res.status(500).json({ error: questionError.message });
    }

    for (let i = 0; i < q.answers.length; i++) {
      const answer = q.answers[i];
      const answerText = typeof answer === 'string' ? answer : answer.answer_text || "";
      const imageUrl = typeof answer === 'object' && answer.image ? answer.image : null;
      const isCorrect = q.correct.includes(i);

      const { error: answerError } = await supabase
        .from('answers')
        .insert([{
          question_id: question.question_id,
          answer_text: answerText,
          image_url: imageUrl,
          is_correct: isCorrect,
        }]);

      if (answerError) {
        console.error('❌ Error inserting answer:', answerError);
        return res.status(500).json({ error: answerError.message });
      }
    }
  }

  res.status(201).json({ quiz });
});

// PUT update quiz (rename + reassign folder + overwrite questions/answers)
router.put('/:id', requireTeacher, async (req, res) => {
  const quiz_id = req.params.id;
  const { quiz_name, folder_id, slides } = req.body;

  try {
    const { error: quizUpdateErr } = await supabase
      .from('quizzes')
      .update({ quiz_name, folder_id: folder_id || null })
      .eq('quiz_id', quiz_id);

    if (quizUpdateErr) throw new Error(quizUpdateErr.message);

    const { data: oldQuestions, error: getQErr } = await supabase
      .from('questions')
      .select('question_id')
      .eq('quiz_id', quiz_id);

    if (getQErr) throw new Error(getQErr.message);

    const oldQIds = oldQuestions.map(q => q.question_id);

    if (oldQIds.length > 0) {
      const { error: delAErr } = await supabase
        .from('answers')
        .delete()
        .in('question_id', oldQIds);
      if (delAErr) throw new Error(delAErr.message);

      const { error: delQErr } = await supabase
        .from('questions')
        .delete()
        .in('question_id', oldQIds);
      if (delQErr) throw new Error(delQErr.message);
    }

    for (const q of slides) {
      const { data: question, error: insertQErr } = await supabase
        .from('questions')
        .insert([{
          quiz_id,
          question_text: q.text,
          media_url: q.image || null,
        }])
        .select()
        .single();

      if (insertQErr) throw new Error(insertQErr.message);

      for (let i = 0; i < q.answers.length; i++) {
        const answer = q.answers[i];
        const answerText = typeof answer === 'string' ? answer : answer.answer_text || "";
        const imageUrl = typeof answer === 'object' && answer.image ? answer.image : null;
        const isCorrect = q.correct.includes(i);

        const { error: insertAErr } = await supabase
          .from('answers')
          .insert([{
            question_id: question.question_id,
            answer_text: answerText,
            image_url: imageUrl,
            is_correct: isCorrect,
          }]);

        if (insertAErr) throw new Error(insertAErr.message);
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error updating quiz:', err.message);
    res.status(500).json({ error: 'Failed to update quiz.' });
  }
});

// DELETE a quiz and its associated data
router.delete('/:id', requireAdmin, async (req, res) => {
  const quiz_id = req.params.id;

  try {
    const { data: questions, error: qErr } = await supabase
      .from('questions')
      .select('question_id')
      .eq('quiz_id', quiz_id);

    if (qErr) throw new Error(qErr.message);

    const questionIds = questions.map(q => q.question_id);

    if (questionIds.length > 0) {
      const { error: delAnsErr } = await supabase
        .from('answers')
        .delete()
        .in('question_id', questionIds);
      if (delAnsErr) throw new Error(delAnsErr.message);

      const { error: delQErr } = await supabase
        .from('questions')
        .delete()
        .in('question_id', questionIds);
      if (delQErr) throw new Error(delQErr.message);
    }

    const { error: delQuizErr } = await supabase
      .from('quizzes')
      .delete()
      .eq('quiz_id', quiz_id);

    if (delQuizErr) throw new Error(delQuizErr.message);

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Error deleting quiz:', err.message);
    res.status(500).json({ error: 'Failed to delete quiz.' });
  }
});

export default router;
