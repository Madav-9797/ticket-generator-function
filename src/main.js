import { Client, Databases } from "node-appwrite";

export default async ({ req, res, log }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);

  try {
    const result = await databases.createDocument(
      process.env.APPWRITE_DATABASE_ID,
      process.env.APPWRITE_COLLECTION_ID,
      "unique()", // ID
      {
        name: "Test User",
        ticket: Math.floor(Math.random() * 10000)
      }
    );

    res.json({
      success: true,
      message: "Ticket generated",
      data: result,
    });
  } catch (error) {
    log(error);
    res.json({
      success: false,
      error: error.message,
    });
  }
};
