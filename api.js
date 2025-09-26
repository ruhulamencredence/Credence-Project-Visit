// api.js - Backend proxy for Gemini API calls
// This server securely handles API requests to Google Gemini,
// keeping the API key hidden from the frontend application.

const express = require('express');
// The @google/genai package is required for this server to function.
// In a Node.js environment, it should be installed via: npm install @google/genai
const { GoogleGenAI } = require('@google/genai'); 
const cors = require('cors');

const app = express();
const port = 3001; // The port the backend server will run on.

// --- Middleware Setup ---
// Enable Cross-Origin Resource Sharing (CORS) for all routes
app.use(cors()); 
// Enable parsing of JSON bodies, with a higher limit to accommodate image data
app.use(express.json({ limit: '10mb' })); 

// --- Gemini API Initialization ---
// The API key MUST be provided as an environment variable for security.
const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  console.error("FATAL ERROR: The API_KEY environment variable is not set.");
  console.error("The backend server cannot start without a valid Google Gemini API key.");
  process.exit(1); // Exit the process if the key is missing
}

// Initialize the GoogleGenAI client with the secure API key.
const ai = new GoogleGenAI({ apiKey: API_KEY });

// --- API Endpoint ---
// A generic endpoint to proxy requests from the frontend to the Gemini API.
app.post('/api/gemini/generateContent', async (req, res) => {
  try {
    // Destructure the necessary parameters from the request body.
    const { model, contents, config } = req.body;

    // Basic validation to ensure required parameters are present.
    if (!model || !contents) {
      return res.status(400).json({ error: 'Request body must contain "model" and "contents" fields.' });
    }

    // Call the Gemini API using the server-side SDK.
    // The config object is passed conditionally if it exists.
    const response = await ai.models.generateContent({
        model: model,
        contents: contents,
        ...(config && { config: config }),
    });

    // Send back the generated text, which the frontend will then parse.
    res.json({ text: response.text });

  } catch (error) {
    console.error("Error proxying request to Gemini API:", error);
    res.status(500).json({ error: 'An internal server error occurred while contacting the Gemini API.' });
  }
});


// --- Server Startup ---
app.listen(port, () => {
    console.log(`Backend API proxy server is running at http://localhost:${port}`);
    console.log("This server securely forwards requests from the frontend to the Gemini API.");
});
