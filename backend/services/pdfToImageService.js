import fs from "fs";

import path from "path";

import poppler from "pdf-poppler";

const convertPdfToImages =
  async (pdfPath) => {

    try {

      // TEMP OUTPUT FOLDER

      const outputDir =
        path.join(
          "tmp",
          `ocr_${Date.now()}`
        );

      // CREATE FOLDER

      if (
        !fs.existsSync(outputDir)
      ) {

        fs.mkdirSync(
          outputDir,
          { recursive: true }
        );
      }

      // PDF → PNG

      await poppler.convert(pdfPath, {

        format: "png",

        out_dir: outputDir,

        out_prefix: "page",

        page: null,
      });

      return outputDir;

    } catch (err) {

      console.log(
        "PDF TO IMAGE ERROR:",
        err
      );

      return null;
    }
};

export default convertPdfToImages;