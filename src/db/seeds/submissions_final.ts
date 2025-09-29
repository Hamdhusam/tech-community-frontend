import { db } from '@/db';
import { submissions } from '@/db/schema';

async function main() {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const fourDaysAgo = new Date(today);
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

    const sampleSubmissions = [
        {
            userId: 'user_1759120401457_r71xiby0sok',
            submissionDate: today.toISOString().split('T')[0],
            date: today.toISOString().split('T')[0],
            attendanceClass: 'Computer Science 301',
            fileAcademics: 'Data Structures and Algorithms Assignment - Implementing Binary Search Trees and Hash Tables with performance analysis and complexity evaluation.',
            qdOfficial: 'Assignment submission for CS301 - Data structures implementation with complete documentation and test cases.',
            createdAt: today.toISOString(),
            updatedAt: today.toISOString(),
        },
        {
            userId: 'user_1759120401457_r71xiby0sok',
            submissionDate: yesterday.toISOString().split('T')[0],
            date: yesterday.toISOString().split('T')[0],
            attendanceClass: 'Physics 205',
            fileAcademics: 'Quantum Mechanics Lab Report - Double-slit experiment analysis with wave-particle duality observations and measurement uncertainties.',
            qdOfficial: 'Lab report for Physics 205 - Experimental verification of quantum mechanical principles with detailed calculations.',
            createdAt: yesterday.toISOString(),
            updatedAt: yesterday.toISOString(),
        },
        {
            userId: 'user_1759120401457_r71xiby0sok',
            submissionDate: twoDaysAgo.toISOString().split('T')[0],
            date: twoDaysAgo.toISOString().split('T')[0],
            attendanceClass: 'Mathematics 310',
            fileAcademics: 'Advanced Calculus Project - Real Analysis and Measure Theory applications in probability distributions and convergence theorems.',
            qdOfficial: 'Mathematics project for MATH310 - Theoretical proofs and practical applications of measure theory concepts.',
            createdAt: twoDaysAgo.toISOString(),
            updatedAt: twoDaysAgo.toISOString(),
        },
        {
            userId: 'user_1759120401457_r71xiby0sok',
            submissionDate: threeDaysAgo.toISOString().split('T')[0],
            date: threeDaysAgo.toISOString().split('T')[0],
            attendanceClass: 'Chemistry 250',
            fileAcademics: 'Organic Chemistry Research - Synthesis and characterization of novel pharmaceutical compounds with NMR and mass spectrometry analysis.',
            qdOfficial: 'Research submission for CHEM250 - Independent study on drug discovery and molecular characterization techniques.',
            createdAt: threeDaysAgo.toISOString(),
            updatedAt: threeDaysAgo.toISOString(),
        },
        {
            userId: 'user_1759120401457_r71xiby0sok',
            submissionDate: fourDaysAgo.toISOString().split('T')[0],
            date: fourDaysAgo.toISOString().split('T')[0],
            attendanceClass: 'English Literature 180',
            fileAcademics: 'Victorian Literature Essay - Comparative analysis of social criticism in Dickens and Hardy with focus on industrialization themes and class dynamics.',
            qdOfficial: 'Literary analysis for ENG180 - Critical examination of Victorian authors and their societal commentary through fiction.',
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