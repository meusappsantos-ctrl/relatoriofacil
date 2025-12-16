import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { getTemplates, saveReport } from '../utils/storage';
import { ReportTemplate, ReportData, Team, WorkCenter, ReportPhoto } from '../types';
import { TEAMS, WORK_CENTERS } from '../constants';
import { generatePDF } from '../utils/pdfGenerator';
import { ArrowLeft, Camera, X, Check, AlertTriangle, FileText, Share2, Image as ImageIcon, RotateCcw, Pencil, MessageSquare, Save } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import ImageEditor from './ImageEditor';

const ReportForm: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [template, setTemplate] = useState<ReportTemplate | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Camera Interface State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);

  // Editor State
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  
  // Refs
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<ReportData>>({
    date: new Date().toISOString().split('T')[0],
    activityType: 'Preventiva',
    isFinished: true,
    hasPending: false,
    iamoDeviation: false,
    photos: []
  });

  useEffect(() => {
    const templates = getTemplates();
    const found = templates.find(t => t.id === templateId);
    
    if (found) {
      setTemplate(found);
      
      const existingReport = location.state?.reportData as any; // Use any to handle migration
      
      if (existingReport) {
        // Migration: Check if photos are strings and convert to objects
        let safePhotos: ReportPhoto[] = [];
        if (Array.isArray(existingReport.photos)) {
            safePhotos = existingReport.photos.map((p: any) => {
                if (typeof p === 'string') return { uri: p, caption: '' };
                return p;
            });
        }

        setFormData({
            ...existingReport,
            photos: safePhotos
        });
      } else {
        setFormData(prev => ({ 
            ...prev, 
            templateId: found.id,
            activityExecuted: found.activityExecuted 
        }));
      }
    } else {
      navigate('/');
    }
  }, [templateId, navigate, location.state]);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // --- Camera Logic ---

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Prefer back camera
        audio: false
      });
      setCameraStream(stream);
      setIsCameraOpen(true);
      // Slight delay to ensure video element is rendered
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Não foi possível acessar a câmera diretamente. Usando método padrão.");
      // Fallback to standard input
      const fallbackInput = document.createElement('input');
      fallbackInput.type = 'file';
      fallbackInput.accept = 'image/*';
      fallbackInput.capture = 'environment';
      fallbackInput.onchange = (e: any) => handlePhotoUpload(e);
      fallbackInput.click();
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraOpen(false);
    setCapturedPreview(null);
  };

  const takePicture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Match canvas size to video size
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageBase64 = canvas.toDataURL('image/jpeg', 0.8); // 0.8 quality
        setCapturedPreview(imageBase64);
      }
    }
  };

  const confirmPicture = () => {
    if (capturedPreview) {
      stopCamera();
      // Add directly to photos with empty caption
      setFormData(prev => ({
        ...prev,
        photos: [...(prev.photos || []), { uri: capturedPreview, caption: '' }]
      }));
    }
  };

  const retakePicture = () => {
    setCapturedPreview(null);
  };

  // --- End Camera Logic ---

  // --- Editor Logic ---
  const handleEditSave = (newImageUri: string) => {
    if (editingIndex !== null) {
      setFormData(prev => {
        const newPhotos = [...(prev.photos || [])];
        if (newPhotos[editingIndex]) {
          newPhotos[editingIndex] = { ...newPhotos[editingIndex], uri: newImageUri };
        }
        return { ...prev, photos: newPhotos };
      });
      setEditingIndex(null);
    }
  };
  // --- End Editor Logic ---

  const handleChange = (field: keyof ReportData, value: any) => {
    setFormData(prev => {
        const updates: Partial<ReportData> = { [field]: value };
        if (field === 'activityType' && value === 'Preventiva' && template) {
            updates.activityExecuted = template.activityExecuted;
        }
        return { ...prev, ...updates };
    });
  };

  const handleCaptionChange = (index: number, caption: string) => {
      setFormData(prev => {
          const newPhotos = [...(prev.photos || [])];
          newPhotos[index] = { ...newPhotos[index], caption };
          return { ...prev, photos: newPhotos };
      });
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const promises = files.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
             resolve(reader.result as string);
          };
          reader.readAsDataURL(file as Blob);
        });
      });

      Promise.all(promises).then(base64Images => {
        const newPhotoObjects = base64Images.map(uri => ({ uri, caption: '' }));
        setFormData(prev => ({
          ...prev,
          photos: [...(prev.photos || []), ...newPhotoObjects]
        }));
      });
      e.target.value = '';
    }
  };

  const removePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos?.filter((_, i) => i !== index)
    }));
  };

  // Save only to history/localStorage without generating PDF
  const handleSaveOnly = async () => {
    if (template && formData.omNumber) {
        try {
            const reportToSave: ReportData = {
              ...(formData as ReportData),
              id: formData.id || uuidv4(),
              templateId: template.id
            };
            saveReport(reportToSave);
            alert("Relatório salvo no histórico!");
            navigate('/');
        } catch (error) {
            console.error(error);
            alert("Erro ao salvar relatório.");
        }
    } else {
        alert("Preencha pelo menos o Nº da OM para salvar o rascunho.");
    }
  };

  const handleSubmit = async () => {
    if (template && formData.omNumber && formData.equipment) {
        setIsGenerating(true);
        try {
            const reportToSave: ReportData = {
              ...(formData as ReportData),
              id: formData.id || uuidv4(),
              templateId: template.id
            };
            saveReport(reportToSave);
            await generatePDF(template, reportToSave);
            navigate('/'); 
        } catch (error) {
            console.error(error);
            setIsGenerating(false);
        }
    } else {
        alert("Preencha o Nº da OM e Equipamento para gerar o PDF.");
    }
  };

  if (!template) return <div className="p-8 text-center text-slate-500">Carregando...</div>;

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center sticky top-0 z-30 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-600">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="ml-2 flex-1">
          <h1 className="text-sm font-bold text-slate-800 leading-tight">RELATÓRIO DE EXECUÇÃO</h1>
          <p className="text-xs text-slate-500">AUTOMAÇÃO – MINA SERRA SUL</p>
        </div>
      </div>

      <div className="p-4 space-y-6 max-w-lg mx-auto w-full">
        
        {/* Read Only Section */}
        <div className="bg-slate-100 rounded-xl p-4 border border-slate-200 space-y-3">
          <div>
            <label className="flex items-center text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">
              <FileText className="w-3 h-3 mr-1" /> Descrição da OM
            </label>
            <p className="text-slate-800 font-medium">{template.omDescription}</p>
          </div>
          
          <div className="border-t border-slate-200 pt-3">
            <label className="flex items-center text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">
               <FileText className="w-3 h-3 mr-1" /> Atividade Executada
            </label>
            {formData.activityType === 'Corretiva' ? (
                <textarea
                    value={formData.activityExecuted || ''}
                    onChange={(e) => handleChange('activityExecuted', e.target.value)}
                    className="w-full mt-1 p-2 bg-white border border-slate-300 rounded-md text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all"
                    rows={3}
                    placeholder="Descreva a atividade corretiva..."
                />
            ) : (
                <p className="text-slate-800 font-medium">{template.activityExecuted}</p>
            )}
          </div>

          <div className="border-t border-slate-200 pt-3">
             <label className="flex items-center text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">
               <MessageSquare className="w-3 h-3 mr-1" /> Observações
            </label>
             <textarea
                value={formData.observations || ''}
                onChange={(e) => handleChange('observations', e.target.value)}
                className="w-full mt-1 p-2 bg-white border border-slate-300 rounded-md text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all"
                rows={2}
                placeholder="Observações adicionais (opcional)..."
            />
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">🗓 Data</label>
              <input type="date" value={formData.date} onChange={e => handleChange('date', e.target.value)} className="w-full input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">📂 Nº OM</label>
              <input 
                type="number" 
                placeholder="12345" 
                value={formData.omNumber || ''} 
                onChange={e => handleChange('omNumber', e.target.value)} 
                className="w-full input-field" 
              />
            </div>
          </div>

          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">🚜 Equipamento</label>
             <input type="text" placeholder="Ex: TR-001" value={formData.equipment || ''} onChange={e => handleChange('equipment', e.target.value)} className="w-full input-field" />
          </div>

          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">🛠 Tipo de Atividade</label>
             <div className="flex bg-white rounded-lg p-1 border border-slate-200">
                {['Preventiva', 'Corretiva'].map((type) => (
                    <button
                        key={type}
                        onClick={() => handleChange('activityType', type)}
                        className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${formData.activityType === type ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        {type}
                    </button>
                ))}
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">⏰ Horário Inicial</label>
              <input type="time" value={formData.startTime || ''} onChange={e => handleChange('startTime', e.target.value)} className="w-full input-field" />
            </div>
             <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">⏰ Horário Final</label>
              <input type="time" value={formData.endTime || ''} onChange={e => handleChange('endTime', e.target.value)} className="w-full input-field" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
             <div className="flex items-center justify-between mb-2">
                 <label className="text-sm font-medium text-slate-700 flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-1 text-amber-500" />
                    🛑 Desvio IAMO
                 </label>
                 <div className="flex items-center space-x-3">
                     <label className="flex items-center space-x-1 cursor-pointer">
                         <input type="radio" name="iamo" checked={!formData.iamoDeviation} onChange={() => handleChange('iamoDeviation', false)} className="accent-blue-600 w-4 h-4" />
                         <span className="text-sm">Não</span>
                     </label>
                     <label className="flex items-center space-x-1 cursor-pointer">
                         <input type="radio" name="iamo" checked={!!formData.iamoDeviation} onChange={() => handleChange('iamoDeviation', true)} className="accent-blue-600 w-4 h-4" />
                         <span className="text-sm">Sim</span>
                     </label>
                 </div>
             </div>
             
             {formData.iamoDeviation && (
                 <div className="space-y-3 mt-3 pt-3 border-t border-slate-100 animate-fadeIn">
                     <input 
                        type="text" 
                        placeholder="Período" 
                        value={formData.iamoPeriod || ''} 
                        onChange={e => handleChange('iamoPeriod', e.target.value)}
                        className="w-full input-field text-sm" 
                     />
                     <textarea 
                        placeholder="Motivo do desvio" 
                        value={formData.iamoReason || ''} 
                        onChange={e => handleChange('iamoReason', e.target.value)}
                        className="w-full input-field text-sm" 
                        rows={2}
                     />
                 </div>
             )}
          </div>

           <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <label className="block text-xs font-bold text-slate-500 mb-2">🎯 OM FINALIZADA?</label>
                     <div className="flex space-x-4">
                        <label className="flex items-center space-x-1"><input type="radio" checked={!!formData.isFinished} onChange={() => handleChange('isFinished', true)} className="accent-green-600"/> <span className="text-sm">Sim</span></label>
                        <label className="flex items-center space-x-1"><input type="radio" checked={!formData.isFinished} onChange={() => handleChange('isFinished', false)} className="accent-red-600"/> <span className="text-sm">Não</span></label>
                    </div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <label className="block text-xs font-bold text-slate-500 mb-2">🔔 PENDÊNCIAS?</label>
                     <div className="flex space-x-4">
                        <label className="flex items-center space-x-1"><input type="radio" checked={!!formData.hasPending} onChange={() => handleChange('hasPending', true)} className="accent-amber-600"/> <span className="text-sm">Sim</span></label>
                        <label className="flex items-center space-x-1"><input type="radio" checked={!formData.hasPending} onChange={() => handleChange('hasPending', false)} className="accent-blue-600"/> <span className="text-sm">Não</span></label>
                    </div>
                    {formData.hasPending && (
                       <div className="mt-3 pt-2 border-t border-slate-100 animate-fadeIn">
                           <textarea 
                              placeholder="Descreva a pendência..." 
                              value={formData.pendingDescription || ''} 
                              onChange={e => handleChange('pendingDescription', e.target.value)}
                              className="w-full input-field text-sm" 
                              rows={2}
                           />
                       </div>
                   )}
                </div>
           </div>

           <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">📈 Equipe (Turno)</label>
              <select value={formData.team} onChange={e => handleChange('team', e.target.value)} className="w-full input-field">
                  <option value="">Selecione...</option>
                  {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
           </div>

           <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">🔖 Centro de Trabalho</label>
              <select value={formData.workCenter} onChange={e => handleChange('workCenter', e.target.value)} className="w-full input-field">
                  <option value="">Selecione...</option>
                  {WORK_CENTERS.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
           </div>

           <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">👥 Técnicos</label>
              <textarea 
                value={formData.technicians || ''} 
                onChange={e => handleChange('technicians', e.target.value)} 
                placeholder="Nome dos técnicos..."
                className="w-full input-field"
                rows={3}
              />
           </div>

           {/* Photo Section */}
           <div className="space-y-3 pt-4">
               <div className="flex items-center justify-between">
                   <label className="text-sm font-bold text-slate-700">📸 Registros Fotográficos</label>
                   <div className="flex items-center space-x-2">
                     <button 
                      onClick={() => galleryInputRef.current?.click()}
                      className="text-slate-700 text-xs font-semibold flex items-center bg-white border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                     >
                         <ImageIcon className="w-4 h-4 mr-1.5 text-blue-600" /> Galeria
                     </button>
                     <button 
                      onClick={startCamera}
                      className="text-slate-700 text-xs font-semibold flex items-center bg-white border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                     >
                         <Camera className="w-4 h-4 mr-1.5 text-blue-600" /> Câmera
                     </button>
                   </div>
                   
                   {/* Hidden Inputs */}
                   <input 
                    type="file" 
                    ref={galleryInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    multiple 
                    onChange={handlePhotoUpload} 
                   />
               </div>
               
               {formData.photos && formData.photos.length > 0 ? (
                   <div className="grid grid-cols-2 gap-3">
                       {formData.photos.map((photo, idx) => (
                           <div key={idx} className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                               <div className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 mb-2 group">
                                   <img src={photo.uri} alt={`Evidência ${idx + 1}`} className="w-full h-full object-cover" />
                                   
                                   <div className="absolute top-1 right-1 flex space-x-1">
                                       <button 
                                        onClick={() => setEditingIndex(idx)}
                                        className="bg-blue-600 text-white rounded-full p-1.5 opacity-90 shadow-sm hover:opacity-100"
                                        title="Editar / Marcar"
                                       >
                                           <Pencil className="w-3.5 h-3.5" />
                                       </button>
                                       <button 
                                        onClick={() => removePhoto(idx)}
                                        className="bg-red-500 text-white rounded-full p-1.5 opacity-90 shadow-sm hover:opacity-100"
                                        title="Remover"
                                       >
                                           <X className="w-3.5 h-3.5" />
                                       </button>
                                   </div>
                               </div>
                               <input 
                                  type="text" 
                                  placeholder="Escrever legenda..." 
                                  value={photo.caption}
                                  onChange={(e) => handleCaptionChange(idx, e.target.value)}
                                  className="w-full text-xs text-slate-700 bg-slate-50 border-0 rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none"
                               />
                           </div>
                       ))}
                   </div>
               ) : (
                   <div className="text-center py-8 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                       <p className="text-slate-400 text-xs">Nenhuma foto adicionada</p>
                   </div>
               )}
           </div>

        </div>

        {/* Floating Action Button for PDF */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
             <div className="flex space-x-3">
                 <button 
                    onClick={handleSaveOnly}
                    className="flex-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold py-3.5 rounded-xl shadow-sm flex items-center justify-center space-x-2 transition-transform active:scale-[0.98]"
                 >
                     <Save className="w-5 h-5" />
                     <span>Salvar</span>
                 </button>
                 
                 <button 
                    onClick={handleSubmit}
                    disabled={isGenerating}
                    className="flex-[2] bg-slate-900 hover:bg-slate-800 disabled:bg-slate-600 text-white font-bold py-3.5 rounded-xl shadow-lg flex items-center justify-center space-x-2 transition-transform active:scale-[0.98]"
                 >
                     {isGenerating ? (
                        <span>Gerando...</span>
                     ) : (
                        <>
                            <Share2 className="w-5 h-5" />
                            <span>Gerar PDF</span>
                        </>
                     )}
                 </button>
             </div>
        </div>
      </div>

      {/* CUSTOM CAMERA MODAL */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
           {/* Canvas for capture (hidden) */}
           <canvas ref={canvasRef} className="hidden"></canvas>
           
           <div className="relative flex-1 flex flex-col">
              {/* Top Controls */}
              <div className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-center bg-gradient-to-b from-black/50 to-transparent">
                  <button onClick={stopCamera} className="p-2 bg-black/20 backdrop-blur-md rounded-full text-white">
                      <X className="w-6 h-6" />
                  </button>
                  <span className="text-white font-medium drop-shadow-md">
                      {capturedPreview ? 'Revisar Foto' : 'Tirar Foto'}
                  </span>
                  <div className="w-10"></div> {/* Spacer */}
              </div>

              {/* Main Viewport */}
              <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
                  {capturedPreview ? (
                      <img src={capturedPreview} alt="Preview" className="w-full h-full object-contain" />
                  ) : (
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        className="w-full h-full object-cover"
                      />
                  )}
              </div>

              {/* Bottom Controls */}
              <div className="h-32 bg-black flex items-center justify-center space-x-12 pb-6 pt-4">
                  {capturedPreview ? (
                      <>
                          <button 
                            onClick={retakePicture}
                            className="flex flex-col items-center justify-center text-white space-y-1"
                          >
                              <div className="w-14 h-14 rounded-full bg-slate-800 flex items-center justify-center border border-slate-600">
                                  <RotateCcw className="w-6 h-6" />
                              </div>
                              <span className="text-xs">Tirar Outra</span>
                          </button>

                          <button 
                            onClick={confirmPicture}
                            className="flex flex-col items-center justify-center text-white space-y-1"
                          >
                              <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/50">
                                  <Check className="w-8 h-8" />
                              </div>
                              <span className="text-xs">Confirmar</span>
                          </button>
                      </>
                  ) : (
                      <button 
                        onClick={takePicture}
                        className="w-16 h-16 rounded-full bg-white border-4 border-slate-300 shadow-lg active:scale-95 transition-transform"
                      ></button>
                  )}
              </div>
           </div>
        </div>
      )}
      
      {/* IMAGE EDITOR MODAL */}
      {editingIndex !== null && formData.photos && formData.photos[editingIndex] && (
        <ImageEditor 
            imageSrc={formData.photos[editingIndex].uri}
            onSave={handleEditSave}
            onCancel={() => setEditingIndex(null)}
        />
      )}

      <style>{`
          .input-field {
              background-color: white;
              border: 1px solid #cbd5e1;
              border-radius: 0.5rem;
              padding: 0.75rem;
              font-size: 0.95rem;
              color: #1e293b;
              outline: none;
              transition: all 0.2s;
          }
          .input-field:focus {
              border-color: #3b82f6;
              box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }
          @keyframes fadeIn {
              from { opacity: 0; transform: translateY(-5px); }
              to { opacity: 1; transform: translateY(0); }
          }
          .animate-fadeIn {
              animation: fadeIn 0.3s ease-out forwards;
          }
      `}</style>
    </div>
  );
};

export default ReportForm;