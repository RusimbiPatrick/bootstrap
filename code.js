import { ChatGroq } from "@langchain/groq";

import dotenv from 'dotenv';

dotenv.config();


// Initialize Groq for intent recognition
const model = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: "llama-3.1-70b-versatile",
  temperature: 1
});


async function handleUserInput(userInput) {
  const prompt = ` You are a code generator and analylitical thinker and sophisticated coder.${userInput}`;
  const response = await model.invoke(prompt);
  return response.content.trim(); // Clean response
}

// Main function to run the bot
async function main() {
  const userInput = `give this table   id TEXT PRIMARY KEY,
    embedding_values TEXT,
    fileName TEXT,
    pageNumber INTEGER,
    text TEXT,
    pdf BLOB. where text is the content of the  pdf which looks like "text: 'FacultyofInformationTechnology\n' +
        'FinalSemesterExam,2022/2023(1)\n' +
        'Course(Code)Name:...ProgrammingwithC...(INSY228)...................\n' +
        'Instructor:VivienNiyomugengaExamDuration:1.5hrs\n' +
        'Group :......Day........Date:.../12/2022\n' +
        '_____________________________________________________________________________\n' +
        'INSTRUCTIONS:\n' +
        '-Thisisapracticalexam.Answerallquestions\n' +
        '-Examisclosedbooksandnotes.Accesstointernetisalsoprohibited\n' +
        '-AnyformofcheatingispunishablebyAUCAacademicpolicy\n' +
        'Question:\n' +
        'WriteaCprogramthatmanagesteams’scoresintheongoingWorldCupinQatar.Ateamplays\n' +
        'manygames,andtheprogramrecordgameswiththefollowinginformation:Team(Country),\n' +
        'Dateofthegame,numberofgoalsscored,numberofgoalsconceded.Implementtheprogram\n' +
        'performingthefollowing:\n' +
        '-Useastructure“team”thatenablesrecordingtheaboveinformation./6marks\n' +
        '-Recordsdatafromusersandstoretheminafile,usingafunction./6marks\n' +
        '-Readsfromthefileanddisplaysallgamesusingafunction./6marks\n' +
        '-Displayteamsthathavescoredmoregoalsthantheonesconcededintotalnotpergame.\n' +
        '/6marks'", comple the following code based on the comments in the  following code import { ChatGroq } from "@langchain/groq";
import pkg from 'sqlite3';
const { Database } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// Initialize SQLite database
const db = new Database('vectors.db');

// Initialize Groq for intent recognition
const model = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: "llama-3.1-70b-versatile",
  temperature: 0.7
});

function extractCommand(inputString) {
  const commands = [
    'Get_paper_summary',
    'Get_past_paper',
    'Greeting',
    'Get_academic_advice_based_on_past_papers'
  ];
  const pattern = new RegExp(commands.join('|'), 'g');
  const matches = inputString.match(pattern);
  return matches ? matches.join(', ') : 'No valid command found.';
}

async function determineIntent(userInput) {
  const prompt = "Return the intent of the following user input:{userInput}. Identify whether it is Get_paper_summary, Get_past_paper, Greeting, or Get_academic_advice_based_on_past_papers. Provide a concise response.";
  const response = await model.invoke(prompt);
  return response.content.trim(); // Clean response
}

async function handleUserInput(userInput) {
  const intent = await determineIntent(userInput);
  switch (intent) {
    case 'Get_paper_summary':
      return await getSummary(userInput);
    case 'Get_past_paper':
      return await getPastPaper(userInput);
    case 'Greeting':
      return greetingResponse();
    default:
      return "I'm sorry, I didn't understand that.";
  }
}

async function getSummary(userInput) {
  //in my pastpapers lectures are dubbbed  instructors, and eexh exam in the thable has a year and program and alot of information. do AI magic and go through all papers stored there by a specific intructor and summarise them and say for exaple this teache likes to ask about this and that but the AI must be hooked to the db. using langchai and grok  and lamma70b  no Open Ai; I want the best of grok models. MAy other summarisation models can be used but they must be groq complient.
}

async function getPastPaper(userInput) {
//AI must be hooked on this database too.and it should identify which file is needed and then send the blob. from the database. use langchainn and g the the best of grok models for this 
}

function greetingResponse() {
  return "Hello! I'm here to help you with past papers and summaries. How can I assist you?";
}

// Main function to run the bot
async function main() {
  const userInput = "Hello how are you?"; // Replace with actual input
  const response = await handleUserInput(userInput);
  console.log(response);
}

main().catch(console.error); there is no field called instructor name and ther is no field called course name. the courname or lectures name may be mis spelled what are we going to do? will ai handle this or will i redesign the db? undefined irune d and got this error
[Error: SQLITE_ERROR: no such table: past_papers] {
  errno: 1,
  code: 'SQLITE_ERROR it is called embeddings anyways adress this consider implementing error handling to catch and handle any potential errors that may occur. For example, what if the database connection fails or if there is no data in the database matching the specified conditions?

This code also only extracts the course name and instructor name from the specified text string but does not account for other fields like the course code, semester, or academic year. Depending on your specific requirements, you might need to modify this code accordingly. 

A better approach to handle courses and instructors with potentially misspelled names might be to use some version of Levenshtein Distance algorithm to compute the similarity between two strings, as used in spell checkers.'
`; // Replace with actual input
  const response = await handleUserInput(userInput);
  console.log(response);
}

main().catch(console.error);
