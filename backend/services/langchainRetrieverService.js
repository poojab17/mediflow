import { Chroma } from "@langchain/community/vectorstores/chroma";
import { GoogleGenerativeAIEmbeddings }
from "@langchain/google-genai";

const embeddings =
  new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GEMINI_API_KEY,
    model: "gemini-embedding-001",
  });

export const getRetriever =
  async (reportHash) => {

    const vectorStore =
      await Chroma.fromExistingCollection(
        embeddings,
        {
          collectionName: "medical_reports",
          url: "http://localhost:8000",
        }
      );

    return vectorStore.asRetriever({
      k: 4,
      filter: {
        reportHash,
      },
    });
  };