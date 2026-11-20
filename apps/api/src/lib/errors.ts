export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export const Unauthenticated = () => new AppError(401, 'UNAUTHENTICATED', 'Please log in.');
export const Forbidden = (msg = 'You do not have permission to do this.') =>
  new AppError(403, 'FORBIDDEN', msg);
export const NotFound = (what = 'Resource') => new AppError(404, 'NOT_FOUND', `${what} not found.`);
