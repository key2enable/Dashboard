// import express from 'express';
// import multer from 'multer';
// import fs from 'fs';
// import { GoogleGenerativeAI } from '@google/generative-ai';
// import supabase from '../supabaseClient.js';

// const router = express.Router();
// const upload = multer({ dest: 'uploads/' });
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// // POST /auto-grade
// router.post('/', upload.single('worksheet'), async (req, res) => {
//   const imagePath = req.file?.path;

//   if (!imagePath) {
//     console.error("🚫 No file received in request.");
//     return res.status(400).json({ error: "No file uploaded" });
//   }

//   try {
//     const { language, month, group_id, week, week_start, week_end } = req.body;
//     console.log("📥 Request body:", req.body);

//     const imageData = fs.readFileSync(imagePath);
//     const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

//     const prompt = `
// You are grading a student worksheet. At the top is the student's full name.

// Each question has:
// - A printed LETTER (A to Z)
// - A row of 3 or more images
// - The student has selected one or more images (highlighted or circled)

// You must:
// 1. Extract the **student's full name** at the top.
// 2. For each letter, check:
//    - How many images were selected
//    - If exactly 1 image is selected, it is "correct": true
//    - If more than 1, it's "correct": false

// Return only clean JSON like:
// {
//   "student_name": "Ernest 2",
//   "answers": [
//     { "letter": "M", "selections": 1, "correct": true },
//     { "letter": "Q", "selections": 2, "correct": false }
//   ]
// }
// `;

//     console.log("🧠 Sending prompt to Gemini...");
//     const result = await model.generateContent([
//       prompt,
//       {
//         inlineData: {
//           data: imageData.toString('base64'),
//           mimeType: 'image/png',
//         },
//       },
//     ]);

//     const outputText = result.response.text().trim();
// const cleanText = outputText.replace(/^```json|```$/g, '').trim(); // remove markdown code block
// let parsed;
// try {
//   parsed = JSON.parse(cleanText);
// } catch (e) {
//   throw new Error("❌ Could not parse Gemini output. Raw text: " + outputText);
// }


//     const studentName = parsed.student_name?.trim();
//     const graded = parsed.answers;

//     if (!studentName) {
//       throw new Error("❌ Student name not extracted from worksheet.");
//     }

//     console.log("✅ Student extracted:", studentName);
//     console.log("📝 Graded answers:", graded);

//     const { data: student, error } = await supabase
//       .from("students")
//       .select("id")
//       .eq("name", studentName)
//       .single();

//     if (error || !student) {
//       throw new Error(`❌ Student "${studentName}" not found in Supabase.`);
//     }

//     console.log("🎯 Matched student ID:", student.id);

//     const insertPromises = graded.map((entry) =>
//       supabase.from("assessment_scores").insert({
//         student_id: student.id,
//         category: entry.letter,
//         raw_score: entry.correct ? 1 : 0,
//         max_score: 1,
//         language,
//         month,
//         group_id,
//         week: week || null,
//         week_start: week_start || null,
//         week_end: week_end || null,
//       })
//     );

//     await Promise.all(insertPromises);
//     fs.unlinkSync(imagePath); // cleanup

//     console.log(`✅ Auto-grade complete for ${studentName}`);
//     res.json({ success: true, student_name: studentName, graded });

//   } catch (err) {
//     console.error("🔥 Error grading worksheet:", err.message);
//     if (imagePath && fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
//     res.status(500).json({ error: err.message });
//   }
// });

// export default router;
import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import supabase from '../supabaseClient.js';
import { requireTeacher } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post('/', requireTeacher, upload.single('worksheet'), async (req, res) => {
  const imagePath = req.file?.path;

  if (!imagePath) {
    console.error("🚫 No file received in request.");
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const { language, month, group_id, week, week_start, week_end } = req.body;

    const imageData = fs.readFileSync(imagePath);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
You are grading a student worksheet. At the top is the student's full name.

Each question has:
- A printed LETTER (A to Z)
- A row of 3 or more images
- The student has selected one or more images (highlighted or circled)

You must:
1. Extract the **student's full name** at the top.
2. For each letter, check:
   - How many images were selected
   - If exactly 1 image is selected, it is "correct": true
   - If more than 1, it's "correct": false

Return only clean JSON like:
{
  "student_name": "Ernest 2",
  "answers": [
    { "letter": "M", "selections": 1, "correct": true },
    { "letter": "Q", "selections": 2, "correct": false }
  ]
}
`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageData.toString('base64'),
          mimeType: 'image/png',
        },
      },
    ]);

    const outputText = result.response.text().trim();
    const cleanText = outputText.replace(/^```json|```$/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleanText);
    } catch (e) {
      throw new Error("❌ Could not parse Gemini output. Raw text: " + outputText);
    }

    const studentName = parsed.student_name?.trim();
    const graded = parsed.answers;

    if (!studentName) {
      throw new Error("❌ Student name not extracted from worksheet.");
    }

    const { data: student, error } = await supabase
      .from("students")
      .select("id")
      .eq("name", studentName)
      .single();

    if (error || !student) {
      throw new Error(`❌ Student "${studentName}" not found in Supabase.`);
    }

    // Aggregate scoring
    const raw_score = graded.filter((entry) => entry.correct).length;
    const max_score = graded.length;

    await supabase.from("assessment_scores").insert({
      student_id: student.id,
      category: "Letters",
      raw_score,
      max_score,
      language,
      month,
      group_id,
      week: week || null,
      week_start: week_start || null,
      week_end: week_end || null,
    });

    fs.unlinkSync(imagePath); // cleanup

    res.json({ success: true, student_name: studentName, raw_score, max_score });

  } catch (err) {
    console.error("🔥 Error grading worksheet:", err.message);
    if (imagePath && fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    res.status(500).json({ error: err.message });
  }
});

export default router;
