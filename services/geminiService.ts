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
 * Generates the final poster by swapping the actor.
 * Uses gemini-3-pro-image-preview for high quality generation.
 * heavily optimized for Landing Page layouts and Realistic Textures.
 */
export const generateFinalPoster = async (
  actorFile: File,
  referenceFile: File,
  outputType: string,
  landingPosition: string = 'center',
  analysisContext?: string,
  preserveText: boolean = false
): Promise<string> => {
  const ai = getAiClient();
  
  // Ensure we can read the files before calling API
  const [actorBase64, referenceBase64] = await Promise.all([
    fileToBase64(actorFile),
    fileToBase64(referenceFile)
  ]);

  let aspectRatio = "1:1";
  let promptPrefix = "";
  
  // Logic for specific formats
  if (outputType === 'ad_stories') {
      aspectRatio = "9:16";
      promptPrefix = "SOCIAL MEDIA STORY FORMAT.";
  } else if (outputType === 'thumbnail') {
      aspectRatio = "16:9";
      promptPrefix = `
        YOUTUBE THUMBNAIL FORMAT (16:9).
        - STYLE: High Contrast, Vibrant Saturation, Eye-Catching.
        - COMPOSITION: Rule of thirds.
        - BACKGROUND: Must separate clearly from the subject (Rim lighting).
        - EXPRESSION: Boost the intensity of the expression slightly for click-through rate.
      `;
  } else if (outputType === 'landing_hero') {
      aspectRatio = "16:9";
      // Explicit Web Design Instructions
      promptPrefix = "WEB DESIGN HERO HEADER (1920x1080).";
      
      if (landingPosition === 'left') {
          promptPrefix += `
            \n**CRITICAL WEB LAYOUT RULE: SUBJECT LEFT / COPY RIGHT**
            1. The User Actor must be positioned in the LEFT 30-40% of the frame.
            2. The RIGHT 60% of the frame is the "COPY SPACE" (Negative Space).
            3. INSTRUCTION FOR RIGHT SIDE: Extend the background environment but keep it low-detail, slightly blurred (bokeh), or lower contrast. This area MUST be clean because the developer will overlay HTML text (H1 + Button) there. Do not put busy objects on the right.
          `;
      } else if (landingPosition === 'right') {
           promptPrefix += `
            \n**CRITICAL WEB LAYOUT RULE: SUBJECT RIGHT / COPY LEFT**
            1. The User Actor must be positioned in the RIGHT 30-40% of the frame.
            2. The LEFT 60% of the frame is the "COPY SPACE" (Negative Space).
            3. INSTRUCTION FOR LEFT SIDE: Extend the background environment but keep it low-detail, slightly blurred (bokeh), or lower contrast. This area MUST be clean because the developer will overlay HTML text (H1 + Button) there. Do not put busy objects on the left.
          `;
      } else {
           promptPrefix += `
            \n**CRITICAL WEB LAYOUT RULE: CENTERED HERO**
            1. The User Actor must be centered.
            2. The areas to the immediate Left and Right must be clean negative space for potential secondary text.
          `;
      }
  } else {
      promptPrefix = "SQUARE FEED AD.";
  }

  // Text Handling Logic
  const textInstruction = preserveText 
    ? "TEXT MODE: MOCKUP. Attempt to simulate the typography/headline style found in IMAGE_1. The text doesn't need to be readable, but the visual weight and placement should match the reference to serve as a design mockup."
    : "TEXT MODE: CLEAN PLATE. **CRITICAL**: DO NOT render any text, headlines, logos, or subtitles. Remove all typography found in IMAGE_1. The output must be a clean image (background + actor) only, ready for a developer to add HTML text.";

  const prompt = `
    ROLE: Senior VFX Compositor & Web Designer.
    TASK: High-End Marketing Asset Generation.
    FORMAT: ${promptPrefix}
    
    INPUTS:
    - IMAGE_1: REFERENCE (Lighting, Layout, Mood).
    - IMAGE_2: TALENT (Face & Identity Source).
    ${analysisContext ? `- TECHNICAL ANALYSIS OF REF: ${analysisContext}` : ''}

    EXECUTION STEPS:
    
    1. **SKELETON & POSE MAPPING**:
       - Ignore the pose in IMAGE_2.
       - Force the anatomy of the Talent (IMAGE_2) to match the EXACT skeletal pose, hand position, and spine rotation of the character in IMAGE_1.
    
    2. **RELIGHTING (The most important step)**:
       - Analyze the light sources in IMAGE_1 (Key, Rim, Fill).
       - Cast EXACTLY the same shadows onto the Talent's face.
       - Match the "Light Wrap" effect from the background.
       - **Skin Texture**: Must be hyper-realistic. Visible pores, subsurface scattering (SSS) on ears/nose.
    
    3. **COMPOSITION (Strict Adherence)**:
       - If LANDING_HERO: You MUST respect the "Negative Space" instructions. The generated empty space must be usable for text overlay without contrast issues.
       - If THUMBNAIL: Prioritize separation between subject and background (Pop out).
       - ${textInstruction}
    
    4. **FINAL GRADING**:
       - Match the film grain, ISO noise, and color palette of IMAGE_1.

    OUTPUT: Photorealistic, 4K, Commercial Grade.
    Output Format: ${outputType} (Ratio: ${aspectRatio}).
  `;

  try {
    console.log(`Generating: ${outputType} | Position: ${landingPosition} | Text: ${preserveText}`);
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: referenceFile.type,
              data: referenceBase64
            }
          },
          {
            inlineData: {
              mimeType: actorFile.type,
              data: actorBase64
            }
          },
          {
            text: prompt
          }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio as any,
          imageSize: '4K' as any 
        }
      }
    });

    console.log("Response received", response);

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
        if (textPart?.text) {
             throw new Error(`Model Refusal: ${textPart.text}`);
        }
      }
    }
    
    throw new Error("No image data returned.");
  } catch (error: any) {
    console.error("Generation Error:", error);
    throw new Error(error.message || "Failed to generate poster.");
  }
};

/**
 * Chat bot functionality using gemini-3-pro-preview
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
    config: {
        systemInstruction: "You are a helpful assistant for the CineMorph SaaS platform. You help users understand how to use the tool to create movie posters and ad creatives. Keep answers concise and helpful."
    }
  });

  const response = await chat.sendMessage({ message: newMessage });
  return response.text || "I couldn't generate a response.";
};
