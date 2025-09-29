import { db } from '@/db';
import { submissions } from '@/db/schema';

async function main() {
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
            userId: 'user_01h4kxt2e8z9y3b1n7m6q5w8r4',
            submissionDate: today.toISOString().split('T')[0],
            date: today.toISOString().split('T')[0],
            attendanceClass: 'Advanced Database Systems - CS 642',
            fileAcademics: 'academic_paper_database_optimization.pdf',
            qdOfficial: 'QD2024-001-Academic Research on Query Optimization Techniques',
            createdAt: today.toISOString(),
            updatedAt: today.toISOString(),
        },
        {
            userId: 'user_01h4kxt2e8z9y3b1n7m6q5w8r4',
            submissionDate: yesterday.toISOString().split('T')[0],
            date: yesterday.toISOString().split('T')[0],
            attendanceClass: 'Software Engineering Lab - CS 551',
            fileAcademics: 'lab_report_week12_software_testing.pdf',
            qdOfficial: 'QD2024-002-Lab Report on Unit Testing and Integration Testing',
            createdAt: yesterday.toISOString(),
            updatedAt: yesterday.toISOString(),
        },
        {
            userId: 'user_01h4kxt2e8z9y3b1n7m6q5w8r4',
            submissionDate: twoDaysAgo.toISOString().split('T')[0],
            date: twoDaysAgo.toISOString().split('T')[0],
            attendanceClass: 'Machine Learning Applications - CS 720',
            fileAcademics: 'project_submission_neural_networks.zip',
            qdOfficial: 'QD2024-003-Final Project on Deep Learning for Image Recognition',
            createdAt: twoDaysAgo.toISOString(),
            updatedAt: twoDaysAgo.toISOString(),
        },
        {
            userId: 'user_01h4kxt2e8z9y3b1n7m6q5w8r4',
            submissionDate: threeDaysAgo.toISOString().split('T')[0],
            date: threeDaysAgo.toISOString().split('T')[0],
            attendanceClass: 'Computer Science Research Methods - CS 800',
            fileAcademics: 'research_paper_distributed_systems.pdf',
            qdOfficial: 'QD2024-004-Research Paper on Blockchain Applications in Distributed Computing',
            createdAt: threeDaysAgo.toISOString(),
            updatedAt: threeDaysAgo.toISOString(),
        },
        {
            userId: 'user_01h4kxt2e8z9y3b1n7m6q5w8r4',
            submissionDate: fourDaysAgo.toISOString().split('T')[0],
            date: fourDaysAgo.toISOString().split('T')[0],
            attendanceClass: 'Advanced Algorithms Seminar - CS 750',
            fileAcademics: 'presentation_slides_graph_algorithms.pptx',
            qdOfficial: 'QD2024-005-Technical Presentation on Graph Theory and Network Analysis',
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