import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from '../errors';
import { TokenBlacklist } from '../user/tokenBlacklist.model';

export interface JwtPayload {
  userId: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// Verifica token JWT y que no esté en la blacklist (logout)
export const authenticate = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AppError('No autorizado', 401));
  }

  const token = header.split(' ')[1];

  try {
    const payload = jwt.verify(token, config.jwt.secret) as JwtPayload;

    // Verificar si el token fue invalidado por logout
    const isBlacklisted = await TokenBlacklist.findOne({ token }).lean();
    if (isBlacklisted) {
      return next(new AppError('No autorizado', 401));
    }

    req.user = payload;
    next();
  } catch {
    next(new AppError('No autorizado', 401));
  }
};

export const requireAdmin = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'admin') {
    return next(new AppError('No autorizado', 401));
  }
  next();
};
