import assert from "node:assert/strict";
import test from "node:test";
import { ApiRequestError, parseApiResponse } from "./apiResponse";

test("accepts a JSON account profile", async () => {
  const payload = { id: "test-user", is_org_admin: false, projects: [] };
  const response = new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
  assert.deepEqual(await parseApiResponse(response, "/users/me"), payload);
});

test("rejects a 200 HTML frontend fallback instead of showing a sign-in error", async () => {
  const response = new Response("<html>App shell</html>", {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
  await assert.rejects(
    () => parseApiResponse(response, "/users/me"),
    (error: unknown) => error instanceof ApiRequestError &&
      error.message.includes("VITE_API_URL") && error.message.includes("web page"),
  );
});

test("rejects null account JSON", async () => {
  const response = new Response("null", {
    status: 200, headers: { "content-type": "application/json" },
  });
  await assert.rejects(
    () => parseApiResponse(response, "/users/me"),
    (error: unknown) => error instanceof ApiRequestError &&
      error.message.includes("no account or project data"),
  );
});

test("preserves backend error messages and status", async () => {
  const response = new Response(JSON.stringify({ error: "User profile is missing or inactive" }), {
    status: 401, headers: { "content-type": "application/json" },
  });
  await assert.rejects(
    () => parseApiResponse(response, "/users/me"),
    (error: unknown) => error instanceof ApiRequestError &&
      error.status === 401 && error.message === "User profile is missing or inactive",
  );
});

test("handles an expected no-content success response", async () => {
  const response = new Response(null, { status: 204 });
  assert.equal(await parseApiResponse(response, "/projects/example"), null);
});

test("rejects malformed JSON", async () => {
  const response = new Response("{", {
    status: 200, headers: { "content-type": "application/json" },
  });
  await assert.rejects(
    () => parseApiResponse(response, "/users/me"),
    (error: unknown) => error instanceof ApiRequestError &&
      error.message.includes("invalid JSON"),
  );
});
