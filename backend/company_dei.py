from typing import Dict, List, Optional

# Mock DEI dataset
DEI_DATA = [
    {
        "company": "GreenSpark Software",
        "inclusivity_score": 4.2,
        "leadership_diversity": 3.8,
        "international_friendly": 4.5,
        "work_life_balance": 4.0,
        "sponsorship_history": "Active",
        "diversity_report": "https://example.com/diversity-report",
        "glassdoor_culture": 4.1,
        "eeoc_certified": True,
        "erg_available": True,
        "global_footprint": ["US", "Canada", "UK"],
        "employee_sentiment": 4.3
    },
    {
        "company": "Valore Partners",
        "inclusivity_score": 3.8,
        "leadership_diversity": 3.5,
        "international_friendly": 3.2,
        "work_life_balance": 3.6,
        "sponsorship_history": "Limited",
        "diversity_report": None,
        "glassdoor_culture": 3.7,
        "eeoc_certified": True,
        "erg_available": False,
        "global_footprint": ["US"],
        "employee_sentiment": 3.5
    },
    {
        "company": "Augment",
        "inclusivity_score": 4.5,
        "leadership_diversity": 4.3,
        "international_friendly": 4.8,
        "work_life_balance": 4.2,
        "sponsorship_history": "Very Active",
        "diversity_report": "https://example.com/augment-diversity",
        "glassdoor_culture": 4.4,
        "eeoc_certified": True,
        "erg_available": True,
        "global_footprint": ["US", "Canada", "UK", "Germany", "India"],
        "employee_sentiment": 4.6
    },
    {
        "company": "TechFlow Systems",
        "inclusivity_score": 3.5,
        "leadership_diversity": 3.2,
        "international_friendly": 2.8,
        "work_life_balance": 3.4,
        "sponsorship_history": "Rare",
        "diversity_report": None,
        "glassdoor_culture": 3.3,
        "eeoc_certified": True,
        "erg_available": True,
        "global_footprint": ["US"],
        "employee_sentiment": 3.2
    },
    {
        "company": "DataVault",
        "inclusivity_score": 4.0,
        "leadership_diversity": 3.9,
        "international_friendly": 4.2,
        "work_life_balance": 3.8,
        "sponsorship_history": "Active",
        "diversity_report": "https://example.com/datavault-diversity",
        "glassdoor_culture": 4.0,
        "eeoc_certified": True,
        "erg_available": True,
        "global_footprint": ["US", "Canada"],
        "employee_sentiment": 4.1
    },
    {
        "company": "CloudScale Inc",
        "inclusivity_score": 4.7,
        "leadership_diversity": 4.6,
        "international_friendly": 4.9,
        "work_life_balance": 4.5,
        "sponsorship_history": "Very Active",
        "diversity_report": "https://example.com/cloudscale-diversity",
        "glassdoor_culture": 4.6,
        "eeoc_certified": True,
        "erg_available": True,
        "global_footprint": ["US", "Canada", "UK", "Germany", "India", "Australia"],
        "employee_sentiment": 4.7
    },
    {
        "company": "SecureNet Solutions",
        "inclusivity_score": 3.9,
        "leadership_diversity": 3.7,
        "international_friendly": 3.5,
        "work_life_balance": 3.7,
        "sponsorship_history": "Moderate",
        "diversity_report": None,
        "glassdoor_culture": 3.8,
        "eeoc_certified": True,
        "erg_available": False,
        "global_footprint": ["US", "Canada"],
        "employee_sentiment": 3.9
    },
    {
        "company": "InnovateAI",
        "inclusivity_score": 4.3,
        "leadership_diversity": 4.1,
        "international_friendly": 4.4,
        "work_life_balance": 4.1,
        "sponsorship_history": "Active",
        "diversity_report": "https://example.com/innovateai-diversity",
        "glassdoor_culture": 4.2,
        "eeoc_certified": True,
        "erg_available": True,
        "global_footprint": ["US", "Canada", "UK", "India"],
        "employee_sentiment": 4.3
    },
    {
        "company": "GlobalTech Corp",
        "inclusivity_score": 4.6,
        "leadership_diversity": 4.4,
        "international_friendly": 4.7,
        "work_life_balance": 4.3,
        "sponsorship_history": "Very Active",
        "diversity_report": "https://example.com/globaltech-diversity",
        "glassdoor_culture": 4.5,
        "eeoc_certified": True,
        "erg_available": True,
        "global_footprint": ["US", "Canada", "UK", "Germany", "India", "Australia", "Singapore"],
        "employee_sentiment": 4.5
    },
    {
        "company": "StartupXYZ",
        "inclusivity_score": 3.2,
        "leadership_diversity": 2.9,
        "international_friendly": 2.5,
        "work_life_balance": 3.0,
        "sponsorship_history": "None",
        "diversity_report": None,
        "glassdoor_culture": 3.1,
        "eeoc_certified": False,
        "erg_available": False,
        "global_footprint": ["US"],
        "employee_sentiment": 3.0
    },
    {
        "company": "Salesforce",
        "inclusivity_score": 4.7,
        "leadership_diversity": 4.6,
        "international_friendly": 4.8,
        "work_life_balance": 4.5,
        "sponsorship_history": "Very Active",
        "diversity_report": "https://www.salesforce.com/company/equality/",
        "glassdoor_culture": 4.6,
        "eeoc_certified": True,
        "erg_available": True,
        "global_footprint": ["US", "Canada", "UK", "Germany", "India", "Australia", "Japan", "Singapore", "Brazil", "France"],
        "employee_sentiment": 4.7
    },
    {
        "company": "Summit Ridge Enterprises",
        "inclusivity_score": 1.8,
        "leadership_diversity": 2.0,
        "international_friendly": 1.5,
        "work_life_balance": 2.5,
        "sponsorship_history": "None",
        "diversity_report": None,
        "glassdoor_culture": 2.2,
        "eeoc_certified": False,
        "erg_available": False,
        "global_footprint": ["Canada"],
        "employee_sentiment": 2.3
    }
]


def get_company_insights(company_name: str) -> Optional[Dict]:
    """Get DEI insights for a company"""
    company_lower = company_name.lower()
    
    for company in DEI_DATA:
        if company["company"].lower() == company_lower:
            return {
                "inclusivity_score": company["inclusivity_score"],
                "leadership_diversity": company["leadership_diversity"],
                "international_friendly": company["international_friendly"],
                "work_life_balance": company["work_life_balance"],
                "sponsorship_history": company["sponsorship_history"],
                "diversity_report": company["diversity_report"],
                "glassdoor_culture": company["glassdoor_culture"],
                "eeoc_certified": company["eeoc_certified"],
                "erg_available": company["erg_available"],
                "global_footprint": company["global_footprint"],
                "employee_sentiment": company["employee_sentiment"]
            }
    
    # Return "not found" response
    return {
        "inclusivity_score": None,
        "leadership_diversity": None,
        "international_friendly": None,
        "work_life_balance": None,
        "sponsorship_history": "Unknown",
        "diversity_report": None,
        "glassdoor_culture": None,
        "eeoc_certified": None,
        "erg_available": None,
        "global_footprint": [],
        "employee_sentiment": None,
        "status": "DEI data unavailable"
    }


# Mock alternative jobs dataset
ALTERNATIVE_JOBS = [
    {
        "job_title": "Senior Software Engineer",
        "company": "CloudScale Inc",
        "location": "Remote / San Francisco, CA",
        "inclusivity_score": 4.7,
        "international_friendly": 4.9,
        "sponsorship_history": "Very Active",
        "badges": ["International Friendly", "Verified Sponsorship", "Remote Friendly"],
        "description": "We're looking for a skilled software engineer to join our diverse team. Strong communication skills required. Work authorization required. We welcome candidates from all backgrounds."
    },
    {
        "job_title": "Full Stack Developer",
        "company": "GlobalTech Corp",
        "location": "New York, NY / Remote",
        "inclusivity_score": 4.6,
        "international_friendly": 4.7,
        "sponsorship_history": "Very Active",
        "badges": ["International Friendly", "Verified Sponsorship", "Diverse Team"],
        "description": "Join our inclusive engineering team. We value diverse perspectives and experiences. Relevant work experience preferred. Strong English communication skills required."
    },
    {
        "job_title": "Product Manager",
        "company": "Augment",
        "location": "Seattle, WA",
        "inclusivity_score": 4.5,
        "international_friendly": 4.8,
        "sponsorship_history": "Very Active",
        "badges": ["International Friendly", "Verified Sponsorship"],
        "description": "We're seeking a collaborative product manager to help build inclusive products. Experience with cross-functional teams preferred. We support work authorization for qualified candidates."
    },
    {
        "job_title": "Data Scientist",
        "company": "InnovateAI",
        "location": "Boston, MA / Remote",
        "inclusivity_score": 4.3,
        "international_friendly": 4.4,
        "sponsorship_history": "Active",
        "badges": ["International Friendly", "Remote Friendly"],
        "description": "Looking for a data scientist passionate about building fair and unbiased AI systems. We welcome candidates from all backgrounds. Work authorization required."
    },
    {
        "job_title": "DevOps Engineer",
        "company": "GreenSpark Software",
        "location": "Austin, TX",
        "inclusivity_score": 4.2,
        "international_friendly": 4.5,
        "sponsorship_history": "Active",
        "badges": ["International Friendly", "Verified Sponsorship"],
        "description": "Join our DevOps team building scalable infrastructure. We value diverse technical backgrounds. Strong problem-solving skills required. Work authorization required."
    }
]


def get_alternatives(company_name: str, limit: int = 3) -> List[Dict]:
    """Get alternative companies with better DEI scores"""
    company_lower = company_name.lower()
    
    # Find current company's score
    current_company = None
    for company in DEI_DATA:
        if company["company"].lower() == company_lower:
            current_company = company
            break
    
    if not current_company:
        # If company not found, return top companies
        sorted_companies = sorted(DEI_DATA, key=lambda x: x["inclusivity_score"], reverse=True)
        return [
            {
                "company": c["company"],
                "inclusivity_score": c["inclusivity_score"],
                "international_friendly": c["international_friendly"],
                "sponsorship_history": c["sponsorship_history"]
            }
            for c in sorted_companies[:limit]
        ]
    
    # Find companies with better scores
    alternatives = [
        c for c in DEI_DATA
        if c["company"].lower() != company_lower and
        c["inclusivity_score"] > current_company["inclusivity_score"]
    ]
    
    # Sort by inclusivity score
    alternatives.sort(key=lambda x: x["inclusivity_score"], reverse=True)
    
    return [
        {
            "company": c["company"],
            "inclusivity_score": c["inclusivity_score"],
            "international_friendly": c["international_friendly"],
            "sponsorship_history": c["sponsorship_history"],
            "badges": ["International Friendly", "Verified Sponsorship"] if c["international_friendly"] >= 4.0 else ["International Friendly"]
        }
        for c in alternatives[:limit]
    ]


def get_alternative_jobs(company_name: str = None, limit: int = 5) -> List[Dict]:
    """Get alternative job postings that are more inclusive"""
    # Filter out jobs from the same company if company_name provided
    if company_name:
        company_lower = company_name.lower()
        filtered_jobs = [j for j in ALTERNATIVE_JOBS if j["company"].lower() != company_lower]
        return filtered_jobs[:limit]
    
    return ALTERNATIVE_JOBS[:limit]

