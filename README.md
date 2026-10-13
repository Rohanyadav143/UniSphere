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

4. For an existing database, run the compatible migrations before seeding. The DSA migration is needed only if the database still has the old separate DSA collection; the dynamic-course migration removes the former one-course-per-type database index:

   ```powershell
   cd server
   npm run migrate:legacy-dsa
   npm run migrate:dynamic-courses
   npm run seed
   ```

   The dynamic-course migration removes the old unique course-type index so multiple general courses can be added. For a brand-new database, run only `npm run seed`.

   To create the first administrator, set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `server/.env` before seeding. Signup requests always create student accounts; the admin role is never accepted from the client.
   
   The migration preserves lesson IDs and progress, verifies the copy, and only then removes the old DSA collection.

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

Deploy `client/` as a static SPA and `server/` as a Node service. Set the API service root directory to `server/`, then use `npm install` as the build command and `npm start` as the start command. Its health check path is `/health`. Set the frontend project root directory to `client/`, use `npm install` and `npm run build`, and publish `dist/`.

Configure the client environment variable `VITE_API_URL` to the deployed API base ending in `/api`. On the server, configure `MONGO_URI`, `JWT_SECRET`, `CLIENT_URL`, and `NODE_ENV=production`. Add every allowed frontend origin to comma-separated `CLIENT_URL`.

The session cookie is HTTP-only and secure in production. For independently hosted cross-site frontend and API domains, set `COOKIE_SAME_SITE=none` (HTTPS is required); same-site deployments can use `lax`. Set `COOKIE_DOMAIN` only when using a shared parent domain. Configure TLS at the hosting platform or reverse proxy.

`server/src/utils/seed.js` contains editable starter content. Once seeded, the admin studio can create and maintain public content without changing frontend source code. Seed operations upsert starter records and are safe to rerun.

In the admin studio, choose **Courses** to add a custom learning path and enter its path type (for example, Python or Data Science). Add topics to that path, then add lessons. Use **DSA Sheet** to add problem titles and URLs to DSA topics; each question gets an independently saved completion checkbox for guests and signed-in students.

## Data and privacy notes

- Guest checklist state and theme preference use local storage only; authentication credentials and JWTs are never stored there.
- Authenticated progress is stored in MongoDB and becomes the source of truth after guest progress is merged at registration or sign-in.
- Public video content is embedded from YouTube; video files are not uploaded or copied.
- Admin APIs enforce the role on the server. Password hashes are excluded from API responses.
