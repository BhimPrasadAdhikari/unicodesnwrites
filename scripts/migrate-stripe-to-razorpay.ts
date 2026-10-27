/**
 * Moves stored products and purchases off Stripe so the Razorpay (INR-only) models load cleanly.
 *
 * - Drops the old unique Stripe indexes (stripeSessionId, stripePaymentIntentId, stripeProductId,
 *   stripePriceId) so new Razorpay rows without those fields don't collide on null.
 * - Gives legacy purchases a placeholder `razorpayOrderId` (legacy_stripe_<session>) so the new
 *   unique index can build. Their Stripe ids and original currency are kept for the record.
 * - Unsets Stripe ids on products. Products not priced in INR are only listed unless you pass
 *   --usd-inr-rate=<rate>, which converts price and totalRevenue to paise, rounded to whole rupees.
 *
 * - Dry run by default: reports what would change and writes nothing.
 * - Pass --apply to write. Safe to re-run: migrated documents no longer match.
 * - Reads MONGODB_URI from the process environment only; it never loads an env file.
 *
 * Usage (sandbox):
 *   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/with-sandbox-env.ps1 npx tsx scripts/migrate-stripe-to-razorpay.ts
 *   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/with-sandbox-env.ps1 npx tsx scripts/migrate-stripe-to-razorpay.ts --usd-inr-rate=84 --apply
 */
import mongoose from 'mongoose';

import { connectDB } from '@/lib/db/connection';

const apply = process.argv.includes('--apply');
const rateArg = process.argv.find((arg) => arg.startsWith('--usd-inr-rate='));
const usdInrRate = rateArg ? Number(rateArg.split('=')[1]) : null;

const LEGACY_INDEXES: Record<string, string[]> = {
  purchases: ['stripeSessionId_1', 'stripePaymentIntentId_1'],
  products: ['stripeProductId_1', 'stripePriceId_1'],
};

// Cents -> paise at the given rate, rounded to a whole rupee.
const toPaise = (cents: number, rate: number) => Math.round((cents / 100) * rate) * 100;

async function dropLegacyIndexes(db: mongoose.mongo.Db) {
  for (const [collection, names] of Object.entries(LEGACY_INDEXES)) {
    const existing = await db.collection(collection).indexes().catch(() => []);
    for (const name of names.filter((n) => existing.some((index) => index.name === n))) {
      console.log(`${apply ? 'Dropping' : 'Would drop'} index ${collection}.${name}`);
      if (apply) await db.collection(collection).dropIndex(name);
    }
  }
}

async function migratePurchases(db: mongoose.mongo.Db) {
  const purchases = db.collection('purchases');
  const legacy = await purchases
    .find({ razorpayOrderId: { $exists: false } }, { projection: { purchaseId: 1, stripeSessionId: 1, status: 1, currency: 1 } })
    .toArray();

  console.log(`Legacy purchases without razorpayOrderId: ${legacy.length}`);
  for (const purchase of legacy) {
    const placeholder = `legacy_stripe_${purchase.stripeSessionId || purchase.purchaseId || purchase._id}`;
    console.log(`  ${purchase.purchaseId} (${purchase.status}, ${purchase.currency}) -> ${placeholder}`);
    if (apply) await purchases.updateOne({ _id: purchase._id }, { $set: { razorpayOrderId: placeholder } });
  }
}

async function migrateProducts(db: mongoose.mongo.Db) {
  const products = db.collection('products');
  const withStripeIds = await products.countDocuments({
    $or: [{ stripeProductId: { $exists: true } }, { stripePriceId: { $exists: true } }],
  });
  console.log(`Products with Stripe ids to unset: ${withStripeIds}`);
  if (apply && withStripeIds) {
    await products.updateMany({}, { $unset: { stripeProductId: '', stripePriceId: '' } });
  }

  const nonInr = await products
    .find({ currency: { $ne: 'INR' } }, { projection: { title: 1, price: 1, currency: 1, totalRevenue: 1 } })
    .toArray();
  console.log(`Products not priced in INR: ${nonInr.length}`);

  for (const product of nonInr) {
    if (usdInrRate && String(product.currency).toUpperCase() === 'USD') {
      const price = toPaise(product.price || 0, usdInrRate);
      const totalRevenue = toPaise(product.totalRevenue || 0, usdInrRate);
      console.log(`  ${product.title}: ${product.price} USD cents -> ${price} paise (₹${price / 100})`);
      if (apply) await products.updateOne({ _id: product._id }, { $set: { price, totalRevenue, currency: 'INR' } });
    } else {
      console.log(`  ${product.title}: ${product.price} ${product.currency} (left as is; pass --usd-inr-rate or re-price in the dashboard)`);
    }
  }
}

async function main() {
  if (usdInrRate !== null && !(usdInrRate > 0)) throw new Error('--usd-inr-rate must be a positive number');

  await connectDB();
  const db = mongoose.connection.db;
  if (!db) throw new Error('No database connection');

  console.log(`${apply ? 'APPLYING' : 'DRY RUN'} on ${mongoose.connection.host}/${mongoose.connection.name}`);
  await dropLegacyIndexes(db);
  await migratePurchases(db);
  await migrateProducts(db);
  if (!apply) console.log('Dry run only. Re-run with --apply to write.');
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
