import { Request, Response, NextFunction, RequestHandler } from 'express';

// Elimina el try/catch repetido en cada controller.
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
