import { z } from "zod";
import { generateObject, CoreMessage } from "ai";
import { google } from "@ai-sdk/google";
import { ANALYSIS_AGENT_MODEL_NAME } from "../../common/config";

const getAnalysisPrompt = (fillableFields: any[], pageDimensions: { width: number; height: number }[]) => `
Analyze the provided PDF document and the extracted raw fillable fields to return a structured JSON object.
The PDF is provided as inline data.

**PDF Coordinate System Context:**
- Origin (0,0) is at the **bottom-left** corner.
- X increases to the right. Y increases upwards.
- Bounding boxes: { x, y, width, height }.
- Page Dimensions: ${JSON.stringify(pageDimensions)}

**Raw Fields:**
${JSON.stringify(fillableFields, null, 2)}

**Task: Layout Analysis & Field Mapping**
Act as an expert Layout Analysis Engine. Your goal is to make this PDF usable by a human.

1.  **Identify Logical Sections**: Group fields into logical sections (e.g., "Shipper Info", "Line Items").
2.  **DETECT TABLES (CRITICAL)**:
    -   Look for **grids** of fields with aligned X or Y coordinates.
    -   Look for repeating patterns (e.g., "Description", "Qty", "Price" columns).
    -   If you see a table, group those fields into a "Table" section or similar.
    -   **Table Headers**: Look for text labels *above* the columns (e.g., "No.", "Description", "Unit Price").
3.  **Generate Field Descriptions**:
    -   For EACH field, find its **visual label** in the PDF.
    -   **Label Search**: Look *immediately to the left* or *immediately above* the field's bounding box.
    -   **Description**: Must include the literal label text.
    -   Example: "Field for 'Company Name' in Shipper section".

4.  **FieldName Preservation (THE HOLY RULE)**:
    -   You MUST return the \`fieldName\` EXACTLY as it appears in the "Raw Fields" list.
    -   DO NOT truncate, "clean", or modify the field names (e.g., do not change \`topmostSubform[0]...\` to \`First_Name\`).
    -   If you modify the \`fieldName\`, the system will fail. COPY THEM LITERALLY.

5.  **Summary**: Brief summary of the document.
`;

// Define the schema for the structured response we expect from Gemini
export const GeminiPdfAnalysisSchema = z.object({
  documentInfo: z.object({
    summary: z.string().describe("A brief summary of the document's purpose."),
    keywords: z.array(z.string()).describe("Potential keywords for searching related topics."),
    searchQueries: z.array(z.string()).describe("Suggested search queries for further research."),
  }),
  layout: z.object({
    pages: z.number().describe("The total number of pages in the document."),
    sections: z.array(z.string()).describe("An array of major section titles or descriptions."),
  }),
  fields: z.array(
    z.object({
      fieldName: z.string().describe("The original field name from pdf-lib."),
      label: z
        .string()
        .describe(
          "The human-readable label for the field, extracted directly from the PDF if available, or a best guess based on proximity."
        ),
      description: z
        .string()
        .describe(
          "A concise, human-readable description of the field's purpose, including its literal label from the PDF and its context (e.g., 'Field for Company Name in the Shipper section')."
        ),
      section: z
        .string()
        .describe("The logical section name this field belongs to (e.g., 'Shipper Information', 'Header', 'Footer')."),
    })
  ),
});

export type GeminiPdfAnalysis = z.infer<typeof GeminiPdfAnalysisSchema>;

/**
 * Analyzes a PDF's structure and content using the Gemini API.
 *
 * @param pdfBytes The raw bytes of the PDF file.
 * @param fillableFields A flat list of raw fillable fields with their coordinates.
 * @param pageDimensions An array of page dimensions (width, height) for each page.
 * @returns A promise that resolves to the structured analysis from Gemini.
 * @throws If the API call fails or the response does not match the expected schema.
 */
export async function analyzePdf(
  pdfBytes: Buffer,
  fillableFields: any[],
  pageDimensions: { width: number; height: number }[]
): Promise<GeminiPdfAnalysis> {
  const promptContent: CoreMessage[] = [
    {
      role: "user",
      content: [
        { type: "text", text: getAnalysisPrompt(fillableFields, pageDimensions) },
        { type: "file", data: pdfBytes, filename: "document.pdf", mediaType: "application/pdf" },
      ],
    },
  ];

  try {
    console.log("[AnalyzeAgent] Starting PDF analysis with Gemini...");
    const { object, usage } = await generateObject({
      model: google(ANALYSIS_AGENT_MODEL_NAME),
      schema: GeminiPdfAnalysisSchema,
      prompt: promptContent,
      temperature: 0.2,
    });

    console.log("[AnalyzeAgent] Analysis complete. Usage:", JSON.stringify(usage));
    console.log("[AnalyzeAgent] RAW OBJECT (Sample fields):", JSON.stringify(object.fields.slice(0, 5), null, 2));
    return object;
  } catch (error: any) {
    console.error("[analyze.agent] An error occurred during PDF analysis:", error.message, error);
    throw new Error(`Failed to analyze PDF with Gemini: ${error.message}`);
  }
}
