# Assessment Notes - Susanto

## Part 1: Bug Fixes

1. **Bug: Race Condition on ID Creation (POST /tasks)**
   - **What was wrong:** `nextId` was read before an asynchronous operation (`simulateLatency`) and incremented after. 
   - **Why it was a problem:** Under concurrent traffic, multiple POST requests would read the same `nextId` before any of them incremented it, resulting in duplicate task IDs.
   - **How I fixed it:** I modified `src/store.js` to synchronously capture and increment `nextId` before hitting the `await simulateLatency()` block.

2. **Bug: Placeholder Response & Double Header (POST /tasks)**
   - **What was wrong:** The route synchronously sent a `202` response but also attempted to send a `201` response inside `.then()`, causing header conflicts and returning dummy data instead of the actual persisted task.
   - **Why it was a problem:** Clients would receive a placeholder instead of the actual data, and the server would throw an unhandled exception for setting headers twice.
   - **How I fixed it:** Refactored the route to use `async/await`, removed the synchronous `202` response, and directly returned the awaited `store.insert` result with status `201`.

3. **Bug: Arbitrary Field Overwrite (PUT /tasks/:id)**
   - **What was wrong:** The PUT route passed `req.body` directly into `store.update()`, merging it blindly using `Object.assign()`.
   - **Why it was a problem:** Malicious users could overwrite protected fields, such as forcing a change to the task's `id`.
   - **How I fixed it:** Destructured `req.body` to explicitly pick only allowed fields (`title`, `completed`) before passing the changes to `store.update()`.

4. **Bug: Unhandled Crashes on Malformed JSON**
   - **What was wrong:** Express's default `express.json()` threw an unhandled error when receiving broken JSON (e.g., missing quotes), crashing the server.
   - **How I fixed it:** Added a global error handling middleware in `src/app.js` to catch `SyntaxError` with status `400` and return a clean JSON error response instead of crashing.

## Part 2: Added Features
- **Input validation:** Middleware rejects missing or non-string titles with a 400 response.
- **Pagination:** Added `limit` and `offset` support to `GET /tasks`.
- **Rate limiting:** Implemented a basic in-memory window rate limiter on all write endpoints returning 429 when exceeded.
- **Auth middleware:** Added an `x-api-key` header check on write endpoints (fallback: `pieverse-secret`) returning 401 on failure.