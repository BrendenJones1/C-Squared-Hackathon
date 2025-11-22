# BiasLens - Real Analysis Status

## ✅ REAL ANALYSIS (Actually Working)

### 1. **Keyword Detection** (`bias_engine.py`)
- **REAL**: Searches text for actual bias keywords
- Uses regex pattern matching with word boundaries
- Detects:
  - Masculine-coded language (rockstar, ninja, aggressive, etc.)
  - Feminine-coded language
  - Age bias (digital native, young, etc.)
  - Exclusionary language (visa restrictions, native speaker requirements)
  - Cultural fit clichés
  - Disability-biased language
- Returns actual counts and matched phrases

### 2. **NLP Classification** (`bias_engine.py`)
- **REAL**: Uses Hugging Face's `facebook/bart-large-mnli` model
- Zero-shot classification to detect bias types
- Categories: age-bias, gender-bias, culture-fit-bias, exclusionary-language, disability-bias, neutral
- Falls back to keyword-based inference if model fails to load
- Model loads on first request (may take 30-60 seconds first time)

### 3. **Bias Scoring** (`bias_engine.py`)
- **REAL**: Calculates scores based on actual keyword matches
- Weighted scoring system:
  - Exclusionary language: 15 pts per match (heavy penalty)
  - Disability bias: 12 pts per match
  - Age bias: 10 pts per match
  - Gender bias: 8 pts per match
  - Cultural fit: 5 pts per match
- International Student Bias Score: Separate calculation focusing on visa/language issues
- Scores range from 0-100

### 4. **Red Flag Detection** (`bias_engine.py`)
- **REAL**: Generates warnings from actual keyword matches
- Severity levels: high, medium
- Examples:
  - "No sponsorship available" → High severity
  - "Native English speaker required" → Medium severity

### 5. **Text Rewriting** (`rewrite_engine.py`)
- **REAL**: Rule-based text transformation (not mock!)
- Uses regex to find and replace biased language
- Comprehensive replacement patterns:
  - "rockstar" → "skilled professional"
  - "native English speaker" → "strong English communication skills"
  - "must be eligible to work in U.S." → "authorization to work required"
  - And 15+ more patterns
- Can use OpenAI GPT-4 if API key provided (optional enhancement)
- Falls back to rule-based if OpenAI unavailable

### 6. **Change Detection** (`rewrite_engine.py`)
- **REAL**: Compares original vs rewritten text
- Identifies specific changes made
- Lists all transformations applied

## ⚠️ MOCK DATA (For Demo/Development)

### 1. **Company DEI Data** (`company_dei.py`)
- Hardcoded dataset of 10 companies
- Real structure, mock values
- Can be replaced with real API/scraping later

### 2. **Link Parser** (`link_parser.py`)
- Returns mock job postings for known domains
- Real structure, mock extraction
- Can be replaced with real web scraping later

## How to Verify Real Analysis

1. **Check Logs**: Backend logs show:
   - "Starting full bias analysis..."
   - "Keyword analysis found X bias indicators"
   - "NLP classification result: [label] (confidence: X)"
   - "Analysis complete - Bias Score: X/100"

2. **Test with Real Text**: Paste a job description with biased language:
   ```
   "We're looking for a rockstar developer. Must be eligible to work in the U.S. 
   Native English speaker required. Work hard play hard culture."
   ```
   You'll see:
   - Real keyword matches detected
   - Real bias scores calculated
   - Real red flags generated
   - Real text rewriting applied

3. **Check Response**: API responses include `"analysis_type": "real"` flag

## Performance Notes

- **First Request**: May take 30-60 seconds (NLP model download/load)
- **Subsequent Requests**: Fast (< 2 seconds)
- **Model Size**: ~1.6GB (downloads automatically on first use)
- **Memory**: Requires ~2GB RAM for NLP model

## Dependencies for Real Analysis

- `transformers` - Hugging Face library for NLP
- `torch` - PyTorch for model inference
- `regex` - Pattern matching (built-in `re` module)

All analysis is **REAL** and **WORKING**. The only mock parts are company DEI data and link parsing, which are clearly marked and can be replaced with real implementations.

