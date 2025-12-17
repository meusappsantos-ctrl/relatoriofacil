import React, { useRef, useState, useEffect } from 'react';
import { X, Check, Undo, Palette, Type, Brush } from 'lucide-react';

interface ImageEditorProps {
  imageSrc: string;
  onSave: (newImage: string) => void;
  onCancel: () => void;
}

const COLORS = [
  { hex: '#dc2626', name: 'Vermelho' }, // Red 600
  { hex: '#eab308', name: 'Amarelo' },  // Yellow 500
  { hex: '#16a34a', name: 'Verde' },    // Green 600
  { hex: '#000000', name: 'Preto' },
  { hex: '#ffffff', name: 'Branco' },
];

const ImageEditor: React.FC<ImageEditorProps> = ({ imageSrc, onSave, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedColor, setSelectedColor] = useState('#dc2626');
  const [activeTool, setActiveTool] = useState<'brush' | 'text'>('brush');
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<string[]>([]); // To support Undo
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Text Input State
  const [pendingText, setPendingText] = useState<{ x: number, y: number } | null>(null);
  const [textValue, setTextValue] = useState("");

  // Load image and setup canvas
  useEffect(() => {
    const image = new Image();
    image.src = imageSrc;
    image.onload = () => {
      if (containerRef.current && canvasRef.current) {
        const container = containerRef.current;
        const maxWidth = container.clientWidth;
        const maxHeight = container.clientHeight;

        // Calculate aspect ratio to fit image within container
        const ratio = Math.min(maxWidth / image.width, maxHeight / image.height);
        const width = image.width * ratio;
        const height = image.height * ratio;

        setCanvasSize({ width, height });
        
        const canvas = canvasRef.current;
        canvas.width = image.width; // Use actual image resolution for quality
        canvas.height = image.height;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Draw white background first (for transparent PNGs)
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          saveToHistory(); // Initial state
        }
      }
    };
  }, [imageSrc]);

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      setHistory(prev => [...prev.slice(-10), canvas.toDataURL()]); // Keep last 10 steps
    }
  };

  const handleUndo = () => {
    if (history.length <= 1) return;
    
    const newHistory = [...history];
    newHistory.pop(); // Remove current state
    const previousState = newHistory[newHistory.length - 1];
    setHistory(newHistory);

    const img = new Image();
    img.src = previousState;
    img.onload = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      }
    };
  };

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const handleInteractionStart = (e: React.MouseEvent | React.TouchEvent) => {
    // If text input is open, don't start new interaction
    if (pendingText) return;

    e.preventDefault(); // Prevent scrolling
    const { x, y } = getCoordinates(e);

    if (activeTool === 'text') {
        setPendingText({ x, y });
        setTextValue("");
    } else {
        // Brush Mode
        setIsDrawing(true);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.strokeStyle = selectedColor;
          ctx.lineWidth = canvasRef.current!.width * 0.01; // Scale line width based on image size
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
        }
    }
  };

  const handleInteractionMove = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing || activeTool !== 'brush') return;
    const { x, y } = getCoordinates(e);
    
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const handleInteractionEnd = () => {
    if (isDrawing) {
      setIsDrawing(false);
      const ctx = canvasRef.current?.getContext('2d');
      ctx?.closePath();
      saveToHistory();
    }
  };

  const confirmText = () => {
    if (pendingText && textValue.trim() && canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
            const { x, y } = pendingText;
            const fontSize = canvasRef.current.width * 0.05; // 5% of width
            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Stroke (outline) for contrast
            ctx.strokeStyle = selectedColor === '#ffffff' ? '#000000' : '#ffffff';
            ctx.lineWidth = fontSize * 0.15;
            ctx.strokeText(textValue, x, y);
            
            // Fill
            ctx.fillStyle = selectedColor;
            ctx.fillText(textValue, x, y);
            
            saveToHistory();
        }
    }
    setPendingText(null);
    setTextValue("");
  };

  const handleSave = () => {
    if (canvasRef.current) {
      // Export with 0.8 quality
      onSave(canvasRef.current.toDataURL('image/jpeg', 0.8));
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 bg-black/50 backdrop-blur-sm absolute top-0 left-0 right-0 z-10">
        <button onClick={onCancel} className="p-2 text-white bg-white/10 rounded-full">
          <X className="w-6 h-6" />
        </button>
        <div className="flex flex-col items-center">
             <span className="text-white font-medium">Editar Foto</span>
             <span className="text-xs text-slate-300">
                 {activeTool === 'brush' ? 'Deslize para desenhar' : 'Toque na foto para adicionar texto'}
             </span>
        </div>
        <button onClick={handleSave} className="p-2 text-white bg-blue-600 rounded-full shadow-lg shadow-blue-900/50">
          <Check className="w-6 h-6" />
        </button>
      </div>

      {/* Canvas Container */}
      <div 
        ref={containerRef} 
        className="flex-1 flex items-center justify-center p-4 overflow-hidden touch-none relative"
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleInteractionStart}
          onMouseMove={handleInteractionMove}
          onMouseUp={handleInteractionEnd}
          onMouseLeave={handleInteractionEnd}
          onTouchStart={handleInteractionStart}
          onTouchMove={handleInteractionMove}
          onTouchEnd={handleInteractionEnd}
          style={{
            width: canvasSize.width,
            height: canvasSize.height,
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            boxShadow: '0 0 20px rgba(0,0,0,0.5)'
          }}
        />

        {/* Custom Text Input Overlay */}
        {pendingText && (
            <div className="absolute top-4 left-4 right-4 z-50 flex flex-col items-center animate-fadeIn">
               <div className="bg-white p-2 rounded-xl shadow-2xl flex w-full max-w-md">
                   <input 
                     autoFocus
                     type="text"
                     value={textValue}
                     onChange={(e) => setTextValue(e.target.value)}
                     placeholder="Digite seu texto..."
                     className="flex-1 p-2 outline-none text-slate-900"
                     onKeyDown={(e) => {
                         if (e.key === 'Enter') confirmText();
                     }}
                   />
                   <button 
                     onClick={confirmText}
                     className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-lg font-semibold ml-2"
                   >
                     OK
                   </button>
                   <button 
                     onClick={() => setPendingText(null)}
                     className="text-slate-400 hover:text-slate-600 px-3 ml-1"
                   >
                     <X className="w-5 h-5" />
                   </button>
               </div>
               <div className="mt-2 text-white text-xs drop-shadow-md bg-black/50 px-2 py-1 rounded">
                   Dica: O texto será inserido onde você tocou.
               </div>
            </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="bg-slate-900 border-t border-slate-800 p-4 pb-8 safe-bottom">
        <div className="flex flex-col space-y-4 max-w-sm mx-auto">
          
          {/* Top Row: Tools */}
          <div className="flex items-center justify-center space-x-6">
             <button 
                onClick={handleUndo}
                disabled={history.length <= 1}
                className={`p-2 rounded-full flex flex-col items-center ${history.length <= 1 ? 'text-slate-600' : 'text-slate-300 hover:text-white'}`}
             >
                <Undo className="w-6 h-6" />
                <span className="text-[10px] mt-1">Desfazer</span>
             </button>

             <div className="h-8 w-px bg-slate-700"></div>

             <button 
                onClick={() => setActiveTool('brush')}
                className={`p-2 rounded-xl flex flex-col items-center transition-all ${activeTool === 'brush' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
             >
                <Brush className="w-6 h-6" />
                <span className="text-[10px] mt-1">Pincel</span>
             </button>

             <button 
                onClick={() => setActiveTool('text')}
                className={`p-2 rounded-xl flex flex-col items-center transition-all ${activeTool === 'text' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
             >
                <Type className="w-6 h-6" />
                <span className="text-[10px] mt-1">Texto</span>
             </button>
          </div>

          {/* Bottom Row: Colors */}
          <div className="flex items-center justify-center space-x-4 bg-slate-800/50 p-3 rounded-2xl">
            {COLORS.map((color) => (
              <button
                key={color.hex}
                onClick={() => setSelectedColor(color.hex)}
                className={`w-8 h-8 rounded-full border-2 transition-transform ${selectedColor === color.hex ? 'border-white scale-110 shadow-md' : 'border-transparent opacity-80'}`}
                style={{ backgroundColor: color.hex }}
                aria-label={color.name}
              />
            ))}
          </div>

        </div>
      </div>
      <style>{`
          @keyframes fadeIn {
              from { opacity: 0; transform: translateY(-10px); }
              to { opacity: 1; transform: translateY(0); }
          }
          .animate-fadeIn {
              animation: fadeIn 0.2s ease-out forwards;
          }
      `}</style>
    </div>
  );
};

export default ImageEditor;