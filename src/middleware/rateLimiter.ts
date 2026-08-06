import rateLimit from 'express-rate-limit';

// Login: máximo 10 intentos cada 15 minutos por IP
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { ok: false, message: 'Demasiados intentos. Esperá 15 minutos' },
});
