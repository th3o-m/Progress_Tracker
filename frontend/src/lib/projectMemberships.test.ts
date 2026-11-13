import assert from "node:assert/strict";
import test from "node:test";
import { normalizeProjectMemberships } from "./projectMemberships";

const project = {
  id: "project-1",
  name: "Water Quality",
  description: null,
  district: "Central",
  sector: "Environment",
  status: "active",
};

test("returns an empty list for absent and invalid project collections", () => {
  for (const input of [null, undefined, {}, "no projects", 123]) {
    assert.deepEqual(normalizeProjectMemberships(input), []);
  }
});

test("skips null memberships and missing nested projects without crashing", () => {
  const input = [
    null,
    { role: "admin", district: null, projects: null },
    { role: "admin", projects: [null] },
    { role: "admin", projects: { ...project, status: "cancelled" } },
    { role: "supervisor", district: "Central", projects: project },
  ];
  const result = normalizeProjectMemberships(input);
  assert.equal(result.length, 1);
  assert.equal(result[0].projects.id, project.id);
  assert.equal(result[0].role, "supervisor");
  assert.equal(result[0].district, "Central");
});

test("accepts an array relationship even if an earlier element is null", () => {
  const input = [{ id: "membership-1", role: "officer", district: null, projects: [null, project] }];
  assert.deepEqual(normalizeProjectMemberships(input), [{
    id: "membership-1",
    role: "officer",
    district: null,
    projects: project,
  }]);
});

test("rejects incomplete projects and unknown roles or statuses", () => {
  const result = normalizeProjectMemberships([
    { role: "administrator", projects: project },
    { role: "admin", projects: { id: null, name: "Untitled", status: "active" } },
    { role: "admin", projects: { id: "x", status: "active" } },
    { role: "admin", projects: { ...project, status: "deleted" } },
    { role: "admin", projects: project },
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].role, "admin");
});

test("does not mutate API membership records", () => {
  const row = { role: "finance", district: undefined, projects: project };
  const results = normalizeProjectMemberships([row]);
  assert.equal(results[0].district, null);
  assert.equal(row.district, undefined);
  assert.equal(results[0].projects, project);
});
