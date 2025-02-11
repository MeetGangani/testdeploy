import jwt from 'jsonwebtoken';

const generateToken = (res, userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });

  // Set JWT Cookie - simplified for development
  res.cookie('jwt', token, {
    httpOnly: true,
    secure: false, // Set to false in development
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: '/'
  });

  console.log('Setting JWT cookie with token:', token.substring(0, 10) + '...');
};

export default generateToken;
