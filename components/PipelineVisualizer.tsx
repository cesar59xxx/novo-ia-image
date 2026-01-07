import React from 'react';
import { CheckCircle2, Circle, Loader2, AlertCircle } from 'lucide-react';
import { ProcessingStep } from '../types';

interface PipelineVisualizerProps {
  steps: ProcessingStep[];
}

const PipelineVisualizer: React.FC<PipelineVisualizerProps> = ({ steps }) => {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 w-full">
      <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-4">
        Pipeline Status
      </h3>
      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={step.id} className="relative">
            {index !== steps.length - 1 && (
              <div 
                className={`absolute left-3 top-8 w-0.5 h-6 -ml-px ${
                  step.status === 'completed' ? 'bg-emerald-500/30' : 'bg-zinc-800'
                }`} 
              />
            )}
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {step.status === 'completed' && <CheckCircle2 className="w-6 h-6 text-emerald-500" />}
                {step.status === 'processing' && <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />}
                {step.status === 'pending' && <Circle className="w-6 h-6 text-zinc-700" />}
                {step.status === 'error' && <AlertCircle className="w-6 h-6 text-red-500" />}
              </div>
              <div>
                <p className={`text-sm font-medium ${
                  step.status === 'processing' ? 'text-indigo-400' :
                  step.status === 'completed' ? 'text-zinc-200' : 
                  'text-zinc-500'
                }`}>
                  {step.name}
                </p>
                {step.details && (
                  <p className="text-xs text-zinc-500 mt-1">{step.details}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PipelineVisualizer;
