/** Erreur métier dont le message peut être montré tel quel à l'utilisateur. */
export class AppError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
  }
}

export const notFound = (what = "Élément") => new AppError(`${what} introuvable.`, 404);
export const forbidden = () => new AppError("Vous n'avez pas accès à cette ressource.", 403);
export const invalid = (fieldErrors: Record<string, string>) =>
  new AppError("Certains champs sont à corriger.", 422, fieldErrors);
export const conflict = (message: string) => new AppError(message, 409);
