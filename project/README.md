# ELECTRO-POS

A professional, cloud-based electronic Point of Sale system built with React, TypeScript, Tailwind CSS, and Supabase.

## Features

- **Dashboard** — Real-time sales stats, revenue tracking, low-stock alerts, top products
- **Point of Sale** — Product grid, cart, discounts, customer selection, cash/card/mobile payments, printable receipts
- **Products & Inventory** — Full CRUD for products, categories, stock tracking with low-stock warnings
- **Customers** — Customer profiles with loyalty points and purchase history
- **Sales History** — Transaction log with date filters, receipt detail view, and sales analytics
- **Authentication** — Secure staff login with Supabase Auth

## Tech Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS, Vite
- **Backend/Database:** Supabase (PostgreSQL)
- **Icons:** lucide-react

## Running Locally

```bash
npm install
npm run dev
```

The app runs on `http://localhost:5173`.

Supabase credentials are pre-configured in `.env`.

## Building for Production

```bash
npm run build
```

Output goes to `dist/`.

## Deploying

### Vercel

1. Push your code to a GitHub/GitLab repository
2. Go to [vercel.com](https://vercel.com) and import the repo
3. Vercel auto-detects Vite — no config needed
4. Add environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy

### Cloudflare Pages

1. Push your code to a GitHub/GitLab repository
2. Go to [pages.cloudflare.com](https://pages.cloudflare.com) and create a project
3. Settings:
   - Build command: `npm run build`
   - Output directory: `dist`
4. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy

## Database

The database runs on **Supabase** (managed PostgreSQL). The schema includes:

- `categories` — Product categories
- `products` — Product catalog with stock tracking
- `customers` — Customer profiles
- `sales` — Transaction headers
- `sale_items` — Line items per sale

Row-level security is enabled on all tables. Stock auto-decrements on sale and restores on void.
