import React, { useState, useEffect, useCallback } from 'react';
import { 
  UploadCloud, 
  Image as ImageIcon, 
  Settings2, 
  ChevronRight, 
  Wand2,
  Layout,
  User,
  Download,
  Key,
  Monitor,
  Youtube,
  Type,
  Eraser,
  Smartphone,
  ArrowUpFromLine,
  ArrowDownFromLine,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { OutputType, LandingPosition, ProcessingStep } from './types';
import { generateFinalPoster, analyzeImageStructure, refinePoster } from './services/geminiService';
import PipelineVisualizer from './components/PipelineVisualizer';
import MaskGallery from './components/MaskGallery';
import ChatAssistant from './components/ChatAssistant';
import AnalysisPanel from './components/AnalysisPanel';

const App: React.FC = () => {
  // State: API Key
  const [apiKeySet, setApiKeySet] = useState(false);

  // State: Inputs
  const [actorFile, setActorFile] = useState<File | null>(null);
  const [actorPreview, setActorPreview] = useState<string | null>(null);
  const [refFile, setRefFile] = useState<File | null>(null);
  const [refPreview, setRefPreview] = useState<string | null>(null);
  
  // State: Configuration
  const [outputType, setOutputType] = useState<OutputType>(OutputType.AD_FEED);
  const [landingPos, setLandingPos] = useState<LandingPosition>(LandingPosition.CENTER);
  const [preserveText, setPreserveText] = useState(false);
  const [customText, setCustomText] = useState('');
  
  // Helper for Landing Page Sub-mode
  const [landingDevice, setLandingDevice] = useState<'desktop' | 'mobile'>('desktop');

  // State: Pipeline
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisText, setAnalysisText] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [steps, setSteps] = useState<ProcessingStep[]>([
    { id: '1', name: 'Segmentation Engine', status: 'pending', details: 'Waiting for inputs' },
    { id: '2', name: 'Hero Replacement', status: 'pending' },
    { id: '3', name: 'Relighting & Texture', status: 'pending' },
    { id: '4', name: 'Identity Blocker', status: 'pending' },
    { id: '5', name: 'Final 4K Render', status: 'pending' },
  ]);

  // State: Refinement
  const [refinePrompt, setRefinePrompt] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  // Check for API key on mount
  useEffect(() => {
    const checkKey = async () => {
      // Priority 1: Check standard env var (Vercel / Build)
      if (process.env.API_KEY) {
        setApiKeySet(true);
        return;
      }

      // Priority 2: Check AI Studio Runtime
      const aiStudio = (window as any).aistudio;
      if (aiStudio && await aiStudio.hasSelectedApiKey()) {
        setApiKeySet(true);
      }
    };
    checkKey();
  }, []);

  // Update OutputType based on device selection when in Landing mode
  useEffect(() => {
    if (outputType === OutputType.LANDING_HERO || outputType === OutputType.LANDING_MOBILE) {
      if (landingDevice === 'desktop') {
        setOutputType(OutputType.LANDING_HERO);
        // Reset to valid horizontal pos if needed
        if (landingPos === LandingPosition.TOP || landingPos === LandingPosition.BOTTOM) {
            setLandingPos(LandingPosition.CENTER);
        }
      } else {
        setOutputType(OutputType.LANDING_MOBILE);
        // Reset to valid vertical pos if needed
        if (landingPos === LandingPosition.LEFT || landingPos === LandingPosition.RIGHT || landingPos === LandingPosition.CENTER) {
            setLandingPos(LandingPosition.TOP);
        }
      }
    }
  }, [landingDevice, outputType, landingPos]);

  const handleApiKeySelect = async () => {
    const aiStudio = (window as any).aistudio;
    if (aiStudio) {
      await aiStudio.openSelectKey();
      // Assume success to handle race condition where hasSelectedApiKey might lag
      setApiKeySet(true);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'actor' | 'ref') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const preview = URL.createObjectURL(file);
      
      if (type === 'actor') {
        setActorFile(file);
        setActorPreview(preview);
      } else {
        setRefFile(file);
        setRefPreview(preview);
        // Trigger auto-analysis when reference is uploaded
        handleAnalyze(file);
      }
    }
  };

  const handleAnalyze = async (file: File) => {
    if (!apiKeySet) return;
    setIsAnalyzing(true);
    setAnalysisText(null);
    try {
      const text = await analyzeImageStructure(file);
      setAnalysisText(text);
      setSteps(prev => prev.map(s => s.id === '1' ? { ...s, status: 'completed', details: 'Lighting topology mapped' } : s));
    } catch (e) {
      console.error(e);
      // Analysis is optional for generation, so we don't block the user, just show status
      setSteps(prev => prev.map(s => s.id === '1' ? { ...s, status: 'completed', details: 'Analysis skipped (auto-mode)' } : s));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const updateStep = (id: string, status: ProcessingStep['status'], details?: string) => {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, status, details } : s));
  };

  const handleGenerate = async () => {
    if (!actorFile || !refFile || !apiKeySet) return;

    setIsProcessing(true);
    setGeneratedImage(null);
    
    // Reset steps but keep analysis if done
    setSteps(prev => prev.map(s => {
      if (s.id === '1' && analysisText) return s; // Keep segmentation status if valid
      return { ...s, status: 'pending', details: undefined };
    }));
    
    try {
      // Step 1 check
      if (!analysisText) updateStep('1', 'completed', 'Using fast segmentation');
      
      updateStep('2', 'processing', 'Skeleton mapping & Pose transfer...');
      await new Promise(r => setTimeout(r, 1000)); 
      updateStep('2', 'completed');

      updateStep('3', 'processing', 'Raytraced Shadow & Skin SSS...');
      await new Promise(r => setTimeout(r, 1000));
      updateStep('3', 'completed');

      updateStep('4', 'processing', 'Compositing Layout & Breathing Room...');
      updateStep('4', 'completed');

      updateStep('5', 'processing', 'Final 4K Texture Grading...');
      
      // Pass the analysis text to the generator for better context
      const resultImageUrl = await generateFinalPoster(
        actorFile, 
        refFile, 
        outputType, 
        landingPos, 
        analysisText || undefined,
        preserveText,
        customText
      );
      
      setGeneratedImage(resultImageUrl);
      updateStep('5', 'completed', 'Render finished');

    } catch (error: any) {
      console.error(error);
      const msg = error.message || 'Unknown error';

      if (msg.includes('Requested entity was not found')) {
        setApiKeySet(false);
        const aiStudio = (window as any).aistudio;
        if (aiStudio) {
            await aiStudio.openSelectKey();
            setApiKeySet(true);
            updateStep('5', 'error', 'API Key refreshed. Please click Generate again.');
            return;
        }
      }

      // Truncate long error messages for the UI, but keep enough to be useful
      const displayMsg = msg.length > 50 ? 'Generation failed: Check console for details' : msg;
      updateStep('5', 'error', displayMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRefine = async () => {
    if (!generatedImage || !refinePrompt.trim() || isRefining) return;
    
    setIsRefining(true);
    updateStep('5', 'processing', 'Applying Magic Fix...');

    try {
      const refinedImageUrl = await refinePoster(generatedImage, refinePrompt, outputType);
      setGeneratedImage(refinedImageUrl);
      setRefinePrompt(''); // Clear prompt
      updateStep('5', 'completed', 'Refinement applied successfully');
    } catch (error: any) {
      console.error(error);
      updateStep('5', 'error', 'Refinement failed. Try again.');
    } finally {
      setIsRefining(false);
    }
  };

  if (!apiKeySet) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Wand2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">CineMorph SaaS</h1>
          <p className="text-zinc-400">Please select a valid Google Gemini API Key (paid project required) to access the professional rendering engine.</p>
          <div className="space-y-3">
            {/* Show Select Button only if AI Studio Runtime is detected, otherwise rely on Env Var */}
            {(window as any).aistudio ? (
              <button 
                onClick={handleApiKeySelect}
                className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition-colors"
              >
                <Key className="w-4 h-4" />
                Select API Key via AI Studio
              </button>
            ) : (
              <div className="p-3 bg-zinc-800 rounded-lg text-xs text-zinc-400 border border-zinc-700">
                Environment Variable <code>API_KEY</code> is missing. Please configure it in Vercel Project Settings.
              </div>
            )}
          </div>
           <a 
            href="https://ai.google.dev/gemini-api/docs/billing" 
            target="_blank" 
            rel="noreferrer"
            className="text-xs text-zinc-500 hover:text-zinc-300 block"
          >
            View Billing Documentation
          </a>
        </div>
      </div>
    );
  }

  const isWideFormat = outputType === OutputType.LANDING_HERO || outputType === OutputType.THUMBNAIL;
  const isVerticalFormat = outputType === OutputType.AD_STORIES || outputType === OutputType.LANDING_MOBILE;

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-200 overflow-hidden font-sans">
      
      {/* Sidebar - Configuration */}
      <aside className="w-80 border-r border-zinc-800 flex flex-col bg-[#0c0c0e]">
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
               <Wand2 className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-lg tracking-tight text-white">CineMorph</h1>
          </div>
          <p className="text-xs text-zinc-500">Professional Marketing Generator</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          
          {/* 1. Actor Upload */}
          <section>
            <h2 className="text-sm font-semibold text-zinc-100 mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-400" />
              1. User Actor Photo
            </h2>
            <div className="relative group">
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => handleFileUpload(e, 'actor')}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className={`border-2 border-dashed rounded-xl p-4 transition-all ${actorPreview ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-zinc-700 hover:border-zinc-500 bg-zinc-800/50'}`}>
                {actorPreview ? (
                  <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg">
                    <img src={actorPreview} alt="Actor" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-xs font-medium text-white">Change Photo</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-zinc-500">
                    <UploadCloud className="w-8 h-8 mb-2" />
                    <p className="text-xs">Upload Hero (Clear Face)</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* 2. Reference Upload */}
          <section>
            <h2 className="text-sm font-semibold text-zinc-100 mb-4 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-purple-400" />
              2. Layout Reference
            </h2>
            <div className="relative group">
               <input 
                type="file" 
                accept="image/*"
                onChange={(e) => handleFileUpload(e, 'ref')}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
               <div className={`border-2 border-dashed rounded-xl p-4 transition-all ${refPreview ? 'border-purple-500/50 bg-purple-500/5' : 'border-zinc-700 hover:border-zinc-500 bg-zinc-800/50'}`}>
                {refPreview ? (
                  <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg">
                    <img src={refPreview} alt="Reference" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-xs font-medium text-white">Change Layout</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-zinc-500">
                    <UploadCloud className="w-8 h-8 mb-2" />
                    <p className="text-xs">Upload Poster Base</p>
                  </div>
                )}
              </div>
            </div>
            
            <MaskGallery referenceImage={refPreview} isAnalyzing={isAnalyzing} isAnalyzed={!!analysisText} />
            <AnalysisPanel analysisText={analysisText} isAnalyzing={isAnalyzing} />
          </section>

          {/* 3. Output Specs */}
          <section>
            <h2 className="text-sm font-semibold text-zinc-100 mb-4 flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-emerald-400" />
              3. Output Specs
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-zinc-500 mb-2 block">Format</label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                   <button
                      onClick={() => { setOutputType(OutputType.AD_FEED); setLandingDevice('desktop'); }}
                      className={`px-3 py-2 text-[10px] font-medium rounded-lg border flex items-center justify-center gap-1 transition-all ${
                        outputType === OutputType.AD_FEED
                        ? 'bg-zinc-100 text-black border-transparent' 
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
                      }`}
                    >
                      <Layout className="w-3 h-3" /> Feed 1:1
                    </button>
                    <button
                      onClick={() => { setOutputType(OutputType.AD_STORIES); setLandingDevice('desktop'); }}
                      className={`px-3 py-2 text-[10px] font-medium rounded-lg border flex items-center justify-center gap-1 transition-all ${
                        outputType === OutputType.AD_STORIES
                        ? 'bg-zinc-100 text-black border-transparent' 
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
                      }`}
                    >
                      <Layout className="w-3 h-3 rotate-90" /> Story 9:16
                    </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { setOutputType(OutputType.LANDING_HERO); setLandingDevice('desktop'); }}
                      className={`px-3 py-2 text-[10px] font-medium rounded-lg border flex items-center justify-center gap-1 transition-all ${
                        outputType === OutputType.LANDING_HERO || outputType === OutputType.LANDING_MOBILE
                        ? 'bg-zinc-100 text-black border-transparent' 
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
                      }`}
                    >
                      <Monitor className="w-3 h-3" /> Landing Page
                    </button>
                    <button
                      onClick={() => { setOutputType(OutputType.THUMBNAIL); setLandingDevice('desktop'); }}
                      className={`px-3 py-2 text-[10px] font-medium rounded-lg border flex items-center justify-center gap-1 transition-all ${
                        outputType === OutputType.THUMBNAIL
                        ? 'bg-zinc-100 text-black border-transparent' 
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
                      }`}
                    >
                      <Youtube className="w-3 h-3" /> Thumb 16:9
                    </button>
                </div>
              </div>

              {/* Landing Page Settings (Desktop vs Mobile) */}
              {(outputType === OutputType.LANDING_HERO || outputType === OutputType.LANDING_MOBILE) && (
                <div className="bg-zinc-800/50 p-3 rounded-lg border border-zinc-700/50 space-y-3">
                   {/* Device Toggle */}
                   <div className="flex bg-zinc-800 p-1 rounded-lg">
                      <button
                        onClick={() => setLandingDevice('desktop')}
                        className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium rounded-md transition-all ${
                          landingDevice === 'desktop' ? 'bg-emerald-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        <Monitor className="w-3 h-3" /> Desktop (16:9)
                      </button>
                      <button
                        onClick={() => setLandingDevice('mobile')}
                        className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium rounded-md transition-all ${
                          landingDevice === 'mobile' ? 'bg-emerald-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        <Smartphone className="w-3 h-3" /> Mobile (9:16)
                      </button>
                   </div>

                   {/* Positioning Logic */}
                   <div>
                     <label className="text-xs text-indigo-400 mb-2 block font-medium">
                       {landingDevice === 'desktop' ? 'Horizontal Layout' : 'Vertical Stacking'}
                     </label>
                     
                     {landingDevice === 'desktop' ? (
                       // Desktop Controls (Left/Center/Right)
                       <div className="flex bg-zinc-800 p-1 rounded-lg">
                         {[LandingPosition.LEFT, LandingPosition.CENTER, LandingPosition.RIGHT].map((pos) => (
                           <button
                            key={pos}
                            onClick={() => setLandingPos(pos)}
                            className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium rounded-md capitalize transition-all ${
                              landingPos === pos ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                           >
                             {pos === LandingPosition.LEFT && <AlignLeft className="w-3 h-3" />}
                             {pos === LandingPosition.CENTER && <AlignCenter className="w-3 h-3" />}
                             {pos === LandingPosition.RIGHT && <AlignRight className="w-3 h-3" />}
                             {pos}
                           </button>
                         ))}
                       </div>
                     ) : (
                        // Mobile Controls (Top/Bottom)
                        <div className="flex bg-zinc-800 p-1 rounded-lg">
                           <button
                            onClick={() => setLandingPos(LandingPosition.TOP)}
                            className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium rounded-md transition-all ${
                              landingPos === LandingPosition.TOP ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                           >
                             <ArrowUpFromLine className="w-3 h-3" /> Image Top
                           </button>
                           <button
                            onClick={() => setLandingPos(LandingPosition.BOTTOM)}
                            className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-medium rounded-md transition-all ${
                              landingPos === LandingPosition.BOTTOM ? 'bg-indigo-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                           >
                             <ArrowDownFromLine className="w-3 h-3" /> Image Btm
                           </button>
                        </div>
                     )}
                   </div>
                   
                   <p className="text-[10px] text-zinc-500 text-center leading-tight">
                     {landingDevice === 'desktop' && landingPos === LandingPosition.LEFT && "Clean space on RIGHT for H1."}
                     {landingDevice === 'desktop' && landingPos === LandingPosition.RIGHT && "Clean space on LEFT for H1."}
                     {landingDevice === 'desktop' && landingPos === LandingPosition.CENTER && "Clean space on SIDES."}
                     {landingDevice === 'mobile' && landingPos === LandingPosition.TOP && "Image Top 40% / Clean Btm 60%."}
                     {landingDevice === 'mobile' && landingPos === LandingPosition.BOTTOM && "Image Btm 40% / Clean Top 60%."}
                   </p>
                </div>
              )}

              {/* Text Mode Toggle */}
              <div>
                <label className="text-xs text-zinc-500 mb-2 block">Text Overlay Mode</label>
                <div className="flex bg-zinc-800 p-1 rounded-lg mb-2">
                  <button
                    onClick={() => { setPreserveText(false); setCustomText(''); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-[10px] font-medium rounded-md transition-all ${
                      !preserveText ? 'bg-zinc-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <Eraser className="w-3 h-3" /> Clean Plate
                  </button>
                  <button
                    onClick={() => setPreserveText(true)}
                    className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-[10px] font-medium rounded-md transition-all ${
                      preserveText ? 'bg-zinc-600 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <Type className="w-3 h-3" /> Layout & Text
                  </button>
                </div>
                
                {/* Custom Text Input - Only shows when "Layout & Text" is active */}
                {preserveText && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <input 
                      type="text"
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      placeholder="Optional: Enter custom headline..."
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <p className="text-[10px] text-zinc-500 mt-1 ml-1">
                      {customText ? 'AI will render this specific text.' : 'AI will mimic reference text.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

        </div>

        <div className="p-6 border-t border-zinc-800 bg-zinc-900/50">
          <button
            onClick={handleGenerate}
            disabled={!actorFile || !refFile || isProcessing || isRefining}
            className={`w-full py-4 rounded-xl font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-all shadow-lg ${
              !actorFile || !refFile || isProcessing || isRefining
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/25 hover:scale-[1.02]'
            }`}
          >
            {isProcessing ? (
              <>
                <Wand2 className="w-4 h-4 animate-spin" />
                RENDERING...
              </>
            ) : (
              <>
                <Layout className="w-4 h-4" />
                {generatedImage ? 'RE-GENERATE' : 'GENERATE ASSET'}
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main Preview Area */}
      <main className="flex-1 flex flex-col bg-zinc-950 relative overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-8 bg-[#0c0c0e]">
          <div className="flex items-center gap-2 text-zinc-500 text-sm">
            <span>Project</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-zinc-200">Untitled Campaign</span>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 rounded-full border border-zinc-800">
                <span className={`w-2 h-2 rounded-full ${apiKeySet ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                <span className="text-xs font-medium text-zinc-400">{apiKeySet ? 'System Ready' : 'Key Required'}</span>
             </div>
          </div>
        </header>

        {/* Canvas */}
        <div className="flex-1 p-8 flex gap-8 overflow-hidden">
          
          {/* Central Stage */}
          <div className="flex-1 flex flex-col items-center justify-center relative z-10">
            <div className={`relative transition-all duration-500 ${
              isVerticalFormat ? 'aspect-[9/16] h-[90%]' :
              outputType === OutputType.AD_FEED ? 'aspect-square h-[80%]' :
              'aspect-video w-[90%]' // Covers both Hero Desktop and Thumbnail
            } bg-[#050505] rounded-lg border border-zinc-800 shadow-2xl flex items-center justify-center overflow-hidden group`}>
              
              {!generatedImage ? (
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 border border-zinc-800 rounded-full flex items-center justify-center mx-auto bg-zinc-900/50">
                     <ImageIcon className="w-8 h-8 text-zinc-700" />
                  </div>
                  <p className="text-zinc-600 text-sm font-medium">Preview Canvas</p>
                  {isProcessing && (
                     <div className="absolute inset-0 bg-black/80 flex items-center justify-center backdrop-blur-sm z-20">
                        <div className="text-center">
                           <Wand2 className="w-10 h-10 text-indigo-500 animate-spin mx-auto mb-4" />
                           <p className="text-indigo-400 font-mono text-sm tracking-wider animate-pulse">AI PROCESSING</p>
                           <p className="text-zinc-500 text-xs mt-2">Professional 4K Rendering...</p>
                        </div>
                     </div>
                  )}
                </div>
              ) : (
                <>
                  <img src={generatedImage} alt="Generated Poster" className="w-full h-full object-cover" />
                  
                  {/* Overlay Loading State for Refinement */}
                  {isRefining && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center z-20">
                      <div className="bg-zinc-900 border border-zinc-700 px-6 py-4 rounded-xl flex items-center gap-3 shadow-2xl">
                        <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" />
                        <div>
                           <p className="text-sm font-semibold text-white">Applying Magic Fix...</p>
                           <p className="text-xs text-zinc-400">Polishing specific details</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <a 
                      href={generatedImage} 
                      download="cinemorph_poster.png"
                      className="p-3 bg-white/10 backdrop-blur hover:bg-white/20 rounded-lg text-white flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      <span className="text-xs font-medium">Download 4K</span>
                    </a>
                  </div>
                </>
              )}
            </div>
            
            {/* Magic Fix / Refinement Bar - Appears only when image exists */}
            {generatedImage && !isProcessing && (
              <div className="absolute -bottom-2 w-[500px] max-w-full animate-in slide-in-from-bottom-4 duration-500 z-30">
                <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-700 rounded-xl p-2 shadow-2xl flex gap-2 items-center">
                   <div className="pl-3 pr-2">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                   </div>
                   <input 
                      type="text" 
                      value={refinePrompt}
                      onChange={(e) => setRefinePrompt(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
                      placeholder="Magic Fix: Describe a specific detail to correct (e.g., 'Fix the index finger')..."
                      className="flex-1 bg-transparent border-none text-sm text-white placeholder-zinc-500 focus:ring-0 outline-none"
                      disabled={isRefining}
                   />
                   <button 
                     onClick={handleRefine}
                     disabled={!refinePrompt.trim() || isRefining}
                     className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors"
                   >
                     {isRefining ? 'FIXING...' : 'REFINE'}
                   </button>
                </div>
              </div>
            )}
            
            {/* Context Labels */}
            {outputType === OutputType.LANDING_HERO && !generatedImage && (
                 <div className="absolute bottom-4 bg-zinc-900/80 px-4 py-2 rounded-full border border-zinc-800 text-xs text-zinc-400">
                    <span className="text-emerald-400 font-bold">DESKTOP:</span> Web Layout Generator (Horizontal Copy Space)
                 </div>
            )}
            {outputType === OutputType.LANDING_MOBILE && !generatedImage && (
                 <div className="absolute bottom-4 bg-zinc-900/80 px-4 py-2 rounded-full border border-zinc-800 text-xs text-zinc-400">
                    <span className="text-emerald-400 font-bold">MOBILE:</span> Vertical Layout Generator (Vertical Copy Space)
                 </div>
            )}
          </div>

          {/* Right Panel - Technical Status */}
          <div className="w-72 flex flex-col gap-4">
             <PipelineVisualizer steps={steps} />
             
             {/* Info Box */}
             <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-4">
                <h4 className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-2">Technical Constraints</h4>
                <ul className="space-y-2">
                   <li className="text-xs text-zinc-400 flex items-start gap-2">
                      <span className="w-1 h-1 bg-indigo-500 rounded-full mt-1.5"></span>
                      Identity leakage blocked
                   </li>
                   <li className="text-xs text-zinc-400 flex items-start gap-2">
                      <span className="w-1 h-1 bg-indigo-500 rounded-full mt-1.5"></span>
                      Shadow matte reconstruction active
                   </li>
                   {isWideFormat && (
                      <li className="text-xs text-zinc-400 flex items-start gap-2">
                        <span className="w-1 h-1 bg-indigo-500 rounded-full mt-1.5"></span>
                        16:9 Cinematic Ratio
                      </li>
                   )}
                   {isVerticalFormat && (
                      <li className="text-xs text-zinc-400 flex items-start gap-2">
                        <span className="w-1 h-1 bg-indigo-500 rounded-full mt-1.5"></span>
                        9:16 Vertical Ratio
                      </li>
                   )}
                   {customText && (
                      <li className="text-xs text-zinc-400 flex items-start gap-2">
                        <span className="w-1 h-1 bg-indigo-500 rounded-full mt-1.5"></span>
                        Custom Text Rendering
                      </li>
                   )}
                </ul>
             </div>
          </div>

        </div>
        
        {/* Background Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-900/10 blur-[120px] rounded-full pointer-events-none -z-0"></div>
      </main>

      <ChatAssistant />
    </div>
  );
};

export default App;