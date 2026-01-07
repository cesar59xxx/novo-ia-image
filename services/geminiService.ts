import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";

// Initialize the API client helper
// Note: We create instances dynamically to ensure we use the latest API key if it changes.
const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found. Please select an API Key.");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Encodes a File object to a base64 string.
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

/**
 * Analyzes an image using gemini-3-pro-preview to understand composition and segmentation.
 * Now provides a much more technical breakdown for the generation phase.
 */
export const analyzeImageStructure = async (imageFile: File): Promise<string> => {
  try {
    const ai = getAiClient();
    const base64Data = await fileToBase64(imageFile);
    
    // For text models, standard structure
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: imageFile.type,
              data: base64Data
            }
          },
          {
            text: `Act as a Technical Director for VFX. Analyze this image for a compositing task.
            Return a structured report covering:
            1. CAMERA: Estimated Focal Length (e.g., 35mm, 85mm), Depth of Field.
            2. LIGHTING: Direction (clock face), Hardness (softbox vs hard sunlight), Color Temp (Kelvin), and Ratio (Key:Fill).
            3. PERSPECTIVE: Horizon line height, Camera Angle (High/Low/Eye-level).
            4. TEXTURE: Grain structure, specularity of skin/surfaces.
            
            Keep it concise but highly technical.`
          }
        ]
      }
    });

    return response.text || "Analysis failed to produce text.";
  } catch (error) {
    console.error("Analysis Error:", error);
    // Do not throw, return a fallback to avoid breaking UI if analysis fails
    return "Analysis unavailable.";
  }
};

/**
 * Generates the final poster.
 * Supports 4 modes:
 * 1. Actor + Reference (Face Swap)
 * 2. Actor + Prompt (Generative Scene)
 * 3. Reference + Prompt (Style/Variation - No Actor)
 * 4. Prompt Only (Text to Image - No Actor)
 */
export const generateFinalPoster = async (
  actorFile: File | null, // Now Optional
  referenceFile: File | null, // Optional
  outputType: string,
  landingPosition: string = 'center',
  analysisContext?: string,
  preserveText: boolean = false,
  customText: string = '',
  creativePrompt: string = '' // Scene description or Modification instruction
): Promise<string> => {
  const ai = getAiClient();
  const contentParts: any[] = [];

  // 1. Prepare Inputs
  let actorBase64: string | null = null;
  if (actorFile) {
      actorBase64 = await fileToBase64(actorFile);
  }

  let referenceBase64: string | null = null;
  if (referenceFile) {
    referenceBase64 = await fileToBase64(referenceFile);
  }

  // 2. Prepare Format Instructions
  let aspectRatio = "1:1";
  let formatInstruction = "";
  
  if (outputType === 'ad_stories') {
      aspectRatio = "9:16";
      formatInstruction = "FORMAT: SOCIAL MEDIA STORY (9:16). Vertical Composition.";
  } else if (outputType === 'thumbnail') {
      aspectRatio = "16:9";
      formatInstruction = `FORMAT: YOUTUBE THUMBNAIL (16:9). High Contrast, Rule of Thirds.`;
  } else if (outputType === 'landing_hero') {
      aspectRatio = "16:9";
      formatInstruction = "FORMAT: CINEMATIC WEB HEADER (16:9).";
      if (landingPosition === 'left') formatInstruction += " LAYOUT: Subject Anchored LEFT. Right side: Negative space.";
      else if (landingPosition === 'right') formatInstruction += " LAYOUT: Subject Anchored RIGHT. Left side: Negative space.";
      else formatInstruction += " LAYOUT: Center Composition.";
  } else if (outputType === 'landing_mobile') {
      aspectRatio = "9:16";
      formatInstruction = "FORMAT: MOBILE LANDING PAGE (Vertical 9:16).";
      if (landingPosition === 'top') formatInstruction += " LAYOUT: Subject in TOP half. Clean negative space at BOTTOM.";
      else if (landingPosition === 'bottom') formatInstruction += " LAYOUT: Subject in BOTTOM half. Clean negative space at TOP.";
  } else {
      formatInstruction = "FORMAT: SQUARE AD (1:1).";
  }

  // 3. Prepare Text Overlay Instructions
  let textInstruction = "";
  if (customText && customText.trim().length > 0) {
      textInstruction = `TEXT RENDER: Render the title "${customText}" in the image with cinematic typography fitting the scene.`;
  } else if (!preserveText) {
      textInstruction = "TEXT: No text. Clean image.";
  }

  // 4. Build Prompt & Content Parts based on Scenario
  let systemPrompt = "";

  if (actorFile && actorBase64 && referenceFile && referenceBase64) {
    // === SCENARIO 1: ACTOR + REFERENCE (Classic Face Swap) ===
    contentParts.push({ inlineData: { mimeType: referenceFile.type, data: referenceBase64 } }); // IMAGE_1
    contentParts.push({ inlineData: { mimeType: actorFile.type, data: actorBase64 } });       // IMAGE_2
    
    systemPrompt = `
      ROLE: Senior VFX Compositor.
      TASK: Face Replacement & Relighting.
      ${formatInstruction}
      
      INPUTS:
      - IMAGE_1 (Base Plate): Master Reference.
      - IMAGE_2 (Source): User Identity.
      ${analysisContext ? `- TECH SPECS: ${analysisContext}` : ''}
      ${creativePrompt ? `- ADDITIONAL INSTRUCTION: ${creativePrompt}` : ''}

      INSTRUCTIONS:
      1. Replace the face in IMAGE_1 with the face from IMAGE_2.
      2. PRESERVE IMAGE_1's lighting, shadows, and color grading exactly.
      3. Adapt IMAGE_2's head geometry to match IMAGE_1's angle.
      4. ${textInstruction}
    `;

  } else if (actorFile && actorBase64 && !referenceFile) {
    // === SCENARIO 2: ACTOR + PROMPT (Generative Scene) ===
    contentParts.push({ inlineData: { mimeType: actorFile.type, data: actorBase64 } }); // IMAGE_1
    
    systemPrompt = `
      ROLE: Movie Poster Concept Artist.
      TASK: Create a scene featuring the Actor.
      ${formatInstruction}
      
      INPUTS:
      - IMAGE_1: The Main Actor.
      - SCENE DESCRIPTION: "${creativePrompt}"

      INSTRUCTIONS:
      1. GENERATE a high-end cinematic environment based on the SCENE DESCRIPTION.
      2. PLACE the actor from IMAGE_1 into this scene.
      3. Match lighting and reflections on the actor to the new environment.
      4. ${textInstruction}
    `;

  } else if (!actorFile && referenceFile && referenceBase64) {
    // === SCENARIO 3: REFERENCE + PROMPT (No Actor - Style/Variation) ===
    contentParts.push({ inlineData: { mimeType: referenceFile.type, data: referenceBase64 } }); // IMAGE_1
    
    systemPrompt = `
      ROLE: Creative Director / Art Director.
      TASK: Reimagine the Reference Image.
      ${formatInstruction}
      
      INPUTS:
      - IMAGE_1: Visual Reference (Composition/Lighting Base).
      - CREATIVE DIRECTION: "${creativePrompt}"

      INSTRUCTIONS:
      1. Generate a NEW image that respects the composition and lighting structure of IMAGE_1.
      2. APPLY the CREATIVE DIRECTION to transform the content, style, or subject matter.
      3. If the prompt asks to change the person/character, generate a new fictional character fitting the description.
      4. Maintain the professional "movie poster" aesthetic of the reference.
      5. ${textInstruction}
    `;

  } else if (!actorFile && !referenceFile && creativePrompt) {
    // === SCENARIO 4: PROMPT ONLY (Text to Image) ===
    systemPrompt = `
      ROLE: AI Image Generator.
      TASK: Create a Movie Poster from scratch.
      ${formatInstruction}
      
      PROMPT: "${creativePrompt}"

      INSTRUCTIONS:
      1. Generate a Photorealistic, 8k resolution cinematic image based on the PROMPT.
      2. Ensure high dynamic range and dramatic lighting.
      3. ${textInstruction}
    `;
  } else {
    throw new Error("Invalid Input Combination. Please provide at least an Actor, a Reference, or a Prompt.");
  }

  // Add the prompt
  contentParts.push({ text: systemPrompt });

  try {
    console.log(`Generating with mode: Actor=${!!actorFile}, Ref=${!!referenceFile}, Prompt=${!!creativePrompt}`);
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: contentParts },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio as any,
          imageSize: '4K' as any 
        }
      }
    });

    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      const parts = candidates[0].content?.parts;
      if (parts) {
        for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
        const textPart = parts.find(p => p.text);
        if (textPart?.text) throw new Error(`Model Refusal: ${textPart.text}`);
      }
    }
    
    throw new Error("No image data returned.");
  } catch (error: any) {
    console.error("Generation Error:", error);
    throw new Error(error.message || "Failed to generate poster.");
  }
};

/**
 * Refines an existing generated image based on a specific user instruction.
 */
export const refinePoster = async (
  currentImageBase64: string,
  refinementPrompt: string,
  outputType: string
): Promise<string> => {
  const ai = getAiClient();
  const base64Data = currentImageBase64.split(',')[1];
  
  let aspectRatio = "1:1";
  if (outputType === 'ad_stories' || outputType === 'landing_mobile') aspectRatio = "9:16";
  else if (outputType === 'thumbnail' || outputType === 'landing_hero') aspectRatio = "16:9";

  const prompt = `
    ROLE: Senior Photo Retoucher.
    TASK: Detailed Image Refinement.
    USER REQUEST: "${refinementPrompt}"
    INSTRUCTIONS: Fix the image according to the request. Keep original quality. Output 4K.
    Output Ratio: ${aspectRatio}.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/png', data: base64Data } },
          { text: prompt }
        ]
      },
      config: {
        imageConfig: { aspectRatio: aspectRatio as any, imageSize: '4K' as any }
      }
    });

    const candidates = response.candidates;
    if (candidates && candidates.length > 0) {
      const parts = candidates[0].content?.parts;
      if (parts) {
        for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
      }
    }
    throw new Error("Refinement failed.");
  } catch (error: any) {
    console.error("Refinement Error:", error);
    throw new Error(error.message || "Failed to refine image.");
  }
};

/**
 * Chat bot functionality
 */
export const sendChatMessage = async (
  history: { role: 'user' | 'model', text: string }[],
  newMessage: string
): Promise<string> => {
  const ai = getAiClient();
  const chat: Chat = ai.chats.create({
    model: 'gemini-3-pro-preview',
    history: history.map(h => ({
      role: h.role,
      parts: [{ text: h.text }]
    })),
    config: { systemInstruction: "You are a helper for CineMorph SaaS." }
  });

  const response = await chat.sendMessage({ message: newMessage });
  return response.text || "I couldn't generate a response.";
};
