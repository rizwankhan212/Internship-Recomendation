/**
 * RecoMinds Seed Script — Full ChromaDB Integration
 * Seeds: 5 Recruiters · 20 Internships · 300 Candidates · ~700 Applications
 * Stores ALL embeddings in ChromaDB + MongoDB simultaneously.
 */
require('dotenv').config();
const mongoose  = require('mongoose');
const bcrypt    = require('bcryptjs');
const Candidate  = require('./models/Candidate');
const Recruiter  = require('./models/Recruiter');
const Internship = require('./models/Internship');
const Application = require('./models/Application');
const {
  initChroma,
  upsertInternshipEmbedding,
  upsertCandidateEmbedding,
  candidateToEmbedding,
  internshipToEmbedding,
  isChromaAvailable,
} = require('./services/vectorSearch.service');
const { rankInternshipsForCandidate } = require('./services/rankingEngine.service');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/recomids';

// ── DATA TEMPLATES ────────────────────────────────────────────────────────────

const COMPANIES = [
  { name: 'Google',     designation: 'Engineering Recruiter',   industry: 'Technology',         size: '10000+',    website: 'https://google.com',    desc: "Organizing the world's information and making it universally accessible." },
  { name: 'Microsoft',  designation: 'Talent Acquisition Lead', industry: 'Technology',         size: '10000+',    website: 'https://microsoft.com', desc: 'Empowering every person and every organization on the planet to achieve more.' },
  { name: 'Amazon',     designation: 'Technical Recruiter',     industry: 'E-commerce & Cloud', size: '10000+',    website: 'https://amazon.com',    desc: "Earth's most customer-centric company — from cloud computing to e-commerce." },
  { name: 'Flipkart',   designation: 'HR Manager',              industry: 'E-commerce',         size: '5000-10000',website: 'https://flipkart.com',  desc: "India's leading e-commerce marketplace connecting millions of buyers and sellers." },
  { name: 'Razorpay',   designation: 'Campus Recruiter',        industry: 'Fintech',            size: '1000-5000', website: 'https://razorpay.com',  desc: 'Building the payments backbone of India with cutting-edge fintech solutions.' },
];

const RECRUITER_SEEDS = [
  { name: 'Priya Sharma', email: 'priya@google.com',     password: 'Google@123',    companyIdx: 0 },
  { name: 'Rahul Mehta',  email: 'rahul@microsoft.com',  password: 'Microsoft@123', companyIdx: 1 },
  { name: 'Sneha Iyer',   email: 'sneha@amazon.com',     password: 'Amazon@123',    companyIdx: 2 },
  { name: 'Arjun Nair',   email: 'arjun@flipkart.com',   password: 'Flipkart@123',  companyIdx: 3 },
  { name: 'Kavya Reddy',  email: 'kavya@razorpay.com',   password: 'Razorpay@123',  companyIdx: 4 },
];

const INTERNSHIPS_DATA = [
  // Google (0–3)
  { title: 'Software Engineering Intern',   skills: ['python', 'java', 'algorithms', 'data structures', 'git'],                 location: 'Bangalore',  type: 'on-site', stipend: 80000, openings: 10, duration: '3 months', desc: 'Work with world-class engineers on large-scale distributed systems. Contribute to products used by billions, solve complex algorithmic problems, and collaborate across teams in an Agile environment.' },
  { title: 'ML Research Intern',            skills: ['machine learning', 'python', 'tensorflow', 'pytorch', 'deep learning'],    location: 'Hyderabad',  type: 'hybrid',  stipend: 90000, openings: 5,  duration: '6 months', desc: 'Join the AI research team to develop cutting-edge machine learning models. Work on NLP, computer vision and reinforcement learning projects with state-of-the-art GPU infrastructure.' },
  { title: 'NLP Research Intern',           skills: ['nlp', 'python', 'pytorch', 'deep learning', 'machine learning'],          location: 'Hyderabad',  type: 'hybrid',  stipend: 85000, openings: 3,  duration: '6 months', desc: 'Research and implement state-of-the-art NLP models. Work on text classification, sentiment analysis, language generation and multilingual transformers.' },
  { title: 'Cloud Infrastructure Intern',   skills: ['aws', 'docker', 'kubernetes', 'linux', 'devops'],                         location: 'Pune',       type: 'remote',  stipend: 65000, openings: 4,  duration: '3 months', desc: 'Help build and scale cloud infrastructure. Work with container orchestration, CI/CD pipelines, Terraform, and monitoring systems like Prometheus and Grafana.' },
  // Microsoft (4–7)
  { title: 'Frontend Engineering Intern',   skills: ['react', 'javascript', 'typescript', 'html', 'css'],                       location: 'Gurgaon',    type: 'remote',  stipend: 60000, openings: 8,  duration: '3 months', desc: 'Build beautiful, performant user interfaces used by millions. Collaborate with design and backend teams using React, TypeScript and accessibility-first practices.' },
  { title: 'Backend Engineering Intern',    skills: ['nodejs', 'express', 'mongodb', 'rest', 'sql'],                            location: 'Bangalore',  type: 'on-site', stipend: 75000, openings: 7,  duration: '3 months', desc: 'Design and build scalable APIs and microservices. Work with databases, Redis caching, message queues and monitoring in a high-traffic production environment.' },
  { title: 'DevOps Intern',                 skills: ['devops', 'docker', 'kubernetes', 'aws', 'linux', 'devops'],               location: 'Bangalore',  type: 'on-site', stipend: 60000, openings: 4,  duration: '4 months', desc: 'Automate deployment pipelines, manage Kubernetes clusters, and improve system reliability. Work alongside SRE and platform engineering teams.' },
  { title: 'Data Science Intern',           skills: ['data science', 'python', 'sql', 'tableau', 'statistics'],                 location: 'Mumbai',     type: 'on-site', stipend: 70000, openings: 6,  duration: '4 months', desc: 'Analyze large datasets to extract insights that drive product decisions. Work with data pipelines, visualization tools, A/B testing and statistical models.' },
  // Amazon (8–11)
  { title: 'Computer Vision Intern',        skills: ['computer vision', 'python', 'tensorflow', 'deep learning', 'pytorch'],    location: 'Hyderabad',  type: 'hybrid',  stipend: 80000, openings: 3,  duration: '6 months', desc: 'Develop visual search, image recognition and augmented reality features. Work with large-scale image datasets on GPU clusters using PyTorch and OpenCV.' },
  { title: 'iOS Development Intern',        skills: ['ios', 'swift', 'mobile', 'git', 'rest'],                                  location: 'Mumbai',     type: 'hybrid',  stipend: 60000, openings: 4,  duration: '3 months', desc: 'Develop features for the Amazon Shopping iOS app. Work with SwiftUI, Combine and high-performance networking for a 100M+ user product.' },
  { title: 'Data Engineering Intern',       skills: ['python', 'sql', 'data analysis', 'kafka', 'aws'],                         location: 'Gurgaon',    type: 'on-site', stipend: 70000, openings: 5,  duration: '4 months', desc: 'Build real-time data pipelines that process millions of events daily using Apache Kafka, Spark and AWS data services.' },
  { title: 'Site Reliability Intern',       skills: ['devops', 'kubernetes', 'linux', 'golang', 'aws'],                         location: 'Hyderabad',  type: 'hybrid',  stipend: 75000, openings: 3,  duration: '6 months', desc: 'Ensure 99.99% uptime for critical services. Work on monitoring, alerting, capacity planning and incident response with world-class SRE practices.' },
  // Flipkart (12–15)
  { title: 'Android Development Intern',    skills: ['android', 'kotlin', 'java', 'mobile', 'git'],                             location: 'Remote',     type: 'remote',  stipend: 50000, openings: 6,  duration: '3 months', desc: 'Build features for the Flipkart Android app used by 100M+ users. Work with Jetpack Compose, MVVM architecture and REST APIs.' },
  { title: 'Cybersecurity Intern',          skills: ['cybersecurity', 'linux', 'python', 'networking', 'git'],                  location: 'Bangalore',  type: 'on-site', stipend: 65000, openings: 3,  duration: '3 months', desc: 'Identify and remediate security vulnerabilities across infrastructure. Conduct penetration testing, code reviews, threat modelling and security audits.' },
  { title: 'React Native Development Intern', skills: ['react', 'javascript', 'mobile', 'flutter', 'git'],                    location: 'Remote',     type: 'remote',  stipend: 50000, openings: 6,  duration: '3 months', desc: 'Build cross-platform mobile apps for Android and iOS using React Native and Redux, integrated with RESTful APIs.' },
  { title: 'Product Analytics Intern',      skills: ['data analysis', 'sql', 'python', 'tableau', 'excel'],                     location: 'Bangalore',  type: 'on-site', stipend: 55000, openings: 5,  duration: '3 months', desc: 'Analyze user behavior, run A/B experiments and generate insights to improve product decisions. Work with PMs, designers and engineers.' },
  // Razorpay (16–19)
  { title: 'Full Stack Development Intern', skills: ['react', 'nodejs', 'mongodb', 'javascript', 'rest'],                       location: 'Remote',     type: 'remote',  stipend: 55000, openings: 10, duration: '3 months', desc: 'Build end-to-end features for our fintech platform — from interactive React UIs to Node.js microservices backed by MongoDB.' },
  { title: 'Blockchain Development Intern', skills: ['blockchain', 'javascript', 'nodejs', 'python', 'rest'],                   location: 'Remote',     type: 'remote',  stipend: 55000, openings: 4,  duration: '4 months', desc: 'Build decentralized applications and smart contracts. Explore DeFi protocols, NFTs and blockchain interoperability for next-gen payment systems.' },
  { title: 'Payments Backend Intern',       skills: ['java', 'spring', 'sql', 'rest', 'redis'],                                 location: 'Bangalore',  type: 'on-site', stipend: 70000, openings: 5,  duration: '4 months', desc: 'Build reliable, high-throughput payment processing systems. Work with complex financial data, transaction management and PCI-DSS security protocols.' },
  { title: 'UI Engineering Intern',         skills: ['typescript', 'react', 'css', 'html', 'javascript'],                       location: 'Mumbai',     type: 'hybrid',  stipend: 60000, openings: 4,  duration: '3 months', desc: 'Create stunning visual experiences and interactive UI components for our merchant dashboard. Work at the intersection of design and engineering.' },
];

const RECRUITER_ASSIGNMENT = [0,0,0,0, 1,1,1,1, 2,2,2,2, 3,3,3,3, 4,4,4,4];

const SKILLS_POOLS = [
  ['python', 'machine learning', 'tensorflow', 'data science', 'sql'],
  ['react', 'javascript', 'typescript', 'html', 'css', 'nodejs'],
  ['java', 'spring', 'sql', 'rest', 'git', 'algorithms'],
  ['python', 'django', 'flask', 'rest', 'postgresql', 'docker'],
  ['javascript', 'nodejs', 'mongodb', 'express', 'react', 'git'],
  ['android', 'kotlin', 'java', 'mobile', 'git', 'rest'],
  ['ios', 'swift', 'mobile', 'rest', 'git'],
  ['docker', 'kubernetes', 'aws', 'linux', 'devops'],
  ['data science', 'python', 'pandas', 'scikit', 'tableau', 'sql'],
  ['deep learning', 'pytorch', 'nlp', 'python', 'tensorflow'],
  ['react', 'typescript', 'graphql', 'nodejs', 'postgresql'],
  ['flutter', 'mobile', 'firebase', 'rest'],
  ['golang', 'kubernetes', 'linux', 'docker', 'aws'],
  ['computer vision', 'python', 'deep learning', 'pytorch'],
  ['blockchain', 'javascript', 'nodejs', 'python'],
  ['cybersecurity', 'linux', 'python', 'networking'],
  ['cpp', 'algorithms', 'data structures', 'python'],
  ['angular', 'typescript', 'java', 'spring', 'sql'],
  ['aws', 'azure', 'gcp', 'docker', 'kubernetes'],
  ['data analysis', 'excel', 'sql', 'python', 'tableau'],
];

const LOCATIONS    = ['Bangalore', 'Hyderabad', 'Mumbai', 'Pune', 'Chennai', 'Delhi', 'Gurgaon', 'Noida', 'Kolkata', 'Remote'];
const COLLEGES     = ['IIT Bombay', 'IIT Delhi', 'IIT Madras', 'IIT Kanpur', 'NIT Trichy', 'NIT Warangal', 'BITS Pilani', 'VIT Vellore', 'IIIT Hyderabad', 'DTU Delhi', 'Jadavpur University', 'Amrita University', 'Manipal Institute', 'SRM University', 'PES University'];
const DEGREES      = ['B.Tech CSE', 'B.Tech ECE', 'M.Tech CSE', 'B.Tech IT', 'MCA', 'M.Sc Data Science', 'BCA', 'B.E. CSE'];
const PREF_TYPES   = [['remote'], ['on-site'], ['hybrid'], ['remote', 'hybrid'], ['on-site', 'hybrid']];
const FIRST_NAMES  = ['Aarav','Aditya','Akash','Amit','Ananya','Anjali','Arjun','Aryan','Ayesha','Deepak','Divya','Gaurav','Harini','Ishaan','Karan','Kavya','Keerthi','Lakshmi','Mahesh','Manish','Meera','Mihir','Nidhi','Nikhil','Nisha','Pooja','Pradeep','Pranav','Priya','Rahul','Raj','Ravi','Ritesh','Rohan','Sahil','Sanket','Saurabh','Shivam','Shruti','Sneha','Suresh','Tanya','Uday','Vaibhav','Vikram','Vishal','Vivek','Yash','Zara','Zoya'];
const LAST_NAMES   = ['Agarwal','Bhatia','Choudhary','Das','Desai','Ghosh','Gupta','Iyer','Jain','Joshi','Kapoor','Khan','Kumar','Mehta','Mishra','Nair','Patel','Pillai','Rao','Reddy','Sharma','Singh','Sinha','Srivastava','Tiwari','Verma'];

const rand   = (a)       => a[Math.floor(Math.random() * a.length)];
const randInt = (lo, hi) => Math.floor(Math.random() * (hi - lo + 1)) + lo;
const randF   = (lo, hi) => parseFloat((Math.random() * (hi - lo) + lo).toFixed(1));
const shuffle = (a)      => [...a].sort(() => Math.random() - 0.5);

// ── MAIN ─────────────────────────────────────────────────────────────────────
async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB connected');

    // Init ChromaDB (non-blocking — seed works even if Chroma is offline)
    await initChroma();
    if (isChromaAvailable()) {
      console.log('✅ ChromaDB connected — embeddings will be stored in vector DB');
    } else {
      console.log('⚠️  ChromaDB offline — embeddings stored in MongoDB only');
      console.log('   Run: pip install chromadb && chroma run --path ./chroma_db\n');
    }

    // Clear all collections
    console.log('🗑️  Clearing existing data...');
    await Promise.all([
      Candidate.deleteMany({}),
      Recruiter.deleteMany({}),
      Internship.deleteMany({}),
      Application.deleteMany({}),
    ]);

    // ── RECRUITERS ──────────────────────────────────────────────────────────
    console.log('\n👔 Seeding 5 recruiters...');
    const hashed = await Promise.all(RECRUITER_SEEDS.map((r) => bcrypt.hash(r.password, 10)));
    const recruiters = await Recruiter.insertMany(
      RECRUITER_SEEDS.map((r, i) => {
        const co = COMPANIES[r.companyIdx];
        return { name: r.name, email: r.email, password: hashed[i], role: 'recruiter', company: co.name, designation: co.designation, companyDescription: co.desc, website: co.website, industry: co.industry, companySize: co.size };
      })
    );
    console.log(`   ✓ ${recruiters.length} recruiters created`);

    // ── INTERNSHIPS (with ChromaDB upsert) ──────────────────────────────────
    console.log('\n📋 Seeding 20 internships + ChromaDB embeddings...');
    const internshipDocs = [];
    for (let i = 0; i < INTERNSHIPS_DATA.length; i++) {
      const data = INTERNSHIPS_DATA[i];
      const rec  = recruiters[RECRUITER_ASSIGNMENT[i]];
      const doc  = new Internship({
        title: data.title, description: data.desc, company: rec.company,
        recruiter: rec._id,
        skills: data.skills, location: data.location, type: data.type,
        stipend: data.stipend, openings: data.openings, duration: data.duration,
        isActive: true,
      });
      // Generate embedding + upsert → ChromaDB (if available) + sets doc.embedding
      await upsertInternshipEmbedding(doc);
      await doc.save();
      internshipDocs.push(doc);
      process.stdout.write(`\r   ✓ ${i + 1}/20 internships`);
    }
    console.log('');

    // ── CANDIDATES (with ChromaDB upsert) ───────────────────────────────────
    console.log('\n👥 Seeding 300 candidates + ChromaDB embeddings...');
    const candidateDocs = [];
    const usedEmails   = new Set();

    for (let i = 0; i < 300; i++) {
      const firstName = rand(FIRST_NAMES);
      const lastName  = rand(LAST_NAMES);
      let email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@student.edu`;
      while (usedEmails.has(email)) {
        email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}_${randInt(1,999)}@student.edu`;
      }
      usedEmails.add(email);

      const skillPool  = rand(SKILLS_POOLS);
      const extraSkills = shuffle(SKILLS_POOLS.flat()).slice(0, randInt(0, 3));
      const skills     = [...new Set([...skillPool, ...extraSkills])];
      const location   = rand(LOCATIONS);
      const college    = rand(COLLEGES);
      const degree     = rand(DEGREES);
      const cgpa       = randF(5.5, 10.0);
      const prefTypes  = rand(PREF_TYPES);
      const bio        = `${degree} student at ${college} with skills in ${skills.slice(0,3).join(', ')}. CGPA: ${cgpa}. Open to ${prefTypes.join('/')} internships.`;

      const candidate = new Candidate({
        name: `${firstName} ${lastName}`, email,
        password: await bcrypt.hash('Password@123', 10),
        role: 'candidate', skills, location,
        preferredTypes: prefTypes, bio, cgpa,
        college, degree, experience: randInt(0, 12),
      });

      // Generate embedding + upsert → ChromaDB + sets candidate.profileEmbedding
      await upsertCandidateEmbedding(candidate);
      await candidate.save();
      candidateDocs.push(candidate);

      if ((i + 1) % 50 === 0) process.stdout.write(`\r   ✓ ${i + 1}/300 candidates`);
    }
    console.log('\r   ✓ 300/300 candidates');

    // ── APPLICATIONS (with real ranking scores) ──────────────────────────────
    console.log('\n📨 Seeding ~700 applications with AI ranking scores...');
    const appDocs  = [];
    const pairSet  = new Set();
    const statuses = ['pending', 'pending', 'pending', 'shortlisted'];

    for (const candidate of candidateDocs) {
      const numApps = randInt(2, 4);
      const shuffled = shuffle(internshipDocs);

      for (let j = 0; j < Math.min(numApps, shuffled.length); j++) {
        const internship = shuffled[j];
        const key = `${candidate._id}-${internship._id}`;
        if (pairSet.has(key)) continue;
        pairSet.add(key);

        // Real rank score using the full hybrid engine (BM25 + ChromaDB + skill + location)
        const [ranked] = await rankInternshipsForCandidate(candidate, [internship], '', 1);

        appDocs.push({
          candidate:        candidate._id,
          internship:       internship._id,
          recruiter:        internship.recruiter,
          status:           rand(statuses),
          rankScore:        ranked?.rankScore         || parseFloat((Math.random() * 0.8).toFixed(4)),
          bm25Score:        ranked?.bm25Score         || parseFloat((Math.random() * 0.6).toFixed(4)),
          similarityScore:  ranked?.similarityScore   || parseFloat((Math.random() * 0.7).toFixed(4)),
          skillOverlapScore:ranked?.skillOverlapScore || parseFloat((Math.random() * 0.5).toFixed(4)),
          locationScore:    ranked?.locationScore     || parseFloat((Math.random() * 1.0).toFixed(4)),
          coverLetter:      `I am excited to apply for the ${internship.title} position at ${internship.company}. My skills in ${candidate.skills.slice(0,2).join(' and ')} align well with your requirements.`,
          appliedAt:        new Date(Date.now() - randInt(0, 30) * 86400000),
        });
      }
    }

    // Batch insert in chunks of 200
    let inserted = 0;
    for (let i = 0; i < appDocs.length; i += 200) {
      await Application.insertMany(appDocs.slice(i, i + 200), { ordered: false });
      inserted += Math.min(200, appDocs.length - i);
      process.stdout.write(`\r   ✓ ${inserted}/${appDocs.length} applications`);
    }
    console.log('');

    // ── SUMMARY ──────────────────────────────────────────────────────────────
    console.log('\n' + '─'.repeat(56));
    console.log('🎉  Seeding Complete!');
    console.log('─'.repeat(56));
    console.log(`   Recruiters   : ${await Recruiter.countDocuments()}`);
    console.log(`   Internships  : ${await Internship.countDocuments()}  (+ ChromaDB ${isChromaAvailable() ? '✅' : '⚠️ offline'})`);
    console.log(`   Candidates   : ${await Candidate.countDocuments()}  (+ ChromaDB ${isChromaAvailable() ? '✅' : '⚠️ offline'})`);
    console.log(`   Applications : ${await Application.countDocuments()}`);
    console.log('─'.repeat(56));
    console.log('\n🔑  Demo Login Credentials:');
    console.log('   RECRUITER: priya@google.com     / Google@123');
    console.log('   RECRUITER: rahul@microsoft.com  / Microsoft@123');
    console.log('   RECRUITER: sneha@amazon.com     / Amazon@123');
    console.log('   RECRUITER: arjun@flipkart.com   / Flipkart@123');
    console.log('   RECRUITER: kavya@razorpay.com   / Razorpay@123');
    console.log('   CANDIDATE: (any seed email)     / Password@123');
    console.log('\n   Or register a fresh candidate / recruiter account!');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Seed error:', err.message);
    console.error(err.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seed();
