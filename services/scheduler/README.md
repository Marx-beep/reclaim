# Reclaim Scheduler Service

Python FastAPI scheduler service for dynamic planning.

## Local Dev

Use the helper script to run inside project virtual environment:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\run-python.ps1 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The script auto-creates `.venv` and installs dependencies from `requirements.txt`.
