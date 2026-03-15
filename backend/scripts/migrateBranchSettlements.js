require('dotenv').config();
const mongoose = require('mongoose');
const Branch = require('../src/models/Branch');
const BranchSettlement = require('../src/models/BranchSettlement');

async function migrate() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in env');
    }

    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    let migratedBranches = 0;
    let totalSettlements = 0;

    const branches = await Branch.find({ 'settlementHistory.0': { $exists: true } });
    console.log(`Found ${branches.length} branches with embedded settlement data.`);

    for (const branch of branches) {
      if (branch._doc.settlementHistory && branch._doc.settlementHistory.length > 0) {
        const batch = branch._doc.settlementHistory.map(sh => ({
          tenant: branch.tenant,
          branch: branch._id,
          date: sh.date,
          totalSales: sh.totalSales,
          cashSales: sh.cashSales,
          cardSales: sh.cardSales,
          creditSales: sh.creditSales,
          totalExpenses: sh.totalExpenses,
          netCash: sh.netCash,
          cashInHand: sh.cashInHand,
          expectedCash: sh.expectedCash,
          variance: sh.variance,
          invoicesCount: sh.invoicesCount,
          settledBy: sh.settledBy,
          notes: sh.notes,
          createdAt: sh.createdAt || Date.now(),
        }));

        await BranchSettlement.insertMany(batch);
        totalSettlements += batch.length;
        
        // Remove from branch
        await Branch.updateOne(
          { _id: branch._id },
          { $unset: { settlementHistory: 1 } }
        );
        migratedBranches++;
      }
    }

    console.log(`Migration completed successfully!`);
    console.log(`Migrated ${migratedBranches} branches details.`);
    console.log(`Created ${totalSettlements} BranchSettlement records.`);

    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
