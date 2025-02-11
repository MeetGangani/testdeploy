import jwt from 'jsonwebtoken';

const generateToken = (res, userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });

  // Even though NODE_ENV is 'development', we need secure cookies for deployed backend
  res.cookie('jwt', token, {
    httpOnly: true,
    secure: true,  // Always true for deployed backend
    sameSite: 'none',  // Required for cross-site cookies
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
};

export default generateToken;
