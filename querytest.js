import express from "express";
import cors from "cors";
import { ChatGroq } from "@langchain/groq";
import sqlite3 from "sqlite3";
import { configDotenv } from "dotenv";

// Load configuration
try {
  configDotenv();
} catch (e) {
  console.error("Error loading configuration:", e);
  process.exit(1);
}

// Create server
const app = express();
app.use(cors());
app.use(express.json()); // Enable JSON body parsing

// Create database connection
const db = new sqlite3.Database("exams.db", (err) => {
  if (err) {
    console.error("Error opening database: " + err.message);
  } else {
    console.log("Connected to the SQLite database.");
  }
});

// Create LLaMA model
const model = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: "llama-3.1-70b-versatile",
  temperature: 0,
});

// Route handler
app.post("/api/query", async (req, res) => {
  const prompt = req.body.prompt; // Get the prompt from the request body

  console.log("Prompt: " + prompt);

  let response = {
    result: [],
    error: "",
  };

  /**
   *       - id TEXT PRIMARY KEY
      - embedding_values TEXT
      - fileName TEXT UNIQUE
      - pageNumber INTEGER
      - text TEXT
      - pdf BLOB
      - instructorName TEXT
      - academicYear TEXT
      - courseName TEXT
      - courseCode TEXT
      - schoolName TEXT
   */
  try {
    // Construct the prompt for LLaMA to generate a SQL query
    const queryPrompt = `
      You are an AI that generates SQL queries. Based on the following table(embeddings) structure:
      - id TEXT PRIMARY KEY
      - fileName TEXT UNIQUE
      - pageNumber INTEGER
      - instructorName TEXT
      - academicYear TEXT
      - courseName TEXT
      - courseCode TEXT
      - schoolName TEXT
      
      Generate a SQL query to retrieve all past papers based on this prompt: "${prompt}"
    `;

    // Generate SQL query using LLaMA model
    const resp = await model.invoke(queryPrompt);

    // Use regex to extract the first SQL query
    const regex = /```sql\n(.*?)\n```/gs; // 's' flag allows . to match newlines
    const match = resp.content.match(regex);

    let sqlQuery = "";
    if (match) {
      sqlQuery = match[0].replace(/```sql\n|```/g, "").trim(); // Remove the backticks and 'sql'
      console.log("Generated SQL Query: ", sqlQuery);
    } else {
      console.log("No SQL query found.");
      response.error = "No SQL query generated.";
      return res.status(400).json(response);
    }

    // Execute the SQL query against the database
    db.all(sqlQuery, [], (err, rows) => {
      if (err) {
        console.error("Error executing SQL query: ", err);
        response.error = "Error executing SQL query.";
        return res.status(500).json(response);
      }

      // Return the rows as the result
      response.result = rows;

      res.status(200).json(rows[0]);
    });
  } catch (e) {
    console.error("Error: ", e);
    response.error = "Server error. Try again with a different prompt.";
    res.status(500).json(response);
  }
});

// Start server
app.listen(5000, () => {
  console.log("Server started on port 5000");
});