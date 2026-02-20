# CISO Campus Device Management Mockup

Device management tool for CISOs to manage campus/organization devices, add devices via agent or manual entry, and run simulated threat/CVE scans.

## Tech Stack

- **Backend:** Flask (Python)
- **Frontend:** React (Vite)
- **Agent:** Python (collects CPU, RAM, installed apps)

## Quick Start

### 1. Backend

```bash
cd backend
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
./venv/bin/python app.py
```

Backend runs at http://127.0.0.1:5000

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at http://localhost:5173

### 3. Agent (optional)

Run on a device to register it automatically:

```bash
cd agent
pip install -r requirements.txt
python agent.py http://127.0.0.1:5000
```

## Features

- **Devices:** List, add (agent or manual), edit, delete
- **Agent:** Collects CPU, RAM, installed apps; registers via HTTP
- **Threats:** Select devices, click "New Scan" for simulated CVE results
