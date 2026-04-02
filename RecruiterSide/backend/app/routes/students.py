"""Student Module Integration — mock API + data sync."""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timezone
from app.database import students_collection
from app.models.student import StudentProfile, StudentListResponse

router = APIRouter(prefix="/students", tags=["Student Integration"])

# ── Mock student data (simulates fetching from Student Module API) ───────────
MOCK_STUDENTS = [
    {
        "student_id": "STU001",
        "name": "Aarav Sharma",
        "email": "aarav@university.edu",
        "cgpa": 8.7,
        "branch": "Computer Science",
        "skills": ["python", "machine learning", "sql", "tensorflow", "data analysis"],
        "experience": ["ML Intern at TechCorp (3 months)", "Data Analyst Intern at DataCo (2 months)"],
        "education": "B.Tech Computer Science, 2024",
        "resume_text": "Motivated computer science student with experience in machine learning and data analysis. Proficient in Python, TensorFlow, SQL. Built sentiment analysis pipeline processing 100K reviews. Developed predictive models achieving 92% accuracy.",
        "profile_summary": "ML-focused CS student with strong analytical skills",
        "graduation_year": 2024,
    },
    {
        "student_id": "STU002",
        "name": "Priya Patel",
        "email": "priya@university.edu",
        "cgpa": 9.1,
        "branch": "Computer Science",
        "skills": ["java", "spring boot", "react", "mongodb", "docker", "kubernetes"],
        "experience": ["Full-stack Intern at WebDev Inc (6 months)"],
        "education": "B.Tech Computer Science, 2024",
        "resume_text": "Full-stack developer experienced in Java Spring Boot and React. Built microservices architecture handling 10K requests/sec. Deployed applications using Docker and Kubernetes. Strong problem-solving skills with competitive programming background.",
        "profile_summary": "Full-stack developer with microservices expertise",
        "graduation_year": 2024,
    },
    {
        "student_id": "STU003",
        "name": "Rahul Verma",
        "email": "rahul@university.edu",
        "cgpa": 7.5,
        "branch": "Information Technology",
        "skills": ["python", "django", "javascript", "aws", "sql"],
        "experience": ["Backend Intern at CloudTech (4 months)"],
        "education": "B.Tech IT, 2024",
        "resume_text": "Backend developer with experience in Python Django and AWS cloud services. Designed RESTful APIs serving 50+ endpoints. Managed PostgreSQL databases with complex queries. Implemented CI/CD pipelines using GitHub Actions.",
        "profile_summary": "Backend developer with cloud experience",
        "graduation_year": 2024,
    },
    {
        "student_id": "STU004",
        "name": "Sneha Gupta",
        "email": "sneha@university.edu",
        "cgpa": 8.3,
        "branch": "Data Science",
        "skills": ["python", "deep learning", "nlp", "pytorch", "pandas", "computer vision"],
        "experience": ["Research Intern at AI Lab (5 months)", "NLP Intern at LangTech (3 months)"],
        "education": "B.Tech Data Science, 2024",
        "resume_text": "Data science student specializing in NLP and computer vision. Published research on transformer-based text classification. Built NER system extracting entities from legal documents with 95% F1 score. Proficient in PyTorch and Hugging Face transformers.",
        "profile_summary": "AI/NLP researcher with published work",
        "graduation_year": 2024,
    },
    {
        "student_id": "STU005",
        "name": "Vikram Singh",
        "email": "vikram@university.edu",
        "cgpa": 7.8,
        "branch": "Computer Science",
        "skills": ["javascript", "react", "node.js", "express", "mongodb", "typescript"],
        "experience": ["Frontend Intern at UIFactory (4 months)"],
        "education": "B.Tech CS, 2024",
        "resume_text": "Frontend-focused developer with strong JavaScript and React skills. Built responsive dashboards with real-time data visualization. Experience with Node.js backend and MongoDB. Created reusable component libraries used across 5 projects.",
        "profile_summary": "Frontend specialist with React expertise",
        "graduation_year": 2024,
    },
    {
        "student_id": "STU006",
        "name": "Ananya Reddy",
        "email": "ananya@university.edu",
        "cgpa": 9.4,
        "branch": "Computer Science",
        "skills": ["python", "machine learning", "deep learning", "sql", "spark", "mlops"],
        "experience": ["Data Science Intern at BigData Corp (6 months)", "ML Engineer Intern at AIStart (3 months)"],
        "education": "B.Tech CS, 2024",
        "resume_text": "Top-performing CS student with extensive experience in ML engineering and MLOps. Built end-to-end ML pipelines processing 1M+ records using Apache Spark. Deployed models using MLflow and Docker. Strong foundation in statistics and algorithms.",
        "profile_summary": "ML engineer with production deployment experience",
        "graduation_year": 2024,
    },
    {
        "student_id": "STU007",
        "name": "Karthik Nair",
        "email": "karthik@university.edu",
        "cgpa": 6.9,
        "branch": "Electronics",
        "skills": ["c++", "embedded systems", "python", "iot", "arduino"],
        "experience": ["IoT Intern at SmartDevices (3 months)"],
        "education": "B.Tech ECE, 2024",
        "resume_text": "Electronics engineering student with IoT and embedded systems focus. Developed smart home automation system using Arduino and Raspberry Pi. Basic Python and C++ programming skills. Interest in transitioning to software development.",
        "profile_summary": "Embedded systems developer transitioning to software",
        "graduation_year": 2024,
    },
    {
        "student_id": "STU008",
        "name": "Meera Joshi",
        "email": "meera@university.edu",
        "cgpa": 8.9,
        "branch": "Data Science",
        "skills": ["python", "r", "statistics", "machine learning", "tableau", "sql", "data visualization"],
        "experience": ["Business Analyst Intern at ConsultCo (5 months)", "Data Intern at AnalyticsFirm (3 months)"],
        "education": "B.Tech Data Science, 2024",
        "resume_text": "Data science student with strong analytical and visualization skills. Created interactive dashboards in Tableau tracking KPIs for Fortune 500 client. Proficient in statistical analysis using R and Python. Built recommendation system improving user engagement by 25%.",
        "profile_summary": "Data analyst with business intelligence expertise",
        "graduation_year": 2024,
    },
    {
        "student_id": "STU009",
        "name": "Arjun Kumar",
        "email": "arjun@university.edu",
        "cgpa": 8.1,
        "branch": "Computer Science",
        "skills": ["python", "fastapi", "docker", "postgresql", "redis", "celery", "microservices"],
        "experience": ["Backend Engineer Intern at FinTech (6 months)"],
        "education": "B.Tech CS, 2024",
        "resume_text": "Backend engineer with hands-on experience in building scalable microservices at a fintech company. Designed event-driven architecture using Redis and Celery. Implemented payment processing API handling 1000+ transactions/day. Strong advocate for clean code and testing.",
        "profile_summary": "Backend engineer with fintech microservices experience",
        "graduation_year": 2024,
    },
    {
        "student_id": "STU010",
        "name": "Divya Menon",
        "email": "divya@university.edu",
        "cgpa": 7.2,
        "branch": "Information Technology",
        "skills": ["html", "css", "javascript", "react", "figma", "ui/ux"],
        "experience": ["UI/UX Intern at DesignStudio (4 months)"],
        "education": "B.Tech IT, 2024",
        "resume_text": "Creative IT student with passion for UI/UX design and frontend development. Designed user interfaces for 3 mobile apps in Figma. Built responsive websites using React. Strong understanding of design principles, accessibility, and user research methodologies.",
        "profile_summary": "UI/UX designer with frontend development skills",
        "graduation_year": 2024,
    },
]


@router.get("", response_model=StudentListResponse)
async def list_students(
    branch: Optional[str] = None,
    min_cgpa: Optional[float] = None,
    skills: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """
    Fetch student profiles.
    In production, this calls the Student Module API.
    Currently returns mock data and caches to MongoDB.
    """
    # Seed mock data into MongoDB if empty
    count = await students_collection.count_documents({})
    if count == 0:
        for s in MOCK_STUDENTS:
            await students_collection.update_one(
                {"student_id": s["student_id"]},
                {"$set": s},
                upsert=True,
            )

    query = {}
    if branch:
        query["branch"] = {"$regex": branch, "$options": "i"}
    if min_cgpa:
        query["cgpa"] = {"$gte": min_cgpa}
    if skills:
        skill_list = [s.strip().lower() for s in skills.split(",")]
        query["skills"] = {"$in": skill_list}

    total = await students_collection.count_documents(query)
    skip = (page - 1) * page_size
    cursor = students_collection.find(query).skip(skip).limit(page_size)

    students = []
    async for doc in cursor:
        doc.pop("_id", None)
        students.append(StudentProfile(**doc))

    return StudentListResponse(students=students, total=total, page=page, page_size=page_size)


@router.get("/{student_id}", response_model=StudentProfile)
async def get_student(student_id: str):
    """Get a single student profile."""
    doc = await students_collection.find_one({"student_id": student_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Student not found")
    doc.pop("_id", None)
    return StudentProfile(**doc)
