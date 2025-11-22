# BiasLens - Job Bias Detection Tool

A web application that analyzes job postings for bias and provides inclusive alternatives, similar to Simplify's UX but focused on bias detection.

## Features

- **Bias Analysis**: Detects gendered language, age bias, exclusionary language, and visa restrictions
- **International Student Focus**: Special scoring for international student bias
- **Inclusive Rewrite**: AI-powered rewriting to make job descriptions more inclusive
- **Company DEI Snapshot**: View company diversity, equity, and inclusion metrics
- **Alternative Jobs**: Find safer, more inclusive job postings
- **Link Parser**: Paste job links or text directly
 - **Batch Analysis**: Quickly scan multiple postings at once and compare bias scores
 - **International-Friendly Companies**: Browse companies known for inclusive, global hiring

## Project Structure

```
biaslens/
├── backend/          # FastAPI backend
│   ├── main.py       # API routes
│   ├── bias_engine.py    # Bias detection logic
│   ├── rewrite_engine.py # LLM rewriting
│   ├── company_dei.py    # Company DEI data
│   └── link_parser.py    # Job link parsing
├── frontend/         # React + Vite frontend
│   └── src/
│       ├── components/   # React components
│       └── App.jsx       # Main app
├── shared/           # Shared types/schemas
└── docker-compose.yml
```

## Setup

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

Backend runs on `http://localhost:8000`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

### Docker

```bash
docker-compose up
```

## API Endpoints

- `GET /health` - Health check
- `POST /analyze/keywords` - Keyword-based bias detection
- `POST /analyze/classifier` - NLP classification
- `POST /analyze/full` - Complete bias analysis
- `POST /rewrite` - Inclusive rewrite
- `POST /company/insights` - Company DEI data
- `POST /parse-link` - Parse job posting from URL

## Environment Variables

- `OPENAI_API_KEY` - Optional, for LLM rewriting (falls back to mock if not set)

## Tech Stack

- **Backend**: FastAPI, Transformers (Hugging Face), OpenAI
- **Frontend**: React, Vite
- **NLP**: facebook/bart-large-mnli for zero-shot classification

## Future Roadmap

- **Browser Extension Integration**: Analyze job postings directly on LinkedIn, Indeed, and other boards via a one-click browser extension button, sending the page content to BiasLens in the background and overlaying bias scores in place.
- **Richer DEI Data**: Deeper integration with public sponsorship and DEI datasets to power more precise company scores.

