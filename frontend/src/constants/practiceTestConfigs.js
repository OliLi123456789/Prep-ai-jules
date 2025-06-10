export const practiceSections = {
  "SAT": {
    categories: {
      "Math": {
        title: "SAT Math Section",
        apiParams: { testType: "SAT", topic: "Math", subTopic: "Full Module" },
        isAdaptive: true, // General flag for adaptive nature
        satSectionType: "Math", // Specific for SAT adaptivity logic
        questionsPerModule: { module1: 22, module2: 22 },
        numQuestions: 22, // Default for one module if adaptive, or total if not
        supportsLearn: false, // Can this be "learned" as a whole section? Probably not.
        supportsGuidance: true // Can we start guided practice for this section? Yes.
      },
      "Reading & Writing": {
        title: "SAT Reading & Writing Section",
        apiParams: { testType: "SAT", topic: "Reading & Writing", subTopic: "Full Module" },
        isAdaptive: true,
        satSectionType: "Reading & Writing",
        questionsPerModule: { module1: 27, module2: 27 }, // Example: 27 questions per module
        numQuestions: 27,
        supportsLearn: false,
        supportsGuidance: true
      }
      // Individual subtopics could be added here later if desired for general practice
    }
  },
  "ACT": {
    categories: {
      "English": {
        title: "ACT English Section",
        apiParams: { testType: "ACT", topic: "English", subTopic: "Full Section" },
        isAdaptive: false,
        numQuestions: 15, // Example for a practice set
        supportsLearn: false,
        supportsGuidance: true
      },
      "Math": {
        title: "ACT Math Section",
        apiParams: { testType: "ACT", topic: "Math", subTopic: "Full Section" },
        isAdaptive: false,
        numQuestions: 15, // Example
        supportsLearn: false,
        supportsGuidance: true
      }
      // ... other ACT sections
    }
  },
  "General": {
    categories: { // General topics might not be tied to SAT/ACT directly
      "Algebra Basics": {
        title: "Algebra Basics Practice",
        apiParams: { testType: "General", topic: "Math", subTopic: "Algebra Basics" },
        isAdaptive: false,
        numQuestions: 10, // User can often select this for general practice
        supportsLearn: true,
        supportsGuidance: true
      },
      "Vocabulary": {
        title: "Vocabulary Practice",
        apiParams: { testType: "General", topic: "Reading", subTopic: "Vocabulary" },
        isAdaptive: false,
        numQuestions: 15,
        supportsLearn: true,
        supportsGuidance: true
      }
    }
  }
};

export const testConfigurations = [
  {
    id: "sat_full_official_sample",
    name: "Digital SAT Full Test (Official Sample)",
    type: "SAT",
    description: "Full-length adaptive Digital SAT sample, including Reading & Writing and Math sections.",
    sections: [
      { ...practiceSections.SAT.categories["Reading & Writing"], id: "rw_module1", name: "Reading & Writing - Module 1" },
      { ...practiceSections.SAT.categories["Reading & Writing"], id: "rw_module2", name: "Reading & Writing - Module 2" }, // Performance on M1 determines M2 difficulty
      { ...practiceSections.SAT.categories.Math, id: "math_module1", name: "Math - Module 1" },
      { ...practiceSections.SAT.categories.Math, id: "math_module2", name: "Math - Module 2" } // Performance on M1 determines M2 difficulty
    ],
    isFullTest: true,
  },
  {
    id: "sat_math_section_sample",
    name: "SAT Math Section (Adaptive Sample)",
    type: "SAT",
    description: "Two adaptive Math modules, similar to the real SAT.",
    // This is a single section test, but it's adaptive (has 2 modules)
    isSingleSectionTest: true,
    // It directly uses the config from practiceSections for its properties
    // When QuizPlayer handles full test sequence, this might need different structure.
    // For now, "TestPage" will treat this as launching the first module of this section.
    // The QuizPlayer itself will handle the two modules internally if isAdaptiveSat=true.
    ...practiceSections.SAT.categories.Math, // Spread SAT Math section config
    sections: [ // For consistency, even single section tests can have a "sections" array
       { ...practiceSections.SAT.categories.Math, id: "math_module1_test", name: "Math - Module 1" },
       { ...practiceSections.SAT.categories.Math, id: "math_module2_test", name: "Math - Module 2" }
    ]
  },
  {
    id: "act_full_sample",
    name: "ACT Full Test (Sample)",
    type: "ACT",
    description: "Sample ACT test covering English, Math, Reading, and Science.",
    sections: [
        { ...practiceSections.ACT.categories.English, id: "act_english", name: "ACT English Section", numQuestions: 75 }, // Example Q counts for full sections
        { ...practiceSections.ACT.categories.Math, id: "act_math", name: "ACT Math Section", numQuestions: 60 },
        // Add Reading & Science if defined in practiceSections.ACT.categories
    ],
    isFullTest: true,
  }
  // ... other predefined tests
];

// Helper to get a specific config by ID
export const getTestConfigById = (id) => testConfigurations.find(test => test.id === id);

export const getPracticeSectionDetails = (testType, mainCategory) => {
    return practiceSections[testType]?.categories?.[mainCategory] || null;
};
