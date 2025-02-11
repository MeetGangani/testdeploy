import jwt from 'jsonwebtoken';

const generateToken = (res, userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });

  // Set cookie with correct domain and path
  res.cookie('jwt', token, {
    httpOnly: true,
    secure: true,  // Always true for deployed backend
    sameSite: 'none',  // Required for cross-site cookies
    domain: '.onrender.com',  // Match your domain
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });

  // Log cookie being set
  console.log('Setting JWT cookie');
};

export default generateToken;
