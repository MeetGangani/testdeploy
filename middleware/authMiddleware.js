import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import User from '../models/userModel.js';

const protect = asyncHandler(async (req, res, next) => {
  let token;
  
  // Check Authorization header first
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else {
    // Fallback to cookies
    token = req.cookies.jwt;
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.userId).select('-password');
    
    if (!req.user) {
      res.status(401);
      throw new Error('User not found');
    }

    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    res.status(401);
    throw new Error('Not authorized, token failed');
  }
});

// Remove role restrictions for now
const adminOnly = (req, res, next) => next();
const instituteOnly = (req, res, next) => next();
const studentOnly = (req, res, next) => next();

export { protect, adminOnly, instituteOnly, studentOnly };
