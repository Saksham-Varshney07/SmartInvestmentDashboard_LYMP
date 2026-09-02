# Smart Investment Dashboard - Runbook

This document contains all the necessary commands and steps to set up, configure, and run the Smart Investment Dashboard project locally.

## 1. Prerequisites
- **Node.js**: v18 or higher recommended.
- **Python**: v3.9 or higher recommended.
- **PostgreSQL**: Must be installed and running on port `5432`.

---

## 2. Database Configuration (PostgreSQL)
The backend uses PostgreSQL as its primary database. By default, it expects the following credentials (configured in `backend/db.py`):
- **Username**: `postgres`
- **Password**: `your_password`
- **Host**: `localhost`
- **Port**: `5432`
- **Database**: `postgres`

**Note:** When the backend starts, it will automatically create the required tables (`users`, `portfolio`, `portfolio_assets`, `asset_prices`, `risk_scores`) if they do not exist.

---

## 3. Backend Setup (FastAPI & ML Engine)
Open a new terminal window and run the following commands:

```powershell
# 1. Navigate to the backend directory
cd backend

# 2. (Optional but recommended) Create and activate a Python virtual environment
python -m venv venv
.\venv\Scripts\activate

# 3. Install required Python dependencies
pip install fastapi uvicorn sqlalchemy psycopg2 yfinance pandas scikit-learn requests pydantic

# 4. Start the backend server
uvicorn main:app --reload --port 8000
```
*(The backend will be available at `http://127.0.0.1:8000`)*

---

## 4. Database Setup (PostgreSQL & pgAdmin)

The backend Python commands do **not** automatically install or start the database. You must have PostgreSQL running on your machine for the backend to save transactions.

### Option A: Direct Windows Installation (Recommended for beginners)
1. Download the **PostgreSQL Installer for Windows** from [EnterpriseDB](https://www.enterprisedb.com/downloads/postgres-postgresql-downloads).
2. Run the installer. **Important**: During installation, it will ask you to set a password for the `postgres` superuser. You must set it to **`your_password`** (or update the `DATABASE_URL` in `backend/db.py` to match your new password).
3. Ensure **pgAdmin 4** is checked during the installation components screen.
4. Once installed, search for "pgAdmin 4" in your Windows Start Menu to open the graphical database manager.
5. The PostgreSQL service will now run automatically in the background on port `5432`.

### Option B: Using Docker (For advanced users)
If you have Docker Desktop installed, you can spin up the database and pgAdmin instantly without installing anything on your host machine:

```powershell
# Start PostgreSQL container
docker run --name smart-invest-db -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=saki007 -e POSTGRES_DB=postgres -p 5432:5432 -d postgres:15

# Start pgAdmin container
docker run --name pgadmin -e PGADMIN_DEFAULT_EMAIL=admin@admin.com -e PGADMIN_DEFAULT_PASSWORD=admin -p 5050:80 -d dpage/pgadmin4
```
*(pgAdmin will be available at `http://localhost:5050`)*

---

## 4. Frontend Setup (React & Vite)
Open a separate terminal window and run the following commands:

```powershell
# 1. Navigate to the frontend directory
cd react-app

# 2. Install all Node modules and dependencies
npm install

# 3. Start the Vite development server
npm run dev
```
*(The frontend will be available at `http://localhost:5173`)*

---

## 5. Helpful Commands & Troubleshooting

**Resetting the Onboarding Tour:**
If you ever want to see the welcome screen and spotlight tour again, you can clear the cache by opening your browser's Developer Console (F12) and running:
```javascript
localStorage.removeItem('hasSeenOnboarding_v3');
```
Then refresh the page.

**Updating Dependencies:**
If you ever encounter missing module errors, run:
- In `backend`: `pip install -r requirements.txt` (if generated)
- In `react-app`: `npm install`
