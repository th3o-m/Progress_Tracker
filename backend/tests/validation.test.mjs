import test from 'node:test';
import assert from 'node:assert/strict';
import * as s from '../dist/schemas/index.js';
import { parseBody, ApiError } from '../dist/utils/http.js';
const id = '22222222-2222-4222-8222-222222222222';

test('create defaults apply, but updates never reset omitted status, progress or resolution', () => {
  assert.equal(s.createProjectSchema.parse({ name: ' Test ' }).status, 'active');
  assert.equal(s.createChallengeSchema.parse({ activity_id: id, challenge_type: 'risk', description: 'Test' }).resolved, false);
  const activity = { name: 'Task', category: 'Work', district: 'North', start_date: '2026-01-01', end_date: '2026-02-01', status: 'Started' };
  assert.equal(s.createActivitySchema.parse(activity).progress_pct, 0);
  assert.deepEqual(s.updateProjectSchema.parse({ name: ' Renamed ' }), { name: 'Renamed' });
  assert.deepEqual(s.updateActivitySchema.parse({ name: 'Renamed' }), { name: 'Renamed' });
  assert.deepEqual(s.updateChallengeSchema.parse({ description: 'Updated' }), { description: 'Updated' });
  assert.deepEqual(s.updateChallengeSchema.parse({ resolved: false }), { resolved: false });
  assert.deepEqual(s.updateActivitySchema.parse({ progress_pct: '0' }), { progress_pct: 0 });
});

test('empty updates and unknown fields remain rejected', () => {
  for (const schema of [s.updateProjectSchema, s.updateChallengeSchema, s.updateProgressSchema, s.updateFinancialSchema, s.updateProfileSchema, s.updateProjectMemberSchema]) {
    assert.equal(schema.safeParse({}).success, false);
    assert.equal(schema.safeParse({ unexpected: true }).success, false);
  }
  assert.equal(s.createProjectSchema.safeParse({ name: 'Test', is_org_admin: true }).success, false);
});

test('numeric coercion, decimal amounts and progress bounds remain enforced', () => {
  const financial = { activity_id: id, expense_category: 'Travel', amount: '12.34', description: 'Taxi' };
  assert.equal(s.createFinancialSchema.parse(financial).amount, 12.34);
  for (const amount of [-1, 'bad', 1.001, Infinity]) assert.equal(s.createFinancialSchema.safeParse({ ...financial, amount }).success, false);
  for (const progress_pct of [-1, 101, 1.5, 'bad', Infinity]) assert.equal(s.updateActivitySchema.safeParse({ progress_pct }).success, false);
  assert.equal(s.updateActivitySchema.parse({ progress_pct: '100' }).progress_pct, 100);
});

test('blank nullable values and arbitrary import records retain their meanings', () => {
  const result = s.reportImportSchema.parse({ budget: '', start_date: '', percentage_completion: '', executive_summary: ' ', milestones: ' First ', raw_data: { nested: { values: [1, null, true] } } });
  assert.equal(result.budget, null);
  assert.equal(result.start_date, null);
  assert.equal(result.percentage_completion, null);
  assert.equal(result.executive_summary, null);
  assert.deepEqual(result.milestones, ['First']);
  assert.deepEqual(result.raw_data, { nested: { values: [1, null, true] } });
  assert.deepEqual(result.warnings, []);
  assert.equal(result.overwrite, false);
  assert.equal(s.reportImportSchema.safeParse({ raw_data: [] }).success, false);
});

test('date ordering, identifiers, roles and invitation limits reject invalid requests', () => {
  assert.equal(s.createProjectSchema.safeParse({ name: 'Test', start_date: '2026-02-01', end_date: '2026-01-01' }).success, false);
  assert.equal(s.updateProjectSchema.safeParse({ end_date: '2026-02-01' }).success, true);
  assert.equal(s.createProgressSchema.safeParse({ activity_id: 'bad' }).success, false);
  assert.equal(s.addProjectMemberSchema.safeParse({ email: 'a@example.com', role: 'owner' }).success, false);
  assert.deepEqual(s.addProjectMemberSchema.parse({ email: ' A@EXAMPLE.COM ', role: 'officer' }), { email: 'a@example.com', role: 'officer' });
  assert.equal(s.createProjectInvitationSchema.parse({ expiresInDays: '7' }).expiresInDays, 7);
  for (const expiresInDays of [0, 91, 1.5]) assert.equal(s.createProjectInvitationSchema.safeParse({ expiresInDays }).success, false);
});

test('validation failures preserve the API 400 field and form error contract', () => {
  assert.throws(() => parseBody(s.createProjectSchema, { name: '' }), error => error instanceof ApiError && error.status === 400 && Array.isArray(error.details.name));
  assert.throws(() => parseBody(s.updateProjectSchema, {}), error => error instanceof ApiError && error.status === 400 && Array.isArray(error.details._form));
});
