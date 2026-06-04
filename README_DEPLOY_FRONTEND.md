Frontend deployment (Vercel)

1. Install Vercel CLI (if not installed):

```bash
npm install -g vercel
```

2. Login to Vercel:

```bash
vercel login
```

3. From the `recruitbot-web` folder, deploy:

```bash
cd recruitbot-web
vercel --prod
```

Notes:
- Make sure `.env.production` contains `VITE_API_BASE_URL` pointing to your backend (e.g. `https://your-backend.com`).
- Vercel will use the `dist` folder produced by `npm run build` (configured in `vercel.json`).
- For CI, connect your GitHub repo to Vercel and set the environment variables in the Vercel dashboard.
