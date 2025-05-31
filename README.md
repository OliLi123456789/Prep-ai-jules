# AI Prep Zone - SAT/ACT Preparation Platform

This application is designed to help students prepare for the SAT and ACT using AI-powered tools, personalized learning, and practice resources.

## Key Features

*   **AI Tutor:** Interactive chat support for questions, concepts, and problem-solving.
*   **AI Learning Modules:** Structured lessons on specific test topics.
*   **Practice Questions & Mock Tests:** Generate quizzes and simulate full test experiences.
*   **Performance Analytics:** Track progress and identify areas for improvement.
*   **Personalized Study Plan:** AI-generated calendar to guide study.

## How the System Works

The application uses a client-server architecture:

1.  **Frontend (Client-Side):**
    *   Built with **React** (and Vite).
    *   Provides the user interface and handles user interactions.
    *   Communicates with the backend via API calls for data and AI features.

2.  **Backend (Server-Side):**
    *   Built with **Node.js** and **Express.js**.
    *   Serves as an API gateway, handling requests from the frontend.
    *   Manages business logic and user data (via `backend/mockUserData.json`).
    *   Integrates with the **DeepSeek API** for AI functionalities.

3.  **External AI Service (DeepSeek API):**
    *   Provides the core Large Language Model (LLM) capabilities for the AI Tutor, learning module generation, and practice question creation.
    *   The backend sends specific prompts to this API to get the desired AI-generated content.

## AI Tutor Deep Dive

The AI Tutor is a core feature designed to provide personalized assistance.

**1. How it Works:**
   *   The user types a question into the chat interface on the "AI Tutor Page" (`frontend/src/components/AITutorPage.jsx`).
   *   The frontend sends this message, along with recent conversation history (for context), to the `/api/ai-tutor-chat` endpoint on the backend.
   *   The backend (`backend/server.js`) receives this. It has a predefined "system prompt" that defines the AI's role and expertise.
   *   The backend combines this system prompt, the conversation history, and the user's new message into a comprehensive prompt for the DeepSeek API's `deepseek-chat` model.
   *   The DeepSeek API processes this and returns the AI's textual response.
   *   The backend forwards this response to the frontend, which displays it in the chat.

**2. AI Tutor Capabilities:**
   Based on its system prompt, the AI Tutor can:
   *   Help students understand SAT/ACT concepts across all subjects.
   *   Break down difficult problems step-by-step.
   *   Offer clear, actionable explanations.
   *   Provide guidance on test-taking strategies (e.g., process of elimination, guessing, managing anxiety).
   *   Explain time management techniques for different test sections.
   *   Advise on the effective use of approved calculators.
   *   Offer insights into study skills and learning challenging material.
   *   Engage interactively and ask clarifying questions.

**3. AI Tutor Prompting (Example for LLM):**
   The full information package sent to the DeepSeek LLM for a typical AI Tutor interaction consists of three parts:

   *   **a) System Prompt (defined in `backend/server.js` and sent automatically):**
       ```
       You are a friendly, patient, and encouraging AI Tutor specializing in SAT and ACT preparation. Your goal is to help students deeply understand concepts, effectively break down difficult problems step-by-step, and offer clear, actionable explanations.
       You are knowledgeable in all subject areas of the SAT and ACT. Beyond specific academic topics, you can also provide guidance on:
       - Test-taking strategies (e.g., process of elimination, when to guess, managing anxiety).
       - Time management techniques for each section of the tests.
       - Effective use of approved calculators (like the TI-84 series for graphing, matrix operations, etc., relevant to specific problem types).
       - Study skills and how to approach learning challenging material.
       When a student asks for help, try to understand their specific difficulty. If they ask about a broad topic like 'time management,' you might offer some general strategies and then ask them if they want to focus on a particular section or problem type. If they mention a specific problem, guide them through it rather than just giving the answer. Be interactive and ask clarifying questions to ensure they are following along. Keep your responses concise and focused on the student's query unless asked for more detail.
       ```

   *   **b) Conversation History (example, if relevant prior messages exist):**
       ```json
       [
         { "role": "user", "content": "What's the difference between 'affect' and 'effect'?" },
         { "role": "assistant", "content": "'Affect' is usually a verb meaning 'to influence,' while 'effect' is usually a noun meaning 'a result.' For example, 'The rain will affect the game,' and 'The game was canceled as an effect of the rain.'" }
       ]
       ```

   *   **c) User's Current Question (example for an ACT trigonometry problem):**
       ```
       "Thanks for clarifying affect/effect! Now, I'm stuck on an ACT math problem. It says: 'In triangle ABC, angle A is 30 degrees, side b (AC) is 10 units, and side a (BC) is 5 units. Find the measure of angle B.' I know I should use the Law of Sines, but I'm not sure how to set it up correctly for this case, or if there could be more than one possible answer for angle B. Can you walk me through it?"
       ```

## Practice Question Generation (`/api/generate-questions`) Prompts

The application can generate practice questions for various test sections and topics via the `/api/generate-questions` endpoint. This feature also uses the DeepSeek API with a specific set of prompts:

**1. System Prompt for Question Generation:**
   This is the general instruction given to the LLM, defined in `backend/server.js` within the `getAIQuestions` function:
   ```
   You are an expert test question writer. You generate questions in a precise JSON format as instructed. Do not include any markdown formatting like ```json or ``` around the JSON output.
   ```

**2. Instructional Prompt (Example for ACT Trigonometry):**
   This part of the prompt is dynamically constructed based on user selections (e.g., test type, topic, sub-topic, number of questions). For instance, to generate 5 ACT Trigonometry questions, the instructional content sent to the LLM would be:
   ```
   Generate 5 questions for an ACT Math test, focusing on Trigonometry. Return the output as a VALID JSON array where each element is an object with the following keys: 'question_text' (string), 'options' (array of 4 strings), 'correct_answer' (string - one of the options), 'explanation' (string), and optionally 'visual_assets'. If 'visual_assets' is used, it must be an object with 'type' (string, either 'latex' or 'svg') and 'data' (string, the LaTeX or SVG code). Ensure no extra text or markdown formatting outside the JSON array. The entire response should be only the JSON array itself.
   ```
   *(Note: In this example, the request to the API endpoint would specify parameters like `testType: "ACT"`, `topic: "Math"`, `subTopic: "Trigonometry"`, and `numQuestions: 5` which are then used to build the prompt above.)*

## Application Pages Overview

The application is organized into the following main pages (components found in `frontend/src/components/`):

*   **Homepage (Not Logged In):** (`App.jsx` logic for `/`)
    *   Displays testimonials and a hero section to welcome new users.
*   **Dashboard (Logged In):** (`Dashboard.jsx` at `/dashboard` or `/`)
    *   Central hub for users, showing progress, AI calendar tasks, and quick navigation.
*   **Practice Page:** (`PracticePage.jsx` at `/practice`)
    *   For generating and taking custom practice quizzes on selected topics.
*   **Tests Page:** (`TestPage.jsx` at `/tests`)
    *   For taking full-length simulated SAT/ACT style tests.
*   **Settings Page:** (`SettingsPage.jsx` at `/settings`)
    *   Allows users to manage their profile, test details (SAT/ACT, date), and study preferences.
*   **Analytics Page:** (`AnalyticsPage.jsx` at `/analytics`)
    *   Visualizes user performance, highlighting strengths, weaknesses, and progress over time.
*   **AI Tutor Page:** (`AITutorPage.jsx` at `/ai-tutor`)
    *   The chat interface for direct interaction with the AI Tutor.
*   **AI Learn Page:** (`AILearnPage.jsx` at `/ai-learn`)
    *   Users select topics to receive detailed, AI-generated learning modules covering concepts, examples, and practice questions.

## System Wiring and Operational Dependencies

The application's code is structured for its components to work together:

*   **Frontend Routing:** `frontend/src/App.jsx` uses `react-router-dom` to map browser URLs to the correct React page components.
*   **API Connectivity:** Frontend components are designed to make API calls to specific endpoints defined in the backend (`backend/server.js`). For instance, the AI Tutor chat sends messages to `/api/ai-tutor-chat`.
*   **Backend Logic:** The backend `server.js` contains handlers for these API endpoints, processing incoming data and, for AI features, interacting with the DeepSeek API.

**Critical Dependencies for Full Functionality:**

For the application, especially its AI-powered features, to work correctly in a live or development environment, the following are essential:

1.  **`DEEPSEEK_API_KEY` Environment Variable:**
    *   This API key **must** be correctly configured in the environment where the backend Node.js server is running.
    *   The backend code relies on this key to authenticate with the DeepSeek API.
    *   **If this key is missing, invalid, or the DeepSeek service is unreachable, AI features (AI Tutor, AI Learn, AI question generation) will not function.** The system may return errors or limited/fallback data in such cases.

2.  **Running Backend Server:**
    *   The Node.js Express server (`backend/server.js`) must be running (e.g., via `node backend/server.js` or a process manager).

3.  **Accessible Frontend:**
    *   The React frontend application must be built and served, or running via its development server (e.g., `npm run dev` from the `frontend` directory).

4.  **Data Files:**
    *   `backend/mockUserData.json`: Must be present and writable by the backend server process for user data persistence.
    *   `backend/testStructures.json`: Must be present and readable for defining test structures.

5.  **Network Connectivity:**
    *   The backend server needs internet access to reach the DeepSeek API.

The codebase provides the necessary "wiring" (connections in code). However, these external factors and configurations are vital for the application to be fully operational.
