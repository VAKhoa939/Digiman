# DIGIMAN - Digital Manga Platform

# Project Structure

```

DIGIMAN/
│
├── backend/
│   └── digimanproject/
│       ├── manage.py
│       ├── digimanproject/       ← Django project folder (settings, etc.)
│       ├── api/                  ← Main app with models, serializers, views, urls, services, permissions, admins, and utils
│       ├── collected_static/     ← Static files (after collectstatic)
│       └── requirements.txt      ← Dependencies list
│
└── frontend/                     ← React + Vite app

````

---

# I. DIGIMAN Backend

This is the **backend** of the DIGIMAN project — a Django REST Framework (DRF) application connected to **Supabase** for database and image storage.

The backend provides APIs for user management, image uploads, and admin control.

---

## 1. Prerequisites

Before setting up, make sure you have installed:

| Tool           | Version |
|----------------|---------|
| **Python**     | 3.11.*  |
| **pip**        | latest  |
| **virtualenv** | latest  |
| **Git**        | latest  |

---

## 2. Clone Repository

```
# Clone from GitHub
git clone https://github.com/<your-username>/DIGIMAN.git

# Move to backend directory
cd DIGIMAN/backend/digimanproject
````

---

## 3. Setup Virtual Environment

```
# Create virtual environment
python -m venv venv

# Activate it (Windows)
venv\Scripts\activate

# For macOS/Linux
# source venv/bin/activate
```

You should now see `(venv)` at the start of your terminal prompt.

---

## 4. Install Dependencies

```
python.exe -m pip install --upgrade pip
pip install -r requirements.txt
```

If you face dependency errors, ensure these are installed manually:

```
pip install django djangorestframework django-environ supabase jazzmin rest_framework_simplejwt dj_database_url pillow
```

---

## 5. Create `.env` File

In the same directory as `manage.py`, create a file named:

```
backend.env
```

Then add:

```env
DEBUG=True
SECRET_KEY=your-local-secret-key
ALLOWED_HOSTS=localhost,127.0.0.1

# --- Supabase Database ---
DATABASE_URL=postgresql://postgres.<your-db-id>:[YOUR-PASSWORD]@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres

# --- Supabase Storage ---
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
DB_SSL_REQUIRE=True
```

> **Note:** Do **not** commit `backend.env` — keep it local.

---

## 6. Apply Migrations and Create Admin User

```bash
python manage.py migrate
python manage.py createsuperuser
```

Follow the prompts to create your admin account.

---

## 7. Collect Static Files

```bash
python manage.py collectstatic --noinput
```

---

## 8. Run the Development Server

```bash
python manage.py runserver
```

Then open:

| URL                                                          | Description  |
| ------------------------------------------------------------ | ------------ |
| [http://127.0.0.1:8000/admin/](http://127.0.0.1:8000/admin/) | Django Admin |
| [http://127.0.0.1:8000/api/](http://127.0.0.1:8000/api/)     | API Root     |

---

## 9. Troubleshooting

| Issue                          | Possible Fix                                                        |
| ------------------------------ | ------------------------------------------------------------------- |
| **400 Bad Request**            | Add `localhost,127.0.0.1` to `ALLOWED_HOSTS` in `backend.env`       |
| **No module named supabase**   | Run `pip install supabase`                                          |
| **Migration errors**           | Delete local DB and rerun `python manage.py migrate`                |
| **Static files missing**       | Ensure `DEBUG=True` locally                                         |
| **Database connection failed** | Double-check your `DATABASE_URL` (use Supabase “Connection String”) |

---

## 10. Useful Commands

| Action                  | Command                                    |
| ----------------------- | ------------------------------------------ |
| Run Django shell        | `python manage.py shell`                   |
| View model structure    | `python manage.py inspectdb`               |
| Check for config issues | `python manage.py check`                   |
| Rebuild static files    | `python manage.py collectstatic --noinput` |

---

## 11. Quick Recap

```bash
git clone https://github.com/<your-username>/DIGIMAN.git
cd DIGIMAN/backend/digimanproject
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Now visit:

```
http://127.0.0.1:8000/admin/
http://127.0.0.1:8000/api/
```

---

## 12. Notes

* The backend can run independently from the frontend.
* Supabase is used for **PostgreSQL database** and **Storage (image upload)**.
* The `.env` file contains all secret and environment-specific variables.
* Keep `DEBUG=True` only in local development.
* When deploying to Render or other services, adjust:

  * `ALLOWED_HOSTS`
  * `CSRF_TRUSTED_ORIGINS`
  * `DEBUG=False`

---
