# DIGIMAN - Digital Manga Platform

# Project Structure

```

DIGIMAN/
│
├── backend/
│   └── digimanproject/
│       ├── manage.py
│       ├── digimanproject/       ← Django project folder (settings, celery, etc.)
│       ├── api/                  ← Main app with folders (models, serializers, views, urls, services, permissions, admins, signals, tasks, and utils)
│       ├── collected_static/     ← Static files (after collectstatic)
│       └── requirements.txt      ← Dependencies list
│
├── frontend/
│
├── src/
│   ├── components/             ← Reusable React components
│   │   ├── pages/              ← Page-level components
│   │   └── smallComponents/    ← Smaller UI components (e.g., NavBar, Modal, Toaster)
│   ├── context/                ← React Context for global state (e.g., Auth, Theme)
│   ├── customHooks/            ← Custom React hooks (e.g., useMangaPage, useModalBackground)
│   ├── data/                   ← Static data (e.g., mangaData)
│   ├── styles/                 ← CSS files for themes and custom styles
│   └── App.jsx                 ← Main app component
│
├── public/                     ← Static assets (e.g., icons, manifest)
├── index.html                  ← HTML template
├── vite.config.js              ← Vite configuration
├── package.json                ← Dependencies and scripts
└── package_lock.json           ← Dependencies and scripts for clean install

```

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
# Clone from GitHub (if you haven't done it)
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
SECRET_KEY=your-django-local-secret-key
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=<your-frontend-url>
PYTHON_VERSION=3.11.9

# --- Supabase Database ---
DATABASE_URL=postgresql://postgres.<your-db-id>:[YOUR-PASSWORD]@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres

# --- Supabase Storage ---
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
DB_SSL_REQUIRE=True

# --- Perspective API and Sightengine ---
PERSPECTIVE_API_KEY=<your-perspective-api-key-in-google-cloud-project>
SIGHTENGINE_USER=<your-sightengine-api-user>
SIGHTENGINE_SECRET=<your-sightengine-api-secret>

# --- Redis ---
# Note that this project's redis uses Render's Key Value service for hosting
REDIS_URL=rediss://red-xxxxx:PASSWORD@singapore-keyvalue.render.com:6379?ssl_cert_reqs=CERT_NONE
DJANGO_REDIS_URL=rediss://red-xxxxx:PASSWORD@singapore-keyvalue.render.com:6379/0
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

## 9. Run the Celery Worker (for AI Moderation)

Open another terminal in the project root and paste these command:

```bash
cd backend/digimanproject
celery -A digimanproject worker -l info -P solo --pool=solo --without-gossip --without-mingle --without-heartbeat
```

---

## 10. Troubleshooting

| Issue                          | Possible Fix                                                        |
| ------------------------------ | ------------------------------------------------------------------- |
| **400 Bad Request**            | Add `localhost,127.0.0.1` to `ALLOWED_HOSTS` in `backend.env`       |
| **No module named supabase**   | Run `pip install supabase`                                          |
| **Migration errors**           | Delete local DB and rerun `python manage.py migrate`                |
| **Static files missing**       | Ensure `DEBUG=True` locally                                         |
| **Database connection failed** | Double-check your `DATABASE_URL` (use Supabase “Connection String”) |

---

## 11. Useful Commands

| Action                  | Command                                    |
| ----------------------- | ------------------------------------------ |
| Run Django shell        | `python manage.py shell`                   |
| View model structure    | `python manage.py inspectdb`               |
| Check for config issues | `python manage.py check`                   |
| Rebuild static files    | `python manage.py collectstatic --noinput` |

---

## 12. Quick Recap

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

Then open another terminal:

```bash
cd backend/digimanproject
celery -A digimanproject worker -l info -P solo --pool=solo --without-gossip --without-mingle --without-heartbeat
```

Now visit:

```
http://127.0.0.1:8000/admin/
http://127.0.0.1:8000/api/
```

---

## 13. Notes

* The backend can run independently from the frontend.
* Supabase is used for **PostgreSQL database** and **Storage (image upload)**.
* The `backend.env` file contains all secret and environment-specific variables.
* Keep `DEBUG=True` only in local development.
* When deploying to Render or other services, adjust:

  * `ALLOWED_HOSTS`
  * `CORS_ALLOWED_ORIGINS`
  * `DEBUG=False`
  * `REDIS_URL` (Change from Key Value's external url to internal url only when deploying to Render)

---

# II. DIGIMAN Frontend

This is the **frontend** of the DIGIMAN project — a React application built with **Vite**. 

It provides a user-friendly interface for browsing, reading, and managing manga content.

---

## 1. Prerequisites

Before setting up, make sure you have installed:

| Tool           | Version |
|----------------|---------|
| **Node.js**    | 18.*    |
| **npm**        | 9.*     |
| **Git**        | latest  |

---

## 2. Clone Repository

```
Clone from GitHub (if you haven't done it)
git clone https://github.com/<your-username>/DIGIMAN.git

Move to frontend directory
cd DIGIMAN/frontend/digiman
```

---

## 3. Install Dependencies

```bash
npm ci
```

This will install all required packages listed in `package_lock.json`.

---

## 4. Create `.local` File

In the `frontend/digiman` directory, create a file named:

```
.env.local
```

Then add:

```
VITE_API_URL=http://127.0.0.1:8000/api/
VITE_USE_MOCK_DATA=false
```

> **Notes:**
> * Replace the VITE_API_URL value with your backend URL if it's hosted elsewhere.
> * Replace the VITE_USE_MOCK_DATA value with true for running the frontend with mock data

---

## 5. Run the server

```bash
npm run dev
```

This will start the Vite development server. Open your browser and navigate to:

```
http://127.0.0.1:5173
```

---

## 6. Build for Production

To build the frontend for production, run:

```bash
npm run build
```

The optimized build will be output to the dist folder.

---

## 7. Run the Production Build Locally

After building the project, you can preview the production build locally:

```bash
npm run preview
```

This will serve the production build at:

```
http://127.0.0.1:4173
```

---

## 8. Progressive Web App (PWA) Support

The DIGIMAN frontend is configured as a Progressive Web App (PWA) using the vite-plugin-pwa. This allows the app to work offline and provide a better user experience.

Key Features:

* Offline Support: The app caches assets and API responses for offline use.
* Auto Updates: The service worker automatically updates when a new version is available.

Testing PWA:

1. Open the app in your browser.
2. Go to Developer Tools (press f12) > Application > Service Workers.
3. Test offline functionality by disabling your network.

---

## 9. Useful Commands

| Action                   | Command           |
| ------------------------ | ----------------- |
| Start development server | `npm run dev`     |
| Build for production     | `npm run build`   |
| Preview production build | `npm run preview` |
| Lint code                | `npm run lint`    |

---

## 10. Quick Recap

```bash
git clone https://github.com/<your-username>/DIGIMAN.git
cd DIGIMAN/frontend/digiman
npm ci
npm run dev
```

Or run production build locally:

```bash
npm run build
npm run preview
```

Now visit:

```
http://127.0.0.1:5173 
http://127.0.0.1:4173 
```

---

## 11. Notes

* The frontend communicates with the backend via the VITE_API_URL environment variable.
* The app uses React Router for navigation and React Query for data fetching and caching.
* Bootstrap is used for styling, and custom themes are applied dynamically based on user preferences.
* The PWA configuration ensures the app is optimized for offline use.

---
