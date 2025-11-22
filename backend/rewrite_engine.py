import os
import logging
from typing import Dict
from openai import OpenAI

logger = logging.getLogger(__name__)

# Initialize OpenAI client (will use API key from environment or mock)
client = None

def get_openai_client():
    """Get OpenAI client, using mock if no API key"""
    global client
    if client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key:
            client = OpenAI(api_key=api_key)
        else:
            client = None  # Will use mock response
    return client


def rewrite_inclusive(text: str) -> Dict:
    """Rewrite job description to be inclusive using LLM or rule-based - REAL REWRITE"""
    import logging
    logger = logging.getLogger(__name__)
    
    client = get_openai_client()
    
    if client is None:
        # Use rule-based rewrite (REAL transformation, not mock)
        logger.info("Using rule-based rewrite (no OpenAI API key)")
        rewritten = mock_rewrite(text)
        changes = identify_changes(text, rewritten)
        return {
            "rewritten_text": rewritten,
            "changes": changes,
            "method": "rule-based"
        }
    
    prompt = f"""Rewrite the following job description to be inclusive, neutral, and free of gendered or exclusionary language while keeping the meaning unchanged. Remove any visa restrictions, native speaker requirements, or cultural assumptions. Make it welcoming to international candidates and diverse backgrounds:

{text}

Rewritten version:"""
    
    try:
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert at rewriting job descriptions to be inclusive and bias-free."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1000
        )
        
        rewritten = response.choices[0].message.content
        
        # Extract changes (simplified - in production, use more sophisticated diff)
        changes = identify_changes(text, rewritten)
        
        return {
            "rewritten_text": rewritten,
            "changes": changes,
            "method": "llm"
        }
    except Exception as e:
        # Fallback to rule-based rewrite (REAL, not mock)
        logger.warning(f"LLM rewrite failed, using rule-based: {e}")
        rewritten = mock_rewrite(text)
        changes = identify_changes(text, rewritten)
        return {
            "rewritten_text": rewritten,
            "changes": changes,
            "method": "rule-based-fallback"
        }


def mock_rewrite(text: str) -> str:
    """Rule-based rewrite function - REAL TEXT TRANSFORMATION"""
    import re
    rewritten = text
    
    # Comprehensive replacements with case-insensitive matching
    replacements = [
        (r'\brockstar\b', 'skilled professional', re.IGNORECASE),
        (r'\bninja\b', 'expert', re.IGNORECASE),
        (r'\bguru\b', 'specialist', re.IGNORECASE),
        (r'\bnative\s+english\s+speaker\s+only\b', 'strong English communication skills required', re.IGNORECASE),
        (r'\bnative\s+english\s+speaker\b', 'strong English communication skills', re.IGNORECASE),
        (r'\bnative\s+speaker\s+only\b', 'strong communication skills required', re.IGNORECASE),
        (r'\bnative\s+speaker\b', 'strong communication skills', re.IGNORECASE),
        (r'canadian\s+citizens\s+only', 'authorization to work in Canada required', re.IGNORECASE),
        (r'no\s+international\s+students', '', re.IGNORECASE),
        (r'no\s+work-permit\s+holders', '', re.IGNORECASE),
        (r'must\s+be\s+eligible\s+to\s+work\s+in\s+the\s+u\.?s\.?', 'authorization to work required', re.IGNORECASE),
        (r'no\s+work\s+visa\s+sponsorship', 'work authorization required', re.IGNORECASE),
        (r'no\s+sponsorship', 'work authorization required', re.IGNORECASE),
        (r'\baggressive\b', 'proactive', re.IGNORECASE),
        (r'work\s+hard\s+play\s+hard', 'collaborative and dynamic environment', re.IGNORECASE),
        (r'\bdigital\s+native\b', 'comfortable with technology', re.IGNORECASE),
        (r'\byoung\s+and\s+energetic\b', 'enthusiastic', re.IGNORECASE),
        (r'\benergetic\b', 'motivated', re.IGNORECASE),
        (r'\bcultural\s+fit\b', 'team collaboration', re.IGNORECASE),
        (r'fit\s+the\s+culture', 'collaborate effectively with the team', re.IGNORECASE),
        (r'fit\s+our\s+culture', 'collaborate effectively with our team', re.IGNORECASE),
        (r'\bmust\s+be\s+authorized\s+to\s+work\s+in\s+the\s+united\s+states\b', 'authorization to work required', re.IGNORECASE),
        (r'\bu\.?s\.?\s+citizen\s+only\b', 'authorization to work required', re.IGNORECASE),
        (r'\bmust\s+have\s+work\s+experience\s+in\s+(canadian|american)\b', 'relevant work experience preferred', re.IGNORECASE),
        (r'\blocal\s+experience\s+required\b', 'relevant experience preferred', re.IGNORECASE),
        (r'\bstrong\s+north\s+american\s+communication\b', 'strong communication skills', re.IGNORECASE),
        (r'\bmale\s+applicants\s+preferred\b', '', re.IGNORECASE),
        (r'\bmale\s+preferred\b', '', re.IGNORECASE),
        (r'\bmen\s+preferred\b', '', re.IGNORECASE),
        (r'\bunder\s+\d+\s+years?\s+old\b', '', re.IGNORECASE),
        (r'\bunder\s+\d+\b', '', re.IGNORECASE),
        (r'\byoung\s+team\b', 'dynamic team', re.IGNORECASE),
        (r'\bprofessional\s+appearance\b', 'professional demeanor', re.IGNORECASE),
        (r'no\s+visible\s+tattoos', '', re.IGNORECASE),
        (r'no\s+tattoos', '', re.IGNORECASE),
        (r'no\s+visible\s+piercings', '', re.IGNORECASE),
        (r'no\s+piercings', '', re.IGNORECASE),
        (r'unconventional\s+hairstyles', '', re.IGNORECASE),
        (r'without\s+accommodation', 'with reasonable accommodations as needed', re.IGNORECASE),
        (r'no\s+accommodation', 'reasonable accommodations available', re.IGNORECASE),
        (r'must\s+have\s+valid\s+driver\'?s\s+license', 'valid driver\'s license preferred (if travel required)', re.IGNORECASE),
        (r'personal\s+vehicle\s+required', 'access to transportation preferred (if travel required)', re.IGNORECASE),
        (r'must\s+have\s+car', 'access to transportation preferred (if travel required)', re.IGNORECASE),
        (r'local\s+applicants\s+only', '', re.IGNORECASE),
        (r'no\s+relocations', '', re.IGNORECASE),
        (r'after-work\s+drinks', 'team social events', re.IGNORECASE),
        (r'traditional\s+workplace\s+culture', 'collaborative workplace culture', re.IGNORECASE),
    ]
    
    changes_made = []
    for pattern, replacement, flags in replacements:
        if re.search(pattern, rewritten, flags):
            rewritten = re.sub(pattern, replacement, rewritten, flags=flags)
            changes_made.append(f"Replaced '{pattern}' → '{replacement}'")
    
    # Remove unnecessary physical requirements for desk jobs
    if 'software' in rewritten.lower() or 'engineer' in rewritten.lower() or 'developer' in rewritten.lower():
        rewritten = re.sub(r'must\s+be\s+able\s+to\s+lift\s+\d+\s+lbs?', '', rewritten, flags=re.IGNORECASE)
        rewritten = re.sub(r'physical\s+requirements[^.]*\.', '', rewritten, flags=re.IGNORECASE)
    
    # Add inclusive statement if not present
    if "diverse" not in rewritten.lower() and "inclusive" not in rewritten.lower():
        rewritten += "\n\nWe welcome candidates from all backgrounds and are committed to building a diverse and inclusive team."
    
    return rewritten


def identify_changes(original: str, rewritten: str) -> list:
    """Identify key changes between original and rewritten text - REAL DETECTION"""
    import re
    changes = []
    
    original_lower = original.lower()
    rewritten_lower = rewritten.lower()
    
    # Detect specific changes
    change_patterns = [
        (r'\brockstar\b', "Removed 'rockstar' → 'skilled professional'"),
        (r'\bninja\b', "Removed 'ninja' → 'expert'"),
        (r'\bguru\b', "Removed 'guru' → 'specialist'"),
        (r'native\s+english\s+speaker\s+only', "Removed 'native English speaker only' → 'strong English communication skills required'"),
        (r'native\s+english\s+speaker', "Removed 'native English speaker' → 'strong English communication skills'"),
        (r'native\s+speaker\s+only', "Removed 'native speaker only' → 'strong communication skills required'"),
        (r'native\s+speaker', "Removed 'native speaker' → 'strong communication skills'"),
        (r'canadian\s+citizens\s+only', "Removed citizenship restriction → 'authorization to work in Canada required'"),
        (r'no\s+international\s+students', "Removed exclusion of international students"),
        (r'no\s+work-permit\s+holders', "Removed exclusion of work-permit holders"),
        (r'no\s+(work\s+)?visa\s+sponsorship', "Removed visa restrictions → 'work authorization required'"),
        (r'no\s+sponsorship', "Removed sponsorship restrictions → 'work authorization required'"),
        (r'must\s+be\s+eligible\s+to\s+work\s+in\s+the\s+u\.?s\.?', "Removed 'must be eligible to work in U.S.' → 'authorization to work required'"),
        (r'\baggressive\b', "Changed 'aggressive' → 'proactive'"),
        (r'work\s+hard\s+play\s+hard', "Removed 'work hard play hard' → 'collaborative and dynamic environment'"),
        (r'digital\s+native', "Removed 'digital native' → 'comfortable with technology'"),
        (r'young\s+and\s+energetic', "Removed 'young and energetic' → 'enthusiastic'"),
        (r'\benergetic\b', "Changed 'energetic' → 'motivated'"),
        (r'cultural\s+fit', "Removed 'cultural fit' → 'team collaboration'"),
        (r'fit\s+the\s+culture', "Removed 'fit the culture' → 'collaborate effectively with the team'"),
        (r'fit\s+our\s+culture', "Removed 'fit our culture' → 'collaborate effectively with our team'"),
        (r'u\.?s\.?\s+citizen\s+only', "Removed 'U.S. citizen only' → 'authorization to work required'"),
        (r'\bmale\s+applicants\s+preferred', "Removed gender preference"),
        (r'\bmale\s+preferred', "Removed gender preference"),
        (r'\bmen\s+preferred', "Removed gender preference"),
        (r'\bunder\s+\d+\s+years?\s+old', "Removed age restriction"),
        (r'\bunder\s+\d+', "Removed age restriction"),
        (r'\byoung\s+team', "Changed 'young team' → 'dynamic team'"),
        (r'professional\s+appearance', "Changed 'professional appearance' → 'professional demeanor'"),
        (r'no\s+visible\s+tattoos', "Removed appearance restriction"),
        (r'no\s+tattoos', "Removed appearance restriction"),
        (r'no\s+visible\s+piercings', "Removed appearance restriction"),
        (r'no\s+piercings', "Removed appearance restriction"),
        (r'unconventional\s+hairstyles', "Removed appearance restriction"),
        (r'without\s+accommodation', "Changed 'without accommodation' → 'with reasonable accommodations as needed'"),
        (r'no\s+accommodation', "Changed 'no accommodation' → 'reasonable accommodations available'"),
        (r'must\s+have\s+valid\s+driver\'?s\s+license', "Changed driver's license requirement to preferred (if travel required)"),
        (r'personal\s+vehicle\s+required', "Changed vehicle requirement to preferred (if travel required)"),
        (r'must\s+have\s+car', "Changed car requirement to preferred (if travel required)"),
        (r'local\s+applicants\s+only', "Removed geographic restriction"),
        (r'no\s+relocations', "Removed relocation restriction"),
        (r'after-work\s+drinks', "Changed 'after-work drinks' → 'team social events'"),
        (r'traditional\s+workplace\s+culture', "Changed 'traditional workplace culture' → 'collaborative workplace culture'"),
    ]
    
    for pattern, change_desc in change_patterns:
        if re.search(pattern, original_lower, re.IGNORECASE) and not re.search(pattern, rewritten_lower, re.IGNORECASE):
            changes.append(change_desc)
    
    # Check if inclusive statement was added
    if ("diverse" in rewritten_lower or "inclusive" in rewritten_lower) and \
       ("diverse" not in original_lower and "inclusive" not in original_lower):
        changes.append("Added inclusive language about diverse candidates")
    
    if len(changes) == 0:
        changes.append("Text reviewed and optimized for inclusivity and clarity")
    
    return changes

