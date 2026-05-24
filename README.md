# Kaiyanami 🛍️

A full-stack e-commerce platform built with React, Node.js/TypeScript, Prisma, PostgreSQL, and Stripe.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, React Router v6 |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL via Prisma ORM |
| Payments | Stripe |
| Auth | JWT + Google OAuth 2.0 |
| Email | Nodemailer (Gmail / SMTP) |
| Deployment | Render (backend), Vercel/Netlify (frontend) |

## Features

- 🛒 Full shopping cart (guest + authenticated users)
- 💳 Stripe checkout with webhooks
- 🔐 JWT auth + Google OAuth
- 📧 Email verification & password reset
- 📦 Order tracking
- ❤️ Wishlist
- ⭐ Product reviews
- 👮 Admin dashboard (products, orders, users, analytics, reports)
- 🎫 Support ticket system
- 🗂️ Category management

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ (or a cloud DB like Supabase / Railway / Render)
- A Stripe account
- A Google Cloud project (for OAuth)

---

### 1. Clone the repository

```bash
git clone https://github.com/CrisJomar/kaiyanami.git
cd kaiyanami
```

---

### 2. Backend setup

```bash
cd backend
cp .env.example .env        # fill in your values
npm install
npx prisma migrate dev      # run all migrations
npx prisma generate         # generate the client
npm run dev                 # starts on http://localhost:5001
```

---

### 3. Frontend setup

```bash
cd frontend
cp .env.example .env        # fill in your values
npm install
npm run dev                 # starts on http://localhost:5173
```

---

## Project Structure

```
kaiyanami/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # DB schema
│   │   └── migrations/          # migration history
│   └── src/
│       ├── config/              # passport, app config
│       ├── controllers/         # route handlers
│       ├── lib/                 # shared utilities (prisma singleton, logger)
│       ├── middleware/          # auth, error handler, rate limiter, validator
│       ├── routes/              # Express routers
│       ├── services/            # business logic
│       └── utils/               # email service, helpers
└── frontend/
    └── src/
        ├── components/          # reusable UI components
        ├── context/             # React contexts (Auth, Cart)
        ├── pages/               # page-level components
        └── utils/               # axios instance, stripe loader, helpers
```

---

## Environment Variables

See [`backend/.env.example`](./backend/.env.example) and [`frontend/.env.example`](./frontend/.env.example).

> ⚠️ **Never commit `.env` files.** They are excluded by `.gitignore`.

---

## Scripts

### Backend

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with ts-node (development) |
| `npm run dev:watch` | Start with nodemon (hot-reload) |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled JS (production) |

### Frontend

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## License

MIT
