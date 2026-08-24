import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import multer from 'multer';

dotenv.config();

const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // AI Route for Quick Add
  app.post('/api/parse-expense', upload.single('audio'), async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });
      }

      // If sending audio directly to Gemini:
      const file = req.file;
      let promptText = req.body.text; // Or fallback to text if transcribed client-side

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      let resultText = '';
      if (file) {
        // Assuming Gemini can accept audio inline for 1.5 Pro / Flash
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: file.mimetype,
                    data: file.buffer.toString('base64'),
                  }
                },
                { text: 'Parse this audio into a JSON object with two fields: "amount" (number) and "purpose" (string). If it mentions a category, include it in the purpose. Respond ONLY with valid JSON.' }
              ]
            }
          ]
        });
        resultText = response.text || '';
      } else if (promptText) {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Parse this expense description into a JSON object with two fields: "amount" (number) and "purpose" (string). If it mentions a category, include it in the purpose. Respond ONLY with valid JSON. Description: "${promptText}"`
        });
        resultText = response.text || '';
      } else {
        return res.status(400).json({ error: 'No audio or text provided.' });
      }

      // Clean markdown formatting if present
      resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(resultText);
      
      res.json(parsed);
    } catch (error: any) {
      console.error('Error parsing expense:', error);
      res.status(500).json({ error: error.message || 'Failed to parse expense.' });
    }
  });

  // AI Route for Receipt Parsing
  app.post('/api/parse-receipt', upload.single('image'), async (req, res) => {
    try {
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });
      }

      const file = req.file;
      if (!file) return res.status(400).json({ error: 'No image provided.' });

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: file.mimetype,
                  data: file.buffer.toString('base64'),
                }
              },
              { text: 'Analyze this receipt image. Extract and return ONLY a valid JSON object with these exact keys: "amount" (number representing total amount), "vendor" (string representing the store/vendor name), "date" (string representing the date). If a value is missing, use null.' }
            ]
          }
        ]
      });

      let resultText = response.text || '';
      resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(resultText);
      
      res.json(parsed);
    } catch (error: any) {
      console.error('Error parsing receipt:', error);
      res.status(500).json({ error: error.message || 'Failed to parse receipt.' });
    }
  });

  // Mock Email Route
  app.post('/api/send-email', (req, res) => {
    const { email, invoiceNumber, pdfData } = req.body;
    console.log(`Mock sending email to ${email} for invoice ${invoiceNumber}...`);
    // In a real app, integrate SendGrid, AWS SES, or NodeMailer here
    setTimeout(() => {
      res.json({ success: true, message: `Email sent to ${email}` });
    }, 1000);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
