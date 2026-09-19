
// backend/lessonPlans.js
import express from 'express';
import supabase from '../supabaseClient.js';
import multer from 'multer';
import { requireAdmin, requireTeacher } from '../middleware/auth.js';
const upload = multer();
const router = express.Router();


router.get('/', requireTeacher, async (req, res) => {
  const { month, week, language, group_id } = req.query;

  if (!month || !language || !group_id) {
    return res.status(400).json({ error: "Missing month, language, or group_id" });
  }

  try {
    let query = supabase
      .from('lesson_plans')
      .select('*')
      .eq('month', month)
      .eq('language', language)
      .eq('group_id', group_id);

    if (week) query = query.eq('week', week);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get('/all', requireTeacher, async (req, res) => {
  try {
    const { data, error } = await supabase.from('lesson_plans').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post('/', requireTeacher, async (req, res) => {
  const { month, week, week_start, week_end, category, language, content, group_id } = req.body;

  const { data, error } = await supabase
    .from('lesson_plans')
    .insert([{ month, week, week_start, week_end, category, language, content, group_id }])
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});

// DELETE /lesson-plans/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  // First, delete associated files
  const { data: files, error: fetchFilesError } = await supabase
    .from('lesson_plan_files')
    .select('*')
    .eq('lesson_plan_id', id);

  if (fetchFilesError) return res.status(500).json({ error: fetchFilesError.message });

  for (let file of files) {
    const path = decodeURIComponent(new URL(file.file_url).pathname.replace(/^\/storage\/v1\/object\/public\/lesson-files\//, ''));
    await supabase.storage.from('lesson-files').remove([path]);
  }

  // Delete file metadata
  await supabase.from('lesson_plan_files').delete().eq('lesson_plan_id', id);

  // Then delete the lesson plan itself
  const { error } = await supabase
    .from('lesson_plans')
    .delete()
    .eq('id', id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// DELETE /lesson-plans/files/:id
router.delete('/files/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  // 1. Get file metadata from DB
  const { data: fileData, error: selectError } = await supabase
    .from('lesson_plan_files')
    .select('*')
    .eq('id', id)
    .single();

  if (selectError || !fileData?.file_url) {
    return res.status(404).json({ error: 'File not found or invalid URL' });
  }

  try {
    // 2. Extract clean path from the public URL
    const fullUrl = new URL(fileData.file_url);
    const encodedPath = fullUrl.pathname;
    const cleanedPath = decodeURIComponent(encodedPath.replace(/^\/storage\/v1\/object\/public\/lesson-files\//, ''));

    // 3. Delete from Supabase Storage
    const { error: storageError } = await supabase
      .storage
      .from('lesson-files')
      .remove([cleanedPath]);

    if (storageError) {
      console.error("Storage deletion error:", storageError.message);
      return res.status(500).json({ error: storageError.message });
    }

    // 4. Delete from DB
    const { error: deleteError } = await supabase
      .from('lesson_plan_files')
      .delete()
      .eq('id', id);

    if (deleteError) return res.status(500).json({ error: deleteError.message });

    return res.json({ success: true });
  } catch (err) {
    console.error("❌ Invalid file URL:", fileData.file_url);
    return res.status(400).json({ error: 'Invalid file URL format' });
  }
});

router.put('/:id', requireTeacher, async (req, res) => {
  const { month, week, week_start, week_end, category, language, content } = req.body;
  const { id } = req.params;

  const { data, error } = await supabase
    .from('lesson_plans')
    .update({ month, week, week_start, week_end, category, language, content })
    .eq('id', id)
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data[0]);
});
// backend/routes/lessonPlans.js
router.get('/:id/files', requireTeacher, async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase
    .from('lesson_plan_files')
    .select('*')
    .eq('lesson_plan_id', id);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/upload-multiple', requireTeacher, upload.array('files'), async (req, res) => {
  const { lesson_plan_id } = req.body;
  const files = req.files;
  if (!lesson_plan_id || !files?.length) return res.status(400).json({ error: 'Missing data' });

  const uploadedFiles = [];

  for (let file of files) {
    const filePath = `${Date.now()}_${file.originalname}`;
    const { error: uploadError } = await supabase
      .storage.from('lesson-files')
      .upload(filePath, file.buffer, { contentType: file.mimetype });

    if (uploadError) return res.status(500).json({ error: uploadError.message });

    const { data: urlData } = supabase
  .storage
  .from('lesson-files')
  .getPublicUrl(filePath);

const publicUrl = urlData?.publicUrl;
    const { error: insertError } = await supabase
      .from('lesson_plan_files')
      .insert([{ lesson_plan_id, file_url: publicUrl, file_name: file.originalname }]);

    if (insertError) return res.status(500).json({ error: insertError.message });

    uploadedFiles.push(publicUrl);
  }

  res.json({ success: true, urls: uploadedFiles });
});

router.delete('/files/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { data: fileData, error: fetchError } = await supabase
    .from('lesson_plan_files').select('*').eq('id', id).single();

  if (fetchError || !fileData?.file_url) return res.status(404).json({ error: 'File not found' });

  try {
    const path = decodeURIComponent(new URL(fileData.file_url).pathname.replace(/^\/storage\/v1\/object\/public\/lesson-files\//, ''));
    await supabase.storage.from('lesson-files').remove([path]);
    await supabase.from('lesson_plan_files').delete().eq('id', id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Invalid file URL' });
  }
});



export default router;
