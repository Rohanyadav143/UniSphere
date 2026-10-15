# UniSphere

UniSphere is a MERN learning platform for public MERN Stack, DSA-with-Java, and administrator-created learning paths. Public content is served by Express from MongoDB; guests can browse without an account and save lesson and DSA Sheet progress in their browser. Signed-in students sync progress through an HTTP-only session cookie, and administrators manage courses, topics, lessons, DSA questions, and optional lesson links through the content studio.

## Requirements

- Node.js 20+
- MongoDB 7+ (local or MongoDB Atlas)

## Local setup

1. Install the client and server dependencies separately:

   ```powershell
   cd client
   npm install
   cd ..\server
   npm install
   ```

   Each project keeps its own `node_modules` and `package-lock.json`. There is no root package manifest or dependency folder.

2. Copy `server/.env.example` to `server/.env`, then set `MONGO_URI` and a random `JWT_SECRET` with at least 32 characters. The example URI uses the `unisphere` database; changing a MongoDB URI's database name does not migrate existing records. `CLIENT_URL` defaults to `http://localhost:5173`.

3. Optionally copy `client/.env.example` to `client/.env`. The local API URL defaults to `http://localhost:4000/api`; set `VITE_API_URL` in `client/.env` only if your API uses a different address. This value is public frontend configuration, not a secret.

4. Run the database setup once before starting the API. It migrates any legacy DSA lessons and course indexes, then seeds the starter courses. Already-migrated databases safely skip those migration changes:

   ```powershell
   cd server
   npm run setup
   ```

   To create or reset the administrator during setup, set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in the server environment before running this command. This promotes an existing account with that email and resets its password to the configured seed password. Signup requests always create student accounts; the admin role is never accepted from the client. The migration preserves lesson IDs and progress, verifies the copy, and only then removes the old DSA collection.

5. Start the API and frontend in two separate terminals from the project root:

   ```powershell
   cd server
   npm run dev
   ```

   In a second terminal:

   ```powershell
   cd client
   npm run dev
   ```

   Open `http://localhost:5173`. The REST API runs at `http://localhost:4000`.

To check authentication locally, use the signup screen to create a student, then sign out and sign in again. In the browser's Network panel, `/api/auth/me` should return that user after login and `/api/progress/dashboard` should return successfully. For an admin test, set `SEED_ADMIN_EMAIL` and a password of at least 10 characters in `server/.env`, run `npm run setup` from `server/`, then sign in using those credentials. Keep the local `MONGO_URI` pointed at a local or disposable database so test data does not affect production.

## Tests and build

Run the API tests from `server/`:

```powershell
cd server
npm test
```

Build the frontend from `client/`:

```powershell
cd client
npm run build
```

The API test suite includes database-backed authentication, progress synchronization, role authorization, admin CRUD, ordering, and YouTube URL normalization. To run the database integration test, set `MONGO_TEST_URI` to a disposable MongoDB database that has been seeded, and set `JWT_SECRET` in the server environment.

## Deployment

Deploy `client/` as a Vercel project and `server/` as a Node service. Set the API service root directory to `server/`, the build command to `npm install && npm run setup`, and the start command to `npm start`. Its health check path is `/health`. `npm run setup` runs both migrations and seeds starter content automatically during each server deployment; no separate Shell commands are needed. Configure `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`, `NODE_ENV=production`, and, when provisioning an admin, `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in the Render environment before deploy. The setup build needs network access to the same MongoDB database used by the running API, so ensure its MongoDB Atlas network access rules allow the Render service. Set the Vercel project root directory to `client/`, use `npm install` and `npm run build`, and publish `dist/`.

The production client uses the same-origin `/api` path. Vercel rewrites these requests to `client/api/proxy.js`, which forwards API requests and session cookies to Render, and rewrites returned session cookies as secure, host-only Vercel cookies. This avoids reliance on browsers allowing cross-site cookies. The Vercel project root must be `client/` so it discovers both `api/proxy.js` and `vercel.json`; changing this root can make every `/api/*` route return Vercel `404 NOT_FOUND`. When changing the backend hostname, update the proxy destination in `client/api/proxy.js` and redeploy the frontend. `VITE_API_URL` is used only for local development; do not set it to the Render URL in Vercel.

On the server, configure `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`, and `NODE_ENV=production`. Set `CLIENT_URL` to the exact Vercel origin (without a trailing slash). The session cookie is HTTP-only, secure in production, and uses `SameSite=Lax` by default. Leave `COOKIE_DOMAIN` unset when using the Vercel API rewrite. Configure TLS at the hosting platform or reverse proxy.

`server/src/utils/seed.js` contains editable starter content. Once seeded, the admin studio can create and maintain public content without changing frontend source code. Setup reruns the seed on each deployment, which upserts and refreshes the bundled starter records. If `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` are set, each deployment also promotes that configured account and resets its password to the configured value.

In the admin studio, choose **Courses** to add a custom learning path and enter its path type (for example, Python or Data Science). Add topics to that path, then add lessons. Use **DSA Sheet** to add problem titles and URLs to DSA topics; each question gets an independently saved completion checkbox for guests and signed-in students.

## Data and privacy notes

- Guest checklist state and theme preference use local storage only; authentication credentials and JWTs are never stored there.
- Authenticated progress is stored in MongoDB and becomes the source of truth after guest progress is merged at registration or sign-in.
- Public video content is embedded from YouTube; video files are not uploaded or copied.
- Admin APIs enforce the role on the server. Password hashes are excluded from API responses.
