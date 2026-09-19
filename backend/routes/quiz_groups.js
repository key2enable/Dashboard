// File: backend/routes/quiz_groups.js
import express from 'express';
import supabase from '../supabaseClient.js';
import { requireTeacher } from '../middleware/auth.js';

const router = express.Router();

// GET all groups assigned to a specific quiz
router.get('/:quiz_id', async (req, res) => {
  const { quiz_id } = req.params;

  const { data, error } = await supabase
    .from('quiz_groups')
    .select('group_id')
    .eq('quiz_id', quiz_id);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data.map(d => d.group_id));
});

// POST assign groups to a quiz (bulk insert)
router.post('/', requireTeacher, async (req, res) => {
  const { quiz_id, group_ids } = req.body;

  if (!quiz_id || !Array.isArray(group_ids)) {
    return res.status(400).json({ error: 'Missing quiz_id or group_ids array' });
  }

  const insertData = group_ids.map(group_id => ({ quiz_id, group_id }));

  // Optional: Remove previous assignments (to reset selection)
  await supabase.from('quiz_groups').delete().eq('quiz_id', quiz_id);

  const { data, error } = await supabase
    .from('quiz_groups')
    .insert(insertData)
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

export default router;
