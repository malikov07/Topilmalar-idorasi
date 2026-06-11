# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Lost Items Platform** (production: topilmalar.polito.uz) — a full-stack application for reporting and finding lost items with location-based search capabilities.

**Tech Stack:**
- **Frontend:** React 19 + Vite, Tailwind CSS, React Router, Leaflet maps
- **Backend:** Django 6.0.3 + Django REST Framework, PostgreSQL, Celery
- **Authentication:** Google OAuth + JWT (simple JWT)
- **Documentation:** DRF-spectacular (Swagger UI at `/api/docs/`)

## Development Commands

### Frontend
```bash
cd frontend

# Development server (http://localhost:5173, proxies /api to backend)
npm run dev

# Build for production
npm run build

# Lint with ESLint
npm run lint
```

### Backend
```bash
cd backend

# Note: Create virtual environment if needed (venv/ exists in repo)
# On Windows: venv\Scripts\activate

# Run development server (http://localhost:8000)
python manage.py runserver

# Run database migrations
python manage.py migrate

# Create admin user
python manage.py createsuperuser

# Run tests
python manage.py test

# Start Celery worker (for async tasks)
celery -A lost_items worker -l info
```

## Architecture

### Frontend Structure
- **Main apps:** React Router pages for login, registration, item creation, search, profile
- **Context API:** `AuthContext` (JWT tokens) and `LanguageContext` (i18n)
- **Key components:** `MapSearchPage` (Leaflet map with items), `ItemDetail`, `CreateItemPage`, `Profile`
- **Services:** `api.js` (axios + backend requests), `auth.js` (OAuth/JWT logic)
- **Styling:** Tailwind CSS with React components using Lucide icons
- **Image handling:** `browser-image-compression` for client-side optimization before upload

### Backend Structure
- **Apps:**
  - `apps.users` — User model (custom AUTH_USER_MODEL), authentication endpoints
  - `apps.items` — Item model, CRUD endpoints for items
- **Key Features:**
  - JWT authentication with token refresh/blacklist support
  - Pagination (10 items per page default)
  - File uploads (MEDIA_URL/MEDIA_ROOT for images)
  - Swagger/OpenAPI schema at `/api/schema/`
- **Database:** PostgreSQL with Django ORM migrations

### Development Setup
1. **Vite dev server** runs on port 5173 and proxies `/api`, `/admin`, `/static`, `/media` to Django on port 8000
2. **CORS** is configured to allow localhost:5173 for local development
3. **SPA routing:** Non-API routes serve the React index.html, allowing client-side routing
4. **Media files:** Uploaded images stored in `backend/media/` (excluded from Git)

## Important Details

- **Environment variables:** Backend uses `.env` file (with `python-dotenv`). Frontend consumes backend URLs via relative paths (Vite proxy).
- **Google OAuth:** Configured via `@react-oauth/google` on frontend; backend validates tokens via `google-auth` library.
- **Image uploads:** Frontend compresses with `browser-image-compression`, backend stores with Pillow.
- **Async tasks:** Celery configured to use Django settings; requires Redis (optional in dev, runs in eager mode if not configured).
- **API versioning:** No prefix; endpoints under `/api/` and `/auth/` with DRF-spectacular introspection.

## Common Workflows

**Adding a new item field:**
1. Update `Item` model in `apps/items/models.py`
2. Create and run migration: `python manage.py makemigrations` → `python manage.py migrate`
3. Update serializers/views in `apps/items/` if needed
4. Update frontend form in `CreateItemPage` and detail view in `ItemDetail`

**Deploying:**
- Production domain: `topilmalar.polito.uz`
- Backend uses Gunicorn + PostgreSQL
- Frontend built with `npm run build` → static files served via Django

**Debugging:**
- Frontend: Browser DevTools, React DevTools browser extension
- Backend: Django debug toolbar optional, check logs with `python manage.py runserver` or Celery worker logs
- API calls: Use `/api/docs/` Swagger UI to test endpoints directly
