import { db } from '@/db';
import { votes } from '@/db/schema';

async function main() {
    // Delete all existing votes to clean up for proper constraint testing
    await db.delete(votes);
    
    console.log('✅ Votes cleanup completed successfully - all existing votes have been removed');
}

main().catch((error) => {
    console.error('❌ Votes cleanup failed:', error);
});