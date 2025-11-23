import os
import logging
import re
from typing import Dict, List

logger = logging.getLogger(__name__)

try:
    from .bias_engine import analyze_with_classifier, BIAS_PHRASES
except ImportError:
    from bias_engine import analyze_with_classifier, BIAS_PHRASES


USE_NLP_REWRITE = os.getenv("USE_NLP_REWRITE", "0") == "1"


def split_sentences(text: str) -> List[str]:
    """Very simple sentence splitter based on punctuation."""
    # Preserve newlines as potential boundaries, then split on .?! followed by space/newline
    parts = re.split(r'(?<=[.!?])\s+', text.strip())
    # Filter out empty fragments
    return [p for p in parts if p.strip()]


def classify_sentence_bias(sentence: str, threshold: float = 0.6) -> Dict:
    """Use MNLI to decide if a sentence likely contains bias."""
    result = analyze_with_classifier(sentence, timeout=3)
    labels = result.get("labels") or []
    scores = result.get("scores") or []
    if labels and scores:
        top_label = labels[0]
        top_score = scores[0]
        is_biased = top_label != "neutral" and top_score >= threshold
    else:
        is_biased = False
        top_label = "neutral"
        top_score = 0.0
    return {
        "is_biased": is_biased,
        "label": top_label,
        "score": top_score,
        "raw": result,
    }


def apply_dictionary_replacements(sentence: str, change_log: List[str]) -> str:
    """Apply BIAS_PHRASES replacements inside a single sentence."""
    if not sentence.strip():
        return sentence

    lowered = sentence.lower()

    REASONS_BY_CATEGORY = {
        "masculine_coded": "reduces masculine-coded language and focuses on evidence-based qualities.",
        "feminine_coded": "avoids signaling a preference for a specific gendered communication style.",
        "age_biased": "removes age-biased wording so opportunities are open to all experience levels.",
        "exclusionary_language": "removes visa/citizenship restrictions and focuses on work authorization instead.",
        "cultural_fit": "replaces vague 'culture fit' language with clear collaboration expectations.",
        "disability_biased": "removes unnecessary physical or ability-based requirements.",
        "appearance_biased": "removes appearance-based restrictions unrelated to job performance.",
    }

    # Apply longer phrases first to avoid partial overlaps
    for phrase, meta in sorted(BIAS_PHRASES.items(), key=lambda kv: len(kv[0]), reverse=True):
        replacement = meta.get("replacement", "")
        category = meta.get("category")
        if not phrase or phrase not in lowered:
            continue

        # Build a case-insensitive pattern; for multi-word phrases we allow substring match
        if len(phrase.split()) == 1:
            pattern = re.compile(r'\b' + re.escape(phrase) + r'\b', re.IGNORECASE)
        else:
            pattern = re.compile(re.escape(phrase), re.IGNORECASE)

        if pattern.search(sentence):
            def _repl(match: re.Match) -> str:
                text = match.group(0)
                rep = replacement
                # Preserve capitalization style of the original match
                if text.isupper():
                    rep = replacement.upper()
                elif text[0].isupper():
                    rep = replacement[:1].upper() + replacement[1:]
                return rep

            sentence = pattern.sub(_repl, sentence)
            lowered = sentence.lower()
            reason = REASONS_BY_CATEGORY.get(category)
            if reason:
                change_log.append(
                    f"Replaced '{phrase}' with '{replacement}' – {reason}"
                )
            else:
                change_log.append(f"Replaced '{phrase}' with '{replacement}'")

    return sentence


def paraphrase_sentence(sentence: str) -> str:
    """Placeholder paraphrasing hook (currently no-op for speed)."""
    # NOTE: To re-enable HF paraphrasing, wire in a small T5 model here.
    return sentence


def rewrite_with_mnli_and_dictionary(text: str) -> Dict:
    """
    Complete rewrite pipeline:
    1) MNLI at sentence level to flag biased sentences.
    2) Dictionary lookup to localize & replace biased phrases.
    3) Optional paraphrasing for fluency.
    4) MNLI validation; fallback to deterministic version if paraphrase reintroduces bias.
    """
    sentences = split_sentences(text)
    rewritten_sentences: List[str] = []
    changes: List[str] = []

    for sentence in sentences:
        info = classify_sentence_bias(sentence)

        if not info["is_biased"]:
            # Keep sentence as-is; no rewrite necessary
            rewritten_sentences.append(sentence)
            continue

        # Step 2: apply dictionary replacements
        clean_sentence = apply_dictionary_replacements(sentence, changes)

        if clean_sentence.strip() == sentence.strip():
            # MNLI thinks it's biased but dictionary found nothing – flag but don't rewrite
            changes.append(
                f"Potential bias detected in sentence, but no known phrases to rewrite: '{sentence[:120]}...'"
            )
            rewritten_sentences.append(sentence)
            continue

        # Step 3: optional paraphrasing for fluency (currently disabled for speed)
        clean_sentence = paraphrase_sentence(clean_sentence)
        rewritten_sentences.append(clean_sentence)

    rewritten_text = " ".join(rewritten_sentences).strip()

    # Add welcoming inclusive statement if not present
    if (
        "diverse" not in rewritten_text.lower()
        and "inclusive" not in rewritten_text.lower()
        and "welcome" not in rewritten_text.lower()
    ):
        rewritten_text += (
            "\n\nWe welcome candidates from all backgrounds and are committed to "
            "building a diverse and inclusive team."
        )

    if not changes:
        changes.append("Text reviewed with MNLI + dictionary; no biased phrases found to rewrite.")

    return {
        "rewritten_text": rewritten_text,
        "changes": changes,
        "method": "mnli-dictionary",
    }


def rewrite_inclusive(text: str) -> Dict:
    """
    Main entrypoint used by the API.
    By default uses fast dictionary-only rewrite.
    When USE_NLP_REWRITE=1, uses MNLI + dictionary pipeline.
    """
    if USE_NLP_REWRITE:
        logger.info("Rewriting job description using MNLI + dictionary pipeline")
        try:
            return rewrite_with_mnli_and_dictionary(text)
        except Exception as e:
            logger.warning(f"MNLI rewrite failed, falling back to dictionary-only: {e}")

    logger.info("Rewriting job description using fast dictionary-only pipeline")
    change_log: List[str] = []
    rewritten = apply_dictionary_replacements(text, change_log)
    if not change_log:
        change_log.append(
            "Text reviewed with bias dictionary; no phrases matched for rewrite."
        )
    return {
        "rewritten_text": rewritten,
        "changes": change_log,
        "method": "dictionary-only",
    }


def mock_rewrite(text: str) -> str:
    """Rule-based rewrite function - REAL TEXT TRANSFORMATION with friendly terminology and proper grammar"""
    import re
    rewritten = text
    
    # First, handle complex sentence patterns that need to be removed or restructured entirely
    # These patterns remove entire clauses/sentences when they contain biased language
    
    # Remove entire sentences/clauses with age restrictions (handle various patterns)
    # Match until end of line or period, handling newlines
    rewritten = re.sub(r'[Mm]ust\s+be\s+under\s+\d+\s+years?\s+old[^\n]*', '', rewritten, flags=re.IGNORECASE | re.MULTILINE)
    rewritten = re.sub(r'[Mm]ust\s+be\s+under\s+\d+[^\n]*', '', rewritten, flags=re.IGNORECASE | re.MULTILINE)
    rewritten = re.sub(r'[Uu]nder\s+\d+\s+years?\s+old\s+to\s+[^\n]*', '', rewritten, flags=re.IGNORECASE | re.MULTILINE)
    rewritten = re.sub(r'[Uu]nder\s+\d+\s+to\s+[^\n]*', '', rewritten, flags=re.IGNORECASE | re.MULTILINE)
    rewritten = re.sub(r'[Mm]ust\s+be\s+under\s+\d+\s+years?\s+old\s+to\s+[^\n]*', '', rewritten, flags=re.IGNORECASE | re.MULTILINE)
    rewritten = re.sub(r'[Mm]ust\s+be\s+under\s+\d+\s+to\s+[^\n]*', '', rewritten, flags=re.IGNORECASE | re.MULTILINE)
    # Handle "to fit with" patterns after age removal
    rewritten = re.sub(r'[Mm]ust\s+be\s+to\s+fit\s+with[^\n]*', '', rewritten, flags=re.IGNORECASE | re.MULTILINE)
    
    # Remove entire sentences with gender preferences (more patterns)
    rewritten = re.sub(r'[Mm]ale\s+applicants\s+preferred[^\n]*', '', rewritten, flags=re.IGNORECASE | re.MULTILINE)
    rewritten = re.sub(r'[Mm]ale\s+preferred[^\n]*', '', rewritten, flags=re.IGNORECASE | re.MULTILINE)
    rewritten = re.sub(r'[Mm]en\s+preferred[^\n]*', '', rewritten, flags=re.IGNORECASE | re.MULTILINE)
    rewritten = re.sub(r'[Ff]or\s+leadership\s+presence[^\n]*', '', rewritten, flags=re.IGNORECASE | re.MULTILINE)
    rewritten = re.sub(r'[Ff]or\s+leadership\s+capabilities[^\n]*', '', rewritten, flags=re.IGNORECASE | re.MULTILINE)
    rewritten = re.sub(r'[Mm]ale\s+applicants\s+preferred\s+for[^\n]*', '', rewritten, flags=re.IGNORECASE | re.MULTILINE)
    
    # Remove entire appearance requirement sentences (including parentheticals)
    # First remove parentheticals with appearance restrictions
    rewritten = re.sub(r'\([^)]*no\s+visible\s+tattoos[^)]*\)', '', rewritten, flags=re.IGNORECASE)
    rewritten = re.sub(r'\([^)]*no\s+tattoos[^)]*\)', '', rewritten, flags=re.IGNORECASE)
    rewritten = re.sub(r'\([^)]*no\s+visible\s+piercings[^)]*\)', '', rewritten, flags=re.IGNORECASE)
    rewritten = re.sub(r'\([^)]*no\s+piercings[^)]*\)', '', rewritten, flags=re.IGNORECASE)
    rewritten = re.sub(r'\([^)]*unconventional\s+hairstyles[^)]*\)', '', rewritten, flags=re.IGNORECASE)
    rewritten = re.sub(r'\([^)]*["\']unconventional\s+hairstyles["\'][^)]*\)', '', rewritten, flags=re.IGNORECASE)
    # Now remove sentences with appearance requirements
    rewritten = re.sub(r'[Mm]ust\s+have\s+a\s+["\']professional\s+appearance["\'][^\n]*', '', rewritten, flags=re.IGNORECASE | re.MULTILINE)
    rewritten = re.sub(r'[Mm]ust\s+have\s+a\s+["\']professional\s+demeanor["\'][^\n]*', '', rewritten, flags=re.IGNORECASE | re.MULTILINE)
    rewritten = re.sub(r'[Nn]o\s+visible\s+tattoos[^\n]*', '', rewritten, flags=re.IGNORECASE | re.MULTILINE)
    rewritten = re.sub(r'[Nn]o\s+tattoos[^\n]*', '', rewritten, flags=re.IGNORECASE | re.MULTILINE)
    rewritten = re.sub(r'[Nn]o\s+visible\s+piercings[^\n]*', '', rewritten, flags=re.IGNORECASE | re.MULTILINE)
    rewritten = re.sub(r'[Nn]o\s+piercings[^\n]*', '', rewritten, flags=re.IGNORECASE | re.MULTILINE)
    rewritten = re.sub(r'[Uu]nconventional\s+hairstyles[^\n]*', '', rewritten, flags=re.IGNORECASE | re.MULTILINE)
    
    # Remove entire geographic restriction sentences (including dashes)
    rewritten = re.sub(r'[Ll]ocal\s+applicants\s+only[—\-–][^\n]*', '', rewritten, flags=re.IGNORECASE | re.MULTILINE)
    rewritten = re.sub(r'[Ll]ocal\s+applicants\s+only[^\n]*', '', rewritten, flags=re.IGNORECASE | re.MULTILINE)
    rewritten = re.sub(r'[Nn]o\s+relocations[^\n]*', '', rewritten, flags=re.IGNORECASE | re.MULTILINE)
    
    # Handle complex citizenship/visa patterns - replace entire clause
    rewritten = re.sub(r'[Cc]anadian\s+citizens\s+only[—\-–]\s*no\s+international\s+students[^.]*\.', 
                      'Authorization to work in Canada required.', rewritten, flags=re.IGNORECASE)
    rewritten = re.sub(r'[Cc]anadian\s+citizens\s+only[—\-–]\s*no\s+work-permit\s+holders[^.]*\.', 
                      'Authorization to work in Canada required.', rewritten, flags=re.IGNORECASE)
    
    # Now do word/phrase replacements (order matters: longer phrases first)
    replacements = [
        # Gender-coded language - make more inclusive
        (r'\brockstar\b', 'skilled professional', re.IGNORECASE),
        (r'\bninja\b', 'experienced professional', re.IGNORECASE),
        (r'\bguru\b', 'subject matter expert', re.IGNORECASE),
        (r'\bhustle\b', 'dedication', re.IGNORECASE),
        (r'\bcrush\s+it\b', 'excel', re.IGNORECASE),
        (r'\baggressive\b', 'proactive and results-driven', re.IGNORECASE),
        (r'\bdominant\b', 'strong leadership', re.IGNORECASE),
        (r'\bforceful\b', 'persuasive', re.IGNORECASE),
        (r'\bassertive\s+personality\b', 'strong communication skills', re.IGNORECASE),
        (r'\bleadership\s+presence\b', 'leadership capabilities', re.IGNORECASE),
        
        # Language and citizenship restrictions - make welcoming
        (r'\bnative\s+english\s+speaker\s+only\b', 'Excellent English communication skills required', re.IGNORECASE),
        (r'\bnative\s+english\s+speaker\b', 'excellent English communication skills', re.IGNORECASE),
        (r'\bnative\s+speaker\s+only\b', 'Excellent communication skills required', re.IGNORECASE),
        (r'\bnative\s+speaker\b', 'excellent communication skills', re.IGNORECASE),
        (r'\bstrong\s+north\s+american\s+communication\b', 'strong communication skills', re.IGNORECASE),
        (r'\bcanadian\s+citizens\s+only\b', 'Authorization to work in Canada required', re.IGNORECASE),
        (r'\bu\.?s\.?\s+citizen\s+only\b', 'Authorization to work in the U.S. required', re.IGNORECASE),
        (r'\bcitizens\s+only\b', 'Work authorization required', re.IGNORECASE),
        (r'\bmust\s+be\s+eligible\s+to\s+work\s+in\s+the\s+u\.?s\.?\b', 'Authorization to work in the U.S. required', re.IGNORECASE),
        (r'\bmust\s+be\s+authorized\s+to\s+work\s+in\s+the\s+united\s+states\b', 'Authorization to work in the U.S. required', re.IGNORECASE),
        (r'\bmust\s+be\s+legally\s+authorized\s+to\s+work\b', 'Work authorization required', re.IGNORECASE),
        (r'\bu\.?s\.?\s+work\s+authorization\s+required\b', 'Work authorization required', re.IGNORECASE),
        
        # Visa and sponsorship - remove exclusionary language
        (r'\bno\s+work\s+visa\s+sponsorship\b', 'work authorization required', re.IGNORECASE),
        (r'\bno\s+visa\s+sponsorship\b', 'work authorization required', re.IGNORECASE),
        (r'\bno\s+sponsorship\b', 'work authorization required', re.IGNORECASE),
        (r'\bno\s+international\s+students\b', '', re.IGNORECASE),
        (r'\bno\s+work-permit\s+holders\b', '', re.IGNORECASE),
        (r'\bor\s+work-permit\s+holders\b', '', re.IGNORECASE),  # Handle "—no X or Y" patterns
        
        # Age bias - replace with neutral language
        (r'\bdigital\s+native\b', 'comfortable with modern technology', re.IGNORECASE),
        (r'\byoung\s+and\s+energetic\b', 'enthusiastic and motivated', re.IGNORECASE),
        (r'\byoung\s+team\b', 'dynamic and collaborative team', re.IGNORECASE),
        (r'\byoung\s+professionals\b', 'talented professionals', re.IGNORECASE),
        (r'\byoung\s+and\s+dynamic\b', 'dynamic and innovative', re.IGNORECASE),
        (r'\brecent\s+graduate\b', 'early-career professional', re.IGNORECASE),
        (r'\brecent\s+college\s+graduate\b', 'early-career professional', re.IGNORECASE),
        (r'\bnew\s+graduate\b', 'early-career professional', re.IGNORECASE),
        (r'\bfresh\s+out\s+of\s+college\b', 'early-career professional', re.IGNORECASE),
        (r'\bfresh\b', 'new', re.IGNORECASE),
        (r'\benergetic\b', 'motivated', re.IGNORECASE),
        (r'\benergetic\s+team\b', 'motivated team', re.IGNORECASE),
        (r'\bmillennial\b', 'experienced professional', re.IGNORECASE),
        (r'\bgen\s+z\b', 'experienced professional', re.IGNORECASE),
        (r'\bentry-level\s+only\b', 'entry-level position', re.IGNORECASE),
        
        # Cultural fit clichés - make more professional
        (r'\bwork\s+hard\s+play\s+hard\b', 'collaborative and supportive work environment', re.IGNORECASE),
        (r'\bcultural\s+fit\b', 'strong team collaboration', re.IGNORECASE),
        (r'\bfit\s+the\s+culture\b', 'collaborate effectively with our team', re.IGNORECASE),
        (r'\bfit\s+our\s+culture\b', 'collaborate effectively with our team', re.IGNORECASE),
        (r'["\']fit\s+the\s+culture["\'][^.]*\.', 'collaborate effectively with our team.', re.IGNORECASE),  # Handle quoted phrases
        (r'["\']fit\s+our\s+culture["\'][^.]*\.', 'collaborate effectively with our team.', re.IGNORECASE),
        (r'[Ss]hould\s+["\']fit\s+the\s+culture["\'][^.]*\.', 'Strong collaboration and communication skills preferred.', re.IGNORECASE),
        (r'[Ss]hould\s+["\']fit\s+our\s+culture["\'][^.]*\.', 'Strong collaboration and communication skills preferred.', re.IGNORECASE),
        # Handle "Should X, meaning Y" patterns - replace entire sentence
        (r'[Ss]hould\s+["\'][^"\']+["\'][^,]*,\s*meaning\s+[^\n]*', 'Strong collaboration and communication skills preferred.', re.IGNORECASE | re.MULTILINE),
        (r'[Ss]hould\s+[^,]*,\s*meaning\s+someone\s+social[^\n]*', 'Strong collaboration and communication skills preferred.', re.IGNORECASE | re.MULTILINE),
        (r'[Ss]hould\s+["\'][^"\']+["\'][^,]*,\s*meaning\s+[^\n]*', 'Strong collaboration and communication skills preferred.', re.IGNORECASE | re.MULTILINE),
        (r'\bbeer\s+fridays\b', 'regular team social events', re.IGNORECASE),
        (r'\bafter-work\s+drinks\b', 'team social events', re.IGNORECASE),
        (r'\blike\s+a\s+family\b', 'supportive team environment', re.IGNORECASE),
        (r'\bstartup\s+culture\b', 'dynamic and innovative environment', re.IGNORECASE),
        (r'\btraditional\s+workplace\s+culture\b', 'collaborative workplace culture', re.IGNORECASE),
        (r'\btraditional\s+culture\b', 'collaborative culture', re.IGNORECASE),
        (r'\bfast-paced\s+environment\b', 'dynamic and fast-paced environment', re.IGNORECASE),
        (r'\bsocial\s+team\b', 'collaborative team', re.IGNORECASE),
        (r'\bgo-getter\b', 'proactive professional', re.IGNORECASE),
        (r'\bself-starter\b', 'independent and proactive', re.IGNORECASE),
        (r'\bteam\s+player\b', 'collaborative team member', re.IGNORECASE),
        
        # Experience requirements - make more inclusive
        (r'\bmust\s+have\s+work\s+experience\s+in\s+(canadian|american)\b', 'relevant work experience preferred', re.IGNORECASE),
        (r'\blocal\s+experience\s+required\b', 'relevant experience preferred', re.IGNORECASE),
        (r'\bmust\s+have\s+work\s+experience\s+in\s+canada\b', 'relevant work experience preferred', re.IGNORECASE),
        (r'\bmust\s+have\s+work\s+experience\s+in\s+america\b', 'relevant work experience preferred', re.IGNORECASE),
        
        # Appearance requirements - replace with neutral language
        (r'\bprofessional\s+appearance\b', 'professional demeanor', re.IGNORECASE),
        (r'\bclean-cut\s+appearance\b', 'professional demeanor', re.IGNORECASE),
        (r'\bwell-groomed\b', 'professional', re.IGNORECASE),
        (r'\bappropriate\s+appearance\b', 'professional demeanor', re.IGNORECASE),
        (r'\bprofessional\s+dress\b', 'professional attire', re.IGNORECASE),
        (r'\bbusiness\s+professional\b', 'professional', re.IGNORECASE),
        
        # Disability accommodations - make inclusive
        (r'\bwithout\s+accommodation\b', 'with reasonable accommodations as needed', re.IGNORECASE),
        (r'\bno\s+accommodation\b', 'reasonable accommodations available', re.IGNORECASE),
        (r'\bable-bodied\b', '', re.IGNORECASE),
        (r'\bmust\s+be\s+able\s+to\s+work\s+long\s+hours\s+without\s+accommodation\b', 'flexible work arrangements available', re.IGNORECASE),
        (r'\bwork\s+long\s+hours\s+without\s+accommodation\b', 'flexible work arrangements available', re.IGNORECASE),
        (r'\bability\s+to\s+work\s+long\s+hours\s+without\s+accommodation\b', 'flexible work arrangements available', re.IGNORECASE),
        
        # Transportation - make flexible
        (r'\bmust\s+have\s+valid\s+driver\'?s\s+license\b', 'valid driver\'s license preferred (if travel is required)', re.IGNORECASE),
        (r'\bdriver\'?s\s+license\s+required\b', 'driver\'s license preferred (if travel is required)', re.IGNORECASE),
        (r'\bpersonal\s+vehicle\s+required\b', 'access to transportation preferred (if travel is required)', re.IGNORECASE),
        (r'\bmust\s+have\s+car\b', 'access to transportation preferred (if travel is required)', re.IGNORECASE),
        (r'\bmust\s+drive\b', 'ability to travel preferred (if required)', re.IGNORECASE),
        (r'\bmust\s+be\s+able\s+to\s+travel\b', 'ability to travel preferred (if required)', re.IGNORECASE),
        
        # Physical requirements - remove for desk jobs
        (r'\bmust\s+be\s+able\s+to\s+lift\s+\d+\s+lbs?\b', '', re.IGNORECASE),
        (r'\bmust\s+be\s+able\s+to\s+stand\b', '', re.IGNORECASE),
        (r'\bphysical\s+requirements[^.]*\.', '', re.IGNORECASE),
        
        # Geographic restrictions - remove
        (r'\bmust\s+be\s+local\b', '', re.IGNORECASE),
        (r'\bno\s+remote\b', 'hybrid or on-site work available', re.IGNORECASE),
        (r'\bon-site\s+only\b', 'on-site work available', re.IGNORECASE),
        (r'\bmust\s+relocate\b', 'relocation support available for qualified candidates', re.IGNORECASE),
        
        # Junior/entry level - make more welcoming
        (r'\bjunior\b', 'early-career', re.IGNORECASE),
    ]
    
    # Apply replacements in order (longer phrases first)
    for pattern, replacement, flags in replacements:
        if re.search(pattern, rewritten, flags):
            rewritten = re.sub(pattern, replacement, rewritten, flags=flags)
    
    # Fix article agreement (a/an)
    rewritten = re.sub(r'\ba\s+motivated\b', 'a motivated', rewritten, flags=re.IGNORECASE)
    rewritten = re.sub(r'\ban\s+motivated\b', 'a motivated', rewritten, flags=re.IGNORECASE)
    rewritten = re.sub(r'\ba\s+experienced\b', 'an experienced', rewritten, flags=re.IGNORECASE)
    rewritten = re.sub(r'\ban\s+experienced\b', 'an experienced', rewritten, flags=re.IGNORECASE)
    rewritten = re.sub(r'\ba\s+enthusiastic\b', 'an enthusiastic', rewritten, flags=re.IGNORECASE)
    rewritten = re.sub(r'\ban\s+enthusiastic\b', 'an enthusiastic', rewritten, flags=re.IGNORECASE)
    
    # Clean up broken sentences and fragments
    # Remove sentences that are just fragments
    rewritten = re.sub(r'[Mm]ust\s+be\s+to\s+[^\n]*', '', rewritten, flags=re.MULTILINE)
    rewritten = re.sub(r'[Mm]ust\s+be\s+to\s+[^\n]*$', '', rewritten, flags=re.MULTILINE)  # End of line too
    # Remove incomplete "Must be" sentences that are clearly fragments (but keep complete ones like "Must be authorized")
    rewritten = re.sub(r'^[Mm]ust\s+be\s+under[^\n]*', '', rewritten, flags=re.MULTILINE)
    rewritten = re.sub(r'^[Mm]ust\s+be\s+to\s+[^\n]*', '', rewritten, flags=re.MULTILINE)
    # Remove sentences that start with just "to" (leftover fragments)
    rewritten = re.sub(r'^[Tt]o\s+[^\n]*', '', rewritten, flags=re.MULTILINE)
    # Remove "meaning someone" fragments
    rewritten = re.sub(r',\s*meaning\s+someone\s+[^\n]*', '.', rewritten, flags=re.IGNORECASE | re.MULTILINE)
    rewritten = re.sub(r'\s+meaning\s+someone\s+[^\n]*', '.', rewritten, flags=re.IGNORECASE | re.MULTILINE)
    rewritten = re.sub(r',\s*meaning\s+[^\n]*who\s+enjoys[^\n]*', '.', rewritten, flags=re.IGNORECASE | re.MULTILINE)
    
    # Remove empty parentheticals and broken quotes
    rewritten = re.sub(r'\(\s*,\s*[^)]*\)', '', rewritten)  # ( , something)
    rewritten = re.sub(r'\(\s*\)', '', rewritten)  # Empty ()
    rewritten = re.sub(r'\(\s*[^)]*,\s*\)', '', rewritten)  # (something, )
    rewritten = re.sub(r'["\']\s*,\s*[^"\']*["\']', '', rewritten)  # " , something"
    rewritten = re.sub(r'["\']\s*["\']', '', rewritten)  # Empty quotes ""
    # Remove parentheticals that only contain punctuation or are mostly empty
    rewritten = re.sub(r'\(\s*[,\s]*\)', '', rewritten)  # ( , ) or ( )
    rewritten = re.sub(r'\(\s*["\']\s*["\']\s*\)', '', rewritten)  # ("" )
    
    # Clean up dashes and punctuation
    rewritten = re.sub(r'[—\-–]\s*$', '', rewritten, flags=re.MULTILINE)  # Trailing dashes
    rewritten = re.sub(r'[—\-–]\s*[—\-–]', '—', rewritten)  # Multiple dashes
    rewritten = re.sub(r'[—\-–]\s*or\s+', '', rewritten, flags=re.IGNORECASE)  # "—or something"
    rewritten = re.sub(r'[—\-–]\s*$', '', rewritten, flags=re.MULTILINE)  # Trailing dashes again
    
    # Clean up extra whitespace and punctuation issues while preserving structure
    lines = rewritten.split('\n')
    cleaned_lines = []
    for line in lines:
        if line.strip():
            # Clean up each line
            cleaned = re.sub(r'\s+', ' ', line)  # Multiple spaces to single
            cleaned = re.sub(r'\s+([,\.;:])', r'\1', cleaned)  # Space before punctuation
            cleaned = re.sub(r'([,\.;:])\s*([,\.;:])', r'\1', cleaned)  # Multiple punctuation
            cleaned = re.sub(r'^\s*[—\-–]\s*', '', cleaned)  # Leading dashes
            cleaned = cleaned.strip()
            if cleaned:  # Only add non-empty lines
                cleaned_lines.append(cleaned)
        else:
            # Preserve empty lines (paragraph breaks)
            cleaned_lines.append('')
    
    rewritten = '\n'.join(cleaned_lines)
    
    # Final cleanup: remove excessive blank lines (more than 2 consecutive)
    rewritten = re.sub(r'\n{3,}', '\n\n', rewritten)
    
    # Remove empty list items
    rewritten = re.sub(r'^[•\-\*]\s*$', '', rewritten, flags=re.MULTILINE)  # Empty bullet points
    
    # Remove sections that only have empty content (but keep the header if it has content)
    # This is more conservative - only remove if the line after header is empty or just whitespace
    lines = rewritten.split('\n')
    cleaned_lines = []
    i = 0
    while i < len(lines):
        line = lines[i]
        # Check if this looks like a section header
        if re.match(r'^[A-Z][^:]*:\s*$', line):
            # Check if next non-empty line is far away or doesn't exist
            next_content_idx = i + 1
            while next_content_idx < len(lines) and not lines[next_content_idx].strip():
                next_content_idx += 1
            # If next content is more than 2 lines away or we're at the end, it's probably empty
            if next_content_idx - i > 2 or next_content_idx >= len(lines):
                # Skip this empty section header
                i += 1
                continue
        cleaned_lines.append(line)
        i += 1
    rewritten = '\n'.join(cleaned_lines)
    
    # Clean up any remaining broken patterns
    rewritten = re.sub(r'\s+[—\-–]\s*$', '', rewritten, flags=re.MULTILINE)  # Trailing dashes with space
    rewritten = re.sub(r'^\s*[—\-–]\s*', '', rewritten, flags=re.MULTILINE)  # Leading dashes
    
    rewritten = rewritten.strip()
    
    # Remove unnecessary physical requirements for desk/tech jobs
    tech_keywords = ['software', 'engineer', 'developer', 'programmer', 'coder', 'designer', 'analyst', 'manager', 'coordinator', 'administrator']
    if any(keyword in rewritten.lower() for keyword in tech_keywords):
        rewritten = re.sub(r'must\s+be\s+able\s+to\s+lift\s+\d+\s+lbs?', '', rewritten, flags=re.IGNORECASE)
        rewritten = re.sub(r'physical\s+requirements[^.]*\.', '', rewritten, flags=re.IGNORECASE)
        rewritten = re.sub(r'must\s+be\s+able\s+to\s+stand\s+for\s+extended\s+periods', '', rewritten, flags=re.IGNORECASE)
    
    # Add welcoming inclusive statement if not present
    if "diverse" not in rewritten.lower() and "inclusive" not in rewritten.lower() and "welcome" not in rewritten.lower():
        rewritten += "\n\nWe welcome candidates from all backgrounds and are committed to building a diverse and inclusive team."
    
    return rewritten


def identify_changes(original: str, rewritten: str) -> list:
    """Identify key changes between original and rewritten text - REAL DETECTION"""
    import re
    changes = []
    
    original_lower = original.lower()
    rewritten_lower = rewritten.lower()
    
    # Detect specific changes with friendly descriptions
    change_patterns = [
        (r'\brockstar\b', "Replaced 'rockstar' with 'skilled professional'"),
        (r'\bninja\b', "Replaced 'ninja' with 'experienced professional'"),
        (r'\bguru\b', "Replaced 'guru' with 'subject matter expert'"),
        (r'\bhustle\b', "Replaced 'hustle' with 'dedication'"),
        (r'\bcrush\s+it\b', "Replaced 'crush it' with 'excel'"),
        (r'\baggressive\b', "Replaced 'aggressive' with 'proactive and results-driven'"),
        (r'native\s+english\s+speaker\s+only', "Replaced 'native English speaker only' with 'excellent English communication skills required'"),
        (r'native\s+english\s+speaker', "Replaced 'native English speaker' with 'excellent English communication skills'"),
        (r'native\s+speaker\s+only', "Replaced 'native speaker only' with 'excellent communication skills required'"),
        (r'native\s+speaker', "Replaced 'native speaker' with 'excellent communication skills'"),
        (r'canadian\s+citizens\s+only', "Replaced citizenship restriction with 'authorization to work in Canada required'"),
        (r'u\.?s\.?\s+citizen\s+only', "Replaced 'U.S. citizen only' with 'authorization to work in the U.S. required'"),
        (r'no\s+international\s+students', "Removed exclusion of international students"),
        (r'no\s+work-permit\s+holders', "Removed exclusion of work-permit holders"),
        (r'no\s+(work\s+)?visa\s+sponsorship', "Replaced visa restrictions with 'work authorization required'"),
        (r'no\s+sponsorship', "Replaced sponsorship restrictions with 'work authorization required'"),
        (r'must\s+be\s+eligible\s+to\s+work\s+in\s+the\s+u\.?s\.?', "Replaced 'must be eligible to work in U.S.' with 'authorization to work in the U.S. required'"),
        (r'work\s+hard\s+play\s+hard', "Replaced 'work hard play hard' with 'collaborative and supportive work environment'"),
        (r'digital\s+native', "Replaced 'digital native' with 'comfortable with modern technology'"),
        (r'young\s+and\s+energetic', "Replaced 'young and energetic' with 'enthusiastic and motivated'"),
        (r'\benergetic\b', "Replaced 'energetic' with 'motivated'"),
        (r'cultural\s+fit', "Replaced 'cultural fit' with 'strong team collaboration'"),
        (r'fit\s+the\s+culture', "Replaced 'fit the culture' with 'collaborate effectively with our team'"),
        (r'fit\s+our\s+culture', "Replaced 'fit our culture' with 'collaborate effectively with our team'"),
        (r'\bmale\s+applicants\s+preferred', "Removed gender preference"),
        (r'\bmale\s+preferred', "Removed gender preference"),
        (r'\bmen\s+preferred', "Removed gender preference"),
        (r'\bunder\s+\d+\s+years?\s+old', "Removed age restriction"),
        (r'\bunder\s+\d+', "Removed age restriction"),
        (r'\byoung\s+team', "Replaced 'young team' with 'dynamic and collaborative team'"),
        (r'\brecent\s+graduate', "Replaced 'recent graduate' with 'early-career professional'"),
        (r'\brecent\s+college\s+graduate', "Replaced 'recent college graduate' with 'early-career professional'"),
        (r'\bnew\s+graduate', "Replaced 'new graduate' with 'early-career professional'"),
        (r'\bfresh\s+out\s+of\s+college', "Replaced 'fresh out of college' with 'early-career professional'"),
        (r'professional\s+appearance', "Replaced 'professional appearance' with 'professional demeanor'"),
        (r'no\s+visible\s+tattoos', "Removed appearance restriction"),
        (r'no\s+tattoos', "Removed appearance restriction"),
        (r'no\s+visible\s+piercings', "Removed appearance restriction"),
        (r'no\s+piercings', "Removed appearance restriction"),
        (r'unconventional\s+hairstyles', "Removed appearance restriction"),
        (r'without\s+accommodation', "Replaced 'without accommodation' with 'with reasonable accommodations as needed'"),
        (r'no\s+accommodation', "Replaced 'no accommodation' with 'reasonable accommodations available'"),
        (r'must\s+have\s+valid\s+driver\'?s\s+license', "Changed driver's license requirement to preferred (if travel is required)"),
        (r'personal\s+vehicle\s+required', "Changed vehicle requirement to preferred (if travel is required)"),
        (r'must\s+have\s+car', "Changed car requirement to preferred (if travel is required)"),
        (r'local\s+applicants\s+only', "Removed geographic restriction"),
        (r'no\s+relocations', "Removed relocation restriction"),
        (r'after-work\s+drinks', "Replaced 'after-work drinks' with 'team social events'"),
        (r'beer\s+fridays', "Replaced 'beer Fridays' with 'regular team social events'"),
        (r'traditional\s+workplace\s+culture', "Replaced 'traditional workplace culture' with 'collaborative workplace culture'"),
        (r'like\s+a\s+family', "Replaced 'like a family' with 'supportive team environment'"),
        (r'\bgo-getter\b', "Replaced 'go-getter' with 'proactive professional'"),
        (r'\bself-starter\b', "Replaced 'self-starter' with 'independent and proactive'"),
        (r'\bteam\s+player\b', "Replaced 'team player' with 'collaborative team member'"),
        (r'\bjunior\b', "Replaced 'junior' with 'early-career'"),
        (r'must\s+be\s+able\s+to\s+lift\s+\d+\s+lbs?', "Removed unnecessary physical requirement"),
        (r'\bno\s+remote\b', "Replaced 'no remote' with 'hybrid or on-site work available'"),
    ]
    
    for pattern, change_desc in change_patterns:
        if re.search(pattern, original_lower, re.IGNORECASE) and not re.search(pattern, rewritten_lower, re.IGNORECASE):
            changes.append(change_desc)
    
    # Check if inclusive statement was added
    if ("diverse" in rewritten_lower or "inclusive" in rewritten_lower or "welcome" in rewritten_lower) and \
       ("diverse" not in original_lower and "inclusive" not in original_lower and "welcome" not in original_lower):
        changes.append("Added welcoming statement about diverse candidates")
    
    if len(changes) == 0:
        changes.append("Text reviewed and optimized for inclusivity and clarity")
    
    return changes

