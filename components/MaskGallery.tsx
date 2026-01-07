import React from 'react';
import { Layers } from 'lucide-react';

interface MaskGalleryProps {
  referenceImage: string | null;
  isAnalyzing: boolean;
  isAnalyzed: boolean;
}

const MaskGallery: React.FC<MaskGalleryProps> = ({ referenceImage, isAnalyzing, isAnalyzed }) => {
  if (!referenceImage) return null;

  // Simulate mask visualization using CSS filters on the original image
  // In a real backend implementation, these would be separate image URLs returned by the segmentation engine.
  const masks = [
    { name: 'Binary Mask', filter: 'grayscale(100%) contrast(200%) brightness(150%)' },
    { name: 'Depth Map', filter: 'grayscale(100%) blur(1px) invert(80%)' },
    { name: 'Lighting Est.', filter: 'sepia(100%) hue-rotate(180deg) saturate(200%)' },
    { name: 'Shadow Matte', filter: 'grayscale(100%) brightness(50%) contrast(150%)' },
  ];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 mt-4">
      <div className="flex items-center gap-2 mb-4">
        <Layers className="w-4 h-4 text-zinc-400" />
        <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">
          Segmentation Engine Output
        </h3>
      </div>
      
      {isAnalyzing ? (
        <div className="grid grid-cols-2 gap-2 animate-pulse">
           {[1, 2, 3, 4].map(i => (
             <div key={i} className="aspect-square bg-zinc-800 rounded-md"></div>
           ))}
        </div>
      ) : isAnalyzed ? (
        <div className="grid grid-cols-2 gap-3">
          {masks.map((mask) => (
            <div key={mask.name} className="group relative aspect-square rounded-md overflow-hidden bg-black border border-zinc-800 cursor-pointer hover:border-indigo-500 transition-colors">
              <img 
                src={referenceImage} 
                alt={mask.name}
                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                style={{ filter: mask.filter }}
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm px-2 py-1">
                <p className="text-[10px] text-zinc-300 font-mono text-center">{mask.name}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="h-32 flex items-center justify-center text-zinc-600 text-xs text-center border border-dashed border-zinc-800 rounded-md">
          Awaiting Analysis...
        </div>
      )}
    </div>
  );
};

export default MaskGallery;
