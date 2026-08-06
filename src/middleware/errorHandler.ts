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

  if (err instanceof Error && err.name === 'CastError') {
    res.status(400).json({ ok: false, message: 'ID inválido' });
    return;
  }

  if (err instanceof Error && err.name === 'ValidationError') {
    const messages = Object.values((err as any).errors).map((e: any) => e.message);
    res.status(400).json({ ok: false, message: messages.join(', ') });
    return;
  }

  if (err instanceof Error && (err as any).code === 11000) {
    const field = Object.keys((err as any).keyValue ?? {})[0] ?? 'campo';
    res.status(409).json({ ok: false, message: `El ${field} ya está registrado` });
    return;
  }

  console.error('[ERROR]', err);
  res.status(500).json({ ok: false, message: 'Error interno del servidor' });
};
