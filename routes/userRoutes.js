import express from 'express';
import {
  authUser,
  registerUser,
  logoutUser,
  getUserProfile,
  updateUserProfile,
  googleAuth,
  googleAuthCallback,
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', registerUser);
router.post('/auth', authUser);
router.post('/logout', logoutUser);
router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

// Remove role restrictions from these routes
router.get('/admin', protect, (req, res) => {
  res.json({ message: 'Access granted' });
});

router.get('/institute', protect, (req, res) => {
  res.json({ message: 'Access granted' });
});

router.get('/auth/google', googleAuth);
router.get('/auth/google/callback', googleAuthCallback);

export default router;
