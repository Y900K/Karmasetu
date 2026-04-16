import { NextResponse } from 'next/server';
import { requireTrainee } from '@/lib/auth/requireTrainee';
import { callAI, repairTruncatedJson, extractPotentialJson } from '@/lib/server/aiGateway';

const FALLBACK_QUIZ_EN = [
  {
    q: "What does PPE stand for in an industrial context?",
    options: ["Personal Property Equipment", "Personal Protective Equipment", "Private Protection Engine", "Primary Protective Element"],
    correct: 1,
    explanation: "PPE refers to wearable equipment designed to protect workers from serious workplace injuries or illnesses."
  },
  {
    q: "Which color is typically used for 'Emergency Stop' buttons in manufacturing plants?",
    options: ["Green", "Blue", "Red", "Yellow"],
    correct: 2,
    explanation: "Red is globally recognized as the standard color for emergency stop and shutdown controls."
  },
  {
    q: "If you encounter a spilled chemical with an unknown label, what is the first step?",
    options: ["Clean it immediately with water", "Cover it with a cloth", "Evacuate the area and report it to a supervisor", "Smell it to identify"],
    correct: 2,
    explanation: "Standard safety protocol requires isolating the area and involving trained professionals for unknown spills."
  },
  {
    q: "What is the primary purpose of 'Lock Out Tag Out' (LOTO) procedures?",
    options: ["To prevent theft of tools", "To ensure equipment is not started during maintenance", "To count inventory", "To lock the facility at night"],
    correct: 1,
    explanation: "LOTO ensures that dangerous machines are properly shut off and not started up again prior to the completion of maintenance work."
  },
  {
    q: "How often should safety helmets be inspected for cracks or damage?",
    options: ["Once a year", "Every time they are dropped", "Before every shift", "Only if a heavy object hits it"],
    correct: 2,
    explanation: "Regular inspection before each shift ensures that any micro-fractures in head protection are caught before they fail."
  }
];

const FALLBACK_QUIZ_HI = [
  {
    q: "औद्योगिक संदर्भ में PPE का क्या अर्थ है?",
    options: ["Personal Property Equipment", "Personal Protective Equipment", "Private Protection Engine", "Primary Protective Element"],
    correct: 1,
    explanation: "PPE (Personal Protective Equipment) वह safety gear होता है जो workers को कार्यस्थल hazards से बचाता है।"
  },
  {
    q: "Manufacturing plants में 'Emergency Stop' button के लिए किस रंग का उपयोग किया जाता है?",
    options: ["Green", "Blue", "Red", "Yellow"],
    correct: 2,
    explanation: "Red (लाल) रंग emergency stop और shutdown controls के लिए वैश्विक मानक है।"
  },
  {
    q: "यदि कोई chemical spill हो और उस पर label न हो, तो आपका पहला कदम क्या होना चाहिए?",
    options: ["Clean it immediately with water", "Cover it with a cloth", "Evacuate the area and report it to a supervisor", "Smell it to identify"],
    correct: 2,
    explanation: "Safety protocol के अनुसार उस area को isolate करें (evacuate) और supervisor को report करें।"
  },
  {
    q: "'Lock Out Tag Out' (LOTO) procedures का मुख्य उद्देश्य क्या है?",
    options: ["To prevent theft of tools", "To ensure equipment is not started during maintenance", "To count inventory", "To lock the facility at night"],
    correct: 1,
    explanation: "LOTO यह सुनिश्चित करता है कि maintenance के दौरान machines सुरक्षित रूप से बंद रहें और अचानक start न हों।"
  },
  {
    q: "Safety helmets में cracks या damage की inspection कितनी बार करनी चाहिए?",
    options: ["Once a year", "Every time they are dropped", "Before every shift", "Only if a heavy object hits it"],
    correct: 2,
    explanation: "हर shift से पहले helmet की inspection करना जरूरी है ताकि कोई भी damage समय रहते पकड़ा जा सके।"
  }
];

export async function POST(request: Request) {
  try {
    const trainee = await requireTrainee(request);
    if (!trainee.ok) {
      return trainee.response;
    }

    const { topic, language, count = 10 } = await request.json();

    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      return NextResponse.json(
        { error: 'A valid topic is required to generate a quiz.' },
        { status: 400 }
      );
    }

    const isHindi = language === 'HINGLISH';
    
    const linguisticConstraint = isHindi 
      ? "\nCRITICAL LINGUISTIC INSTRUCTION: You MUST generate the questions, options, and explanations using a natural mix of Hindi (written in Devanagari script) and English (written in Roman script). Essential industrial terms, safety gear (e.g., PPE, Fire Extinguisher, Gloves, Helmets), acronyms, and technical jargons MUST remain in English. Example style: 'PPE (Personal Protective Equipment) वह safety gear होता है जो chemical plants में काम करते वक़्त workers को hazards से बचाता है।'"
      : "";

    const systemPrompt = `You are a strict technical quiz generator. Your only purpose is to output valid JSON.
Generate exactly ${count} multiple choice questions on the requested safety topic.${linguisticConstraint}
DO NOT output any conversational text, greetings, or explanations outside the JSON array.
DO NOT use markdown formatting (no backticks).
Return strictly this structure:
[
  {
    "q": "Insert question here?",
    "options": ["First option", "Second option", "Third option", "Fourth option"],
    "correct": 0,
    "explanation": "Why this is the correct answer in one sentence."
  }
]
Data Types: "correct" must be an integer between 0 and 3 index.`;

    console.log(`[Practice Quiz API] Generating quiz for topic: "${topic}" | Language: ${language || 'EN'}`);

    const userPrompt = isHindi 
      ? `Generate a ${count}-question JSON quiz about: ${topic}. Return ONLY JSON. Ensure all text inside the JSON follows the natural Hindi-English code-mixing instruction.`
      : `Generate a ${count}-question JSON quiz about: ${topic}. Return ONLY JSON.`;

    const gatewayResult = await callAI({
      task: 'practice_quiz',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 2048,
    });

    const fallbackQuiz = isHindi ? FALLBACK_QUIZ_HI : FALLBACK_QUIZ_EN;

    if (gatewayResult.provider === 'static_fallback') {
      return NextResponse.json({ ok: true, quiz: fallbackQuiz, isFallback: true });
    }

    try {
      const cleaned = extractPotentialJson(gatewayResult.content);
      const parsedQuiz = JSON.parse(repairTruncatedJson(cleaned));
      
      if (!Array.isArray(parsedQuiz) || parsedQuiz.length === 0) {
        throw new Error('AI returned an invalid quiz structure.');
      }
      
      return NextResponse.json({ ok: true, quiz: parsedQuiz, provider: gatewayResult.provider });
    } catch (error) {
      console.error(`[Practice Quiz API] AI parse error:`, error);
      return NextResponse.json({ ok: true, quiz: fallbackQuiz, isFallback: true });
    }
  } catch (error) {
    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal Server Error', details },
      { status: 500 }
    );
  }
}
