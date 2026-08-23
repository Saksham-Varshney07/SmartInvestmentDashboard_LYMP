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
