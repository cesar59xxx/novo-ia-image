import React from 'react';
import { ScanSearch, Sparkles } from 'lucide-react';

interface AnalysisPanelProps {
  analysisText: string | null;
  isAnalyzing: boolean;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ analysisText, isAnalyzing }) => {
  if (!analysisText && !isAnalyzing) return null;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <ScanSearch className="w-4 h-4 text-amber-500" />
        <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">
          AI Scene Analysis
        </h3>
      </div>
      
      {isAnalyzing ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-4 bg-zinc-800 rounded w-3/4"></div>
          <div className="h-4 bg-zinc-800 rounded w-full"></div>
          <div className="h-4 bg-zinc-800 rounded w-5/6"></div>
        </div>
      ) : (
        <div className="text-zinc-400 text-xs leading-relaxed max-h-40 overflow-y-auto pr-1 custom-scrollbar">
            <p className="whitespace-pre-line">{analysisText}</p>
        </div>
      )}
    </div>
  );
};

export default AnalysisPanel;
