# Push Unlockladder to GitHub + Live Website

## Step 1 — Create repo & push

```bash
cd /Users/garethlee/unlockladder
git add -A
git commit -m "Unlockladder: milestone token allocations for pump.fun"
gh repo create unlockladder --public --source=. --remote=origin --push
```

**No GitHub CLI?** Create a repo at https://github.com/new named `unlockladder`, then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/unlockladder.git
git branch -M main
git push -u origin main
```

## Step 2 — Enable GitHub Pages

1. Go to **https://github.com/YOUR_USERNAME/unlockladder/settings/pages**
2. Under **Build and deployment** → Source: **GitHub Actions**
3. Push to `main` triggers auto-deploy (~2 min)

## Step 3 — Live site

**https://nostalgicgarethdev.github.io/unlockladder/**

## What works online

| Feature | GitHub Pages |
|---------|--------------|
| Landing page | ✅ |
| Projects + allocations | ✅ localStorage |
| Milestone tracking (DexScreener) | ✅ |
| pump.fun launch | ✅ wallet signs in browser |
| Social impression updates | ✅ manual by creator |

Everything runs client-side in React — no backend required.

## Local dev

```bash
npm install
npm run dev
```

Open http://localhost:5173