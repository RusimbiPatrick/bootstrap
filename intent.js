import { ChatGroq } from "@langchain/groq";
import pkg from 'sqlite3';
const { Database } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// Initialize SQLite database
const db = new Database('vectors.db', (err) => {
  if (err) {
    console.error("Error connecting to the database:", err.message);
  } else {
    console.log("Connected to the SQLite database.");
  }
});

// Initialize Groq for intent recognition
const model = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: "llama-3.1-70b-versatile",
  temperature: 0.7
});

async function determineIntent(userInput) {
  const prompt = `Return the intent of the following user input: ${userInput}. Identify whether it is Get_paper_summary, Get_past_paper, Greeting, or Get_academic_advice_based_on_past_papers. Provide a concise response.`;
  const response = await model.invoke(prompt);
  return response.content.trim(); // Clean response
}

async function semanticSearch(query) {
  // Use the embedding_values for semantic search
  const semanticPrompt = `Find relevant embeddings for the following query: "${query}"`;
  const semanticResponse = await model.invoke(semanticPrompt);
  return semanticResponse.content; // Assuming the response includes relevant details
}

async function getSummary(userInput) {
  const instructorName = userInput.Instructor;

  // Perform a semantic search to find relevant embeddings
  const relevantEmbeddings = await semanticSearch(instructorName);
  
  const query = `SELECT text FROM embeddings WHERE embedding_values LIKE ?`;
  db.all(query, [`%${relevantEmbeddings}%`], (err, rows) => {
    if (err) {
      console.error(err);
    } else {
      let summaryText = "";
      rows.forEach(row => {
        summaryText += row.text + " "; // Concatenate relevant texts
      });
      return summaryText || "No relevant summary found.";
    }
  });
}

async function getPastPaper(userInput) {
  const instructorName = userInput.Instructor;

  // Perform a semantic search to find relevant embeddings
  const relevantEmbeddings = await semanticSearch(instructorName);
  
  const query = `SELECT pdf FROM embeddings WHERE embedding_values LIKE ?`;
  db.all(query, [`%${relevantEmbeddings}%`], (err, rows) => {
    if (err) {
      console.error(err);
    } else {
      if (rows.length > 0) {
        return rows[0].pdf; // Return the first PDF found
      } else {
        return "No past paper found.";
      }
    }
  });
}

function greetingResponse() {
  return "Hello! I'm here to help you with past papers and summaries. How can I assist you?";
}

// Main function to run the bot
async function main() {
  const userInput = 'exam by vivien'; // Replace with actual input
  const summaryResponse = await getSummary(userInput);
  console.log("Summary Response:", summaryResponse);
  
  const pastPaperResponse = await getPastPaper(userInput);
  console.log("Past Paper Response:", pastPaperResponse);
}

main().catch(console.error).finally(() => {
  db.close((err) => {
    if (err) {
      console.error("Error closing the database connection:", err.message);
    } else {
      console.log("Closed the database connection.");
    }
  });
});
