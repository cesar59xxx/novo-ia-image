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
  preserveText: boolean = false,
  customText: string = ''
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
      promptPrefix = "FORMAT: SOCIAL MEDIA STORY (9:16). Extend background vertically if needed.";
  } else if (outputType === 'thumbnail') {
      aspectRatio = "16:9";
      promptPrefix = `
        FORMAT: YOUTUBE THUMBNAIL (16:9).
        - COMPOSITION: High Contrast, Subject Pop, Rule of Thirds.
        - LIGHTING: Emphasize Rim Light for separation.
      `;
  } else if (outputType === 'landing_hero') {
      aspectRatio = "16:9";
      promptPrefix = "FORMAT: CINEMATIC WEB HEADER (16:9).";
      
      if (landingPosition === 'left') {
          promptPrefix += " LAYOUT: Subject Anchored LEFT. Right side: Uncluttered environment extension (bokeh/blur) for text.";
      } else if (landingPosition === 'right') {
           promptPrefix += " LAYOUT: Subject Anchored RIGHT. Left side: Uncluttered environment extension (bokeh/blur) for text.";
      } else {
           promptPrefix += " LAYOUT: Center Composition. Balanced negative space on sides.";
      }
  } else if (outputType === 'landing_mobile') {
      aspectRatio = "9:16";
      promptPrefix = "FORMAT: MOBILE LANDING PAGE (Vertical 9:16).";
      
      if (landingPosition === 'top') {
          promptPrefix += `
            LAYOUT: Subject in TOP half.
            OUTPAINTING INSTRUCTION: Seamlessly extend the bottom of the environment (floor, ground, wall) downwards. 
            Keep the bottom area low-detail (negative space) for UI buttons.
          `;
      } else if (landingPosition === 'bottom') {
          promptPrefix += `
            LAYOUT: Subject in BOTTOM half.
            OUTPAINTING INSTRUCTION: Seamlessly extend the top of the environment (sky, ceiling, wall) upwards.
            Keep the top area low-detail (negative space) for Headline text.
          `;
      }
  } else {
      promptPrefix = "FORMAT: SQUARE AD (1:1).";
  }

  // Text Handling Logic
  let textInstruction = "";
  if (!preserveText) {
      // Clean Plate
      textInstruction = "TEXT: REMOVE ALL EXISTING TEXT/LOGOS from IMAGE_1. Clean Plate only.";
  } else if (customText && customText.trim().length > 0) {
      // Custom Text Replacement
      textInstruction = `TEXT: REPLACE original text in IMAGE_1 with: "${customText}". MATCH the original font style, glow, and perspective exactly.`;
  } else {
      // Mockup / Copy Layout (No custom text)
      textInstruction = "TEXT: KEEP original text layout style from IMAGE_1 as a mockup.";
  }

  const prompt = `
    ROLE: Senior Hollywood VFX Compositor.
    TASK: High-End Photorealistic Face Replacement & Compositing.
    ${promptPrefix}
    
    INPUTS:
    - IMAGE_1 (Base Plate): The Master Reference. Contains the Scene, Lighting, Color Grading, Body Pose, and Composition.
    - IMAGE_2 (Source Identity): The User's Face.
    ${analysisContext ? `- TECH SPECS OF IMAGE_1: ${analysisContext}` : ''}

    STRICT INSTRUCTIONS:
    
    1. **FIDELITY TO IMAGE_1 (The Golden Rule)**:
       - You MUST preserve the exact lighting direction, shadow hardness, color palette, and film grain of IMAGE_1.
       - Do NOT create a "new" image style. Edit IMAGE_1.
       - If IMAGE_1 is dark/moody, the output MUST be dark/moody.
       - If IMAGE_1 has strong rim light, the new face MUST have that rim light.

    2. **IDENTITY SWAP (The Core Task)**:
       - Replace the head/face of the character in IMAGE_1 with the face from IMAGE_2.
       - **CRITICAL**: Adapt the geometry of the face from IMAGE_2 to match the angle and perspective of IMAGE_1.
       - **SKIN TEXTURE**: Apply the skin texture details (pores, sweat, grime) and lighting falloff of IMAGE_1 onto the face of IMAGE_2.
       - **FACE SHAPE**: Keep the identity characteristics of IMAGE_2 (nose, eyes, mouth shape), but blend the jawline/head shape to fit the body in IMAGE_1 naturally.

    3. **LAYOUT & COMPOSITION**:
       - Respect the LAYOUT instructions defined in FORMAT.
       - If creating "Negative Space" for Mobile/Web, do NOT leave it white/blank. **EXTEND THE ENVIRONMENT**. Continue the wall, sky, or background texture naturally so it looks like a wider/taller camera shot.
       - ${textInstruction}

    4. **FINAL POLISH**:
       - Check for "Uncanny Valley". Eyes must look at the correct focal point.
       - Match shadows on the neck/collar.
       - Final Output must be 4K Photorealistic.

    Output Format: ${outputType} (Ratio: ${aspectRatio}).
  `;

  try {
    console.log(`Generating: ${outputType} | Position: ${landingPosition} | Text Mode: ${preserveText ? (customText ? 'Custom' : 'Mockup') : 'Clean'}`);
    
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
 * Refines an existing generated image based on a specific user instruction.
 * This is akin to a "Photoshop Request".
 */
export const refinePoster = async (
  currentImageBase64: string, // The image to fix (full data URL)
  refinementPrompt: string,
  outputType: string
): Promise<string> => {
  const ai = getAiClient();
  
  // Strip the "data:image/png;base64," prefix
  const base64Data = currentImageBase64.split(',')[1];
  
  let aspectRatio = "1:1";
  if (outputType === 'ad_stories' || outputType === 'landing_mobile') aspectRatio = "9:16";
  else if (outputType === 'thumbnail' || outputType === 'landing_hero') aspectRatio = "16:9";

  const prompt = `
    ROLE: Senior Photo Retoucher.
    TASK: Detailed Image Refinement & Fixing.
    
    INPUT IMAGE: The provided image is a nearly finished movie poster/ad creative.
    USER REQUEST: "${refinementPrompt}"

    INSTRUCTIONS:
    1. **PRESERVE INTEGRITY**: Do NOT regenerate the entire composition. Keep the lighting, color grading, background, and identity EXACTLY the same as the input image.
    2. **TARGETED EDIT**: Apply changes ONLY to the area specified in the USER REQUEST (e.g., if asked to fix a hand, only touch the hand).
    3. **QUALITY**: Ensure the fixed area blends seamlessly with the existing grain and resolution of the image.
    4. **OUTPUT**: Return the polished image in 4K.
    
    Output Ratio: ${aspectRatio}.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: base64Data
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
    throw new Error("Refinement failed to produce an image.");

  } catch (error: any) {
    console.error("Refinement Error:", error);
    throw new Error(error.message || "Failed to refine image.");
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
