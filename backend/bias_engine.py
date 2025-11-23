import re
import time
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification, AutoConfig

try:  # ONNX acceleration is optional but preferred for hackathon demos.
    import onnxruntime as ort
except Exception:  # pragma: no cover - onnxruntime might be missing in CI
    ort = None

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Cache the classifier model (DeBERTa MNLI)
_classifier: Optional[Dict] = None
_classifier_error = None

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
ONNX_DIR = PROJECT_ROOT / "onnx_models"
DEFAULT_ONNX_CANDIDATES = [
    ONNX_DIR / "deberta-v3-base-mnli-int8.onnx",
    ONNX_DIR / "deberta-v3-base-mnli.onnx",
]


def _resolve_onnx_path() -> Optional[Path]:
    """Return the first available ONNX model path, if any."""
    for candidate in DEFAULT_ONNX_CANDIDATES:
        if candidate.exists():
            return candidate
    return None


def _find_entailment_idx(config) -> int:
    """Given a HF config with id2label, return the index for ENTAILMENT."""
    id2label = config.id2label
    for idx, label in id2label.items():
        if "entail" in label.lower():
            return int(idx)
    raise ValueError(f"Could not find 'entailment' label in id2label: {id2label}")


def _softmax_np(logits: np.ndarray) -> np.ndarray:
    """Numerically stable softmax for numpy arrays."""
    shifted = logits - np.max(logits, axis=-1, keepdims=True)
    exp = np.exp(shifted)
    return exp / np.sum(exp, axis=-1, keepdims=True)


def _mnli_entailment_probs(
    classifier: Dict,
    text: str,
    hypotheses: List[str],
) -> List[float]:
    """
    Compute entailment probabilities for a batch of hypotheses using either
    the HF model or the accelerated ONNX Runtime session.
    """
    tokenizer = classifier["tokenizer"]
    provider = classifier.get("provider", "hf")
    entailment_idx = classifier["entailment_idx"]

    premises = [text] * len(hypotheses)
    encoded = tokenizer(
        premises,
        hypotheses,
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=512,
    )

    if provider == "onnx" and classifier.get("session") is not None:
        ort_inputs = {
            "input_ids": encoded["input_ids"].cpu().numpy(),
        }
        if "attention_mask" in encoded:
            ort_inputs["attention_mask"] = encoded["attention_mask"].cpu().numpy()
        logits = classifier["session"].run(None, ort_inputs)[0]
        probs = _softmax_np(logits)
    else:
        model = classifier["model"]
        with torch.no_grad():
            outputs = model(**encoded)
            logits = outputs.logits
            probs = torch.softmax(logits, dim=-1).cpu().numpy()

    return [float(p[entailment_idx]) for p in probs]


def _split_sentences_with_spans(text: str) -> List[Tuple[str, int, int]]:
    """
    Lightweight sentence splitter that also returns character spans so the
    frontend can highlight the problematic region. Handles both punctuation
    and newline/bullet boundaries.
    """
    if not text:
        return []

    pattern = re.compile(r'([^.!?\n\r]+[.!?]?)', re.MULTILINE)
    sentences: List[Tuple[str, int, int]] = []

    for match in pattern.finditer(text):
        sentence = match.group(1).strip()
        if not sentence:
            continue
        start, end = match.span(1)
        sentences.append((sentence, start, end))

    return sentences


def _extract_biased_sentences(
    text: str,
    classifier: Dict,
    candidate_labels: List[str],
    hypotheses: Dict[str, str],
    max_sentences: int = 5,
    min_chars: int = 40,
    threshold: float = 0.55,
) -> List[Dict]:
    """
    Run MNLI over individual sentences to surface the most biased snippets for
    employer remediation flows.
    """
    if not text or not classifier:
        return []

    flagged: List[Dict] = []
    sentences = _split_sentences_with_spans(text)

    for sentence, start, end in sentences:
        if len(sentence) < min_chars:
            continue

        probs = _mnli_entailment_probs(
            classifier,
            sentence,
            [hypotheses[label] for label in candidate_labels],
        )
        paired = list(zip(candidate_labels, probs))
        paired.sort(key=lambda x: x[1], reverse=True)
        top_label, top_score = paired[0]

        if top_label != "neutral" and top_score >= threshold:
            flagged.append(
                {
                    "sentence": sentence,
                    "label": top_label,
                    "score": round(float(top_score), 4),
                    "start": start,
                    "end": end,
                }
            )

        if len(flagged) >= max_sentences:
            break

    return flagged


def get_classifier():
    """
    Load and cache the MNLI classifier (MoritzLaurer/deberta-v3-base-mnli).

    This replaces the previous BART-based zero-shot pipeline with a more
    efficient and modern MNLI model. We still combine it with the bias
    phrase lookup table so the dictionary remains the first line of detection,
    and MNLI handles subtle bias not captured by keywords.
    """
    global _classifier, _classifier_error
    if _classifier_error:
        raise _classifier_error
    
    if _classifier is None:
        try:
            model_name = "MoritzLaurer/deberta-v3-base-mnli"
            logger.info(
                "Loading DeBERTa v3 MNLI classifier (%s). This may take up to a minute on first run...",
                model_name,
            )
            config = AutoConfig.from_pretrained(model_name)
            entailment_idx = _find_entailment_idx(config)

            # Use slow tokenizer to avoid optional deps; it's still plenty fast.
            tokenizer = AutoTokenizer.from_pretrained(model_name, use_fast=False)

            provider = "hf"
            model = None
            session = None

            onnx_path = _resolve_onnx_path() if ort else None
            if onnx_path:
                logger.info("Found ONNX model at %s – using ONNX Runtime for MNLI.", onnx_path)
                sess_options = ort.SessionOptions()
                sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
                session = ort.InferenceSession(
                    onnx_path.as_posix(),
                    sess_options,
                    providers=["CPUExecutionProvider"],
                )
                provider = "onnx"
            else:
                logger.info(
                    "ONNX Runtime acceleration unavailable. Falling back to Torch HF model."
                )
                model = AutoModelForSequenceClassification.from_pretrained(model_name)
                model.to("cpu")
                model.eval()

            _classifier = {
                "tokenizer": tokenizer,
                "model": model,
                "session": session,
                "entailment_idx": entailment_idx,
                "provider": provider,
                "model_name": model_name,
            }
            logger.info(
                "DeBERTa MNLI classifier ready (provider=%s).", provider
            )
        except Exception as e:
            logger.error(f"Failed to load NLP classifier: {e}")
            _classifier_error = e
            raise
    return _classifier


# Unified bias phrase dictionary: one source of truth for detection + rewriting
# Each entry: phrase -> replacement + high-level category for analysis
BIAS_PHRASES = {
    # Gender-coded / "rockstar" language
    "rockstar": {
        "replacement": "high-performing professional",
        "category": "masculine_coded",
    },
    "ninja": {
        "replacement": "skilled professional",
        "category": "masculine_coded",
    },
    "guru": {
        "replacement": "subject matter expert",
        "category": "masculine_coded",
    },
    "hustle": {
        "replacement": "dedication",
        "category": "masculine_coded",
    },
    "crush it": {
        "replacement": "excel",
        "category": "masculine_coded",
    },
    "aggressive": {
        "replacement": "proactive and results-driven",
        "category": "masculine_coded",
    },
    "dominant": {
        "replacement": "strong leadership",
        "category": "masculine_coded",
    },
    "forceful": {
        "replacement": "persuasive",
        "category": "masculine_coded",
    },
    "assertive personality": {
        "replacement": "strong communication skills",
        "category": "masculine_coded",
    },
    "leadership presence": {
        "replacement": "leadership capabilities",
        "category": "masculine_coded",
    },
    "male applicants preferred": {
        "replacement": "",
        "category": "masculine_coded",
    },
    "male preferred": {
        "replacement": "",
        "category": "masculine_coded",
    },
    "men preferred": {
        "replacement": "",
        "category": "masculine_coded",
    },
    "strong": {
        "replacement": "proven",
        "category": "masculine_coded",
    },
    "drive": {
        "replacement": "steer",
        "category": "masculine_coded",
    },
    "lead": {
        "replacement": "manage",
        "category": "masculine_coded",
    },
    "analysis": {
        "replacement": "research",
        "category": "masculine_coded",
    },
    "individuals": {
        "replacement": "team members",
        "category": "masculine_coded",
    },
    "decisions": {
        "replacement": "actions",
        "category": "masculine_coded",
    },
    "competitive": {
        "replacement": "results-oriented",
        "category": "masculine_coded",
    },
    "tackle": {
        "replacement": "solve",
        "category": "masculine_coded",
    },
    "independent": {
        "replacement": "competent",
        "category": "masculine_coded",
    },

    # Feminine-coded language (tracked for balance)
    "nurturing": {
        "replacement": "supportive",
        "category": "feminine_coded",
    },
    "empathetic": {
        "replacement": "empathetic",
        "category": "feminine_coded",
    },
    "supportive": {
        "replacement": "supportive",
        "category": "feminine_coded",
    },
    "caring": {
        "replacement": "thoughtful",
        "category": "feminine_coded",
    },

    # Age bias
    "digital native": {
        "replacement": "comfortable with modern technology",
        "category": "age_biased",
    },
    "young and energetic": {
        "replacement": "enthusiastic and motivated",
        "category": "age_biased",
    },
    "young team": {
        "replacement": "dynamic and collaborative team",
        "category": "age_biased",
    },
    "young professionals": {
        "replacement": "talented professionals",
        "category": "age_biased",
    },
    "recent graduate": {
        "replacement": "early-career professional",
        "category": "age_biased",
    },
    "recent college graduate": {
        "replacement": "early-career professional",
        "category": "age_biased",
    },
    "new graduate": {
        "replacement": "early-career professional",
        "category": "age_biased",
    },
    "fresh out of college": {
        "replacement": "early-career professional",
        "category": "age_biased",
    },
    "energetic team": {
        "replacement": "motivated team",
        "category": "age_biased",
    },
    "under 30": {
        "replacement": "",
        "category": "age_biased",
    },
    "under 25": {
        "replacement": "",
        "category": "age_biased",
    },

    # Exclusionary / visa / citizenship language
    "must be eligible to work in the u.s.": {
        "replacement": "authorization to work in the U.S. required",
        "category": "exclusionary_language",
    },
    "no work visa sponsorship": {
        "replacement": "work authorization required",
        "category": "exclusionary_language",
    },
    "no visa sponsorship": {
        "replacement": "work authorization required",
        "category": "exclusionary_language",
    },
    "no sponsorship": {
        "replacement": "work authorization required",
        "category": "exclusionary_language",
    },
    "native english speaker": {
        "replacement": "excellent English communication skills",
        "category": "exclusionary_language",
    },
    "native english speaker only": {
        "replacement": "excellent English communication skills required",
        "category": "exclusionary_language",
    },
    "native speaker required": {
        "replacement": "excellent communication skills required",
        "category": "exclusionary_language",
    },
    "native speaker only": {
        "replacement": "excellent communication skills required",
        "category": "exclusionary_language",
    },
    "strong north american communication": {
        "replacement": "strong communication skills",
        "category": "exclusionary_language",
    },
    "canadian citizens only": {
        "replacement": "authorization to work in Canada required",
        "category": "exclusionary_language",
    },
    "u.s. citizen only": {
        "replacement": "authorization to work in the U.S. required",
        "category": "exclusionary_language",
    },
    "us citizen only": {
        "replacement": "authorization to work in the U.S. required",
        "category": "exclusionary_language",
    },
    "no international students": {
        "replacement": "",
        "category": "exclusionary_language",
    },
    "no work-permit holders": {
        "replacement": "",
        "category": "exclusionary_language",
    },
    "citizens only": {
        "replacement": "work authorization required",
        "category": "exclusionary_language",
    },
    "local applicants only": {
        "replacement": "",
        "category": "exclusionary_language",
    },
    "no relocations": {
        "replacement": "",
        "category": "exclusionary_language",
    },
    "must be local": {
        "replacement": "",
        "category": "exclusionary_language",
    },
    "no remote": {
        "replacement": "hybrid or on-site work available",
        "category": "exclusionary_language",
    },

    # Cultural fit / toxicity clichés
    "work hard play hard": {
        "replacement": "collaborative and supportive work environment",
        "category": "cultural_fit",
    },
    "work hard, play hard": {
        "replacement": "collaborative and supportive work environment",
        "category": "cultural_fit",
    },
    "cultural fit": {
        "replacement": "strong team collaboration",
        "category": "cultural_fit",
    },
    "fit the culture": {
        "replacement": "collaborate effectively with our team",
        "category": "cultural_fit",
    },
    "fit our culture": {
        "replacement": "collaborate effectively with our team",
        "category": "cultural_fit",
    },
    "beer fridays": {
        "replacement": "regular team social events",
        "category": "cultural_fit",
    },
    "after-work drinks": {
        "replacement": "team social events",
        "category": "cultural_fit",
    },
    "startup culture": {
        "replacement": "dynamic and innovative environment",
        "category": "cultural_fit",
    },
    "fast-paced environment": {
        "replacement": "dynamic and fast-paced environment",
        "category": "cultural_fit",
    },
    "like a family": {
        "replacement": "supportive team environment",
        "category": "cultural_fit",
    },
    "go-getter": {
        "replacement": "proactive professional",
        "category": "cultural_fit",
    },
    "self-starter": {
        "replacement": "independent and proactive",
        "category": "cultural_fit",
    },
    "team player": {
        "replacement": "collaborative team member",
        "category": "cultural_fit",
    },

    # Disability / physical requirements
    "must be able to lift": {
        "replacement": "",
        "category": "disability_biased",
    },
    "must be able to stand": {
        "replacement": "",
        "category": "disability_biased",
    },
    "physical requirements": {
        "replacement": "",
        "category": "disability_biased",
    },
    "able-bodied": {
        "replacement": "",
        "category": "disability_biased",
    },
    "without accommodation": {
        "replacement": "with reasonable accommodations as needed",
        "category": "disability_biased",
    },
    "no accommodation": {
        "replacement": "reasonable accommodations available",
        "category": "disability_biased",
    },
    "must have valid driver's license": {
        "replacement": "valid driver's license preferred (if travel is required)",
        "category": "disability_biased",
    },
    "personal vehicle required": {
        "replacement": "access to transportation preferred (if travel is required)",
        "category": "disability_biased",
    },
    # Appearance
    "professional appearance": {
        "replacement": "professional demeanor",
        "category": "appearance_biased",
    },
    "clean-cut appearance": {
        "replacement": "professional demeanor",
        "category": "appearance_biased",
    },
    "no visible tattoos": {
        "replacement": "",
        "category": "appearance_biased",
    },
    "no tattoos": {
        "replacement": "",
        "category": "appearance_biased",
    },
    "no visible piercings": {
        "replacement": "",
        "category": "appearance_biased",
    },
    "no piercings": {
        "replacement": "",
        "category": "appearance_biased",
    },
}



def detect_bias_keywords(text: str) -> Dict:    
    if not text or len(text.strip()) == 0:        
        return {            
            "masculine_coded": {"count": 0, "matches": []},            
            "feminine_coded": {"count": 0, "matches": []},            
            "age_biased": {"count": 0, "matches": []},            
            "exclusionary_language": {"count": 0, "matches": []},            
            "cultural_fit": {"count": 0, "matches": []},            
            "disability_biased": {"count": 0, "matches": []},            
            "appearance_biased": {"count": 0, "matches": []},        
        }    
    
    text_lower = text.lower()    
    text_normalized = ' '.join(text_lower.split())    
    
    results = {        
        "masculine_coded": {"count": 0, "matches": []},        
        "feminine_coded": {"count": 0, "matches": []},        
        "age_biased": {"count": 0, "matches": []},        
        "exclusionary_language": {"count": 0, "matches": []},        
        "cultural_fit": {"count": 0, "matches": []},        
        "disability_biased": {"count": 0, "matches": []},        
        "appearance_biased": {"count": 0, "matches": []},    
    }    
    
    # Unified phrase detection: one pass over the bias phrase dictionary    
    for phrase, meta in BIAS_PHRASES.items():        
        category = meta.get("category")        
        if category not in results:            
            continue        
        
        if len(phrase.split()) == 1:            
            pattern = r'\b' + re.escape(phrase) + r'\b'            
            found = re.search(pattern, text_normalized, re.IGNORECASE)        
        else:            
            found = phrase in text_normalized        

        if found:            
            results[category]["count"] += 1            
            if phrase not in results[category]["matches"]:                
                results[category]["matches"].append(phrase)    
    
    logger.info(f"Keyword analysis found {sum(r['count'] for r in results.values())} bias indicators")    
    return results

def analyze_with_classifier(text: str, timeout: int = 3) -> Dict:
    """
    Use MNLI-based classification to detect high-level bias types.

    Implementation details:
      - We reuse the MoritzLaurer/deberta-v3-base-mnli model loaded above.
      - For each bias label (age-bias, gender-bias, etc.), we create a natural
        language hypothesis and ask MNLI how likely the posting entails it.
      - We still rely on the bias phrase lookup table for phrase-level parsing;
        this classifier works at sentence/posting level to catch subtle cases.
    """
    if not text or len(text.strip()) == 0:
        return {
            "labels": ["neutral"],
            "scores": [1.0],
            "error": None
        }
    
    try:
        try:
            classifier = get_classifier()
        except Exception as e:
            logger.warning(f"Classifier not available: {e}")
            raise
        
        # Mapping from our bias labels to MNLI hypotheses
        candidate_labels = [
            "age-bias",
            "gender-bias",
            "culture-fit-bias",
            "exclusionary-language",
            "disability-bias",
            "neutral",
        ]

        hypotheses = {
            "age-bias": (
                "This job posting contains age-related bias or age discrimination."
            ),
            "gender-bias": (
                "This job posting contains gender-related bias or gender discrimination."
            ),
            "culture-fit-bias": (
                "This job posting uses cultural fit or culture-related language that "
                "may be exclusionary."
            ),
            "exclusionary-language": (
                "This job posting clearly excludes or discourages certain groups, "
                "such as international students, visa holders, or minorities, "
                "from applying."
            ),
            "disability-bias": (
                "This job posting says that candidates who need schedule changes or "
                "adjustments due to medical or personal health conditions should not "
                "apply, or otherwise refuses reasonable accommodations."
            ),
            "neutral": (
                "This job posting is neutral and inclusive with no biased language."
            ),
        }

        # Truncate very long text for model (token limit guard)
        max_length_chars = 1200
        text_for_analysis = (
            text[:max_length_chars] if len(text) > max_length_chars else text
        )

        logger.info("Running MNLI-based NLP classification with DeBERTa...")
        scores = []
        for label in candidate_labels:
            hyp = hypotheses[label]
            prob = _mnli_entailment_prob(classifier, text_for_analysis, hyp)
            scores.append(prob)

        # Sort labels by score (descending) for compatibility with previous API
        paired = list(zip(candidate_labels, scores))
        paired.sort(key=lambda x: x[1], reverse=True)
        sorted_labels = [p[0] for p in paired]
        sorted_scores = [float(p[1]) for p in paired]

        logger.info(
            "NLP classification result: %s (confidence: %.2f)",
            sorted_labels[0],
            sorted_scores[0],
        )

        return {
            "labels": sorted_labels,
            "scores": sorted_scores,
            "error": None,
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
        "masculine_coded": 10,  # Increased for explicit gender preference
        "feminine_coded": 8,
        "age_biased": 12,  # Increased for explicit age restrictions
        "cultural_fit": 6,
        "disability_biased": 14,  # Increased for accommodation refusals
        "appearance_biased": 12  # New category for appearance discrimination
    }
    
    for category, weight in weights.items():
        count = keyword_results.get(category, {}).get("count", 0)
        score += min(count * weight, 30)  # Cap per category
    
    # Add classifier confidence (MNLI-based) with label-aware weighting.
    # This lets the DeBERTa model boost the score even when no exact
    # dictionary phrases fire, especially for severe categories.
    if classifier_results.get("scores") and classifier_results.get("labels"):
        top_label = classifier_results["labels"][0]
        top_score = float(classifier_results["scores"][0])

        if top_label != "neutral":
            label_weights = {
                "exclusionary-language": 30,
                "disability-bias": 30,
                "age-bias": 24,
                "gender-bias": 24,
                "culture-fit-bias": 18,
            }
            base_weight = label_weights.get(top_label, 12)

            # Only trust the classifier when it's at least moderately confident.
            if top_score >= 0.4:
                score += int(top_score * base_weight)
    
    return min(score, 100)


def calculate_inclusivity_score(keyword_results: Dict, classifier_results: Optional[Dict] = None) -> Dict:
    """Calculate detailed inclusivity score breakdown"""
    scores = {
        "gender_bias": 0,
        "age_bias": 0,
        "disability_bias": 0,
        "cultural_fit_bias": 0,
        "exclusionary_language": 0,
        "appearance_bias": 0
    }
    
    # Gender bias (masculine + feminine coded) - higher weight for explicit preferences
    masculine_count = keyword_results.get("masculine_coded", {}).get("count", 0)
    feminine_count = keyword_results.get("feminine_coded", {}).get("count", 0)
    # Check for explicit gender preference (heavier penalty)
    masculine_matches = keyword_results.get("masculine_coded", {}).get("matches", [])
    has_explicit_gender = any("male" in m.lower() or "men" in m.lower() for m in masculine_matches)
    gender_multiplier = 15 if has_explicit_gender else 10
    gender_count = masculine_count + feminine_count
    scores["gender_bias"] = min(gender_count * gender_multiplier, 100)
    
    # Age bias - higher weight for explicit age restrictions
    age_count = keyword_results.get("age_biased", {}).get("count", 0)
    age_matches = keyword_results.get("age_biased", {}).get("matches", [])
    has_explicit_age = any("under" in m.lower() for m in age_matches)
    age_multiplier = 20 if has_explicit_age else 15
    scores["age_bias"] = min(age_count * age_multiplier, 100)
    
    # Disability bias - higher weight for accommodation refusals
    disability_count = keyword_results.get("disability_biased", {}).get("count", 0)
    disability_matches = keyword_results.get("disability_biased", {}).get("matches", [])
    has_no_accommodation = any("without accommodation" in m.lower() or "no accommodation" in m.lower() for m in disability_matches)
    disability_multiplier = 25 if has_no_accommodation else 20
    scores["disability_bias"] = min(disability_count * disability_multiplier, 100)
    
    # Cultural fit bias
    cultural_count = keyword_results.get("cultural_fit", {}).get("count", 0)
    scores["cultural_fit_bias"] = min(cultural_count * 12, 100)
    
    # Exclusionary language - higher weight for explicit citizenship/visa restrictions
    exclusionary_count = keyword_results.get("exclusionary_language", {}).get("count", 0)
    exclusionary_matches = keyword_results.get("exclusionary_language", {}).get("matches", [])
    has_explicit_exclusion = any("only" in m.lower() or "no" in m.lower() for m in exclusionary_matches)
    exclusionary_multiplier = 20 if has_explicit_exclusion else 15
    scores["exclusionary_language"] = min(exclusionary_count * exclusionary_multiplier, 100)
    
    # Appearance bias
    appearance_count = keyword_results.get("appearance_biased", {}).get("count", 0)
    appearance_matches = keyword_results.get("appearance_biased", {}).get("matches", [])
    has_explicit_appearance = any("no" in m.lower() for m in appearance_matches)
    appearance_multiplier = 18 if has_explicit_appearance else 12
    scores["appearance_bias"] = min(appearance_count * appearance_multiplier, 100)
    
    # Overall inclusivity score (inverse of bias - higher is better)
    total_bias = sum(scores.values())
    overall_inclusivity = max(0, 100 - (total_bias / 6))

    # Let MNLI-based classifier nudge inclusivity down even when keywords
    # don't fire, so clearly biased text isn't scored as a perfect 100.
    if classifier_results and classifier_results.get("labels") and classifier_results.get("scores"):
        top_label = classifier_results["labels"][0]
        top_score = float(classifier_results["scores"][0])
        if top_label != "neutral" and top_score >= 0.4:
            # Up to -20 points for high-confidence non-neutral classification.
            overall_inclusivity = max(0, overall_inclusivity - top_score * 20.0)
    
    return {
        "overall_inclusivity_score": round(overall_inclusivity, 1),
        "breakdown": scores,
        "interpretation": get_inclusivity_interpretation(overall_inclusivity)
    }


def get_inclusivity_interpretation(score: float) -> str:
    """Get interpretation of inclusivity score"""
    if score >= 80:
        return "Highly Inclusive"
    elif score >= 60:
        return "Moderately Inclusive"
    elif score >= 40:
        return "Needs Improvement"
    else:
        return "Low Inclusivity"


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
    inclusivity_score = calculate_inclusivity_score(keyword_results, classifier_results)
    
    # Step 4: Generate red flags from real matches
    red_flags = generate_red_flags(keyword_results)
    
    logger.info(f"Analysis complete - Bias Score: {bias_score}/100, Intl Score: {intl_score}/100, Inclusivity: {inclusivity_score['overall_inclusivity_score']}/100")
    
    return {
        "bias_score": bias_score,
        "international_student_bias_score": intl_score,
        "inclusivity_score": inclusivity_score,
        "inclusivity_score": inclusivity_score,
        "keyword_analysis": keyword_results,
        "classification": classifier_results or {},
        "red_flags": red_flags,
        "breakdown": {
            "visa_requirements": count_visa_issues(keyword_results),
            "language_bias": count_language_bias(keyword_results),
            "cultural_assumptions": keyword_results.get("cultural_fit", {}).get("count", 0),
            "gender_discrimination": keyword_results.get("masculine_coded", {}).get("count", 0),
            "age_discrimination": keyword_results.get("age_biased", {}).get("count", 0),
            "disability_discrimination": keyword_results.get("disability_biased", {}).get("count", 0),
            "appearance_discrimination": keyword_results.get("appearance_biased", {}).get("count", 0),
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
    """Generate red flag warnings with severity, explanations, and suggestions"""
    flags = []
    seen_flags = set()  # Avoid duplicates
    
    exclusionary = keyword_results.get("exclusionary_language", {}).get("matches", [])
    
    for match in exclusionary:
        match_lower = match.lower()
        if ("no sponsorship" in match_lower or "visa" in match_lower or 
            "no international" in match_lower or "citizens only" in match_lower or
            "no work-permit" in match_lower):
            flag_text = match
            if flag_text not in seen_flags:
                flags.append({
                    "text": flag_text,
                    "severity": "high",
                    "icon": "❗",
                    "category": "Visa/Immigration Exclusion",
                    "explanation": "This requirement explicitly excludes international candidates who may need visa sponsorship. This can be illegal in many jurisdictions and significantly reduces your talent pool.",
                    "suggestion": "Consider stating 'Visa sponsorship available for qualified candidates' or removing the restriction entirely if not legally required."
                })
                seen_flags.add(flag_text)
        elif "native" in match_lower:
            flag_text = match
            if flag_text not in seen_flags:
                flags.append({
                    "text": flag_text,
                    "severity": "high",
                    "icon": "❗",
                    "category": "Language Discrimination",
                    "explanation": "Requiring 'native' language skills discriminates against qualified candidates who learned the language as a second language. This excludes many talented international candidates.",
                    "suggestion": "Replace with 'fluent in [language]' or 'professional proficiency in [language]' to focus on ability rather than origin."
                })
                seen_flags.add(flag_text)
        elif "local applicants only" in match_lower or "no relocations" in match_lower:
            flag_text = match
            if flag_text not in seen_flags:
                flags.append({
                    "text": flag_text,
                    "severity": "high",
                    "icon": "❗",
                    "category": "Geographic Exclusion",
                    "explanation": "Geographic restrictions unnecessarily limit your candidate pool and may exclude highly qualified candidates willing to relocate.",
                    "suggestion": "If location is truly required, specify why (e.g., 'Must work on-site in [location]'). Otherwise, consider remote work options or relocation assistance."
                })
                seen_flags.add(flag_text)
    
    # Check for explicit gender discrimination
    masculine_matches = keyword_results.get("masculine_coded", {}).get("matches", [])
    for match in masculine_matches:
        if "male" in match.lower() or "men" in match.lower():
            flag_text = match
            if flag_text not in seen_flags:
                flags.append({
                    "text": flag_text,
                    "severity": "high",
                    "icon": "❗",
                    "category": "Gender Discrimination",
                    "explanation": "Explicitly stating a gender preference is illegal in most jurisdictions and constitutes direct discrimination. This violates equal employment opportunity laws.",
                    "suggestion": "Remove all gender-specific language. Focus on skills, qualifications, and competencies that are relevant to the role."
                })
                seen_flags.add(flag_text)
    
    # Check for explicit age discrimination
    age_matches = keyword_results.get("age_biased", {}).get("matches", [])
    for match in age_matches:
        if "under" in match.lower():
            flag_text = match
            if flag_text not in seen_flags:
                flags.append({
                    "text": flag_text,
                    "severity": "high",
                    "icon": "❗",
                    "category": "Age Discrimination",
                    "explanation": "Age restrictions are illegal in many countries (e.g., ADEA in the US protects workers 40+). This excludes experienced candidates and may violate employment law.",
                    "suggestion": "Remove age restrictions. If you need specific experience levels, state years of experience or skill requirements instead (e.g., '2-5 years of experience')."
                })
                seen_flags.add(flag_text)
    
    # Check for disability discrimination
    disability_matches = keyword_results.get("disability_biased", {}).get("matches", [])
    for match in disability_matches:
        if "without accommodation" in match.lower() or "no accommodation" in match.lower():
            flag_text = match
            if flag_text not in seen_flags:
                flags.append({
                    "text": match,
                    "severity": "high",
                    "icon": "❗",
                    "category": "Disability Discrimination",
                    "explanation": "Refusing to provide reasonable accommodations violates the ADA (US) and similar laws worldwide. This excludes qualified candidates with disabilities and may be illegal.",
                    "suggestion": "Remove accommodation refusals. Add 'We provide reasonable accommodations for qualified candidates with disabilities' to show inclusivity."
                })
                seen_flags.add(flag_text)
    
    # Check for appearance discrimination
    appearance_matches = keyword_results.get("appearance_biased", {}).get("matches", [])
    for match in appearance_matches:
        if "no visible" in match.lower() or "no tattoos" in match.lower() or "no piercings" in match.lower():
            flag_text = match
            if flag_text not in seen_flags:
                flags.append({
                    "text": match,
                    "severity": "high",
                    "icon": "❗",
                    "category": "Appearance Discrimination",
                    "explanation": "Appearance restrictions based on tattoos, piercings, or hairstyles can discriminate against cultural and religious practices. These requirements are often unnecessary for job performance.",
                    "suggestion": "Remove appearance restrictions unless they're essential for safety (e.g., food service). Focus on professional presentation rather than specific appearance requirements."
                })
                seen_flags.add(flag_text)
    
    # Cultural fit issues
    cultural_matches = keyword_results.get("cultural_fit", {}).get("matches", [])
    for match in cultural_matches:
        if "fit the culture" in match.lower() or "fit our culture" in match.lower():
            flag_text = match
            if flag_text not in seen_flags:
                flags.append({
                    "text": match,
                    "severity": "medium",
                    "icon": "⚠️",
                    "category": "Cultural Fit Bias",
                    "explanation": "Vague 'cultural fit' requirements can be used to exclude candidates from different backgrounds, cultures, or demographics. This often leads to unconscious bias in hiring.",
                    "suggestion": "Be specific about what you mean. Instead of 'cultural fit,' describe actual values (e.g., 'collaborative team player,' 'values diversity and inclusion')."
                })
                seen_flags.add(flag_text)
    
    return flags

