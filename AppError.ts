import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors';

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ ok: false, message: err.message });
    return;
  }

  // ID inválido de MongoDB
  if (err instanceof Error && err.name === 'CastError') {
    res.status(400).json({ ok: false, message: 'ID inválido' });
    return;
  }

  console.error('[ERROR]', err);
  res.status(500).json({ ok: false, message: 'Error interno del servidor' });
};
