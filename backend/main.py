from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict
import uvicorn
import logging

try:
    from .bias_engine import (
        detect_bias_keywords,
        analyze_with_classifier,
        analyze_full,
        get_classifier,
    )
    from .rewrite_engine import rewrite_inclusive
    from .company_dei import get_company_insights, get_alternatives, get_alternative_jobs
    from .link_parser import parse_job_link
except ImportError:
    from bias_engine import (
        detect_bias_keywords,
        analyze_with_classifier,
        analyze_full,
        get_classifier,
    )
    from rewrite_engine import rewrite_inclusive
    from company_dei import get_company_insights, get_alternatives, get_alternative_jobs
    from link_parser import parse_job_link

logger = logging.getLogger(__name__)

app = FastAPI(title="BiasLens API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TextInput(BaseModel):
    text: str
    # Default to True so MNLI-based NLP is active unless explicitly disabled.
    # This guarantees NLP runs even if frontend requests omit the flag.
    use_nlp: bool = True


class URLInput(BaseModel):
    url: str


class CompanyInput(BaseModel):
    company: str


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "BiasLens API"}


@app.on_event("startup")
async def warmup_nlp():
    """
    Warm up the NLP classifier at startup so first demo calls are fast.
    """
    try:
        get_classifier()
        logger.info("NLP classifier warmed up successfully.")
    except Exception as e:
        # Don't crash app if warmup fails; we'll fall back to keyword-only.
        logger.warning(f"Failed to warm up NLP classifier: {e}")


@app.post("/analyze/keywords")
async def analyze_keywords(input: TextInput):
    """Detect bias keywords in text"""
    try:
        result = detect_bias_keywords(input.text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze/classifier")
async def analyze_classifier(input: TextInput):
    """Classify text using zero-shot classification"""
    try:
        result = analyze_with_classifier(input.text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze/full")
async def analyze_full_bias(input: TextInput):
    """Complete bias analysis with keywords and classification (fast mode by default)"""
    try:
        # MNLI-based NLP is enabled by default (use_nlp=True in the model),
        # but can still be turned off explicitly by sending use_nlp=false.
        result = analyze_full(input.text, use_nlp=bool(input.use_nlp))
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/rewrite")
async def rewrite_job(input: TextInput):
    """Rewrite job description to be inclusive"""
    try:
        result = rewrite_inclusive(input.text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/company/insights")
async def company_insights(input: CompanyInput):
    """Get company DEI insights and alternatives"""
    try:
        insights = get_company_insights(input.company)
        alternatives = get_alternatives(input.company)
        alternative_jobs = get_alternative_jobs(input.company)
        return {
            "company": input.company,
            "insights": insights,
            "alternatives": alternatives,
            "alternative_jobs": alternative_jobs
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/parse-link")
async def parse_link(input: URLInput):
    """Parse job posting from URL (mock implementation)"""
    try:
        result = parse_job_link(input.url)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

