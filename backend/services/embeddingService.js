import axios from "axios";

export const createEmbedding =
  async (text) => {

    try {

      console.log(
        "CALLING FASTAPI EMBEDDING..."
      );

      const response =
        await axios.post(
          "http://localhost:8001/embed-report",
          {
            text,
          }
        );

      return response.data.embedding;

    } catch (err) {

      console.log(
        "EMBED ERROR:",
        err.message
      );

      throw err;
    }
  };