import mongoose from "mongoose";
import Report from "../models/reportModel.js";
import { extractLabResults, extractReportDates } from "../services/labExtractionService.js";
import { compareReports } from "../services/reportComparisonService.js";
import { generateComparisonSummary } from "../services/comparisonSummaryService.js";

const USER_ID_RE = /^user_/;

function getClerkUserId(req) {
  const auth = req.auth && typeof req.auth === "function" ? req.auth() : req.auth;
  return auth?.userId || null;
}

function isObjectId(value) {
  return typeof value === "string" && mongoose.Types.ObjectId.isValid(value);
}

/** Load report text for older reports that did not store extractedText. */
async function resolveTextFromChroma(report) {
  if (!report.chromaChunkIds || report.chromaChunkIds.length === 0) return null;
  try {
    const { collection } = await import("../services/chromaService.js");
    const fetched = await collection.get({ ids: report.chromaChunkIds });
    const documents = Array.isArray(fetched.documents) ? fetched.documents : [];
    const parts = documents.filter(Boolean).map((d) => String(d).trim());
    return parts.length ? parts.join("\n") : null;
  } catch (err) {
    return null;
  }
}

/** Resolve structured lab results, lazily backfilling from stored text. */
async function resolveReportResults(report) {
  if (Array.isArray(report.labResults) && report.labResults.length > 0) {
    return { results: report.labResults, method: "stored", warnings: [] };
  }

  let text = report.extractedText || null;
  let method = "extracted-text";
  if (!text) {
    text = await resolveTextFromChroma(report);
    method = text ? "extracted-chroma" : "none";
  }
  if (!text) {
    return { results: [], method: "none", warnings: ["No extracted text available; upload the PDF again to extract laboratory results."] };
  }

  const extraction = extractLabResults(text);
  const dates = extractReportDates(text);

  // Persist the backfill so it is computed only once (no re-embedding).
  try {
    await Report.updateOne(
      { _id: report._id },
      {
        extractedText: text,
        reportDate: report.reportDate || dates.reportDate,
        collectionDate: report.collectionDate || dates.collectionDate,
        labResults: extraction.results,
        labMethod: extraction.method,
        labExtractedAt: new Date(),
      }
    );
  } catch (err) {
    // Non-fatal: extraction still returned to the client.
  }

  return { results: extraction.results, method, warnings: extraction.warnings };
}

const safeReportSummary = (r) => ({
  id: String(r._id),
  reportName: r.reportName || r.fileOriginalName || "Medical report",
  fileOriginalName: r.fileOriginalName || r.reportName || "",
  createdAt: r.createdAt,
  reportDate: r.reportDate || null,
  collectionDate: r.collectionDate || null,
  resultsCount: Array.isArray(r.labResults) ? r.labResults.length : null,
  labMethod: r.labMethod || null,
  reviewRequiredCount: Array.isArray(r.labResults)
    ? r.labResults.filter((x) => x.reviewRequired).length
    : null,
  reportType: r.reportType || "medical-report",
});

export const getReportHistory = async (req, res) => {
  try {
    const userId = getClerkUserId(req);
    if (!userId) return res.status(401).json({ message: "Authentication required" });

    const reports = await Report.find({ userId }).sort({ createdAt: -1 });

    return res.json({
      reports: reports.map(safeReportSummary),
      total: reports.length,
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to load report history" });
  }
};

export const getReportResults = async (req, res) => {
  try {
    const userId = getClerkUserId(req);
    if (!userId) return res.status(401).json({ message: "Authentication required" });

    const { id } = req.params;
    if (!id || !isObjectId(id)) return res.status(400).json({ message: "Invalid report id" });

    const report = await Report.findOne({ _id: id, userId });
    if (!report) return res.status(404).json({ message: "Report not found" });

    const { results, method, warnings } = await resolveReportResults(report);

    const confidence = { high: 0, medium: 0, low: 0 };
    results.forEach((r) => { confidence[r.confidence || "medium"] += 1; });

    return res.json({
      report: safeReportSummary(report),
      labResults: results,
      extraction: {
        method,
        labMethod: report.labMethod || (results.length ? "deterministic" : "none"),
        confidence,
        reviewRequiredCount: results.filter((r) => r.reviewRequired).length,
        generatedAt: report.labExtractedAt || null,
      },
      warnings,
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to extract laboratory results" });
  }
};

export const postCompareReports = async (req, res) => {
  try {
    const userId = getClerkUserId(req);
    if (!userId) return res.status(401).json({ message: "Authentication required" });

    const ids = req.body?.reportIds;
    if (!Array.isArray(ids) || ids.length < 2 || ids.length > 10) {
      return res.status(400).json({
        message: "Select between 2 and 10 reports to compare",
      });
    }
    if (ids.some((x) => !x || !isObjectId(x))) {
      return res.status(400).json({ message: "Invalid report id in comparison" });
    }

    const reports = await Report.find({ _id: { $in: ids }, userId });
    if (reports.length !== ids.length) {
      return res.status(404).json({
        message: "One or more reports not found for this account",
      });
    }

    const warnings = [];
    const resultSets = [];
    for (const report of reports) {
      const { results, warnings: w } = await resolveReportResults(report);
      resultSets.push({
        reportId: report._id,
        reportName: report.reportName || report.fileOriginalName || "Medical report",
        reportDate: report.reportDate || null,
        collectionDate: report.collectionDate || null,
        results,
      });
      warnings.push(...w.map((x) => `${report.reportName || "report"}: ${x}`));
    }

    const comparison = compareReports(resultSets);
    const summary = await generateComparisonSummary(comparison);

    return res.json({ comparison, summary, warnings });
  } catch (err) {
    return res.status(500).json({ message: "Failed to compare reports" });
  }
};

export { getClerkUserId, USER_ID_RE };