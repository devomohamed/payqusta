# Free deployment to Render + MongoDB Atlas (no prior dev ops needed)

## 1) Create free MongoDB Atlas database
1. Sign up at https://www.mongodb.com/atlas/database
2. Create free cluster (M0).
3. Create DB user with username/password.
4. Network: allow access from 0.0.0.0/0 (or your IP if you prefer)
5. Get connection string (SRV). It looks like:
   `mongodb+srv://<user>:<pass>@cluster0.xxxxxx.mongodb.net/payqusta?retryWrites=true&w=majority`

## 2) Prepare env file (we’ll give Render these values)
Copy `.env.render.example` and fill:
- `MONGODB_URI` = Atlas URI from step 1 (replace <user>/<pass>)
- `JWT_SECRET` = long random string
- `CLIENT_URL` = https://<your-render-subdomain>.onrender.com
- `APP_URL`    = same as above
- Optional: `EMAIL_*` if you need email sending

## 3) Push code to GitHub
- Create a new repo and push this project (include Dockerfile, docker-compose.yml already present).

## 4) Deploy on Render (free web service)
1. Create Render account ? New ? Web Service ? Connect your repo.
2. Select **Docker**; Render will auto-detect the Dockerfile.
3. Set Environment = `Docker`.
4. Add Environment Variables (same as your filled `.env.render.example`).
5. Expose Port `5000`.
6. Click Deploy. First build downloads deps, builds frontend, then starts `node server.js`.

## 5) Verify
- Open Render URL: `https://<subdomain>.onrender.com/api/health` should return JSON ok.
- Root `https://<subdomain>.onrender.com/` should show the app.

## 6) Notes / Limits
- Free Render sleeps when idle; first request after sleep may take ~30-60s.
- Render filesystem is ephemeral: `uploads/` won’t persist across restarts. For production-grade storage, move uploads to S3-like storage later.
- Atlas free tier is limited; for heavy traffic use a paid tier.

## 7) If you prefer local Docker run
```
docker-compose up --build
```
API on http://localhost:5000, frontend served from same container.

## 8) Where we adjusted code for deployment
- `server.js`: trust proxy enabled for Render
- `client/vite.config.js`: PWA icons now use existing `favicon.svg` (avoid missing files)
- `.env.render.example`: ready-to-fill production vars

That’s it—fill the env, push to GitHub, connect Render, deploy.
