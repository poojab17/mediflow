import { ChromaClient } from "chromadb";

const client = new ChromaClient({
  host: "127.0.0.1",
  port: 8000,
});

export const collection =
  await client.getOrCreateCollection({

    name: "medical_reports",

    embeddingFunction: null,
  });

console.log("ChromaDB Connected");