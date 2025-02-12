import express from 'express';
import {
  authUser,
  registerUser,
  logoutUser,
  getUserProfile,
  updateUserProfile,
  googleAuth,
  googleAuthCallback
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';
import passport from 'passport';

const router = express.Router();

router.post('/', registerUser);
router.post('/auth', authUser);
router.post('/logout', logoutUser);
router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

// Google OAuth routes
router.get('/auth/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

router.get('/auth/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: '/login?error=auth_failed',
    session: false 
  }),
  (req, res) => {
    // Successful authentication, redirect home.
    res.redirect('/student-dashboard');
  }
);

export default router;
