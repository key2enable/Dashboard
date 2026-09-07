import express from 'express';
import supabase from '../supabaseClient.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// UAE holidays and weekends helper
const isHoliday = (dateStr) => {
  const date = new Date(dateStr);
  const dayOfWeek = date.getDay(); // 0=Sun, 5=Fri, 6=Sat
  
  // UAE weekends: Friday (5) and Saturday (6)
  if (dayOfWeek === 5 || dayOfWeek === 6) return true;
  
  // UAE National holidays (static for 2026)
  const holidays = [
    '2026-04-09', // Eid Al Fitr (approx)
    '2026-04-10',
    '2026-06-15', // Arafat Day
    '2026-06-16', // Eid Al Adha
    '2026-06-17',
    '2026-07-07', // Islamic New Year
    '2026-09-15', // Prophet's Birthday
    '2026-12-02', // National Day
    '2026-12-03',
  ];
  
  return holidays.includes(dateStr);
};

// GET attendance entries (optionally filter by month)
router.get('/', async (req, res) => {
  const { month , group_id } = req.query;

  let query = supabase
    .from("attendance_entries")
    .select("*, students(name, group_id)");

  if (month) {
    query = query.eq("month", month);
  }
  if (group_id) query = query.eq("group_id", group_id);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});


// POST attendance entry (new)
router.post('/', async (req, res) => {
  const { student_id, date, status, month, country } = req.body;

  if (!student_id || !date || status === undefined || status === null || !month || !country) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Fetch group_id from student
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('group_id')
    .eq('id', student_id)
    .single();

  if (studentError || !student) {
    return res.status(404).json({ error: 'Student or group not found' });
  }

  const { data, error } = await supabase
    .from('attendance_entries')
    .insert([{
      id: uuidv4(),
      student_id,
      date,
      status: status === "" ? null : status,
      month,
      country,
      group_id: student.group_id
    }])
    .select();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ message: 'Attendance recorded', data });
});

// PUT update attendance status
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  let status = req.body.status ?? null;
  
  // Normalize: empty string or whitespace = null
  if (typeof status === 'string' && status.trim() === '') {
    status = null;
  }
  
  if (status === null) {
    const { error } = await supabase
      .from('attendance_entries')
      .update({ status: null })
      .eq('id', id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ message: "Status cleared successfully" });
  }

  if (!['P', 'A', 'H'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }
  
  const { error } = await supabase
    .from('attendance_entries')
    .update({ status })
    .eq('id', id);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ message: 'Attendance updated successfully' });
});

// Fill ONLY actual holidays (weekends + public holidays) for a given month
router.post('/fill-holidays', async (req, res) => {
  const { month } = req.body;
  if (!month) return res.status(400).json({ error: "Missing month" });

  const [monthName, year] = month.split(" ");
  const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const { data: students, error: studentErr } = await supabase
    .from("students")
    .select("id, country, group_id");

  if (studentErr) return res.status(500).json({ error: studentErr.message });

  const missingEntries = [];
  let processedDays = 0;
  let filledDays = 0;

  for (const student of students) {
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, monthIndex, d).toISOString().split("T")[0];
      processedDays++;

      // ONLY process if it's an actual holiday (weekend or public holiday)
      if (!isHoliday(date)) {
        continue;
      }

      const { data: existing, error } = await supabase
        .from("attendance_entries")
        .select("id")
        .eq("student_id", student.id)
        .eq("date", date);

      if (error) return res.status(500).json({ error: error.message });

      // Only insert if no entry exists for this holiday
      if (!existing || existing.length === 0) {
        missingEntries.push({
          id: uuidv4(),
          student_id: student.id,
          date,
          status: "H",
          month,
          country: student.country,
          group_id: student.group_id
        });
        filledDays++;
      }
    }
  }

  if (missingEntries.length > 0) {
    const { error: insertError } = await supabase
      .from("attendance_entries")
      .insert(missingEntries);

    if (insertError) return res.status(500).json({ error: insertError.message });
  }

  res.json({ 
    message: `Filled ${missingEntries.length} holiday entries for ${month}`,
    filled: filledDays,
    total: processedDays
  });
});

export default router;
