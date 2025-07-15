import { Client, Databases, Query } from "node-appwrite";

const patterns = [
  { pattern: ["Small", "Big", "Small", "Big"], weight: 5 },
  { pattern: ["Small", "Small", "Big", "Big"], weight: 4 },
  { pattern: ["Small", "Small", "Small", "Big"], weight: 4 },
  { pattern: ["Small", "Small", "Big", "Small", "Big"], weight: 3 },
  { pattern: ["Big", "Big", "Small", "Small"], weight: 2 },
  { pattern: ["Big", "Small", "Small", "Big"], weight: 2 },
  { pattern: ["Big", "Big", "Big", "Small"], weight: 1 },
  { pattern: ["Big", "Small", "Big", "Small"], weight: 2 },
  { pattern: ["Big", "Small", "Big", "Big", "Big"], weight: 1 },
  { pattern: ["Small", "Big", "Big", "Big"], weight: 1 },
  { pattern: ["Big", "Big", "Small", "Big"], weight: 1 },
];

let currentPattern = null;
let resultIndex = 0;

// Weighted pattern picker
function pickWeightedPattern() {
  const totalWeight = patterns.reduce((sum, p) => sum + p.weight, 0);
  const rand = Math.random() * totalWeight;
  let cumulative = 0;
  for (const p of patterns) {
    cumulative += p.weight;
    if (rand < cumulative) return p.pattern;
  }
  return patterns[0].pattern;
}

// Generate single ticket object
function generateTicket() {
  if (!currentPattern || resultIndex >= currentPattern.length) {
    currentPattern = pickWeightedPattern();
    resultIndex = 0;
  }

  const result = currentPattern[resultIndex];
  const ticket = {
    ticketId: id,
    result: result,
    createdAt: new Date().toISOString(),
  };

  resultIndex++;
  return ticket;
}

export default async ({ res, log }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);

  const DB_ID = process.env.APPWRITE_DATABASE_ID;
  const COLLECTION_ID = process.env.APPWRITE_COLLECTION_ID;

  try {
    // 🟢 1. Fetch latest ticket to get last used ticketId
    const latestDoc = await databases.listDocuments(DB_ID, COLLECTION_ID, [
      Query.orderDesc("ticketId"),
      Query.limit(1),
    ]);

    let lastTicketId = 1233; // default if none exists
    if (latestDoc.total > 0) {
      lastTicketId = latestDoc.documents[0].ticketId;
    }

    const nextTicketId = lastTicketId + 1;

    // 🟢 2. Generate and Save New Ticket
    const ticket = generateTicket(nextTicketId);
    const saved = await databases.createDocument(DB_ID, COLLECTION_ID, "unique()", {
      ticketId: ticket.ticketId,
      result: ticket.result,
      createdAt: ticket.createdAt,
    });

    log("✅ Ticket saved: " + JSON.stringify(saved));

    // 🟢 3. Keep only latest 50 tickets
    const docs = await databases.listDocuments(DB_ID, COLLECTION_ID, [
      Query.orderDesc("ticketId"),
      Query.limit(100),
    ]);

    if (docs.total > 50) {
      const toDelete = docs.documents.slice(50); // Keep top 50

      for (const doc of toDelete) {
        try {
          await databases.deleteDocument(DB_ID, COLLECTION_ID, doc.$id);
          log(`🗑️ Deleted old ticket: ${doc.$id}`);
        } catch (delErr) {
          log(`⚠️ Failed to delete ${doc.$id}: ${delErr.message}`);
        }
      }
    } else {
      log(`ℹ️ Total documents (${docs.total}) under limit. No deletion needed.`);
    }


    return res.empty();
  } catch (err) {
    log("❌ Error: " + err.message);
    return res.empty();
  }
};
