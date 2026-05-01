import rateLimit from 'express-rate-limit'

export const otpRateLimitter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10, 
  message: 'Too many otp attempts, please try again after 10 minutes',
  standardHeaders: 'draft-8',
});
