export const tutorTopics = {
  "SAT": {
    categories: {
      "General SAT Strategies": {
        subTopics: {
          "Time Management": { description: "Learn how to pace yourself during the SAT.", supportsLearn: true, supportsGuidance: false },
          "Process of Elimination": { description: "Master the art of eliminating wrong answers.", supportsLearn: true, supportsGuidance: true },
          "Guessing Strategy": { description: "Understand when and how to guess effectively.", supportsLearn: true, supportsGuidance: false },
          "Managing Test Anxiety": { description: "Techniques to stay calm and focused.", supportsLearn: true, supportsGuidance: false }
        }
      },
      "Math": {
        subTopics: {
          "Algebra: Linear Equations": { description: "Solving single and systems of linear equations.", supportsLearn: true, supportsGuidance: true, exampleQuestion: "Solve for x: 2x + 3 = 7" },
          "Algebra: Inequalities": { description: "Understanding and solving inequalities.", supportsLearn: true, supportsGuidance: true },
          "Advanced Math: Quadratics": { description: "Working with quadratic equations and their graphs.", supportsLearn: true, supportsGuidance: true, exampleQuestion: "Find the roots of x^2 - 5x + 6 = 0." },
          "Problem-Solving & Data Analysis: Percentages": { description: "Calculating and applying percentages.", supportsLearn: true, supportsGuidance: true },
          "Calculator Tips (SAT Math)": { description: "Learn to use your calculator effectively for SAT Math problems.", supportsLearn: true, supportsGuidance: true, exampleQuestion: "A function f(x) is defined as f(x) = (x^2 - 7x + 10) / (x-2). What is the value of f(2.001) effectively using a calculator?" }
        }
      },
      "Reading": {
        subTopics: {
          "Main Idea & Purpose": { description: "Identifying the central theme and author's intent.", supportsLearn: true, supportsGuidance: true },
          "Analyzing Evidence": { description: "Finding and interpreting supporting evidence in passages.", supportsLearn: true, supportsGuidance: true }
        }
      },
      "Writing & Language": {
        subTopics: {
          "Grammar: Subject-Verb Agreement": { description: "Ensuring verbs agree with their subjects.", supportsLearn: true, supportsGuidance: true },
          "Punctuation: Commas": { description: "Correct usage of commas in various contexts.", supportsLearn: true, supportsGuidance: true }
        }
      }
    }
  },
  "ACT": {
    categories: {
      "General ACT Strategies": {
        subTopics: {
          "Time Management (ACT Specific)": { description: "Pacing for each section of the ACT.", supportsLearn: true, supportsGuidance: false },
          "ACT Science Section Strategy": { description: "Approaching the unique ACT Science passages.", supportsLearn: true, supportsGuidance: false }
        }
      },
      "English": {
        subTopics: {
          "Grammar & Usage: Verb Tense": { description: "Mastering correct verb tenses.", supportsLearn: true, supportsGuidance: true },
          "Rhetorical Skills: Writer's Goal/Purpose": { description: "Understanding the author's objective.", supportsLearn: true, supportsGuidance: true }
        }
      },
      "Math": {
        subTopics: {
          "Algebra: Basic Linear Equations": { description: "Fundamental algebraic equations.", supportsLearn: true, supportsGuidance: true },
          "Geometry: Plane Geometry": { description: "Working with shapes like triangles and circles.", supportsLearn: true, supportsGuidance: true },
          "Calculator Tips (ACT Math)": { description: "Leveraging your calculator for ACT Math.", supportsLearn: true, supportsGuidance: true, exampleQuestion: "What is the approximate value of sin(35 degrees)?" }
        }
      },
      "Reading": {
        subTopics: {
          "Main Idea of Passages": { description: "Identifying the central theme in ACT reading.", supportsLearn: true, supportsGuidance: true }
        }
      },
      "Science": {
        subTopics: {
          "Interpreting Data from Graphs & Tables": { description: "Analyzing scientific data representations.", supportsLearn: true, supportsGuidance: true },
          "Conflicting Viewpoints Passages Strategy": { description: "Handling passages with multiple perspectives.", supportsLearn: true, supportsGuidance: false }
        }
      }
    }
  }
};
