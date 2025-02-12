import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import User from '../models/userModel.js';

const protect = asyncHandler(async (req, res, next) => {
  let token = req.cookies.jwt;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.userId).select('-password');
      next();
    } catch (error) {
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
  } else {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
});

const admin = (req, res, next) => {
  if (req.user && req.user.userType === 'admin') {
    next();
  } else {
    res.status(401);
    throw new Error('Not authorized as admin');
  }
};

const adminOnly = admin; // Alias for backward compatibility

const instituteOnly = (req, res, next) => {
  if (req.user && req.user.userType === 'institute') {
    next();
  } else {
    res.status(401);
    throw new Error('Not authorized as institute');
  }
};

const studentOnly = (req, res, next) => {
  if (req.user && req.user.userType === 'student') {
    next();
  } else {
    res.status(401);
    throw new Error('Not authorized as student');
  }
};

export { 
  protect, 
  admin,
  adminOnly, // Added this export
  instituteOnly, 
  studentOnly 
};
