import assert from "node:assert/strict";
import test from "node:test";
import { buildImportOutcome, type ImportCounts } from "./importOutcome";

const empty: ImportCounts = {
  activities: 0, progressUpdates: 0, challenges: 0, financialEntries: 0,
  projectDetails: 0, reportSnapshots: 0, financialSnapshots: 0,
};

test("confirmed writes produce a success message with actual counts", () => {
  const result = buildImportOutcome("November", { ...empty, activities: 12, progressUpdates: 12, challenges: 3 }, []);
  assert.equal(result.kind, "success");
  assert.equal(result.title, "Import successful");
  assert.match(result.detail, /12 activities created\/updated/);
  assert.match(result.detail, /12 progress updates saved/);
  assert.match(result.detail, /3 challenges saved/);
});

test("a failed auxiliary write reports completed with warnings", () => {
  const result = buildImportOutcome("November", { ...empty, activities: 1 }, ["Import history could not be saved."]);
  assert.equal(result.kind, "partial");
  assert.match(result.detail, /Import history could not be saved/);
});

test("a failure after a write reports partial import and warns before retry", () => {
  const result = buildImportOutcome("November", { ...empty, reportSnapshots: 1 }, [], "Request failed");
  assert.equal(result.kind, "partial");
  assert.match(result.title, /some data was saved/);
  assert.match(result.detail, /not automatically rolled back/);
});

test("a failure without acknowledged writes does not claim no data was saved", () => {
  const result = buildImportOutcome("November", empty, [], "Network timeout");
  assert.equal(result.kind, "error");
  assert.equal(result.title, "Import could not be confirmed");
  assert.match(result.detail, /Network timeout/);
  assert.match(result.detail, /before retrying/);
});

test("zero acknowledged writes never produces a success message", () => {
  const result = buildImportOutcome("November", empty, []);
  assert.equal(result.kind, "partial");
  assert.equal(result.title, "No new changes confirmed");
});
