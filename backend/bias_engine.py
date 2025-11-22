import re
import logging
from typing import Dict, List, Optional
from transformers import pipeline
import torch

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Cache the classifier model
_classifier = None
_classifier_error = None


def get_classifier():
    """Load and cache the zero-shot classifier (lazy load, may be slow)"""
    global _classifier, _classifier_error
    if _classifier_error:
        raise _classifier_error
    
    if _classifier is None:
        try:
            logger.info("Loading NLP classifier model (this may take 30-60 seconds on first run)...")
            # Use a smaller/faster model if available, otherwise use default
            _classifier = pipeline(
                "zero-shot-classification",
                model="facebook/bart-large-mnli",
                device=0 if torch.cuda.is_available() else -1
            )
            logger.info("NLP classifier model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load NLP classifier: {e}")
            _classifier_error = e
            raise
    return _classifier


# Bias keyword lists
MASCULINE_CODED = [
    "aggressive", "ambitious", "assertive", "competitive", "confident",
    "decisive", "dominant", "driven", "forceful", "independent",
    "leader", "logical", "outspoken", "rockstar", "ninja", "guru",
    "work hard play hard", "hustle", "crush it"
]

FEMININE_CODED = [
    "nurturing", "collaborative", "empathetic", "supportive", "caring",
    "sensitive", "gentle", "warm", "compassionate"
]

AGE_BIASED = [
    "digital native", "young", "energetic", "fresh", "recent graduate",
    "millennial", "gen z", "junior", "entry-level only"
]

EXCLUSIONARY_LANGUAGE = [
    "must be eligible to work in the u.s.", "no work visa sponsorship",
    "no sponsorship", "native english speaker", "native speaker required",
    "strong north american communication", "must have work experience in canadian",
    "must have work experience in american", "local experience required",
    "u.s. citizen only", "must be authorized to work in the united states"
]

CULTURAL_FIT_CLICHES = [
    "cultural fit", "work hard play hard", "beer fridays", "startup culture",
    "fast-paced environment", "like a family"
]

DISABILITY_BIASED = [
    "must be able to lift", "must be able to stand", "physical requirements",
    "must be able to travel", "able-bodied"
]


def detect_bias_keywords(text: str) -> Dict:
    """Detect bias keywords in text and return counts - REAL ANALYSIS"""
    if not text or len(text.strip()) == 0:
        return {
            "masculine_coded": {"count": 0, "matches": []},
            "feminine_coded": {"count": 0, "matches": []},
            "age_biased": {"count": 0, "matches": []},
            "exclusionary_language": {"count": 0, "matches": []},
            "cultural_fit": {"count": 0, "matches": []},
            "disability_biased": {"count": 0, "matches": []}
        }
    
    text_lower = text.lower()
    # Normalize whitespace for better matching
    text_normalized = ' '.join(text_lower.split())
    
    results = {
        "masculine_coded": {
            "count": 0,
            "matches": []
        },
        "feminine_coded": {
            "count": 0,
            "matches": []
        },
        "age_biased": {
            "count": 0,
            "matches": []
        },
        "exclusionary_language": {
            "count": 0,
            "matches": []
        },
        "cultural_fit": {
            "count": 0,
            "matches": []
        },
        "disability_biased": {
            "count": 0,
            "matches": []
        }
    }
    
    # Check masculine coded - using word boundaries for better accuracy
    for word in MASCULINE_CODED:
        # Use word boundaries for single words, substring for phrases
        if len(word.split()) == 1:
            pattern = r'\b' + re.escape(word) + r'\b'
            if re.search(pattern, text_normalized, re.IGNORECASE):
                results["masculine_coded"]["count"] += 1
                results["masculine_coded"]["matches"].append(word)
        else:
            if word in text_normalized:
                results["masculine_coded"]["count"] += 1
                results["masculine_coded"]["matches"].append(word)
    
    # Check feminine coded
    for word in FEMININE_CODED:
        pattern = r'\b' + re.escape(word) + r'\b'
        if re.search(pattern, text_normalized, re.IGNORECASE):
            results["feminine_coded"]["count"] += 1
            results["feminine_coded"]["matches"].append(word)
    
    # Check age biased
    for phrase in AGE_BIASED:
        if phrase in text_normalized:
            results["age_biased"]["count"] += 1
            results["age_biased"]["matches"].append(phrase)
    
    # Check exclusionary language (case-insensitive phrase matching)
    for phrase in EXCLUSIONARY_LANGUAGE:
        if phrase in text_normalized:
            results["exclusionary_language"]["count"] += 1
            results["exclusionary_language"]["matches"].append(phrase)
    
    # Check cultural fit
    for phrase in CULTURAL_FIT_CLICHES:
        if phrase in text_normalized:
            results["cultural_fit"]["count"] += 1
            results["cultural_fit"]["matches"].append(phrase)
    
    # Check disability biased
    for phrase in DISABILITY_BIASED:
        if phrase in text_normalized:
            results["disability_biased"]["count"] += 1
            results["disability_biased"]["matches"].append(phrase)
    
    logger.info(f"Keyword analysis found {sum(r['count'] for r in results.values())} bias indicators")
    return results


def analyze_with_classifier(text: str, timeout: int = 3) -> Dict:
    """Use zero-shot classification to detect bias types - REAL NLP ANALYSIS (with timeout)"""
    if not text or len(text.strip()) == 0:
        return {
            "labels": ["neutral"],
            "scores": [1.0],
            "error": None
        }
    
    try:
        import signal
        
        # Try to get classifier with timeout protection
        try:
            classifier = get_classifier()
        except Exception as e:
            logger.warning(f"Classifier not available: {e}")
            raise
        
        candidate_labels = [
            "age-bias",
            "gender-bias",
            "culture-fit-bias",
            "exclusionary-language",
            "disability-bias",
            "neutral"
        ]
        
        # Truncate very long text for model (BART has token limits)
        max_length = 500
        text_for_analysis = text[:max_length] if len(text) > max_length else text
        
        logger.info("Running NLP classification...")
        result = classifier(text_for_analysis, candidate_labels)
        logger.info(f"NLP classification result: {result['labels'][0]} (confidence: {result['scores'][0]:.2f})")
        
        return {
            "labels": result["labels"],
            "scores": result["scores"],
            "error": None
        }
    except Exception as e:
        logger.warning(f"NLP classification failed, using keyword-only analysis: {e}")
        # Fallback: use keyword analysis to infer classification
        keyword_results = detect_bias_keywords(text)
        
        # Infer labels from keywords
        inferred_labels = ["neutral"]
        inferred_scores = [0.5]
        
        if keyword_results["exclusionary_language"]["count"] > 0:
            inferred_labels.insert(0, "exclusionary-language")
            inferred_scores.insert(0, 0.8)
        if keyword_results["masculine_coded"]["count"] > 0 or keyword_results["feminine_coded"]["count"] > 0:
            inferred_labels.insert(0, "gender-bias")
            inferred_scores.insert(0, 0.7)
        if keyword_results["age_biased"]["count"] > 0:
            inferred_labels.insert(0, "age-bias")
            inferred_scores.insert(0, 0.7)
        
        return {
            "labels": inferred_labels[:6],
            "scores": inferred_scores[:6],
            "error": str(e),
            "fallback": True
        }


def calculate_bias_score(keyword_results: Dict, classifier_results: Dict) -> int:
    """Calculate overall bias score from 0-100"""
    score = 0
    
    # Weight keyword matches
    weights = {
        "exclusionary_language": 15,  # Heavy penalty
        "masculine_coded": 8,
        "feminine_coded": 8,
        "age_biased": 10,
        "cultural_fit": 5,
        "disability_biased": 12
    }
    
    for category, weight in weights.items():
        count = keyword_results.get(category, {}).get("count", 0)
        score += min(count * weight, 30)  # Cap per category
    
    # Add classifier confidence
    if classifier_results.get("scores") and len(classifier_results["scores"]) > 0:
        top_score = classifier_results["scores"][0]
        if classifier_results["labels"][0] != "neutral":
            score += int(top_score * 20)
    
    return min(score, 100)


def analyze_full(text: str, use_nlp: bool = False) -> Dict:
    """Complete bias analysis combining keywords and classification - REAL ANALYSIS (Fast mode)"""
    logger.info(f"Starting full bias analysis on text ({len(text)} characters)")
    
    # Step 1: Real keyword detection (FAST - always runs)
    keyword_results = detect_bias_keywords(text)
    logger.info(f"Keyword analysis complete: {sum(r['count'] for r in keyword_results.values())} matches found")
    
    # Step 2: Real NLP classification (SLOW - optional, with timeout)
    classifier_results = None
    if use_nlp:
        try:
            # Try NLP but don't block if it's slow
            classifier_results = analyze_with_classifier(text, timeout=3)
            logger.info(f"Classification complete: top label = {classifier_results['labels'][0]}")
        except Exception as e:
            logger.warning(f"NLP classification skipped due to timeout/error: {e}")
            # Use keyword-based inference instead
            keyword_results_for_inference = keyword_results
            inferred_labels = ["neutral"]
            inferred_scores = [0.5]
            
            if keyword_results_for_inference["exclusionary_language"]["count"] > 0:
                inferred_labels.insert(0, "exclusionary-language")
                inferred_scores.insert(0, 0.8)
            if keyword_results_for_inference["masculine_coded"]["count"] > 0 or keyword_results_for_inference["feminine_coded"]["count"] > 0:
                inferred_labels.insert(0, "gender-bias")
                inferred_scores.insert(0, 0.7)
            if keyword_results_for_inference["age_biased"]["count"] > 0:
                inferred_labels.insert(0, "age-bias")
                inferred_scores.insert(0, 0.7)
            
            classifier_results = {
                "labels": inferred_labels[:6],
                "scores": inferred_scores[:6],
                "error": str(e),
                "fallback": True
            }
    else:
        # Skip NLP entirely, use keyword inference
        keyword_results_for_inference = keyword_results
        inferred_labels = ["neutral"]
        inferred_scores = [0.5]
        
        if keyword_results_for_inference["exclusionary_language"]["count"] > 0:
            inferred_labels.insert(0, "exclusionary-language")
            inferred_scores.insert(0, 0.8)
        if keyword_results_for_inference["masculine_coded"]["count"] > 0 or keyword_results_for_inference["feminine_coded"]["count"] > 0:
            inferred_labels.insert(0, "gender-bias")
            inferred_scores.insert(0, 0.7)
        if keyword_results_for_inference["age_biased"]["count"] > 0:
            inferred_labels.insert(0, "age-bias")
            inferred_scores.insert(0, 0.7)
        
        classifier_results = {
            "labels": inferred_labels[:6],
            "scores": inferred_scores[:6],
            "fallback": True
        }
    
    # Step 3: Calculate scores based on real analysis (keywords are primary)
    bias_score = calculate_bias_score(keyword_results, classifier_results or {})
    intl_score = calculate_international_bias_score(keyword_results)
    
    # Step 4: Generate red flags from real matches
    red_flags = generate_red_flags(keyword_results)
    
    logger.info(f"Analysis complete - Bias Score: {bias_score}/100, Intl Score: {intl_score}/100")
    
    return {
        "bias_score": bias_score,
        "international_student_bias_score": intl_score,
        "keyword_analysis": keyword_results,
        "classification": classifier_results or {},
        "red_flags": red_flags,
        "breakdown": {
            "visa_requirements": count_visa_issues(keyword_results),
            "language_bias": count_language_bias(keyword_results),
            "cultural_assumptions": keyword_results.get("cultural_fit", {}).get("count", 0),
            "other_exclusionary": keyword_results.get("masculine_coded", {}).get("count", 0) + 
                                 keyword_results.get("age_biased", {}).get("count", 0)
        },
        "analysis_type": "real",  # Flag to show this is real analysis
        "nlp_used": classifier_results is not None and not classifier_results.get("fallback", False)
    }


def calculate_international_bias_score(keyword_results: Dict) -> int:
    """Calculate international student specific bias score"""
    score = 0
    
    # Visa requirements (heavy penalty)
    exclusionary = keyword_results.get("exclusionary_language", {})
    visa_count = sum(1 for match in exclusionary.get("matches", []) 
                    if "visa" in match.lower() or "sponsorship" in match.lower() 
                    or "eligible to work" in match.lower())
    score += visa_count * 30
    
    # Language bias
    language_count = sum(1 for match in exclusionary.get("matches", []) 
                        if "native" in match.lower() or "english" in match.lower())
    score += language_count * 20
    
    # Cultural assumptions
    score += keyword_results.get("cultural_fit", {}).get("count", 0) * 12
    
    # Other exclusionary terms
    score += keyword_results.get("age_biased", {}).get("count", 0) * 10
    
    return min(score, 100)


def count_visa_issues(keyword_results: Dict) -> int:
    """Count visa-related issues"""
    exclusionary = keyword_results.get("exclusionary_language", {})
    return sum(1 for match in exclusionary.get("matches", []) 
               if "visa" in match.lower() or "sponsorship" in match.lower() 
               or "eligible to work" in match.lower())


def count_language_bias(keyword_results: Dict) -> int:
    """Count language bias issues"""
    exclusionary = keyword_results.get("exclusionary_language", {})
    return sum(1 for match in exclusionary.get("matches", []) 
               if "native" in match.lower() or "english" in match.lower())


def generate_red_flags(keyword_results: Dict) -> List[Dict]:
    """Generate red flag warnings with severity"""
    flags = []
    
    exclusionary = keyword_results.get("exclusionary_language", {}).get("matches", [])
    
    for match in exclusionary:
        if "no sponsorship" in match.lower() or "visa" in match.lower():
            flags.append({
                "text": match,
                "severity": "high",
                "icon": "❗"
            })
        elif "native" in match.lower():
            flags.append({
                "text": match,
                "severity": "medium",
                "icon": "⚠️"
            })
    
    if keyword_results.get("cultural_fit", {}).get("count", 0) > 0:
        flags.append({
            "text": "Local experience required",
            "severity": "high",
            "icon": "❗"
        })
    
    return flags

