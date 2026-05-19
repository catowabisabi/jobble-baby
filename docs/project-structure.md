# Jobble Baby - Project Structure

```
jobble-baby/
├── app/                    # Expo Router (React Native)
│   ├── _layout.tsx         # Root layout
│   ├── index.tsx           # Home screen
│   └── ...
├── src/
│   ├── app/                # App screens
│   ├── components/         # Reusable UI components
│   ├── constants/          # App constants
│   ├── hooks/              # Custom React hooks
│   └── global.css          # Global styles
├── assets/                 # Images, fonts
├── docs/                   # Documentation
├── backend/
│   ├── app/
│   │   ├── api/            # API endpoints
│   │   │   ├── cvs.py      # CV analysis endpoints
│   │   │   ├── health.py   # Health check
│   │   │   ├── interviews.py # Interview simulation
│   │   │   ├── jobs.py     # Job matching
│   │   │   ├── market.py   # Market analysis
│   │   │   ├── salary.py   # Salary queries
│   │   │   └── users.py    # User management
│   │   └── __init__.py
│   ├── main.py             # FastAPI entry point
│   ├── requirements.txt    # Python dependencies
│   └── venv/               # Virtual environment
├── package.json
├── app.json               # Expo config
└── user-intention.md       # Project requirements
```

## Frontend (Expo/React Native)

- **File-based routing** via Expo Router
- **TypeScript** for type safety
- **API calls** to FastAPI backend

## Backend (FastAPI)

- **REST API** at `/api/v1/...`
- **Pydantic models** for request/response
- **SQLAlchemy** ORM ready
- **Alembic** migrations ready

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/v1/health | Health check |
| POST | /api/v1/users/register | User registration |
| POST | /api/v1/users/login | User login |
| POST | /api/v1/cvs/upload | Upload CV |
| POST | /api/v1/cvs/analyze | Analyze CV |
| GET | /api/v1/salary/query | Query salary data |
| POST | /api/v1/interviews/start | Start interview |
| POST | /api/v1/interviews/answer | Submit answer |
| GET | /api/v1/jobs/matches | Get job matches |