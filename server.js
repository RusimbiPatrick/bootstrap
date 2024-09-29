import express from "express";
import cors from "cors";
import sqlite3 from "sqlite3";
import { config as configDotenv } from "dotenv";
import twilio from "twilio";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { ChatGroq } from "@langchain/groq";

// Load environment variables
configDotenv();

const model = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: "llama-3.1-70b-versatile",
  temperature: 0,
});

// For ES Module __dirname and __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Twilio configuration
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const app = express();
app.use(cors());
app.use(express.json()); // Enable JSON body parsing

// Create a directory to store PDFs temporarily
const pdfDirectory = path.join(__dirname, "pdfs");
if (!fs.existsSync(pdfDirectory)) {
  fs.mkdirSync(pdfDirectory);
}

// Create database connection
const db = new sqlite3.Database("exams.db", (err) => {
  if (err) {
    console.error("Error opening database: " + err.message);
  } else {
    console.log("Connected to the SQLite database.");
  }
});

// Route to serve PDFs
app.get("/pdf/:fileName", (req, res) => {
  const fileName = req.params.fileName;
  const filePath = path.join(pdfDirectory, fileName);

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error("Error sending file: ", err);
        res.status(500).json({ error: "Error sending the PDF file." });
      } else {
        // File sent successfully, delete it
        fs.unlink(filePath, (err) => {
          if (err) {
            console.error("Error deleting PDF file: ", err);
          } else {
            console.log(`PDF file ${fileName} deleted from server.`);
          }
        });
      }
    });
  } else {
    res.status(404).json({ error: "File not found." });
  }
});

// Route to send PDF via WhatsApp based on user prompt
app.post("/api/send-pdf-whatsapp", async (req, res) => {
  const { prompt, to } = req.body; // Get prompt and recipient WhatsApp number

  // Construct the prompt for LLaMA to generate a SQL query
  const queryPrompt = `
    You are an AI that generates SQL queries. Based on the following table (embeddings) structure:
    - id TEXT PRIMARY KEY
    - fileName TEXT UNIQUE
    - pageNumber INTEGER
    - instructorName TEXT
    - academicYear TEXT
    - courseName TEXT
    - courseCode TEXT
    - schoolName TEXT
    
    Generate a SQL query to retrieve all columns of a perticular paper based on this prompt: "${prompt}"
  `;

  // Generate SQL query using LLaMA model
  let sqlQuery;
  try {
    const resp = await model.invoke(queryPrompt);
    
    // Use regex to extract the first SQL query
    const regex = /```sql\n(.*?)\n```/gs; // 's' flag allows . to match newlines
    const match = resp.content.match(regex);
    
    if (match) {
      sqlQuery = match[0].replace(/```sql\n|```/g, "").trim(); // Remove the backticks and 'sql'
      console.log("Generated SQL Query: ", sqlQuery);
    } else {
      return res.status(400).json({ error: "No SQL query generated." });
    }
  } catch (e) {
    console.error("Error generating SQL query: ", e);
    return res.status(500).json({ error: "Error generating SQL query." });
  }

  // Query the database for the specific entry using the generated SQL
  db.get(sqlQuery, [], async (err, row) => {
    if (err) {
      console.error("Error executing SQL query: ", err);
      return res.status(500).json({ error: "Error retrieving the PDF." });
    }

    if (!row) {
      return res.status(404).json({ error: "PDF not found." });
    }
    // Write the PDF buffer to the temporary file
    const pdfBuffer = Buffer.from(row.pdf);
    const originalFileName = row.fileName || `file-${row.id}.pdf`;
    const sanitizedFileName = originalFileName.replace(/[\/\\?%*:|"<>]/g, "_");
    const filePath = path.join(pdfDirectory, sanitizedFileName);

    fs.writeFile(filePath, pdfBuffer, async (err) => {
      if (err) {
        console.error("Error writing PDF file: ", err);
        return res.status(500).json({ error: "Error saving PDF file." });
      }

      // Generate URL for the file hosted on the Express server
      const fileUrl = `https://6e22-2c0f-eb68-638-4c00-e523-524b-dcfc-cfe3.ngrok-free.app/pdf/${encodeURIComponent(sanitizedFileName)}`;


      try {
        // Send the PDF via WhatsApp using the file URL
        const message = await client.messages.create({
          from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
          to: `whatsapp:${to}`, // Recipient's WhatsApp number
          body: `Here is your PDF: ${sanitizedFileName}`,
          mediaUrl: [fileUrl], // URL to the hosted PDF
        });

        console.log("WhatsApp message sent: ", message.sid);
        res.status(200).json({ success: true, message: "PDF sent via WhatsApp" });
      } catch (e) {
        console.error("Error sending WhatsApp message: ", e);
        res.status(500).json({ error: "Error sending PDF via WhatsApp" });

        // Since sending failed, delete the file now
        fs.unlink(filePath, (err) => {
          if (err) {
            console.error("Error deleting PDF file after failed send: ", err);
          } else {
            console.log(`PDF file ${sanitizedFileName} deleted from server after failed send.`);
          }
        });
      }
    });
  });
});

// Start server
app.listen(5000, () => {
  console.log("Server started on port 5000");
});
