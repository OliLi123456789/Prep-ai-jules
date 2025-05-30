const express = require('express');
const app = express();
const port = process.env.PORT || 3001;

// Middleware to parse JSON bodies
app.use(express.json());

// --- Hardcoded AI Questions Function ---
const getAIQuestions = (params) => {
  console.log("Attempting to generate questions with params:", params);
  // Simulate checking for API key
  if (!process.env.DEEPSEEK_API_KEY) {
    console.log("DEEPSEEK_API_KEY not found. Using hardcoded questions for development.");
  } else {
    console.log("DEEPSEEK_API_KEY found. (Simulating API call - still using hardcoded questions)");
    // Actual API call would go here
  }

  // Hardcoded sample questions
  const sampleQuestions = [
    {
      question_id: "q1_math_algebra",
      question_text: "Solve for x:  2x + 5 = 15",
      options: ["x = 3", "x = 5", "x = 7", "x = 10"],
      correct_answer: "x = 5",
      explanation: "Subtract 5 from both sides: 2x = 10. Then divide by 2: x = 5.",
      visual_assets: null
    },
    {
      question_id: "q2_math_quadratic",
      question_text: "What is the solution to the quadratic equation represented by the formula below?",
      options: ["Option A", "Option B", "Option C", "Option D"],
      correct_answer: "Option A", // Placeholder, actual answer depends on a specific equation
      explanation: "The quadratic formula is used to find the roots of a quadratic equation of the form ax^2 + bx + c = 0.",
      visual_assets: {
        type: "latex",
        data: "x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}"
      }
    },
    {
      question_id: "q3_geometry_svg",
      question_text: "What shape is described by the following SVG code?",
      options: ["A blue square", "A red circle", "A green triangle", "An orange rectangle"],
      correct_answer: "A red circle",
      explanation: "The SVG code defines a circle (cx, cy, r) with a red fill and black stroke.",
      visual_assets: {
        type: "svg",
        data: "<svg width='100' height='100' viewBox='0 0 100 100'><circle cx='50' cy='50' r='40' stroke='black' stroke-width='3' fill='red' /></svg>"
      }
    }
  ];
  // Simulate filtering by numQuestions - in a real scenario, the API would handle this.
  return sampleQuestions.slice(0, params.numQuestions || sampleQuestions.length);
};

// --- API Endpoint ---
app.post('/api/generate-questions', (req, res) => {
  const { testType, topic, subTopic, numQuestions } = req.body;

  // Basic validation
  if (!topic || !subTopic || !numQuestions) {
    return res.status(400).json({ error: 'Missing required parameters: topic, subTopic, numQuestions' });
  }

  try {
    const questions = getAIQuestions({ testType, topic, subTopic, numQuestions });
    if (questions && questions.length > 0) {
      res.json(questions);
    } else {
      res.status(404).json({ error: 'No questions found for the given criteria or numQuestions is too low.' });
    }
  } catch (error) {
    console.error("Error in /api/generate-questions:", error);
    res.status(500).json({ error: 'Internal server error while generating questions.' });
  }
});


app.get('/', (req, res) => {
  res.send('Hello from the backend! API is available at /api/generate-questions (POST).');
});

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});
