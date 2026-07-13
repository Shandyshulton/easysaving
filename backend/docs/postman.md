# EasySaving API Smoke Test

Base URL: `http://localhost:8080/api/v1`

1. `POST /auth/register`
2. `POST /accounts`
3. `GET /categories?type=income`
4. `GET /categories?type=expense`
5. `POST /transactions`
6. `PUT /transactions/:id`
7. `DELETE /transactions/:id`
8. `GET /dashboard/summary?period=monthly&date=2026-06-30`

Use `Authorization: Bearer <token>` for every endpoint except register and login.
