# 🏀 Bounce PASS

**Bounce PASS (Basketball Analytics Operating System)** is a basketball analytics platform designed for semi-professional, international, academy, and club basketball organizations.

The goal of Bounce PASS is to provide teams with the tools of a professional analytics department without requiring dedicated analysts, expensive software, or complex workflows.

Users can upload game statistics, generate advanced analytics, visualize performance trends, and create actionable reports through a simple web-based platform.

---

## Features

### 📊 Team Analytics

* Team performance dashboards
* Offensive and defensive efficiency metrics
* Possession-based statistics
* Four Factors analysis
* Game-by-game trend tracking
* Season performance summaries

### 👤 Player Analytics

* Individual player dashboards
* Advanced player statistics
* Performance trends over time
* Role and usage analysis
* Efficiency tracking

### 📈 Data Visualization

* Interactive charts and graphs
* Team comparison tools
* Player comparison tools
* Trend analysis and performance monitoring

### 📂 Data Management

* CSV game data uploads
* Historical season storage
* Multi-team support
* Exportable reports

### 🔒 Private Access

* Password-protected deployment
* Secure backend API
* Cloudflare + Vercel + Render deployment architecture

---

## Vision

Most professional basketball organizations have access to dedicated analytics departments.

Most clubs, academies, semi-professional teams, and international programs do not.

Bounce PASS aims to bridge that gap by providing:

* Professional-level basketball analytics
* Simple upload workflows
* Affordable SaaS pricing
* Fast report generation
* Scalable infrastructure

The long-term goal is to become the operating system for basketball analytics organizations worldwide.

---

## Technology Stack

### Frontend

* Next.js
* React
* TypeScript

### Backend

* FastAPI
* Python

### Data Processing

* Pandas
* NumPy

### Deployment

* Vercel (Frontend)
* Render (Backend)
* Cloudflare (DNS & Security)

---

## Project Structure

```text
frontend/
├── app/
├── components/
├── lib/
└── public/

backend/
├── main.py
├── stats_engine.py
├── utils/
└── data/
```

---

## Local Development

### Backend

```bash
cd backend

python -m venv .venv
source .venv/bin/activate

pip install -r requirements.txt

uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend

npm install

npm run dev
```

Application will be available at:

```text
http://localhost:3000
```

---

## Environment Variables

### Backend

```env
ACCESS_PASSWORD=your-password
ALLOWED_ORIGINS=http://localhost:3000
```

### Frontend

```env
ACCESS_PASSWORD=your-password
API_URL=http://127.0.0.1:8000
AUTH_SECRET=your-random-secret
```

---

## Roadmap

### MVP

* [x] CSV Uploads
* [x] Team Statistics
* [x] Player Statistics
* [x] Export Resluts (Bounce)
* [ ] Dashboard Visualizations
* [ ] Password Protection

### Version 2

* [ ] Multi-user accounts
* [ ] Team subscriptions
* [ ] Season database
* [ ] Advanced scouting reports
* [ ] Opponent analysis

### Version 3

* [ ] Automated game imports
* [ ] AI-powered insights
* [ ] Mobile application
* [ ] League-wide benchmarking
* [ ] Video integration

---

## Target Users

* Semi-professional basketball teams
* International basketball programs
* Basketball academies
* Junior representative programs
* Coaches
* Performance analysts
* Basketball organizations

---

## License

This project is currently proprietary and not licensed for public redistribution.

All rights reserved.

---

## Founder

Created by Adrian Jaucian.

Building the world class analytics department every basketball organization deserves.
