import { ChatGroq } from "@langchain/groq";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import fs from "fs";
import path from "path";
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import sqlite3 from 'sqlite3';
dotenv.config();

// Ensure you have set the GROQ_API_KEY environment variable
const model = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: "llama-3.1-70b-versatile",
  temperature: 0.7
});

// Initialize SQLite database
const db = new sqlite3.Database('exams.db');

db.serialize(() => {
  // Create a table for storing embeddings and PDF metadata
  db.run(`CREATE TABLE IF NOT EXISTS embeddings (
    id TEXT PRIMARY KEY,
    embedding_values TEXT,
    fileName TEXT UNIQUE,  --Ensure filenames are unique
    pageNumber INTEGER,
    text TEXT,
    pdf BLOB,
    instructorName TEXT,
    academicYear TEXT,
    courseName TEXT,
    courseCode TEXT,
    schoolName TEXT
  )`);
});

// Function to extract fields from text using regex or model
async function extractFieldsFromText(text) {
  const prompt = `Extract the following fields from the text:
  - Instructor Name
  - Academic Year
  - Course Name
  - Course Code
  - School Name
  
  Text: ${text}`;

  const response = await model.invoke(prompt);
  const extractedData = response.content;

  // Parse the extracted data into respective fields
  const instructorName = extractedData.match(/Instructor Name:\s*(.*)/)?.[1]?.trim() || "Unknown";
  const academicYear = extractedData.match(/Academic Year:\s*(.*)/)?.[1]?.trim() || "Unknown";
  const courseName = extractedData.match(/Course Name:\s*(.*)/)?.[1]?.trim() || "Unknown";
  const courseCode = extractedData.match(/Course Code:\s*(.*)/)?.[1]?.trim() || "Unknown";
  const schoolName = extractedData.match(/School Name:\s*(.*)/)?.[1]?.trim() || "Unknown";

  return { instructorName, academicYear, courseName, courseCode, schoolName };
}

async function generateEmbeddingForDocument(doc) {
  const prompt = `You are an embedding generator. Generate a detailed embedding for the text:\n\n${doc.pageContent} to capture its meaning. The output should be comma-separated numerical values only.`;

  const embeddingResponse = await model.invoke(prompt);
  const embeddings = embeddingResponse.content.split(", ").map(Number);
  return embeddings;
}

async function loadPDFsFromFolder(folderPath) {
  const docs = [];
  const files = fs.readdirSync(folderPath);

  for (const file of files) {
    if (path.extname(file).toLowerCase() === '.pdf') {
      const loader = new PDFLoader(path.join(folderPath, file));
      const fileDocs = await loader.load();
      docs.push(...fileDocs);
    }
  }

  return docs;
}

function sanitizeFileName(fileName) {
  return fileName.replace(/[\/\\?%*:|"<>]/g, '_'); // Replace invalid characters with '_'
}

async function main() {
  // Load PDFs from a folder
  const folderPath = "./pepal";
  const docs = await loadPDFsFromFolder(folderPath);

  console.log(`Loaded ${docs.length} documents`);

  // Process each document to generate embeddings and upsert to SQLite
  for (const doc of docs) {
    const embedding = await generateEmbeddingForDocument(doc);
    const fields = await extractFieldsFromText(doc.pageContent);  // Extract additional fields

    if (embedding.length > 0 && embedding.every(val => !isNaN(val))) {
      try {
        const sanitizedFileName = sanitizeFileName(doc.metadata.source.replace("pepal/", ""));
        console.log(`Sanitized File Name: ${sanitizedFileName}`); // Log sanitized file name

        const pdfBuffer = fs.readFileSync(path.join(folderPath, sanitizedFileName));

        const Obj = {
          id: uuidv4(),
          embedding_values: embedding.join(','),
          fileName: sanitizedFileName,
          pageNumber: doc.metadata.pageNumber,
          text: doc.pageContent,
          pdf: pdfBuffer,
          ...fields  // Store extracted fields
        };

        // Insert the data into the database, preventing redundant filenames with UNIQUE constraint
        const insertQuery = `INSERT OR IGNORE INTO embeddings (id, embedding_values, fileName, pageNumber, text, pdf, instructorName, academicYear, courseName, courseCode, schoolName) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        console.log(`Executing Query: ${insertQuery} with values:`, [Obj.id, Obj.embedding_values, Obj.fileName, Obj.pageNumber, Obj.text, Obj.pdf.length, Obj.instructorName, Obj.academicYear, Obj.courseName, Obj.courseCode, Obj.schoolName]);

        db.run(insertQuery, 
          [Obj.id, Obj.embedding_values, Obj.fileName, Obj.pageNumber, Obj.text, Obj.pdf, Obj.instructorName, Obj.academicYear, Obj.courseName, Obj.courseCode, Obj.schoolName], 
          function(err) {
            if (err) {
              console.error(`Error inserting vector for ${Obj.fileName}:`, err);
            } else if (this.changes > 0) {
              console.log(`Inserted vectors and metadata for ${Obj.fileName}`);
            } else {
              console.log(`File ${Obj.fileName} already exists in the database`);
            }
          });
      } catch (error) {
        console.error(`Error upserting vectors for ${doc.metadata.fileName}:`, error);
      }
    } else {
      console.error(`No valid embedding for ${doc.metadata.fileName}`);
    }
  }

  // Close the database connection
  db.close();
}

main().catch(console.error);
