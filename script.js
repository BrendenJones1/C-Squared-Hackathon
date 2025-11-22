// Sample job data
const jobsData = [
    {
        id: 1,
        company: 'GreenSpark Software',
        companyLogo: 'GS',
        title: 'Software Engineer',
        tags: ['Full-Time', 'New York, NY, USA', 'Remote'],
        salary: null,
        experience: 'Mid, Senior',
        location: 'New York, NY, USA',
        workArrangement: 'Remote',
        companySize: '11-50 employees',
        companyDesc: 'Software for scrap yard operations management',
        requirements: [
            '4+ years of professional software engineering experience',
            'Expertise in React JavaScript/TypeScript',
            'Advanced knowledge of cloud platforms (AWS, Azure, GCP)'
        ],
        live: true
    },
    {
        id: 2,
        company: 'Valore Partners',
        companyLogo: 'V',
        title: 'Software Engineer',
        tags: ['Full-Time', '$130k-$160k/yr', 'Tempe, AZ, USA', 'Hybrid'],
        salary: '$130k-$160k/yr',
        experience: 'Mid, Senior',
        location: 'Tempe, AZ, USA',
        workArrangement: 'Hybrid',
        companySize: '51-200 employees',
        companyDesc: 'Financial technology solutions',
        requirements: [
            '5+ years of software development experience',
            'Strong background in Python and Java',
            'Experience with microservices architecture'
        ],
        live: true
    },
    {
        id: 3,
        company: 'Augment',
        companyLogo: 'A',
        title: 'Software Engineer',
        tags: ['Full-Time', 'San Francisco, CA, USA', 'Remote'],
        salary: null,
        experience: 'Mid',
        location: 'San Francisco, CA, USA',
        workArrangement: 'Remote',
        companySize: '11-50 employees',
        companyDesc: 'AI-powered development tools',
        requirements: [
            '3+ years of software engineering experience',
            'Proficiency in JavaScript/TypeScript',
            'Experience with AI/ML technologies'
        ],
        live: true
    },
    {
        id: 4,
        company: 'TechFlow Systems',
        companyLogo: 'TF',
        title: 'Senior Software Engineer',
        tags: ['Full-Time', '$150k-$180k/yr', 'Seattle, WA, USA', 'On-site'],
        salary: '$150k-$180k/yr',
        experience: 'Senior',
        location: 'Seattle, WA, USA',
        workArrangement: 'On-site',
        companySize: '201-500 employees',
        companyDesc: 'Enterprise cloud infrastructure',
        requirements: [
            '7+ years of software engineering experience',
            'Expert in distributed systems',
            'Strong knowledge of Kubernetes and Docker'
        ],
        live: true
    },
    {
        id: 5,
        company: 'DataVault',
        companyLogo: 'DV',
        title: 'Full Stack Engineer',
        tags: ['Full-Time', '$120k-$150k/yr', 'Austin, TX, USA', 'Hybrid'],
        salary: '$120k-$150k/yr',
        experience: 'Mid',
        location: 'Austin, TX, USA',
        workArrangement: 'Hybrid',
        companySize: '51-200 employees',
        companyDesc: 'Data security and encryption solutions',
        requirements: [
            '4+ years of full-stack development',
            'React, Node.js, and PostgreSQL expertise',
            'Understanding of security best practices'
        ],
        live: true
    }
];

let selectedJobId = 1;

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    renderJobsList();
    renderJobDetails(selectedJobId);
    setupEventListeners();
});

// Render jobs list
function renderJobsList() {
    const jobsList = document.getElementById('jobsList');
    if (!jobsList) return;

    jobsList.innerHTML = '';

    jobsData.forEach(job => {
        const jobCard = document.createElement('div');
        jobCard.className = `job-card ${job.id === selectedJobId ? 'selected' : ''}`;
        jobCard.dataset.jobId = job.id;

        const tagsHtml = job.tags.map(tag => `<span class="job-tag">${tag}</span>`).join('');

        jobCard.innerHTML = `
            <div class="job-card-header">
                <div class="company-logo">${job.companyLogo}</div>
                <div class="job-card-info">
                    <a href="company.html" class="job-card-company">${job.company}</a>
                    <div class="job-card-title">${job.title}</div>
                    <div class="job-card-tags">${tagsHtml}</div>
                </div>
            </div>
            <button class="job-card-bookmark" aria-label="Bookmark">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z"/>
                </svg>
            </button>
        `;

        jobCard.addEventListener('click', (e) => {
            if (!e.target.closest('a') && !e.target.closest('.job-card-bookmark')) {
                selectJob(job.id);
            }
        });

        jobsList.appendChild(jobCard);
    });
}

// Select a job
function selectJob(jobId) {
    selectedJobId = jobId;
    renderJobsList();
    renderJobDetails(jobId);
}

// Render job details
function renderJobDetails(jobId) {
    const job = jobsData.find(j => j.id === jobId);
    if (!job) return;

    // Update job title
    const jobTitle = document.getElementById('detailJobTitle');
    if (jobTitle) jobTitle.textContent = job.title;

    // Update company info
    const companyLogo = document.getElementById('detailCompanyLogo');
    if (companyLogo) companyLogo.textContent = job.companyLogo;

    const companyName = document.getElementById('detailCompanyName');
    if (companyName) {
        companyName.textContent = job.company;
        companyName.href = 'company.html';
    }

    const companySize = document.getElementById('detailCompanySize');
    if (companySize) companySize.textContent = job.companySize;

    const companyDesc = document.getElementById('detailCompanyDesc');
    if (companyDesc) companyDesc.textContent = job.companyDesc;

    // Update job meta info
    const experience = document.getElementById('detailExperience');
    if (experience) experience.textContent = job.experience;

    const location = document.getElementById('detailLocation');
    if (location) location.textContent = job.location;

    const workArrangement = document.getElementById('detailWorkArrangement');
    if (workArrangement) workArrangement.textContent = job.workArrangement;

    // Update application panel
    const matchCompanyName = document.getElementById('matchCompanyName');
    if (matchCompanyName) matchCompanyName.textContent = job.company;

    const referralCompanyName = document.getElementById('referralCompanyName');
    if (referralCompanyName) referralCompanyName.textContent = job.company;

    // Update requirements
    const requirementsList = document.getElementById('requirementsList');
    if (requirementsList) {
        requirementsList.innerHTML = job.requirements.map(req => `<li>${req}</li>`).join('');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Tab switching for job details
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            switchTab(tabName);
        });
    });

    // Tab switching for application panel
    const appTabButtons = document.querySelectorAll('.app-tab-btn');
    appTabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            switchAppTab(tabName);
        });
    });

    // Filter tag removal
    const filterTags = document.querySelectorAll('.filter-tag.active');
    filterTags.forEach(tag => {
        const removeBtn = tag.querySelector('.filter-remove');
        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                tag.classList.remove('active');
            });
        }
    });

    // Apply button
    const applyBtn = document.querySelector('.action-btn.primary');
    if (applyBtn) {
        applyBtn.addEventListener('click', () => {
            alert('Application functionality would be implemented here');
        });
    }

    // Save button
    const saveBtn = document.querySelectorAll('.action-btn.secondary')[1];
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            alert('Job saved!');
        });
    }

    // Already Applied button
    const appliedBtn = document.querySelectorAll('.action-btn.secondary')[0];
    if (appliedBtn) {
        appliedBtn.addEventListener('click', () => {
            alert('Marked as already applied');
        });
    }

    // Get referrals button
    const getReferralsBtns = document.querySelectorAll('.get-referrals-btn, .get-referrals-btn-large');
    getReferralsBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            alert('Referral functionality would be implemented here');
        });
    });

    // Bookmark buttons
    const bookmarkBtns = document.querySelectorAll('.job-card-bookmark');
    bookmarkBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            btn.classList.toggle('bookmarked');
            if (btn.classList.contains('bookmarked')) {
                btn.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" fill="currentColor"/>
                    </svg>
                `;
                btn.style.color = 'var(--simplify-blue)';
            } else {
                btn.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z"/>
                    </svg>
                `;
                btn.style.color = 'var(--text-tertiary)';
            }
        });
    });
}

// Switch tab in job details
function switchTab(tabName) {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(btn => {
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    tabContents.forEach(content => {
        if (content.id === `${tabName}Tab`) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
}

// Switch tab in application panel
function switchAppTab(tabName) {
    const appTabButtons = document.querySelectorAll('.app-tab-btn');
    
    appTabButtons.forEach(btn => {
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Update application content based on tab
    const applicationContent = document.querySelector('.application-content');
    if (tabName === 'full') {
        // Show full job posting
        if (applicationContent) {
            const job = jobsData.find(j => j.id === selectedJobId);
            if (job) {
                // You could expand this to show full job description
                console.log('Showing full job posting');
            }
        }
    }
}

// Handle company name clicks - navigate to company page
document.addEventListener('click', (e) => {
    if (e.target.closest('.company-name-link, .job-card-company')) {
        // Navigation is handled by href, but we can add analytics or other logic here
        const companyName = e.target.closest('.company-name-link, .job-card-company')?.textContent;
        if (companyName) {
            // Store company name for company page if needed
            sessionStorage.setItem('viewingCompany', companyName);
        }
    }
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

