const express = require('express');
const axios = require('axios'); // Import axios
const app = express();
const port = process.env.PORT || 3001;

// IMPORTANT: For real question generation, set the DEEPSEEK_API_KEY environment variable.
// e.g., export DEEPSEEK_API_KEY="your_actual_api_key"

// Middleware to parse JSON bodies
app.use(express.json());

// --- AI Questions Function using DeepSeek API ---
const getAIQuestions = async (params) => {
  console.log("Attempting to generate questions with params:", params);
  
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.error("DeepSeek API key (DEEPSEEK_API_KEY) is not configured on the server.");
    // For development, return hardcoded questions if API key is missing
    // return { error: true, message: "DeepSeek API key is not configured on the server. Please set DEEPSEEK_API_KEY environment variable." };
    console.log("DEEPSEEK_API_KEY not found. Using hardcoded questions for development as fallback.");
    const fallbackQuestions = [
        { question_id: "fallback_q1", question_text: "Fallback: Solve 2x+3=7", options: ["x=1", "x=2", "x=3", "x=4"], correct_answer: "x=2", explanation: "2x = 4, so x = 2" },
        { question_id: "fallback_q2", question_text: "Fallback: What is the capital of France?", options: ["Berlin", "Madrid", "Paris", "Rome"], correct_answer: "Paris", explanation: "Paris is the capital of France." }
    ];
    return fallbackQuestions.slice(0, params.numQuestions || fallbackQuestions.length);
  }

  const apiUrl = 'https://api.deepseek.com/chat/completions';
  const promptString = `Generate ${params.numQuestions} questions for an ${params.topic} test, focusing on ${params.subTopic}. Return the output as a VALID JSON array where each element is an object with the following keys: 'question_text' (string), 'options' (array of 4 strings), 'correct_answer' (string - one of the options), 'explanation' (string), and optionally 'visual_assets'. If 'visual_assets' is used, it must be an object with 'type' (string, either 'latex' or 'svg') and 'data' (string, the LaTeX or SVG code). Ensure no extra text or markdown formatting outside the JSON array. The entire response should be only the JSON array itself.`;

  const requestBody = {
    model: "deepseek-chat", // Or "deepseek-coder" if more appropriate for structured output
    messages: [
      { role: "system", content: "You are an expert test question writer. You generate questions in a precise JSON format as instructed. Do not include any markdown formatting like ```json or ``` around the JSON output." },
      { role: "user", content: promptString }
    ],
    temperature: 0.7, 
    max_tokens: 2048, // Adjust based on expected number of questions and complexity
    // stream: false, // Ensure not streaming for this use case
  };

  try {
    console.log("Sending request to DeepSeek API...");
    const response = await axios.post(apiUrl, requestBody, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    let responseContent = response.data.choices[0].message.content;
    console.log("Raw response from DeepSeek:", responseContent);

    // Sometimes the API might still wrap the JSON in markdown, try to remove it.
    responseContent = responseContent.replace(/^```json\s*|\s*```$/g, '').trim();

    try {
      const questions = JSON.parse(responseContent);
      // Basic validation of the parsed structure
      if (!Array.isArray(questions) || questions.some(q => !q.question_text || !q.options || !q.correct_answer || !q.explanation)) {
        console.error("Parsed JSON from DeepSeek does not match expected structure.", questions);
        return { error: true, message: "AI response was valid JSON but did not match the expected question structure.", details: "Ensure questions have text, options, answer, and explanation." };
      }
      return questions;
    } catch (parseError) {
      console.error("Failed to parse JSON response from DeepSeek:", parseError);
      console.error("Non-JSON response content was:", responseContent); // Log the problematic content
      return { error: true, message: "Failed to parse AI response. Output was not valid JSON.", details: parseError.message, rawOutput: responseContent };
    }

  } catch (apiError) {
    console.error("Error calling DeepSeek API:", apiError.response ? apiError.response.data : apiError.message);
    let errorMessage = "Error calling DeepSeek API.";
    if (apiError.response && apiError.response.data && apiError.response.data.error && apiError.response.data.error.message) {
        errorMessage = `DeepSeek API Error: ${apiError.response.data.error.message}`;
    } else if (apiError.message) {
        errorMessage = apiError.message;
    }
    return { error: true, message: errorMessage, details: apiError.response ? apiError.response.data : null };
  }
};

// --- API Endpoint ---
app.post('/api/generate-questions', async (req, res) => { // Make endpoint async
  const { testType, topic, subTopic, numQuestions } = req.body;

  if (!topic || !subTopic || !numQuestions) {
    return res.status(400).json({ error: true, message: 'Missing required parameters: topic, subTopic, numQuestions' });
  }
  if (typeof numQuestions !== 'number' || numQuestions <= 0 || numQuestions > 10) { // Max 10 for safety/cost
      return res.status(400).json({ error: true, message: 'numQuestions must be a positive number, max 10.' });
  }


  const result = await getAIQuestions({ testType, topic, subTopic, numQuestions });

  if (result.error) {
    // Determine status code based on error type if desired, otherwise default to 500
    let statusCode = 500;
    if (result.message.includes("API key") || result.message.includes("configured")) {
        statusCode = 503; // Service Unavailable (key not configured)
    } else if (result.message.includes("parse") || result.message.includes("structure")) {
        statusCode = 502; // Bad Gateway (AI response malformed)
    }
    return res.status(statusCode).json(result);
  }

  if (result && result.length > 0) {
    res.json(result);
  } else if (result && result.length === 0) { // AI returned an empty array
    res.status(404).json({ error: true, message: 'AI generated no questions for the given criteria.' });
  } else { // Should be caught by result.error, but as a fallback
    res.status(500).json({ error: true, message: 'An unexpected issue occurred while generating questions.' });
  }
});

// --- AI Calendar Plan Endpoint ---
app.get('/api/ai-calendar-plan', (req, res) => {
  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const sampleTopics = [
    { topic: "Math", subTopic: "Algebra", num: 5 },
    { topic: "Reading", subTopic: "Main Idea", num: 3 }, // Reading might have fewer "questions" but more passages
    { topic: "Writing", subTopic: "Grammar Usage", num: 10 },
    { topic: "Math", subTopic: "Geometry", num: 7 },
    { topic: "Reading", subTopic: "Inference", num: 4 },
    { topic: "Writing", subTopic: "Punctuation", num: 12 },
    { topic: "Math", subTopic: "Statistics", num: 6 },
  ];

  const plan = daysOfWeek.map((day, dayIndex) => {
    const tasks = [];
    // Select two different tasks for each day
    const task1Index = (dayIndex * 2) % sampleTopics.length;
    const task2Index = (dayIndex * 2 + 1) % sampleTopics.length;
    
    const task1Details = sampleTopics[task1Index];
    tasks.push({
      id: `${day.toLowerCase()}_task1_${task1Details.topic.toLowerCase()}`,
      day: day,
      description: `${task1Details.topic} - ${task1Details.subTopic} - ${task1Details.num} Qs`,
      topic: task1Details.topic,
      subTopic: task1Details.subTopic,
      numQuestions: task1Details.num
    });

    const task2Details = sampleTopics[task2Index];
    // Ensure task 2 is different from task 1 if possible with small sample size
    if (task1Index !== task2Index || sampleTopics.length === 1) {
         tasks.push({
            id: `${day.toLowerCase()}_task2_${task2Details.topic.toLowerCase()}`,
            day: day,
            description: `${task2Details.topic} - ${task2Details.subTopic} - ${task2Details.num} Qs`,
            topic: task2Details.topic,
            subTopic: task2Details.subTopic,
            numQuestions: task2Details.num
        });
    } else { // If only two unique tasks and dayIndex makes them same, pick next one
        const alternativeTaskIndex = (task2Index + 1) % sampleTopics.length;
        const alternativeTaskDetails = sampleTopics[alternativeTaskIndex];
        tasks.push({
            id: `${day.toLowerCase()}_task2_${alternativeTaskDetails.topic.toLowerCase()}`,
            day: day,
            description: `${alternativeTaskDetails.topic} - ${alternativeTaskDetails.subTopic} - ${alternativeTaskDetails.num} Qs`,
            topic: alternativeTaskDetails.topic,
            subTopic: alternativeTaskDetails.subTopic,
            numQuestions: alternativeTaskDetails.num
        });
    }


    return { day: day, tasks: tasks };
  });

  res.json({ plan });
});

// --- AI Tutor Chat Endpoint ---
app.post('/api/ai-tutor-chat', async (req, res) => {
  const { message: userMessage, history = [] } = req.body;

  if (!userMessage) {
    return res.status(400).json({ error: true, message: 'Message content is required.' });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.error("AI Tutor: DeepSeek API key (DEEPSEEK_API_KEY) is not configured.");
    return res.status(503).json({ error: true, message: "AI Tutor API key not configured." });
  }

  const apiUrl = 'https://api.deepseek.com/chat/completions';
  
  const messagesPayload = [
    { role: "system", content: "You are a friendly, patient, and encouraging AI Tutor specializing in SAT and ACT preparation. Help students understand concepts, break down difficult problems step-by-step, and offer clear explanations. Ask clarifying questions if needed. Keep your responses concise and focused on the student's query unless asked for more detail." },
    ...history, // Spread the provided history
    { role: "user", content: userMessage }
  ];
  
  const requestBody = {
    model: "deepseek-chat",
    messages: messagesPayload,
    temperature: 0.5, // Slightly lower temperature for more focused tutoring
    max_tokens: 1000, // Max response length
  };

  try {
    console.log("Sending request to DeepSeek API for AI Tutor chat...");
    const deepseekResponse = await axios.post(apiUrl, requestBody, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const aiMessageContent = deepseekResponse.data.choices[0].message.content;
    res.json({ response: aiMessageContent.trim() });

  } catch (apiError) {
    console.error("Error calling DeepSeek API for AI Tutor:", apiError.response ? apiError.response.data : apiError.message);
    let errorMessage = "Error communicating with AI Tutor service.";
    if (apiError.response && apiError.response.data && apiError.response.data.error && apiError.response.data.error.message) {
        errorMessage = `AI Tutor Error: ${apiError.response.data.error.message}`;
    } else if (apiError.message) {
        errorMessage = apiError.message;
    }
    // Determine appropriate status code
    const statusCode = apiError.response ? apiError.response.status : 500;
    res.status(statusCode).json({ error: true, message: errorMessage, details: apiError.response ? apiError.response.data : null });
  }
});


app.get('/', (req, res) => {
  res.send('Hello from the backend! API is available at /api/generate-questions (POST), /api/ai-calendar-plan (GET), and /api/ai-tutor-chat (POST).');
});

// --- AI Learn Topic Endpoint ---
app.post('/api/ai-learn-topic', async (req, res) => {
  const { testType, section, subTopic } = req.body;

  if (!testType || !section || !subTopic) {
    return res.status(400).json({ error: true, message: 'Missing required parameters: testType, section, subTopic.' });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.error("AI Learn: DeepSeek API key (DEEPSEEK_API_KEY) is not configured.");
    return res.status(503).json({ error: true, message: "AI learning module API key not configured." });
  }

  const apiUrl = 'https://api.deepseek.com/chat/completions';
  
  const systemPrompt = "You are an expert educator and curriculum designer. Your task is to generate a structured learning module for SAT/ACT preparation on a specific topic. The module should be comprehensive yet concise. Output ONLY the valid JSON object as specified, with no surrounding text or markdown formatting.";
  const userPrompt = `Generate a learning module for ${testType} - Section: ${section}, focusing on SubTopic: ${subTopic}.
The JSON object must have the following structure:
{
  "title": "Learning Module: [Generated Title for the SubTopic, e.g., Mastering Quadratic Equations]",
  "introduction": "Engaging introduction to the subtopic (2-4 sentences).",
  "key_concepts": [
    { "concept_name": "[Concept 1 Name]", "explanation": "Detailed but clear explanation of concept 1 (3-5 sentences).", "example": "A practical example or illustration of concept 1 (e.g., a solved math problem, a sentence structure example for writing)." },
    { "concept_name": "[Concept 2 Name]", "explanation": "Detailed but clear explanation of concept 2 (3-5 sentences).", "example": "A practical example or illustration of concept 2." },
    { "concept_name": "[Concept 3 Name]", "explanation": "Detailed but clear explanation of concept 3 (3-5 sentences).", "example": "A practical example or illustration of concept 3." }
  ],
  "practice_questions": [
    { "question_text": "[Question 1 text related to the concepts]", "options": ["Option A", "Option B", "Option C", "Option D"], "correct_answer": "[Correct Option Letter, e.g., A]", "explanation": "Brief explanation for this practice question (1-2 sentences)." },
    { "question_text": "[Question 2 text related to the concepts]", "options": ["Option A", "Option B", "Option C", "Option D"], "correct_answer": "[Correct Option Letter, e.g., B]", "explanation": "Brief explanation for this practice question (1-2 sentences)." }
  ],
  "summary": "Key takeaways summarized (2-3 concise bullet points or a short paragraph)."
}
Ensure the 'correct_answer' for practice_questions is just the letter or text of the correct option, matching one of the provided options.
Produce a JSON object and nothing else.`;

  const requestBody = {
    model: "deepseek-chat", 
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.6, // Slightly lower for more factual/structured content
    max_tokens: 3000, // Increased tokens for potentially longer modules
    // response_format: { type: "json_object" }, // If supported and reliable by DeepSeek for this model
  };

  try {
    console.log(`Sending request to DeepSeek API for AI Learn module: ${testType} - ${section} - ${subTopic}`);
    const deepseekResponse = await axios.post(apiUrl, requestBody, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    let responseContent = deepseekResponse.data.choices[0].message.content;
    console.log("Raw response from DeepSeek (AI Learn):", responseContent);
    responseContent = responseContent.replace(/^```json\s*|\s*```$/g, '').trim();

    try {
      const learningModule = JSON.parse(responseContent);
      // Basic structure validation
      if (!learningModule.title || !learningModule.introduction || !Array.isArray(learningModule.key_concepts) || 
          !Array.isArray(learningModule.practice_questions) || !learningModule.summary ||
          learningModule.key_concepts.some(c => !c.concept_name || !c.explanation || !c.example) ||
          learningModule.practice_questions.some(q => !q.question_text || !q.options || !q.correct_answer || !q.explanation)) {
        console.error("Parsed JSON from DeepSeek (AI Learn) does not match expected structure.");
        return res.status(502).json({ error: true, message: "AI response JSON structure is invalid for learning module." });
      }
      res.json(learningModule);
    } catch (parseError) {
      console.error("Failed to parse JSON response from DeepSeek (AI Learn):", parseError);
      return res.status(502).json({ error: true, message: "Failed to parse AI response as JSON for learning module.", details: parseError.message, rawOutput: responseContent });
    }

  } catch (apiError) {
    console.error("Error calling DeepSeek API for AI Learn:", apiError.response ? apiError.response.data : apiError.message);
    const statusCode = apiError.response ? apiError.response.status : 500;
    res.status(statusCode).json({ 
        error: true, 
        message: "Error communicating with AI learning service.", 
        details: apiError.response && apiError.response.data ? apiError.response.data.error : apiError.message 
    });
  }
});


app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});
