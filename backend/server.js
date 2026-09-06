import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Route imports
import studentRoutes from './routes/students.js';
import attendanceRoutes from './routes/attendance.js';
import assessmentRoutes from './routes/assessments.js';
import statsRoutes from './routes/stats.js';
import lessonRoutes from './routes/lessonPlans.js';
import reportRoutes from './routes/generateReports.js';
import groupRoutes from './routes/groups.js';
import studentDashboardRoute from './routes/studentDashboard.js';
import teachersRoutes from './routes/teachers.js';
import clerkRoutes from './routes/clerk.js';
import autoGradeRoutes from './routes/autoGrade.js';
import translateRoute from './routes/translate.js';
import quizzesRouter from './routes/quizzes.js';
import studentAnswerRoutes from './routes/student_answers.js';
import quizGroupRoutes from './routes/quiz_groups.js';
import studentQuizzesRoute from './routes/studentQuizzes.js';
import quizFolderRoutes from './routes/quiz_folders.js';
import moodEntryRoutes from './routes/moodEntries.js';


// Environment setup
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.originalUrl}`);
  next();
});

// API Routes
app.use('/students', studentRoutes);
app.use('/attendance', attendanceRoutes);
app.use('/assessments', assessmentRoutes);
app.use('/stats', statsRoutes);
app.use('/lesson-plans', lessonRoutes);
app.use('/reports', reportRoutes);
app.use('/ai-reports', reportRoutes);
app.use('/groups', groupRoutes);
app.use('/student-dashboard', studentDashboardRoute);
app.use('/teachers', teachersRoutes);
app.use('/clerk', clerkRoutes);
app.use('/auto-grade', autoGradeRoutes);
app.use('/quizzes', quizzesRouter);
app.use('/quiz-groups', quizGroupRoutes);
app.use('/quiz-folders', quizFolderRoutes); 
app.use('/student-answers', studentAnswerRoutes);
app.use('/student-quizzes', studentQuizzesRoute);
// NOTE: mounted WITHOUT the global requireAuth wrapper you're adding
// per the security audit — POST /mood-entries/kiosk must stay
// reachable from the unauthenticated door-screen device. The two
// teacher-facing GET routes in this file guard themselves with
// requireTeacher internally. Do not wrap this whole router in
// requireAuth when you apply Critical #1.
app.use('/mood-entries', moodEntryRoutes);
app.use('/api', translateRoute);

// Health check
app.get('/', (req, res) => {
  res.send('✅ Key2Enable backend is up and running!');
});

// Start server — only when running locally. On Vercel, the platform
// invokes the exported app as a serverless function instead of us
// calling .listen() ourselves.
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
  });
}

export default app;
