import type { AuthUser, ProjectContext } from './domain.js';

declare global {
  namespace Express {
    interface Request {
      user: AuthUser;
      context: ProjectContext;
    }
  }
}

export {};
