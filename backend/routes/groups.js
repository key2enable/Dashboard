// routes/groups.js
import express from 'express';
import supabase from '../supabaseClient.js';
import { requireAdmin, requireTeacher } from '../middleware/auth.js';

const router = express.Router();

// GET all groups
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('groups')
    .select('id, name')
    .order('name', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /groups/for-teacher?clerk_user_id=...
router.get('/for-teacher', requireTeacher, async (_req, res) => {
  const { data: groups, error: groupsErr } = await supabase
    .from('groups')
    .select('*')
    .order('name', { ascending: true });

  if (groupsErr) return res.status(500).json({ error: groupsErr.message });

  res.json(groups);
});

router.post('/', requireAdmin, async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Missing group name' });
  }

  const { data: newGroup, error: insertError } = await supabase
    .from('groups')
    .insert([{ name }])
    .select()
    .maybeSingle();

  if (insertError) return res.status(500).json({ error: insertError.message });

  res.status(201).json(newGroup);
});


export default router;
