import { db } from '@/db';
import { user, submissions } from '@/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
    // First, find the super admin user
    const superAdmin = await db.select().from(user).where(eq(user.email, 'archanaarchu200604@gmail.com')).limit(1);
    
    if (superAdmin.length === 0) {
        throw new Error('Super admin user with email archanaarchu200604@gmail.com not found');
    }
    
    const userId = superAdmin[0].id;
    
    // Generate dates for the last 5 days
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(today.getDate() - 2);
    
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(today.getDate() - 3);
    
    const fourDaysAgo = new Date(today);
    fourDaysAgo.setDate(today.getDate() - 4);
    
    const sampleSubmissions = [
        {
            userId: userId,
            submissionDate: today.toISOString().split('T')[0],
            date: today.toISOString().split('T')[0],
            attendanceClass: 'Advanced Computer Science - Machine Learning Fundamentals, Data Structures and Algorithms Lab, Database Management Systems Theory',
            fileAcademics: 'ML Assignment #3: Neural Network Implementation submitted, DSA Lab Report #5: Binary Search Trees completed, DBMS Project Phase 2: ERD Design finalized',
            qdOfficial: 'Quarterly Department Meeting: Discussed curriculum updates for next semester, Budget allocation review for computer lab upgrades, Student placement drive coordination meeting',
            createdAt: today.toISOString(),
            updatedAt: today.toISOString(),
        },
        {
            userId: userId,
            submissionDate: yesterday.toISOString().split('T')[0],
            date: yesterday.toISOString().split('T')[0],
            attendanceClass: 'Software Engineering Principles, Web Development Workshop, Computer Networks Theory, Digital Signal Processing Lab',
            fileAcademics: 'SE Project Documentation: Requirements Analysis Phase completed, Web Dev Assignment: React.js Todo Application deployed, CN Lab: Network Topology Simulation exercise',
            qdOfficial: 'Faculty Development Program: Modern Teaching Methodologies workshop, Research Paper Review Committee meeting, Academic Calendar Planning for upcoming semester',
            createdAt: yesterday.toISOString(),
            updatedAt: yesterday.toISOString(),
        },
        {
            userId: userId,
            submissionDate: twoDaysAgo.toISOString().split('T')[0],
            date: twoDaysAgo.toISOString().split('T')[0],
            attendanceClass: 'Operating Systems Design, Artificial Intelligence Applications, Computer Graphics Programming, Cybersecurity Fundamentals',
            fileAcademics: 'OS Assignment: Process Scheduling Algorithms implementation, AI Project: Expert System for Medical Diagnosis, Graphics Lab: 3D Object Rendering using OpenGL',
            qdOfficial: 'Industry Collaboration Meeting: Partnership with TechCorp for internship program, Curriculum Review Committee: CS syllabus modernization, Student Grievance Redressal Committee session',
            createdAt: twoDaysAgo.toISOString(),
            updatedAt: twoDaysAgo.toISOString(),
        },
        {
            userId: userId,
            submissionDate: threeDaysAgo.toISOString().split('T')[0],
            date: threeDaysAgo.toISOString().split('T')[0],
            attendanceClass: 'Mobile Application Development, Cloud Computing Architecture, Human-Computer Interaction, Compiler Design Theory',
            fileAcademics: 'Mobile Dev: Android app prototype with Firebase backend, Cloud Computing: AWS deployment of microservices architecture, HCI Research: User Experience analysis report',
            qdOfficial: 'Research Grant Proposal Meeting: NSF funding application for AI research lab, Academic Excellence Awards Selection Committee, Department Infrastructure Planning Committee',
            createdAt: threeDaysAgo.toISOString(),
            updatedAt: threeDaysAgo.toISOString(),
        },
        {
            userId: userId,
            submissionDate: fourDaysAgo.toISOString().split('T')[0],
            date: fourDaysAgo.toISOString().split('T')[0],
            attendanceClass: 'Data Mining and Analytics, Distributed Systems Architecture, Information Security Management, Advanced Programming Paradigms',
            fileAcademics: 'Data Mining Project: Customer Behavior Analysis using clustering algorithms, Distributed Systems Lab: MapReduce implementation, Security Assignment: Cryptographic Protocol Analysis',
            qdOfficial: 'Board of Studies Meeting: New course proposals for AI specialization, Quality Assurance Audit: NAAC accreditation preparation, Alumni Relations Committee: Industry mentorship program launch',
            createdAt: fourDaysAgo.toISOString(),
            updatedAt: fourDaysAgo.toISOString(),
        }
    ];

    await db.insert(submissions).values(sampleSubmissions);
    
    console.log('✅ Submissions seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});