export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(msg: string) { return new AppError(msg, 400); }
  static notFound(msg: string)   { return new AppError(msg, 404); }
  static internal(msg: string)   { return new AppError(msg, 500); }
}
