/**
 * Backfill Expense.branch from creator's branch when missing.
 * Usage: node scripts/migrate-expense-branch.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Expense = require('../src/models/Expense');
const User = require('../src/models/User');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const expenses = await Expense.find({ branch: null, createdBy: { $ne: null } }).select(
      '_id createdBy'
    );

    let updated = 0;
    for (const expense of expenses) {
      const user = await User.findById(expense.createdBy).select('branch');
      if (!user?.branch) continue;
      await Expense.updateOne({ _id: expense._id }, { $set: { branch: user.branch } });
      updated += 1;
    }

    console.log(`Done. Updated expenses: ${updated}`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

run();
