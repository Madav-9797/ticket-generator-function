import { Client, Databases } from "node-appwrite";

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

let currentTicketId = 1234;
let currentPattern = null;
let resultIndex = 0;

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

function generateTicket() {
  if (!currentPattern || resultIndex >= currentPattern.length) {
    currentPattern = pickWeightedPattern();
    resultIndex = 0;
  }

  const result = currentPattern[resultIndex];
  const ticket = {
    ticketId: currentTicketId,
    result: result,
    createdAt: new Date().toISOString(),
  };

  currentTicketId++;
  resultIndex++;
  return ticket;
}

export default async ({ res, log }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);

  try {
    const ticket = generateTicket();

    // 1. Save the new ticket
    const saved = await databases.createDocument(
      process.env.APPWRITE_DATABASE_ID,
      process.env.APPWRITE_COLLECTION_ID,
      "unique()",
      {
        ticketId: ticket.ticketId,
        result: ticket.result,
        createdAt: ticket.createdAt,
      }
    );

    log("✅ Ticket saved: " + JSON.stringify(saved));

    // 2. Get all documents sorted by createdAt (oldest first)
    let allDocs = [];
    let page = 0;
    let hasMore = true;

    while (hasMore) {
      const docs = await databases.listDocuments(
        process.env.APPWRITE_DATABASE_ID,
        process.env.APPWRITE_COLLECTION_ID,
        [],
        100,
        page * 100,
        undefined,
        undefined,
        ['createdAt']
      );
      allDocs = allDocs.concat(docs.documents);
      hasMore = docs.documents.length === 100;
      page++;
    }

    // 3. Delete all except the latest 50
    const totalToDelete = allDocs.length - 50;
    if (totalToDelete > 0) {
      const oldDocs = allDocs.slice(0, totalToDelete);
      for (const doc of oldDocs) {
        await databases.deleteDocument(
          process.env.APPWRITE_DATABASE_ID,
          process.env.APPWRITE_COLLECTION_ID,
          doc.$id
        );
      }
      log(`🧹 Deleted ${totalToDelete} old tickets`);
    }

    return res.json({
      success: true,
      created: saved,
      totalDeleted: totalToDelete > 0 ? totalToDelete : 0,
    });
  } catch (err) {
    log("❌ Error: " + err.message);
    return res.json({ success: false, error: err.message });
  }
};
