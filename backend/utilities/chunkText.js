import {

  RecursiveCharacterTextSplitter

} from "@langchain/textsplitters";

const chunkText =
  async (
    text
  ) => {

    const splitter =
      new RecursiveCharacterTextSplitter({

        chunkSize: 1200,

        chunkOverlap: 200,

        separators: [

          "\n\n",

          "\n",

          ". ",

          " ",

          ""
        ],
      });

    return await splitter.splitText(
      text
    );
  };

export default chunkText;