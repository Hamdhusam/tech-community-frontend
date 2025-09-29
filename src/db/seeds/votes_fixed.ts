import { db } from '@/db';
import { votes, user } from '@/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
    // Query the user table to find the actual userId for the super admin
    const superAdminUser = await db.select().from(user).where(eq(user.email, 'archanaarchu200604@gmail.com')).limit(1);
    
    if (superAdminUser.length === 0) {
        throw new Error('Super admin user with email archanaarchu200604@gmail.com not found');
    }
    
    const userId = superAdminUser[0].id;
    
    const sampleVotes = [
        {
            userId: userId,
            voteDate: '2024-12-18',
            vote: 'yes',
            createdAt: new Date('2024-12-18T10:30:00Z').toISOString(),
            updatedAt: new Date('2024-12-18T10:30:00Z').toISOString(),
        },
        {
            userId: userId,
            voteDate: '2024-12-19',
            vote: 'approve',
            createdAt: new Date('2024-12-19T14:15:00Z').toISOString(),
            updatedAt: new Date('2024-12-19T14:15:00Z').toISOString(),
        },
        {
            userId: userId,
            voteDate: '2024-12-20',
            vote: 'abstain',
            createdAt: new Date('2024-12-20T09:45:00Z').toISOString(),
            updatedAt: new Date('2024-12-20T09:45:00Z').toISOString(),
        }
    ];

    await db.insert(votes).values(sampleVotes);
    
    console.log('✅ Votes seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});