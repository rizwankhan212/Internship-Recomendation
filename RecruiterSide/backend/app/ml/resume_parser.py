"""Resume Parser — extracts skills, experience, and education using NLP."""
import re
from typing import Dict, List


# ── Comprehensive skill taxonomy ─────────────────────────────────────────────
SKILL_PATTERNS = {
    # Programming languages
    "python", "java", "javascript", "typescript", "c++", "c#", "ruby", "go",
    "rust", "swift", "kotlin", "php", "r", "scala", "perl", "matlab",
    # Web frameworks
    "react", "angular", "vue", "vue.js", "next.js", "nuxt.js", "svelte",
    "django", "flask", "fastapi", "spring boot", "express", "node.js",
    "rails", "laravel", "asp.net",
    # Data & ML
    "machine learning", "deep learning", "nlp", "natural language processing",
    "computer vision", "tensorflow", "pytorch", "keras", "scikit-learn",
    "pandas", "numpy", "scipy", "matplotlib", "seaborn", "opencv",
    "spacy", "hugging face", "transformers", "bert", "gpt",
    # Databases
    "sql", "mysql", "postgresql", "mongodb", "redis", "elasticsearch",
    "cassandra", "dynamodb", "firebase", "neo4j", "sqlite",
    # Cloud & DevOps
    "aws", "azure", "gcp", "docker", "kubernetes", "jenkins", "terraform",
    "ansible", "ci/cd", "github actions", "gitlab ci", "circleci",
    # Data tools
    "spark", "hadoop", "kafka", "airflow", "mlflow", "dbt",
    "tableau", "power bi", "looker", "data visualization",
    # Other
    "git", "linux", "agile", "scrum", "microservices", "rest api",
    "graphql", "grpc", "rabbitmq", "celery", "nginx",
    "figma", "ui/ux", "html", "css", "sass", "tailwind",
    "iot", "arduino", "raspberry pi", "embedded systems",
    "data analysis", "statistics", "mlops", "data engineering",
}

# Experience-related patterns
EXPERIENCE_PATTERNS = [
    r"(?:intern(?:ship)?|worked|experience|role)\s+(?:at|in|with)\s+(.+?)(?:\(|,|\.|$)",
    r"(\d+\s*(?:month|year)s?\s*(?:of\s+)?(?:experience|internship))",
    r"(?:intern|developer|engineer|analyst)\s+at\s+(.+?)(?:\s*\(|\s*,|\s*\.|\s*$)",
]

# Education patterns
EDUCATION_PATTERNS = [
    r"(b\.?tech|m\.?tech|b\.?sc|m\.?sc|b\.?e|m\.?e|ph\.?d|mba|bca|mca)[\s,]+(.+?)(?:\d{4}|$)",
    r"(bachelor|master|doctorate)(?:'s)?\s+(?:of|in)\s+(.+?)(?:\d{4}|,|$)",
]


def extract_skills(text: str) -> List[str]:
    """Extract skills from resume text using pattern matching."""
    text_lower = text.lower()
    found = []
    for skill in SKILL_PATTERNS:
        # Word-boundary matching to avoid partial matches
        pattern = r'\b' + re.escape(skill) + r'\b'
        if re.search(pattern, text_lower):
            found.append(skill)
    return sorted(set(found))


def extract_experience(text: str) -> List[str]:
    """Extract experience mentions from resume text."""
    experiences = []
    for pattern in EXPERIENCE_PATTERNS:
        matches = re.findall(pattern, text, re.IGNORECASE)
        experiences.extend([m.strip() for m in matches if len(m.strip()) > 3])
    return list(set(experiences))[:10]


def extract_education(text: str) -> List[str]:
    """Extract education mentions from resume text."""
    education = []
    for pattern in EDUCATION_PATTERNS:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches:
            if isinstance(match, tuple):
                education.append(" ".join(match).strip())
            else:
                education.append(match.strip())
    return list(set(education))[:5]


def parse_resume(text: str) -> Dict[str, List[str]]:
    """Full resume parsing pipeline."""
    return {
        "skills": extract_skills(text),
        "experience": extract_experience(text),
        "education": extract_education(text),
    }
