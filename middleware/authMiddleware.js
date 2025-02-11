import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import User from '../models/userModel.js';

const protect = asyncHandler(async (req, res, next) => {
  console.log('Cookies received:', req.cookies);
  let token;

  token = req.cookies.jwt;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Token verified, user ID:', decoded.userId);

      req.user = await User.findById(decoded.userId).select('-password');
      next();
    } catch (error) {
      console.error('Token verification failed:', error);
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
  } else {
    console.log('No token found in cookies');
    res.status(401);
    throw new Error('Not authorized, no token');
  }
});

const adminOnly = asyncHandler(async (req, res, next) => {
  if (req.user && req.user.userType === 'admin') {
    next();
  } else {
    res.status(403);
    throw new Error('Not authorized as an admin');
  }
});

const instituteOnly = asyncHandler(async (req, res, next) => {
  if (req.user && req.user.userType === 'institute') {
    next();
  } else {
    res.status(403);
    throw new Error('Not authorized as an institute');
  }
});

const studentOnly = asyncHandler(async (req, res, next) => {
  if (req.user && req.user.userType === 'student') {
    next();
  } else {
    res.status(403);
    throw new Error('Not authorized as a student');
  }
});

export { protect, adminOnly, instituteOnly, studentOnly };
