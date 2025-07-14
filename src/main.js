import { Client, Databases, ID, Query } from "node-appwrite";

// 🎲 Ticket patterns
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

// 🧠 Pattern logic
let currentPattern = null;
let resultIndex = 0;
let currentTicketId = 1234;

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
    ticketId: currentTicketId++,
    result,
    createdAt: new Date().toISOString(),
  };

  resultIndex++;
  return ticket;
}

// 🧩 Main Function
export default async ({ log, res }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);

  const DB_ID = process.env.APPWRITE_DATABASE_ID;
  const COLLECTION_ID = process.env.APPWRITE_COLLECTION_ID;

  try {
    // 🔁 Get existing tickets sorted by createdAt DESC
    const existing = await databases.listDocuments(
      DB_ID,
      COLLECTION_ID,
      [Query.orderDesc("createdAt")]
    );

    // 🗑️ If > 49, delete the oldest (last in list)
    if (existing.total >= 50) {
      const oldest = existing.documents[existing.documents.length - 1];
      await databases.deleteDocument(DB_ID, COLLECTION_ID, oldest.$id);
      log(`🗑️ Deleted oldest ticket ID: ${oldest.ticketId}`);
    }

    // 🎟️ Add new ticket
    const ticket = generateTicket();
    const saved = await databases.createDocument(
      DB_ID,
      COLLECTION_ID,
      ID.unique(),
      ticket
    );

    log(`✅ New ticket saved: ${ticket.ticketId}`);
    return res.json({ success: true, ticket, saved });
  } catch (err) {
    log(`❌ Error: ${err.message}`);
    return res.json({ success: false, error: err.message });
  }
};
