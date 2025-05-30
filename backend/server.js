const express = require('express');
const axios = require('axios');
const fs = require('fs').promises; // Use promise-based fs
const path = require('path');
const app = express();
const port = process.env.PORT || 3001;

const mockDataPath = path.join(__dirname, 'mockUserData.json');

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

const dateFns = require('date-fns');

let testStructures = {}; // To hold loaded test structures
fs.readFile(path.join(__dirname, 'testStructures.json'), 'utf8')
  .then(data => {
    testStructures = JSON.parse(data);
    console.log("Test structures loaded successfully.");
  })
  .catch(err => {
    console.error("Failed to load testStructures.json:", err);
    testStructures = { // Basic fallback if file load fails
        "SAT": { "Math": { "subTopics": {"Algebra": {"weight": 100, "typicalQuestions": 20}}}},
        "ACT": { "Math": { "subTopics": {"Algebra": {"weight": 100, "typicalQuestions": 20}}}}
    };
  });

// Helper function for optimal task assignment (can be moved outside if preferred)
function getOptimalTaskAssignment(subTopicPerformance, currentTestStructure, userPreferences, existingTasksOnDay = [], dailyCap, currentQsOnDay) {
    const allSubTopics = [];
    Object.keys(currentTestStructure).forEach(mainTopic => {
        if (currentTestStructure[mainTopic] && currentTestStructure[mainTopic].subTopics) {
            Object.keys(currentTestStructure[mainTopic].subTopics).forEach(subTopic => {
                allSubTopics.push({
                    mainTopic, subTopic,
                    perf: subTopicPerformance[`${mainTopic}_${subTopic}`]?.avg || 0, // 0 if never practiced
                    weight: currentTestStructure[mainTopic].subTopics[subTopic].weight || 50, // Default weight
                    typicalQuestions: currentTestStructure[mainTopic].subTopics[subTopic].typicalQuestions || 10
                });
            });
        }
    });

    // Sort by performance (lower is worse) then by weight (higher is more important)
    // Simple heuristic: prioritize weaker areas, then more important ones.
    allSubTopics.sort((a, b) => (a.perf - b.perf) || (b.weight - a.weight));

    for (const st of allSubTopics) {
        // Avoid assigning same subTopic multiple times on the same day if many options exist
        if (existingTasksOnDay.some(task => task.topic === st.mainTopic && task.subTopic === st.subTopic) && allSubTopics.length > existingTasksOnDay.length) {
            // If we have other subtopics to choose from, skip this one to ensure variety for the day
            // This check is basic, could be improved (e.g. if only a few subtopics exist for the whole test)
            if (Math.random() < 0.5) continue; // 50% chance to skip if already assigned today & other options exist
        }

        const taskType = Math.random() < 0.25 ? 'ai_tutor_learn' : 'practice';
        let taskLength = 10;
        if (userPreferences.preferredSectionLengths && userPreferences.preferredSectionLengths.length > 0) {
            taskLength = userPreferences.preferredSectionLengths[Math.floor(Math.random() * userPreferences.preferredSectionLengths.length)];
        }
        
        taskLength = Math.min(taskLength, st.typicalQuestions, dailyCap - (currentQsOnDay || 0) );
        if (taskLength < 5 && taskType === 'practice') taskLength = Math.min(5, st.typicalQuestions);
        if (taskLength < 3 && taskType === 'ai_tutor_learn') taskLength = Math.min(3, st.typicalQuestions);


        if (taskLength > 0 && (dailyCap - (currentQsOnDay || 0) >= taskLength)) {
            return {
                type: taskType,
                topic: st.mainTopic,
                subTopic: st.subTopic,
                length: taskLength,
                description: `${st.mainTopic} - ${st.subTopic} - ${taskLength} Qs (${taskType})`,
            };
        }
    }
    return null; // No suitable task found
}


// --- AI Calendar Plan Endpoint (Overhauled for Adaptive Logic) ---
app.get('/api/ai-calendar-plan', async (req, res) => {
  try {
    const userDataString = await fs.readFile(mockDataPath, 'utf8');
    const userData = JSON.parse(userDataString);

    let userData = JSON.parse(userDataString); // Use let as userData might be modified
    const { testDetails, pastScores, practiceHistory, userPreferences, name, generatedPlan: existingPlan } = userData;
    
    const today = new Date();
    const todayISO = formatDateISO(today);

    // --- Date Utilities ---
    const getDaysBetween = (date1, date2) => dateFns.differenceInCalendarDays(dateFns.startOfDay(date2), dateFns.startOfDay(date1));
    const addDaysToDate = (date, days) => dateFns.addDays(dateFns.startOfDay(date), days);
    const getDayOfWeekName = (date) => dateFns.format(date, 'EEEE');
    const formatDateISO = (date) => dateFns.formatISO(date, { representation: 'date' });

    let planStartDate = dateFns.startOfDay(today);
    let daysToPlanFor = 30;
    let daysUntilTest = Infinity;
    let testDateObj = null;

    if (testDetails.testDate) {
      testDateObj = dateFns.parseISO(testDetails.testDate);
      if (dateFns.isValid(testDateObj) && dateFns.isFuture(testDateObj)) {
        daysUntilTest = getDaysBetween(today, testDateObj);
        daysToPlanFor = Math.min(daysUntilTest + 1, 90); // Plan up to test date, or max 90 days
      } else {
        console.log("Test date is in the past or invalid, generating a default 30-day plan from today.");
        testDetails.testDate = null; // Nullify invalid/past test date for planning
      }
    }
    
    const currentTestStructure = testStructures[testDetails.testType] || testStructures["SAT"]; // Default

    // Performance Analysis
    const subTopicPerformance = {};
    practiceHistory.forEach(item => {
        const key = `${item.topic}_${item.subTopic}`;
        if (!subTopicPerformance[key]) subTopicPerformance[key] = { totalScore: 0, count: 0, totalTime: 0 };
        subTopicPerformance[key].totalScore += item.scorePercent;
        subTopicPerformance[key].count += 1;
        subTopicPerformance[key].totalTime += item.timeSpentSeconds || 0;
    });
    for (const key in subTopicPerformance) {
        subTopicPerformance[key].avg = subTopicPerformance[key].count > 0 ? subTopicPerformance[key].totalScore / subTopicPerformance[key].count : 0;
    }

    // Determine if we need to generate a new plan or adapt an existing one
    let newGeneratedPlanStructure = {
        startDate: formatDateISO(planStartDate),
        endDate: formatDateISO(addDaysToDate(planStartDate, daysToPlanFor - 1)),
        dailyTasks: []
    };

    const planIsStale = !existingPlan || !existingPlan.endDate || dateFns.isPast(dateFns.parseISO(existingPlan.endDate)) || existingPlan.dailyTasks.length === 0;

    if (planIsStale || (!testDetails.testDate || practiceHistory.length < 3 )) { // Regenerate if stale or no-data
        console.log(`User ${name}: Generating new calendar plan (stale: ${planIsStale}, no-data: ${!testDetails.testDate || practiceHistory.length < 3}).`);
        // Full plan generation logic (adapted from Step 4, using getOptimalTaskAssignment)
        const dailyQuestionCapBase = userPreferences.dailyStudyTimeMinutesAvg && userPreferences.dailyStudyTimeMinutesAvg > 45 ? 35 : 25;
        
        for (let i = 0; i < daysToPlanFor; i++) {
            const currentDate = addDaysToDate(planStartDate, i);
            const currentDateISO = formatDateISO(currentDate);
            const dayOfWeek = getDayOfWeekName(currentDate);
            const isWeekend = dayOfWeek === 'Saturday' || dayOfWeek === 'Sunday';
            const dailySchedule = { date: currentDateISO, dayName: dayOfWeek, tasks: [] };
            let questionsToday = 0;
            
            const daysRemaining = testDateObj ? getDaysBetween(currentDate, testDateObj) : Infinity;
            let rampUpFactor = 1.0;
            if (daysRemaining < 30) rampUpFactor = 1.25;
            if (daysRemaining < 14) rampUpFactor = 1.5;
            let dailyQuestionCap = Math.floor((isWeekend ? dailyQuestionCapBase * 1.5 : dailyQuestionCapBase) * rampUpFactor);
            if (daysRemaining <= 1) dailyQuestionCap = 0;

            // Simplified Full Test Scheduling
            if (isWeekend && i > 0 && (i % 20 === 0 || daysRemaining < 7) && questionsToday < dailyQuestionCap && testDetails.testType) {
                 const testTaskType = `${testDetails.testType} Full Test`;
                 const typicalQs = testDetails.testType === "SAT" ? 154 : 215;
                 if (dailyQuestionCap - questionsToday >= typicalQs/2) { // Only schedule if significant capacity
                    dailySchedule.tasks.push({
                        taskId: `fulltest_${currentDateISO}_${Date.now()}`, type: 'full_test', description: testTaskType,
                        topic: testDetails.testType, subTopic: "Full", length: typicalQs, status: 'pending'
                    });
                    questionsToday += typicalQs;
                 }
            }

            let tasksAddedToday = 0;
            const MAX_DISTINCT_TASKS = 3;
            while(questionsToday < dailyQuestionCap && tasksAddedToday < MAX_DISTINCT_TASKS) {
                const newTask = getOptimalTaskAssignment(subTopicPerformance, currentTestStructure, userPreferences, dailySchedule.tasks, dailyQuestionCap, questionsToday);
                if (newTask) {
                    dailySchedule.tasks.push({ ...newTask, taskId: `task_${currentDateISO}_${tasksAddedToday}_${Date.now()}`, status: 'pending' });
                    questionsToday += newTask.length;
                    tasksAddedToday++;
                } else {
                    break; // No more suitable tasks
                }
            }
            newGeneratedPlanStructure.dailyTasks.push(dailySchedule);
        }
        userData.generatedPlan = newGeneratedPlanStructure;
    } else {
        // Adapt existing plan
        console.log(`User ${name}: Adapting existing calendar plan.`);
        existingPlan.dailyTasks.forEach(daySchedule => {
            if (dateFns.isPast(dateFns.parseISO(daySchedule.date)) && !dateFns.isToday(dateFns.parseISO(daySchedule.date))) return; // Skip past days

            let questionsOnThisDay = 0;
            daySchedule.tasks.forEach(task => questionsOnThisDay += (task.length || 0));

            daySchedule.tasks = daySchedule.tasks.map(task => {
                if (task.status === 'pending' && (task.type === 'practice' || task.type === 'ai_tutor_learn')) {
                    const adaptedTaskDetails = getOptimalTaskAssignment(
                        subTopicPerformance, 
                        currentTestStructure, 
                        userPreferences,
                        daySchedule.tasks.filter(t => t.taskId !== task.taskId), // Pass other tasks on the same day for variety check
                        Infinity, // For adaptation, don't strictly cap by original daily cap, but by task's own original length
                        questionsOnThisDay - (task.length || 0) // Available capacity if this task was removed
                    );
                    if (adaptedTaskDetails) {
                        // Preserve original length, type, taskId, status. Update topic, subTopic, description.
                        return {
                            ...task,
                            topic: adaptedTaskDetails.topic,
                            subTopic: adaptedTaskDetails.subTopic,
                            description: `${adaptedTaskDetails.topic} - ${adaptedTaskDetails.subTopic} - ${task.length} Qs (${task.type})` // Keep original length
                        };
                    }
                }
                return task;
            });
        });
        // Ensure startDate and endDate of the existing plan are still relevant or update them
        existingPlan.startDate = formatDateISO(dateFns.parseISO(existingPlan.dailyTasks[0].date));
        existingPlan.endDate = formatDateISO(dateFns.parseISO(existingPlan.dailyTasks[existingPlan.dailyTasks.length - 1].date));
        userData.generatedPlan = existingPlan; // The plan is modified in place
    }
    
    await fs.writeFile(mockDataPath, JSON.stringify(userData, null, 2), 'utf8');
    res.json(userData.generatedPlan);

  } catch (error) {
    console.error("Error generating AI calendar plan:", error);
    if (error.code === 'ENOENT' && error.path === mockDataPath) {
        return res.status(404).json({ error: true, message: "User data file not found." });
    } else if (error.path === path.join(__dirname, 'testStructures.json')) {
        return res.status(500).json({ error: true, message: "Test structure configuration file not found or unreadable." });
    }
    res.status(500).json({ error: true, message: "Failed to generate AI calendar plan.", details: error.message });
  }
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
  
  const updatedSystemPrompt = `You are a friendly, patient, and encouraging AI Tutor specializing in SAT and ACT preparation. Your goal is to help students deeply understand concepts, effectively break down difficult problems step-by-step, and offer clear, actionable explanations.

You are knowledgeable in all subject areas of the SAT and ACT. Beyond specific academic topics, you can also provide guidance on:
- Test-taking strategies (e.g., process of elimination, when to guess, managing anxiety).
- Time management techniques for each section of the tests.
- Effective use of approved calculators (like the TI-84 series for graphing, matrix operations, etc., relevant to specific problem types).
- Study skills and how to approach learning challenging material.

When a student asks for help, try to understand their specific difficulty. If they ask about a broad topic like 'time management,' you might offer some general strategies and then ask them if they want to focus on a particular section or problem type. If they mention a specific problem, guide them through it rather than just giving the answer. Be interactive and ask clarifying questions to ensure they are following along. Keep your responses concise and focused on the student's query unless asked for more detail.`;

  const messagesPayload = [
    { role: "system", content: updatedSystemPrompt },
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

// --- Update Calendar Task Day Endpoint ---
app.post('/api/update-calendar-task-day', async (req, res) => {
  const { taskId, originalDate, newDate } = req.body;

  if (!taskId || !originalDate || !newDate) {
    return res.status(400).json({ error: true, message: 'Missing required parameters: taskId, originalDate, newDate.' });
  }

  try {
    const userDataString = await fs.readFile(mockDataPath, 'utf8');
    let userData = JSON.parse(userDataString);

    if (!userData.generatedPlan || !Array.isArray(userData.generatedPlan.dailyTasks)) {
      return res.status(404).json({ error: true, message: 'Generated plan not found or is not in the correct format.' });
    }

    let taskFound = false;
    let taskToMove = null;

    // Find and remove task from original date
    userData.generatedPlan.dailyTasks = userData.generatedPlan.dailyTasks.map(daySchedule => {
      if (daySchedule.date === originalDate) {
        const taskIndex = daySchedule.tasks.findIndex(task => task.taskId === taskId);
        if (taskIndex > -1) {
          taskToMove = daySchedule.tasks[taskIndex];
          daySchedule.tasks.splice(taskIndex, 1);
          taskFound = true;
        }
      }
      return daySchedule;
    });

    if (!taskFound || !taskToMove) {
      return res.status(404).json({ error: true, message: `Task with ID ${taskId} not found on date ${originalDate}.` });
    }
    
    // Add task to new date
    // Update task's internal date property if it has one (not strictly in current model, but good practice)
    // taskToMove.date = newDate; // If your task object itself stores its date

    let newDaySchedule = userData.generatedPlan.dailyTasks.find(ds => ds.date === newDate);
    if (newDaySchedule) {
      newDaySchedule.tasks.push(taskToMove);
    } else {
      // Create new day schedule if it doesn't exist
      // Need to determine dayName if not passed or stored in task
      const newDateObj = dateFns.parseISO(newDate);
      const dayName = dateFns.format(newDateObj, 'EEEE');
      userData.generatedPlan.dailyTasks.push({
        date: newDate,
        dayName: dayName, 
        tasks: [taskToMove]
      });
      // Sort dailyTasks by date to maintain order if a new day was added out of sequence
      userData.generatedPlan.dailyTasks.sort((a, b) => dateFns.compareAsc(dateFns.parseISO(a.date), dateFns.parseISO(b.date)));
    }
    
    // Clean up: remove originalDate entry if it has no tasks left (optional)
    // userData.generatedPlan.dailyTasks = userData.generatedPlan.dailyTasks.filter(ds => ds.date !== originalDate || ds.tasks.length > 0);


    await fs.writeFile(mockDataPath, JSON.stringify(userData, null, 2), 'utf8');
    res.json({ success: true, message: "Task rescheduled successfully.", updatedPlan: userData.generatedPlan }); // Send back updated plan

  } catch (error) {
    console.error("Error updating calendar task day:", error);
    if (error.code === 'ENOENT') {
        return res.status(404).json({ error: true, message: "User data file not found." });
    }
    res.status(500).json({ error: true, message: "Error updating task day.", details: error.message });
  }
});


// --- Profile Data Endpoints ---
// GET /api/get-profile-data
app.get('/api/get-profile-data', async (req, res) => {
  try {
    const data = await fs.readFile(mockDataPath, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error("Error reading profile data:", error);
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: true, message: "Profile data not found." });
    }
    res.status(500).json({ error: true, message: "Error reading profile data." });
  }
});

// POST /api/save-profile-data
app.post('/api/save-profile-data', async (req, res) => {
  const newProfileData = req.body;

  // Basic validation (can be more extensive)
  if (!newProfileData || !newProfileData.name || !newProfileData.testDetails) {
    return res.status(400).json({ error: true, message: "Invalid profile data structure." });
  }

  try {
    await fs.writeFile(mockDataPath, JSON.stringify(newProfileData, null, 2), 'utf8');
    res.json({ message: "Profile saved successfully." });
  } catch (error) {
    console.error("Error saving profile data:", error);
    res.status(500).json({ error: true, message: "Error saving profile data." });
  }
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
