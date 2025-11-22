import json
import os
import re
import logging
from typing import Dict, Optional
from urllib.parse import urlparse, parse_qs
import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# User agent to avoid being blocked
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate',
    'Connection': 'keep-alive',
}


def extract_job_id_from_linkedin_url(url: str) -> Optional[str]:
    """Extract job ID from LinkedIn URL"""
    # LinkedIn URLs can be in different formats:
    # https://www.linkedin.com/jobs/view/4323080682
    # https://www.linkedin.com/jobs/collections/recommended/?currentJobId=4323080682
    
    # Try to get job ID from query parameter
    parsed = urlparse(url)
    query_params = parse_qs(parsed.query)
    
    if 'currentJobId' in query_params:
        return query_params['currentJobId'][0]
    
    # Try to extract from path
    path_match = re.search(r'/jobs/view/(\d+)', url)
    if path_match:
        return path_match.group(1)
    
    path_match = re.search(r'/jobs/collections/[^/]+/\?currentJobId=(\d+)', url)
    if path_match:
        return path_match.group(1)
    
    # Try to find any job ID in URL
    job_id_match = re.search(r'(\d{8,})', url)
    if job_id_match:
        return job_id_match.group(1)
    
    return None


def scrape_linkedin_job(url: str) -> Dict:
    """Scrape actual LinkedIn job posting"""
    try:
        logger.info(f"Attempting to scrape LinkedIn job: {url}")
        
        # Extract job ID and construct direct view URL
        job_id = extract_job_id_from_linkedin_url(url)
        
        if job_id:
            # Try direct view URL format
            direct_url = f"https://www.linkedin.com/jobs/view/{job_id}"
        else:
            direct_url = url
        
        # Make request
        response = requests.get(direct_url, headers=HEADERS, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'lxml')
        
        # LinkedIn uses structured data and specific classes
        # Try to find job title
        title = None
        title_selectors = [
            'h1.top-card-layout__title',
            'h1.job-details-jobs-unified-top-card__job-title',
            'h1[data-test-id="job-title"]',
            '.job-details-top-card__job-title',
            'h1'
        ]
        
        for selector in title_selectors:
            title_elem = soup.select_one(selector)
            if title_elem:
                title = title_elem.get_text(strip=True)
                break
        
        # Try to find company name
        company = None
        company_selectors = [
            'a.topcard__org-name-link',
            'a.job-details-jobs-unified-top-card__company-name',
            'a[data-test-id="job-poster"]',
            '.job-details-top-card__company-name',
            'a.topcard__org-name'
        ]
        
        for selector in company_selectors:
            company_elem = soup.select_one(selector)
            if company_elem:
                company = company_elem.get_text(strip=True)
                break
        
        # Try to find location
        location = None
        location_selectors = [
            '.topcard__flavor--bullet',
            '.job-details-jobs-unified-top-card__primary-description-without-tagline',
            '.job-details-top-card__job-insight',
            '[data-test-id="job-location"]'
        ]
        
        for selector in location_selectors:
            location_elem = soup.select_one(selector)
            if location_elem:
                location = location_elem.get_text(strip=True)
                # Clean up location text
                location = re.sub(r'\s+', ' ', location).strip()
                break
        
        # Try to find job description
        description = None
        description_selectors = [
            '.show-more-less-html__markup',
            '.description__text',
            '.jobs-description__content',
            '[data-test-id="job-description"]',
            '.jobs-box__html-content'
        ]
        
        for selector in description_selectors:
            desc_elem = soup.select_one(selector)
            if desc_elem:
                description = desc_elem.get_text(separator='\n', strip=True)
                break
        
        # If description not found, try to get from structured data
        if not description:
            # Look for JSON-LD structured data
            json_scripts = soup.find_all('script', type='application/ld+json')
            for script in json_scripts:
                try:
                    data = json.loads(script.string)
                    if isinstance(data, dict) and data.get('@type') == 'JobPosting':
                        if not title and 'title' in data:
                            title = data['title']
                        if not company and 'hiringOrganization' in data:
                            company = data['hiringOrganization'].get('name', '')
                        if not location and 'jobLocation' in data:
                            location = data['jobLocation'].get('address', {}).get('addressLocality', '')
                        if not description and 'description' in data:
                            description = data['description']
                except:
                    continue
        
        # Try to extract from meta tags
        if not title:
            meta_title = soup.find('meta', property='og:title')
            if meta_title:
                title = meta_title.get('content', '')
        
        # Clean up description
        if description:
            # Remove extra whitespace
            description = re.sub(r'\n{3,}', '\n\n', description)
            description = re.sub(r' {2,}', ' ', description)
            description = description.strip()
        
        # If we got at least title or description, return results
        if title or description:
            logger.info(f"Successfully scraped job: {title} at {company}")
            return {
                "success": True,
                "url": url,
                "job_title": title or "Job Posting",
                "company": company or "Company",
                "description": description or "Job description not available.",
                "location": location or "Location not specified",
                "type": "Full-Time",  # LinkedIn doesn't always show this clearly
                "raw_text": f"{title or 'Job Posting'} at {company or 'Company'}\n\n{description or 'Job description not available.'}\n\nLocation: {location or 'Location not specified'}"
            }
        else:
            logger.warning(f"Could not extract job data from LinkedIn page")
            raise Exception("Could not extract job information from page")
            
    except requests.exceptions.RequestException as e:
        logger.error(f"Request error scraping LinkedIn: {e}")
        raise
    except Exception as e:
        logger.error(f"Error scraping LinkedIn job: {e}")
        raise


def scrape_indeed_job(url: str) -> Dict:
    """Scrape Indeed job posting"""
    try:
        logger.info(f"Attempting to scrape Indeed job: {url}")
        response = requests.get(url, headers=HEADERS, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'lxml')
        
        # Indeed selectors
        title_elem = soup.select_one('h1.jobsearch-JobInfoHeader-title, h1[data-testid="job-title"]')
        title = title_elem.get_text(strip=True) if title_elem else None
        
        company_elem = soup.select_one('[data-testid="inlineHeader-companyName"], .jobsearch-InlineCompanyRating')
        company = company_elem.get_text(strip=True) if company_elem else None
        
        location_elem = soup.select_one('[data-testid="job-location"], .jobsearch-JobInfoHeader-subtitle')
        location = location_elem.get_text(strip=True) if location_elem else None
        
        desc_elem = soup.select_one('#jobDescriptionText, .jobsearch-jobDescriptionText')
        description = desc_elem.get_text(separator='\n', strip=True) if desc_elem else None
        
        if title or description:
            return {
                "success": True,
                "url": url,
                "job_title": title or "Job Posting",
                "company": company or "Company",
                "description": description or "Job description not available.",
                "location": location or "Location not specified",
                "type": "Full-Time",
                "raw_text": f"{title or 'Job Posting'} at {company or 'Company'}\n\n{description or 'Job description not available.'}\n\nLocation: {location or 'Location not specified'}"
            }
        else:
            raise Exception("Could not extract job information from Indeed page")
            
    except Exception as e:
        logger.error(f"Error scraping Indeed job: {e}")
        raise


def parse_job_link(url: str) -> Dict:
    """Parse job posting from URL - REAL SCRAPING"""
    url_lower = url.lower()
    
    try:
        # LinkedIn scraping
        if 'linkedin.com' in url_lower and '/jobs/' in url_lower:
            return scrape_linkedin_job(url)
        
        # Indeed scraping
        elif 'indeed.com' in url_lower:
            return scrape_indeed_job(url)
        
        # Glassdoor scraping
        elif 'glassdoor.com' in url_lower:
            # Similar to Indeed
            try:
                logger.info(f"Attempting to scrape Glassdoor job: {url}")
                response = requests.get(url, headers=HEADERS, timeout=10)
                response.raise_for_status()
                
                soup = BeautifulSoup(response.text, 'lxml')
                
                title_elem = soup.select_one('h1[data-test="job-title"], .JobDetails_jobTitle')
                title = title_elem.get_text(strip=True) if title_elem else None
                
                company_elem = soup.select_one('[data-test="employer-name"], .EmployerProfile_employerName')
                company = company_elem.get_text(strip=True) if company_elem else None
                
                desc_elem = soup.select_one('[data-test="jobDescriptionText"], .JobDetails_jobDescription')
                description = desc_elem.get_text(separator='\n', strip=True) if desc_elem else None
                
                if title or description:
                    return {
                        "success": True,
                        "url": url,
                        "job_title": title or "Job Posting",
                        "company": company or "Company",
                        "description": description or "Job description not available.",
                        "location": "Location not specified",
                        "type": "Full-Time",
                        "raw_text": f"{title or 'Job Posting'} at {company or 'Company'}\n\n{description or 'Job description not available.'}"
                    }
            except Exception as e:
                logger.error(f"Error scraping Glassdoor: {e}")
        
        # Generic attempt for other sites
        else:
            logger.info(f"Attempting generic scrape for: {url}")
            response = requests.get(url, headers=HEADERS, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'lxml')
            
            # Try to find common job posting patterns
            title = None
            for tag in ['h1', 'h2']:
                title_elem = soup.select_one(tag)
                if title_elem:
                    title = title_elem.get_text(strip=True)
                    if len(title) > 5 and len(title) < 200:
                        break
            
            # Try to find description
            description = None
            desc_elem = soup.select_one('main, article, .description, .job-description, #description')
            if desc_elem:
                description = desc_elem.get_text(separator='\n', strip=True)
            
            if title or description:
                return {
                    "success": True,
                    "url": url,
                    "job_title": title or "Job Posting",
                    "company": "Company",
                    "description": description or "Job description extracted from page.",
                    "location": "Location not specified",
                    "type": "Full-Time",
                    "raw_text": f"{title or 'Job Posting'}\n\n{description or 'Job description extracted from page.'}"
                }
        
        # If all scraping attempts fail, return error
        raise Exception("Could not scrape job posting from URL. The site may require authentication or use JavaScript rendering.")
        
    except requests.exceptions.Timeout:
        logger.error(f"Timeout scraping {url}")
        return {
            "success": False,
            "url": url,
            "error": "Request timed out. The job posting site may be slow or unavailable.",
            "raw_text": None
        }
    except requests.exceptions.RequestException as e:
        logger.error(f"Request error scraping {url}: {e}")
        return {
            "success": False,
            "url": url,
            "error": f"Could not access the URL: {str(e)}",
            "raw_text": None
        }
    except Exception as e:
        logger.error(f"Error parsing job link {url}: {e}")
        return {
            "success": False,
            "url": url,
            "error": f"Could not parse job posting: {str(e)}",
            "raw_text": None
        }

