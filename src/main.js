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
    return res.empty();
  } catch (err) {
    log("❌ Error: " + err.message);
    return res.empty();
  }
};
