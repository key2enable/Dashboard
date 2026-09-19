import express from 'express';
import supabase from '../supabaseClient.js';
import { getTeacherByClerkId } from '../utils/helpers.js';
import { requireAdmin, requireTeacher } from '../middleware/auth.js';

const router = express.Router();

// GET all folders for a given teacher
router.get('/', requireTeacher, async (req, res) => {
  const clerk_user_id = req.authUserId;

  try {
    const teacher = await getTeacherByClerkId(clerk_user_id);
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

    const { data: folders, error } = await supabase
      .from('quiz_folders')
      .select('*')
      .eq('teacher_id', teacher.id);

    if (error) {
      console.error('Error fetching folders:', error.message);
      return res.status(500).json({ error: error.message });
    }

    res.json(folders);
  } catch (err) {
    console.error('Unexpected error:', err.message);
    res.status(500).json({ error: 'Unexpected server error' });
  }
});

// POST create new folder and assign quizzes by updating their folder_id
router.post('/', requireTeacher, async (req, res) => {
  const { folder_name, quiz_ids } = req.body;
  const clerk_user_id = req.authUserId;

  if (!folder_name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const teacher = await getTeacherByClerkId(clerk_user_id);
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

    // Create the folder
    const { data: folder, error: folderError } = await supabase
      .from('quiz_folders')
      .insert([{ folder_name, teacher_id: teacher.id }])
      .select()
      .single();

    if (folderError) {
      console.error('Error creating folder:', folderError.message);
      return res.status(500).json({ error: folderError.message });
    }

    // If any quizzes were selected, update their folder_id
    if (Array.isArray(quiz_ids) && quiz_ids.length > 0) {
      for (const quiz_id of quiz_ids) {
        const { error: updateError } = await supabase
          .from('quizzes')
          .update({ folder_id: folder.id })
          .eq('quiz_id', quiz_id);

        if (updateError) {
          console.error(`Failed to assign folder to quiz ${quiz_id}:`, updateError.message);
          return res.status(500).json({ error: `Failed to assign folder to quiz ${quiz_id}` });
        }
      }
    }

    res.status(201).json(folder);
  } catch (err) {
    console.error('Unexpected error:', err.message);
    res.status(500).json({ error: 'Unexpected server error' });
  }
});

// DELETE folder by ID
router.delete('/:folderId', requireAdmin, async (req, res) => {
  const { folderId } = req.params;

  try {
    const teacher = await getTeacherByClerkId(req.authUserId);
    const { data: folder, error: folderError } = await supabase
      .from('quiz_folders')
      .select('id')
      .eq('id', folderId)
      .eq('teacher_id', teacher?.id)
      .maybeSingle();
    if (folderError || !folder) return res.status(404).json({ error: 'Folder not found' });

    // Unassign all quizzes from this folder
    const { error: updateError } = await supabase
      .from('quizzes')
      .update({ folder_id: null })
      .eq('folder_id', folderId);

    if (updateError) {
      console.error('Error unassigning quizzes:', updateError.message);
      return res.status(500).json({ error: 'Failed to unassign quizzes from folder' });
    }

    // Then delete the folder
    const { error } = await supabase
      .from('quiz_folders')
      .delete()
      .eq('id', folderId);

    if (error) {
      console.error('Error deleting folder:', error.message);
      return res.status(500).json({ error: 'Failed to delete folder' });
    }

    res.status(200).json({ message: 'Folder deleted successfully' });
  } catch (err) {
    console.error('Unexpected server error:', err.message);
    res.status(500).json({ error: 'Unexpected server error' });
  }
});

export default router;
