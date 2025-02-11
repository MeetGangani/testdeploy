import express from 'express';
import {
  getAvailableExams,
  startExam,
  submitExam,
  releaseResults,
  getMyResults,
  getExamResults
} from '../controllers/examController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Remove role restrictions
router.get('/available', protect, getAvailableExams);
router.post('/start', protect, startExam);
router.post('/submit', protect, submitExam);
router.get('/my-results', protect, getMyResults);
router.get('/results/:examId', protect, getExamResults);
router.post('/release/:examId', protect, releaseResults);

export default router; 