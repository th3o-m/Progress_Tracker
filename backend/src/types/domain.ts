export const roles = ['officer', 'supervisor', 'finance', 'admin'] as const;
export type Role = (typeof roles)[number];

export interface AuthUser {
  id: string;
  email: string;
  isOrgAdmin: boolean;
}

export interface ProjectContext {
  projectId: string;
  roleInProject: Role;
  district: string | null;
}
