import { GoogleGenAI, Type } from "@google/genai";
import { IssueCategory, PriorityLevel, SuggestedInfo } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("Gemini API key is not set. Please set the process.env.API_KEY environment variable.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

const issueAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    priority: {
      type: Type.STRING,
      enum: Object.values(PriorityLevel),
      description: 'The priority level of the issue.'
    },
    category: {
      type: Type.STRING,
      enum: Object.values(IssueCategory),
      description: 'The category the issue falls into.'
    }
  },
  required: ['priority', 'category']
};

const fileToGenerativePart = (dataUrl: string) => {
    const [header, data] = dataUrl.split(',');
    const mimeType = header.match(/:(.*?);/)?.[1] ?? 'image/jpeg';
    return {
      inlineData: {
        mimeType,
        data,
      },
    };
};


export const analyzeIssue = async (description: string, photo: string | null): Promise<SuggestedInfo | null> => {
  if (!API_KEY) {
    throw new Error("API Key not found.");
  }

  try {
    const textPrompt = `You are a helpful assistant for a facility management team. Analyze the following issue description and optional photo from a visitor. Based on the text and image, determine the most likely category and a priority level for the issue. The priority levels are '${Object.values(PriorityLevel).join("', '")}'. The categories are '${Object.values(IssueCategory).join("', '")}'.

      Issue Description: "${description}"
      
      Return the result as a JSON object.`;

    const contents = photo
        ? { parts: [{ text: textPrompt }, fileToGenerativePart(photo)] }
        : textPrompt;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: issueAnalysisSchema,
        temperature: 0,
      },
    });

    const jsonString = response.text.trim();
    const parsedJson = JSON.parse(jsonString);

    if (
        Object.values(PriorityLevel).includes(parsedJson.priority) &&
        Object.values(IssueCategory).includes(parsedJson.category)
    ) {
        return parsedJson as SuggestedInfo;
    }
    
    console.warn("Gemini returned unexpected values:", parsedJson);
    return null;

  } catch (error) {
    console.error("Error analyzing issue description with Gemini:", error);
    return null;
  }
};