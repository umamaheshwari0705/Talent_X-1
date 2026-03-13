
import { GoogleGenAI } from "@google/genai";
import { GEMINI_TEXT_MODEL, MOCK_API_KEY } from '../constants';
import { GeminiAnalysisResult, AtsParameterScore } from "../types";

const apiKey = process.env.API_KEY || MOCK_API_KEY;

if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY") {
  console.warn("API_KEY for Gemini is not set or is the placeholder. AI features will be disabled. Check .env.local or constants.ts.");
}

const ai = (apiKey && apiKey !== "YOUR_GEMINI_API_KEY") ? new GoogleGenAI({ apiKey }) : null;

interface ParseError { error: string; originalText: string; }
function isParseError(obj: any): obj is ParseError {
  return obj && typeof obj === 'object' && 'error' in obj && 'originalText' in obj;
}
interface ResumeAnalysisApiResponse { feedback: string; suggestions?: string[]; }
interface PercentageMatchApiResponse { matchScore?: number; feedback?: string; matchingElements?: string[]; missingElements?: string[]; }
interface AtsScoreCalculatorApiResponse { overallScore: number; overallFeedback: string; parameterBreakdown: AtsParameterScore[]; generalImprovementSuggestions?: string[]; }
interface MockInterviewApiResponse { questions?: string[]; feedback?: string; }
interface ResumeSuggestionsApiResponse { feedback: string; suggestions?: string[]; }

const parseJsonFromText = (text: string): any => {
  let jsonStr = text.trim();
  const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
  const match = jsonStr.match(fenceRegex);
  if (match && match[2]) { jsonStr = match[2].trim(); }
  try { return JSON.parse(jsonStr); } catch (e) {
    console.error("Failed to parse JSON from Gemini response:", e, "Original:", text);
    return { error: "Failed to parse JSON", originalText: text };
  }
};

export const analyzeResumeWithGemini = async (resumeText: string): Promise<GeminiAnalysisResult> => {
  if (!ai) return { feedback: "Gemini API not configured. Please set API_KEY." };
  try {
    const systemInstruction = "You are an expert resume reviewer. Analyze the provided resume text. Provide feedback on: 1. Structure and Formatting. 2. Content. 3. Keywords. 4. Common Errors. Return as JSON: {\"feedback\": \"...\", \"suggestions\": [\"...\"]}";
    const result = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: [{ role: "user", parts: [{ text: resumeText }] }],
      config: { systemInstruction, responseMimeType: "application/json", temperature: 0.5 }
    });
    
    const text = result.text;
    if (!text) return { feedback: "No response from AI." };
    const raw = parseJsonFromText(text);
    if (isParseError(raw)) return { feedback: `Error: ${raw.error}. Raw: ${raw.originalText}` };
    const parsed = raw as ResumeAnalysisApiResponse;
    return { feedback: parsed.feedback || "No feedback provided.", suggestions: parsed.suggestions || [] };
  } catch (error) {
    console.error("Error calling Gemini API for resume analysis:", error);
    return { feedback: `An error occurred: ${error instanceof Error ? error.message : String(error)}` };
  }
};

export const getPercentageMatchWithGemini = async (resumeText: string, jobDescriptionText: string): Promise<GeminiAnalysisResult> => {
  if (!ai) return { feedback: "Gemini API not configured." };
  try {
    const systemInstruction = "You are an AI that calculates a percentage match between a resume and a job description. Calculate a compatibility score 0-100%. Return as JSON: {\"matchScore\": 85, \"feedback\": \"...\", \"matchingElements\": [...], \"missingElements\": [...]}";
    const prompt = `Resume:\n\`\`\`\n${resumeText}\n\`\`\`\n\nJob Description:\n\`\`\`\n${jobDescriptionText}\n\`\`\`\n\nPlease provide the percentage match analysis.`;
    const result = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { systemInstruction, responseMimeType: "application/json", temperature: 0.3 }
    });
    
    const text = result.text;
    if (!text) return { feedback: "No response from AI." };
    const raw = parseJsonFromText(text);
    if (isParseError(raw)) return { feedback: `Error: ${raw.error}. Raw: ${raw.originalText}` };
    const parsed = raw as PercentageMatchApiResponse;
    return {
      feedback: `Match Score: ${parsed.matchScore || 'N/A'}%\n\n${parsed.feedback || 'No detailed feedback.'}`,
      suggestions: [
        ...(parsed.matchingElements ? [`Matching: ${parsed.matchingElements.join(', ')}`] : []),
        ...(parsed.missingElements ? [`Missing: ${parsed.missingElements.join(', ')}`] : [])
      ],
      overallScore: parsed.matchScore
    };
  } catch (error) {
    console.error("Error calling Gemini API for percentage match:", error);
    return { feedback: `Error calculating match: ${error instanceof Error ? error.message : String(error)}` };
  }
};

export const calculateAtsScoreWithGemini = async (resumeText: string): Promise<GeminiAnalysisResult> => {
  if (!ai) return { feedback: "Gemini API not configured. Please set API_KEY." };
  try {
    const systemInstruction = "You are an expert ATS Score Calculator. Evaluate the resume for ATS compatibility across parameters: Contact Info, Keywords & Skills, Job Title Clarity, Experience Quantification, Education, Formatting & Structure, Overall Readability. Calculate overall score 0-100. Return JSON: {\"overallScore\": 78, \"overallFeedback\": \"...\", \"parameterBreakdown\": [{\"parameterName\": \"...\", \"score\": 90, \"status\": \"Excellent\", \"feedback\": \"...\", \"recommendation\": \"...\"}], \"generalImprovementSuggestions\": [\"...\"]}. Use Markdown in text fields. For status use: Excellent, Good, Fair, Needs Improvement.";
    const prompt = `Resume/CV:\n\`\`\`\n${resumeText}\n\`\`\`\n\nPlease provide the detailed ATS Score calculation and breakdown.`;
    const result = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { systemInstruction, responseMimeType: "application/json", temperature: 0.4 }
    });
    
    const text = result.text;
    if (!text) return { feedback: "No response from AI.", overallScore: 0, detailedBreakdown: [], suggestions: [] };
    const raw = parseJsonFromText(text);
    if (isParseError(raw)) return { feedback: `Error: ${raw.error}. Raw: ${raw.originalText}`, overallScore: 0, detailedBreakdown: [], suggestions: [] };
    const parsed = raw as AtsScoreCalculatorApiResponse;
    return {
      overallScore: parsed.overallScore, feedback: parsed.overallFeedback || "Overall feedback not provided.",
      detailedBreakdown: parsed.parameterBreakdown || [], suggestions: parsed.generalImprovementSuggestions || [],
    };
  } catch (error) {
    console.error("Error calling Gemini API for ATS Score Calculation:", error);
    return { feedback: `Error: ${error instanceof Error ? error.message : String(error)}`, overallScore: 0, detailedBreakdown: [], suggestions: [] };
  }
};

export const generateAiMockInterviewQuestions = async (jobRoleOrIndustry: string): Promise<GeminiAnalysisResult> => {
  if (!ai) return { feedback: "Gemini API not configured." };
  try {
    const systemInstruction = "You are an AI mock interview question generator. Generate 5 relevant interview questions for the given role/industry. Return JSON: {\"questions\": [\"...\"], \"feedback\": \"Here are questions for a mock interview.\"}";
    const prompt = `Job Role/Industry: ${jobRoleOrIndustry}\n\nPlease generate 5 interview questions.`;
    const result = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { systemInstruction, responseMimeType: "application/json", temperature: 0.6 }
    });
    
    const text = result.text;
    if (!text) return { feedback: "No response from AI." };
    const raw = parseJsonFromText(text);
    if (isParseError(raw)) return { feedback: `Error: ${raw.error}. Raw: ${raw.originalText}` };
    const parsed = raw as MockInterviewApiResponse;
    return { feedback: parsed.feedback || "Generated questions:", suggestions: parsed.questions || ["No questions generated."] };
  } catch (error) {
    console.error("Error calling Gemini API for mock interview questions:", error);
    return { feedback: `Error generating questions: ${error instanceof Error ? error.message : String(error)}` };
  }
};

export const getResumeSuggestionsWithGemini = async (resumeText: string): Promise<GeminiAnalysisResult> => {
  if (!ai) return { feedback: "Gemini API not configured." };
  try {
    const systemInstruction = "You are an AI resume improvement assistant. Provide 3-5 actionable suggestions. Return JSON: {\"feedback\": \"...\", \"suggestions\": [\"...\"]}";
    const prompt = `Resume for Improvement Suggestions:\n\`\`\`\n${resumeText}\n\`\`\`\n\nPlease provide improvement suggestions.`;
    const result = await ai.models.generateContent({
      model: GEMINI_TEXT_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { systemInstruction, responseMimeType: "application/json", temperature: 0.5 }
    });
    
    const text = result.text;
    if (!text) return { feedback: "No response from AI." };
    const raw = parseJsonFromText(text);
    if (isParseError(raw)) return { feedback: `Error: ${raw.error}. Raw: ${raw.originalText}` };
    const parsed = raw as ResumeSuggestionsApiResponse;
    return { feedback: parsed.feedback || "Suggestions for your resume:", suggestions: parsed.suggestions || [] };
  } catch (error) {
    console.error("Error calling Gemini API for resume suggestions:", error);
    return { feedback: `Error getting resume suggestions: ${error instanceof Error ? error.message : String(error)}` };
  }
};
