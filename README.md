# AI Finance Assistant

Веб-приложение для контроля личных финансов.

## Структура

```text
ai-finance-assistant/
├── backend/     # Express + TypeScript + Prisma
├── frontend/    # React + Vite + TypeScript
└── docker-compose.yml
```

Backend и frontend — независимые приложения.

## Быстрый старт

### 1. PostgreSQL

```bash
docker compose up postgres -d
```

### 2. Backend

```bash
cp backend/.env.example backend/.env
cd backend
npm install
npx prisma generate
npm run dev
```

Сервер: http://localhost:3000

### 3. Frontend

```bash
cp frontend/.env.example frontend/.env
cd frontend
npm install
npm run dev
```

Клиент: http://localhost:5173
