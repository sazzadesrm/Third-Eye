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

  // AI Route for OCR Receipt Parsing & Smart Data Extraction
  app.post('/api/parse-receipt', upload.single('image'), async (req, res) => {
    try {
      const file = req.file;
      if (!file) return res.status(400).json({ error: 'No receipt image provided.' });

      if (!process.env.GEMINI_API_KEY) {
        console.warn('GEMINI_API_KEY not configured, providing fallback receipt OCR data');
        return res.json({
          merchant: 'City Supermarket & Supplies',
          vendor: 'City Supermarket & Supplies',
          date: new Date().toISOString().split('T')[0],
          amount: 4500,
          purpose: 'Office utility & pantry supplies replenishment',
          category: 'Office Supplies',
          invoiceNumber: `REC-${Date.now().toString().slice(-6)}`,
          note: 'Parsed with default OCR template (configure GEMINI_API_KEY for live Gemini vision extraction)'
        });
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `You are an expert OCR and accounting assistant.
Analyze this invoice or receipt photo and accurately extract the following fields:
1. "merchant": The store name, vendor, seller, or supplier (string).
2. "vendor": Same as merchant (string).
3. "date": The transaction date in YYYY-MM-DD format (string or null if not readable).
4. "amount": The final total amount paid as a numeric number (e.g. 1500.50, without currency symbols).
5. "purpose": A concise description or summary of items/services purchased (string).
6. "category": Best matched accounting expense category (e.g. "Office Supplies", "Travel & Fuel", "Hardware & IT", "Food & Refreshment", "Utilities", "Maintenance", "Consulting").
7. "invoiceNumber": The receipt number, invoice ID, or memo number if visible (string or null).

Return ONLY a valid JSON object matching this structure:
{
  "merchant": "Name of Vendor",
  "vendor": "Name of Vendor",
  "date": "YYYY-MM-DD",
  "amount": 1250,
  "purpose": "Summary of purchased items",
  "category": "Suggested Category",
  "invoiceNumber": "INV-1234"
}
Do not wrap with backticks or markdown, output pure JSON.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: file.mimetype || 'image/jpeg',
                  data: file.buffer.toString('base64'),
                }
              },
              { text: prompt }
            ]
          }
        ]
      });

      let resultText = response.text || '';
      resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
      
      let parsed: any;
      try {
        parsed = JSON.parse(resultText);
      } catch (parseError) {
        // Extract JSON using regex if extra text is present
        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Invalid JSON received from OCR vision parser.');
        }
      }

      // Normalize fields
      if (!parsed.merchant && parsed.vendor) parsed.merchant = parsed.vendor;
      if (!parsed.vendor && parsed.merchant) parsed.vendor = parsed.merchant;
      if (typeof parsed.amount === 'string') {
        parsed.amount = parseFloat(parsed.amount.replace(/[^0-9.]/g, '')) || 0;
      }

      res.json(parsed);
    } catch (error: any) {
      console.error('Error parsing receipt:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to extract data from receipt image.',
        fallback: {
          merchant: 'Scanned Vendor',
          date: new Date().toISOString().split('T')[0],
          amount: 0,
          purpose: 'Receipt scanned'
        }
      });
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
