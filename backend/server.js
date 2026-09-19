import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { clerkMiddleware } from '@clerk/express';
import { requireAuthenticated } from './middleware/auth.js';

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
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(clerkMiddleware());
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.path}`);
  next();
});

// API Routes
app.use('/students', requireAuthenticated, studentRoutes);
app.use('/attendance', requireAuthenticated, attendanceRoutes);
app.use('/assessments', requireAuthenticated, assessmentRoutes);
app.use('/stats', requireAuthenticated, statsRoutes);
app.use('/lesson-plans', requireAuthenticated, lessonRoutes);
app.use('/reports', requireAuthenticated, reportRoutes);
app.use('/ai-reports', requireAuthenticated, reportRoutes);
app.use('/groups', requireAuthenticated, groupRoutes);
app.use('/student-dashboard', requireAuthenticated, studentDashboardRoute);
app.use('/teachers', requireAuthenticated, teachersRoutes);
app.use('/clerk', requireAuthenticated, clerkRoutes);
app.use('/auto-grade', requireAuthenticated, autoGradeRoutes);
app.use('/quizzes', requireAuthenticated, quizzesRouter);
app.use('/quiz-groups', requireAuthenticated, quizGroupRoutes);
app.use('/quiz-folders', requireAuthenticated, quizFolderRoutes); 
app.use('/student-answers', requireAuthenticated, studentAnswerRoutes);
app.use('/student-quizzes', requireAuthenticated, studentQuizzesRoute);
app.use('/mood-entries', moodEntryRoutes);
app.use('/api', requireAuthenticated, translateRoute);

// Health check
app.get('/', (req, res) => {
  res.send('✅ Key2Enable backend is up and running!');
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
