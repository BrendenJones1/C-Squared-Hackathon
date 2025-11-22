from typing import Optional, List, Dict
from pydantic import BaseModel


class BiasAnalysisResult(BaseModel):
    bias_score: int
    international_student_bias_score: int
    keyword_analysis: Dict
    classification: Dict
    red_flags: List[Dict]
    breakdown: Dict


class RewriteResult(BaseModel):
    rewritten_text: str
    changes: List[str]


class CompanyInsights(BaseModel):
    company: str
    insights: Dict
    alternatives: List[Dict]


class JobPosting(BaseModel):
    url: Optional[str] = None
    text: Optional[str] = None
    job_title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    type: Optional[str] = None

