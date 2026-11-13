import type { Project, ProjectMembership } from "../app/components/ProjectSwitcher";

// The /users/me response is external data. A missing nested project or an
// unexpected null membership must not crash the project picker or dashboard.
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isProject(value: unknown): value is Project {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" && value.id.length > 0 &&
    typeof value.name === "string" && value.name.trim().length > 0 &&
    (value.status === "active" || value.status === "completed" || value.status === "on_hold");
}

function isRole(value: unknown): value is ProjectMembership["role"] {
  return value === "admin" || value === "supervisor" || value === "finance" || value === "officer";
}

export function normalizeProjectMemberships(value: unknown): ProjectMembership[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((membership: unknown): ProjectMembership[] => {
    if (!isRecord(membership) || !isRole(membership.role)) return [];

    const candidates = Array.isArray(membership.projects)
      ? membership.projects
      : [membership.projects];
    const project = candidates.find(isProject);
    if (!project) return []; // Includes cancelled and missing projects.

    return [{
      ...(typeof membership.id === "string" ? { id: membership.id } : {}),
      role: membership.role,
      district: typeof membership.district === "string" ? membership.district : null,
      projects: project,
    }];
  });
}
