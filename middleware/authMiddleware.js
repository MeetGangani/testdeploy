import jwt from 'jsonwebtoken';
import asyncHandler from 'express-async-handler';
import User from '../models/userModel.js';

const protect = asyncHandler(async (req, res, next) => {
  let token;
  
  // Check for token in cookies
  token = req.cookies.jwt;
  
  if (!token) {
    // Check Authorization header as fallback
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer')) {
      token = authHeader.split(' ')[1];
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.userId).select('-password');
    next();
  } catch (error) {
    res.status(401);
    throw new Error('Not authorized, token failed');
  }
});

const checkUserType = (userType) => {
  return (req, res, next) => {
    if (req.user && req.user.userType === userType) {
      next();
    } else {
      res.status(401);
      throw new Error(`Not authorized as ${userType}`);
    }
  };
};

const admin = checkUserType('admin');
const adminOnly = admin; // Alias for backward compatibility
const instituteOnly = checkUserType('institute');
const studentOnly = checkUserType('student');

export { 
  protect,
  checkUserType,
  admin,
  adminOnly,
  instituteOnly,
  studentOnly
};
