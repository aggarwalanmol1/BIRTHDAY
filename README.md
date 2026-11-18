# Birthday Studio — GitHub + Vercel

This project keeps the original five-page birthday experience, egg-opening intro, gallery, themes, and dashboard. Supabase has been removed. Birthday records and photos are stored in a **Private Vercel Blob** store.

## Project files

- `index.html` — creator dashboard
- `birthday.html` — friend's five-page birthday website
- `style.css` and `script.js` — dashboard styling and behaviour
- `api/create-birthday.js` — checks the creator password and saves a birthday
- `api/view-birthday.js` — checks the friend's password and loads the birthday

## Deploy it

1. Create a GitHub repository and upload the contents of this folder (not the ZIP file itself).
2. In Vercel, choose **Add New → Project**, import that GitHub repository, and deploy it.
3. In the Vercel project, open **Storage → Create Database → Blob**. Choose **Private** access and connect the store to this project. Vercel adds `BLOB_READ_WRITE_TOKEN` to the project automatically.
4. Open **Settings → Environment Variables** and add `CREATOR_PASSWORD`. Choose a long private password that only you know. Add it to Production (and Preview if you want preview deployments to work), then redeploy.
5. Open the deployed site. Create a birthday page using your creator password and choose a separate viewing password for the birthday person. Share the generated `birthday.html?slug=...` link and the viewing password with them.

## Run locally (optional)

Install Node.js, then in this folder run:

```bash
npm install
npx vercel login
npx vercel link
npx vercel env pull .env.local
npm run dev
```

Local photo uploads require the linked Vercel Blob environment variable. `vercel env pull` downloads project environment variables to `.env.local`; do not commit that file.

## Important

- Maximum 4 photos. They are resized/compressed in the browser before being sent to the API.
- Both photos and birthday records are stored in a Private Blob store. The browser never receives the Blob storage token.
- Keep `CREATOR_PASSWORD` and `.env.local` private. Never put secrets in `script.js`, `index.html`, or GitHub.
- Vercel Blob and Vercel Functions have usage limits and may incur charges if usage exceeds your plan allowance.
