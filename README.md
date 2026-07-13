# EasySaving

EasySaving adalah aplikasi pencatatan keuangan pribadi berbasis Next.js dan Golang REST API.

## Stack

- Frontend: Next.js, Tailwind CSS, shadcn-style components, TanStack Query, React Hook Form-ready forms, Zod, Recharts.
- Backend: Golang, Gin, JWT, GORM, PostgreSQL, clean architecture.
- Database: PostgreSQL dengan kolom uang `numeric(18,2)`.

## Local Run

Backend:

```bash
docker compose up -d postgres
cd backend
cp .env.example .env
go mod tidy
go run ./cmd/api
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Set `NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1` bila perlu.

Untuk akses dari mobile view, emulator, atau alamat IP LAN seperti `http://10.10.2.169:3000`, jalankan frontend dengan host LAN:

```bash
cd frontend
npm run dev:lan
```

Pakai satu alamat secara konsisten. Login di `localhost:3000` dan login di `10.10.2.169:3000` disimpan terpisah oleh browser, sehingga berpindah alamat bisa terlihat seperti logout.
Saat dibuka dari HP, frontend otomatis mengarahkan API ke host yang sama, misalnya `http://10.10.2.169:8080/api/v1`. Pastikan backend sedang berjalan dan Windows Firewall mengizinkan akses ke port `8080`.

Jika frontend dibuka lewat IP LAN seperti `http://10.10.2.169:3000`, tambahkan origin itu ke `backend/.env`:

```env
FRONTEND_ORIGIN=http://localhost:3000,http://10.10.2.169:3000
```

## Core API

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/accounts`
- `POST /api/v1/accounts`
- `GET /api/v1/categories?type=income|expense`
- `GET /api/v1/transactions`
- `POST /api/v1/transactions`
- `PUT /api/v1/transactions/:id`
- `DELETE /api/v1/transactions/:id`
- `GET /api/v1/dashboard/summary?period=daily|weekly|monthly&date=YYYY-MM-DD`

Semua endpoint selain auth membutuhkan `Authorization: Bearer <token>`.
