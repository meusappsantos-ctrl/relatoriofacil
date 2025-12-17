import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { getTemplates, saveReport } from '../utils/storage';
import { ReportTemplate, ReportData, Team, WorkCenter, ReportPhoto } from '../types';
import { TEAMS, WORK_CENTERS } from '../constants';
import { generatePDF } from '../utils/pdfGenerator';
import { ArrowLeft, Camera, X, Check, AlertTriangle, FileText, Download, Image as ImageIcon, RotateCcw, Pencil, MessageSquare, Save, AlertCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import ImageEditor from './ImageEditor';

const ReportForm: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [template, setTemplate] = useState<ReportTemplate | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
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

  // --- Validation Logic ---
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Basic Fields
    if (!formData.date) newErrors.date = "A data é obrigatória.";
    
    // OM Validation (Numeric and Required)
    if (!formData.omNumber) {
        newErrors.omNumber = "O número da OM é obrigatório.";
    } else if (isNaN(Number(formData.omNumber))) {
        newErrors.omNumber = "O número da OM deve conter apenas números.";
    }

    if (!formData.equipment) newErrors.equipment = "Informe o equipamento.";

    // Time Validation
    if (!formData.startTime) newErrors.startTime = "Horário inicial obrigatório.";
    if (!formData.endTime) newErrors.endTime = "Horário final obrigatório.";
    
    if (formData.startTime && formData.endTime) {
        if (formData.endTime <= formData.startTime) {
            newErrors.endTime = "O horário final deve ser posterior ao inicial.";
        }
    }

    // IAMO Validation
    if (formData.iamoDeviation) {
        if (!formData.iamoPeriod) newErrors.iamoPeriod = "Informe o período do desvio.";
        if (!formData.iamoReason) newErrors.iamoReason = "Informe o motivo do desvio.";
    }

    // Pending Validation
    if (formData.hasPending && !formData.pendingDescription) {
        newErrors.pendingDescription = "Descreva a pendência encontrada.";
    }

    // Team & Technicians
    if (!formData.team) newErrors.team = "Selecione o turno.";
    if (!formData.workCenter) newErrors.workCenter = "Selecione o centro de trabalho.";
    if (!formData.technicians || formData.technicians.trim().length === 0) {
        newErrors.technicians = "Informe os técnicos envolvidos.";
    }

    setErrors(newErrors);

    // Return true if no errors
    if (Object.keys(newErrors).length > 0) {
        // Scroll to top or first error could be implemented here
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return false;
    }
    return true;
  };

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
    // Clear error for this field when user types
    if (errors[field]) {
        setErrors(prev => {
            const newErrs = { ...prev };
            delete newErrs[field];
            return newErrs;
        });
    }

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
    // Basic validation for Drafts
    if (template && formData.omNumber && formData.equipment) {
        try {
            const reportToSave: ReportData = {
              ...(formData as ReportData),
              id: formData.id || uuidv4(),
              templateId: template.id
            };
            saveReport(reportToSave);
            alert("Rascunho salvo no histórico!");
            navigate('/');
        } catch (error) {
            console.error(error);
            alert("Erro ao salvar relatório.");
        }
    } else {
        alert("Preencha ao menos o Nº da OM e Equipamento para salvar o rascunho.");
    }
  };

  const handleSubmit = async () => {
    if (!template) return;

    if (validateForm()) {
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
            console.error("PDF Generation Error:", error);
            setIsGenerating(false);
            alert(`Erro ao gerar PDF: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
        }
    }
  };

  // Helper for input classes based on error state
  const getInputClass = (fieldName: string) => `w-full input-field ${errors[fieldName] ? 'border-red-500 focus:ring-red-900/50' : ''}`;

  if (!template) return <div className="p-8 text-center text-gray-500 dark:text-slate-500">Carregando...</div>;

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-slate-900 pb-20 transition-colors duration-300">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 py-3 flex items-center sticky top-0 z-30 shadow-md">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="ml-2 flex-1">
          <h1 className="text-sm font-bold text-gray-800 dark:text-white leading-tight">RELATÓRIO DE EXECUÇÃO</h1>
          <p className="text-xs text-gray-500 dark:text-slate-400">AUTOMAÇÃO – MINA SERRA SUL</p>
        </div>
      </div>

      <div className="p-4 space-y-6 max-w-lg mx-auto w-full">
        
        {/* Read Only Section */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700 shadow-sm space-y-3">
          <div>
            <label className="flex items-center text-xs font-bold text-gray-500 dark:text-slate-500 mb-1 uppercase tracking-wide">
              <FileText className="w-3 h-3 mr-1" /> Descrição da OM
            </label>
            <p className="text-gray-900 dark:text-white font-medium">{template.omDescription}</p>
          </div>
          
          <div className="border-t border-gray-100 dark:border-slate-700 pt-3">
            <label className="flex items-center text-xs font-bold text-gray-500 dark:text-slate-500 mb-1 uppercase tracking-wide">
               <FileText className="w-3 h-3 mr-1" /> Atividade Executada
            </label>
            {formData.activityType === 'Corretiva' ? (
                <textarea
                    value={formData.activityExecuted || ''}
                    onChange={(e) => handleChange('activityExecuted', e.target.value)}
                    className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-md text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-inner transition-all"
                    rows={3}
                    placeholder="Descreva a atividade corretiva..."
                />
            ) : (
                <p className="text-gray-900 dark:text-white font-medium">{template.activityExecuted}</p>
            )}
          </div>

          <div className="border-t border-gray-100 dark:border-slate-700 pt-3">
             <label className="flex items-center text-xs font-bold text-gray-500 dark:text-slate-500 mb-1 uppercase tracking-wide">
               <MessageSquare className="w-3 h-3 mr-1" /> Observações
            </label>
             <textarea
                value={formData.observations || ''}
                onChange={(e) => handleChange('observations', e.target.value)}
                className="w-full mt-1 p-2 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-md text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-inner transition-all"
                rows={2}
                placeholder="Observações adicionais (opcional)..."
            />
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-slate-400 mb-1">🗓 Data <span className="text-red-500">*</span></label>
              <input type="date" value={formData.date} onChange={e => handleChange('date', e.target.value)} className={getInputClass('date')} />
              {errors.date && <p className="text-xs text-red-500 dark:text-red-400 mt-1 flex items-center"><AlertCircle className="w-3 h-3 mr-1"/>{errors.date}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-slate-400 mb-1">📂 Nº OM <span className="text-red-500">*</span></label>
              <input 
                type="number" 
                placeholder="12345" 
                value={formData.omNumber || ''} 
                onChange={e => handleChange('omNumber', e.target.value)} 
                className={getInputClass('omNumber')} 
              />
              {errors.omNumber && <p className="text-xs text-red-500 dark:text-red-400 mt-1 flex items-center"><AlertCircle className="w-3 h-3 mr-1"/>{errors.omNumber}</p>}
            </div>
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-600 dark:text-slate-400 mb-1">🚜 Equipamento <span className="text-red-500">*</span></label>
             <input type="text" placeholder="Ex: TR-001" value={formData.equipment || ''} onChange={e => handleChange('equipment', e.target.value)} className={getInputClass('equipment')} />
             {errors.equipment && <p className="text-xs text-red-500 dark:text-red-400 mt-1 flex items-center"><AlertCircle className="w-3 h-3 mr-1"/>{errors.equipment}</p>}
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-600 dark:text-slate-400 mb-1">🛠 Tipo de Atividade</label>
             <div className="flex bg-white dark:bg-slate-800 rounded-lg p-1 border border-gray-300 dark:border-slate-700">
                {['Preventiva', 'Corretiva'].map((type) => (
                    <button
                        key={type}
                        onClick={() => handleChange('activityType', type)}
                        className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${formData.activityType === type ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white'}`}
                    >
                        {type}
                    </button>
                ))}
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-slate-400 mb-1">⏰ Horário Inicial <span className="text-red-500">*</span></label>
              <input type="time" value={formData.startTime || ''} onChange={e => handleChange('startTime', e.target.value)} className={getInputClass('startTime')} />
              {errors.startTime && <p className="text-xs text-red-500 dark:text-red-400 mt-1 flex items-center"><AlertCircle className="w-3 h-3 mr-1"/>{errors.startTime}</p>}
            </div>
             <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-slate-400 mb-1">⏰ Horário Final <span className="text-red-500">*</span></label>
              <input type="time" value={formData.endTime || ''} onChange={e => handleChange('endTime', e.target.value)} className={getInputClass('endTime')} />
              {errors.endTime && <p className="text-xs text-red-500 dark:text-red-400 mt-1 flex items-center"><AlertCircle className="w-3 h-3 mr-1"/>{errors.endTime}</p>}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
             <div className="flex items-center justify-between mb-2">
                 <label className="text-sm font-medium text-gray-700 dark:text-slate-300 flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-1 text-amber-500" />
                    🛑 Desvio IAMO
                 </label>
                 <div className="flex items-center space-x-3">
                     <label className="flex items-center space-x-1 cursor-pointer">
                         <input type="radio" name="iamo" checked={!formData.iamoDeviation} onChange={() => handleChange('iamoDeviation', false)} className="accent-blue-600 w-4 h-4" />
                         <span className="text-sm text-gray-700 dark:text-slate-300">Não</span>
                     </label>
                     <label className="flex items-center space-x-1 cursor-pointer">
                         <input type="radio" name="iamo" checked={!!formData.iamoDeviation} onChange={() => handleChange('iamoDeviation', true)} className="accent-blue-600 w-4 h-4" />
                         <span className="text-sm text-gray-700 dark:text-slate-300">Sim</span>
                     </label>
                 </div>
             </div>
             
             {formData.iamoDeviation && (
                 <div className="space-y-3 mt-3 pt-3 border-t border-gray-100 dark:border-slate-700 animate-fadeIn">
                     <div>
                        <input 
                            type="text" 
                            placeholder="Período" 
                            value={formData.iamoPeriod || ''} 
                            onChange={e => handleChange('iamoPeriod', e.target.value)}
                            className={getInputClass('iamoPeriod')} 
                        />
                        {errors.iamoPeriod && <p className="text-xs text-red-500 dark:text-red-400 mt-1 flex items-center"><AlertCircle className="w-3 h-3 mr-1"/>{errors.iamoPeriod}</p>}
                     </div>
                     <div>
                        <textarea 
                            placeholder="Motivo do desvio" 
                            value={formData.iamoReason || ''} 
                            onChange={e => handleChange('iamoReason', e.target.value)}
                            className={getInputClass('iamoReason')} 
                            rows={2}
                        />
                        {errors.iamoReason && <p className="text-xs text-red-500 dark:text-red-400 mt-1 flex items-center"><AlertCircle className="w-3 h-3 mr-1"/>{errors.iamoReason}</p>}
                     </div>
                 </div>
             )}
          </div>

           <div className="grid grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-gray-200 dark:border-slate-700">
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-500 mb-2">🎯 OM FINALIZADA?</label>
                     <div className="flex space-x-4">
                        <label className="flex items-center space-x-1"><input type="radio" checked={!!formData.isFinished} onChange={() => handleChange('isFinished', true)} className="accent-green-600"/> <span className="text-sm text-gray-700 dark:text-slate-300">Sim</span></label>
                        <label className="flex items-center space-x-1"><input type="radio" checked={!formData.isFinished} onChange={() => handleChange('isFinished', false)} className="accent-red-600"/> <span className="text-sm text-gray-700 dark:text-slate-300">Não</span></label>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-gray-200 dark:border-slate-700">
                    <label className="block text-xs font-bold text-gray-500 dark:text-slate-500 mb-2">🔔 PENDÊNCIAS?</label>
                     <div className="flex space-x-4">
                        <label className="flex items-center space-x-1"><input type="radio" checked={!!formData.hasPending} onChange={() => handleChange('hasPending', true)} className="accent-amber-600"/> <span className="text-sm text-gray-700 dark:text-slate-300">Sim</span></label>
                        <label className="flex items-center space-x-1"><input type="radio" checked={!formData.hasPending} onChange={() => handleChange('hasPending', false)} className="accent-blue-600"/> <span className="text-sm text-gray-700 dark:text-slate-300">Não</span></label>
                    </div>
                    {formData.hasPending && (
                       <div className="mt-3 pt-2 border-t border-gray-100 dark:border-slate-700 animate-fadeIn">
                           <textarea 
                              placeholder="Descreva a pendência..." 
                              value={formData.pendingDescription || ''} 
                              onChange={e => handleChange('pendingDescription', e.target.value)}
                              className={getInputClass('pendingDescription')}
                              rows={2}
                           />
                           {errors.pendingDescription && <p className="text-xs text-red-500 dark:text-red-400 mt-1 flex items-center"><AlertCircle className="w-3 h-3 mr-1"/>{errors.pendingDescription}</p>}
                       </div>
                   )}
                </div>
           </div>

           <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-slate-400 mb-1">📈 Equipe (Turno) <span className="text-red-500">*</span></label>
              <select value={formData.team} onChange={e => handleChange('team', e.target.value)} className={getInputClass('team')}>
                  <option value="">Selecione...</option>
                  {TEAMS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {errors.team && <p className="text-xs text-red-500 dark:text-red-400 mt-1 flex items-center"><AlertCircle className="w-3 h-3 mr-1"/>{errors.team}</p>}
           </div>

           <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-slate-400 mb-1">🔖 Centro de Trabalho <span className="text-red-500">*</span></label>
              <select value={formData.workCenter} onChange={e => handleChange('workCenter', e.target.value)} className={getInputClass('workCenter')}>
                  <option value="">Selecione...</option>
                  {WORK_CENTERS.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
              {errors.workCenter && <p className="text-xs text-red-500 dark:text-red-400 mt-1 flex items-center"><AlertCircle className="w-3 h-3 mr-1"/>{errors.workCenter}</p>}
           </div>

           <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-slate-400 mb-1">👥 Técnicos <span className="text-red-500">*</span></label>
              <textarea 
                value={formData.technicians || ''} 
                onChange={e => handleChange('technicians', e.target.value)} 
                placeholder="Nome dos técnicos..."
                className={getInputClass('technicians')}
                rows={3}
              />
              {errors.technicians && <p className="text-xs text-red-500 dark:text-red-400 mt-1 flex items-center"><AlertCircle className="w-3 h-3 mr-1"/>{errors.technicians}</p>}
           </div>

           {/* Photo Section */}
           <div className="space-y-3 pt-4">
               <div className="flex items-center justify-between">
                   <label className="text-sm font-bold text-gray-800 dark:text-slate-300">📸 Registros Fotográficos</label>
                   <div className="flex items-center space-x-2">
                     <button 
                      onClick={() => galleryInputRef.current?.click()}
                      className="text-gray-700 dark:text-slate-300 text-xs font-semibold flex items-center bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                     >
                         <ImageIcon className="w-4 h-4 mr-1.5 text-blue-600 dark:text-blue-400" /> Galeria
                     </button>
                     <button 
                      onClick={startCamera}
                      className="text-gray-700 dark:text-slate-300 text-xs font-semibold flex items-center bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                     >
                         <Camera className="w-4 h-4 mr-1.5 text-blue-600 dark:text-blue-400" /> Câmera
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
                           <div key={idx} className="bg-white dark:bg-slate-800 p-2 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm flex flex-col">
                               <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-slate-900 mb-2 group">
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
                                  className="w-full text-xs text-gray-900 dark:text-white bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none"
                               />
                           </div>
                       ))}
                   </div>
               ) : (
                   <div className="text-center py-8 bg-gray-50 dark:bg-slate-900/50 rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-700">
                       <p className="text-gray-500 dark:text-slate-500 text-xs">Nenhuma foto adicionada</p>
                   </div>
               )}
           </div>

        </div>

        {/* Floating Action Button for PDF */}
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] dark:shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)]">
             <div className="flex space-x-3">
                 <button 
                    onClick={handleSaveOnly}
                    className="flex-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 font-bold py-2.5 rounded-lg text-sm shadow-sm flex items-center justify-center space-x-2 transition-transform active:scale-[0.98]"
                 >
                     <Save className="w-4 h-4" />
                     <span>Salvar</span>
                 </button>
                 
                 <button 
                    onClick={handleSubmit}
                    disabled={isGenerating}
                    className="flex-[2] bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 disabled:text-slate-400 text-white font-bold py-2.5 rounded-lg text-sm shadow-lg shadow-blue-900/40 flex items-center justify-center space-x-2 transition-transform active:scale-[0.98]"
                 >
                     {isGenerating ? (
                        <span>Gerando...</span>
                     ) : (
                        <>
                            <Download className="w-4 h-4" />
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
              <div className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
                  <button onClick={stopCamera} className="p-2 bg-slate-800/50 backdrop-blur-md rounded-full text-white hover:bg-slate-700/50">
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
                            className="flex flex-col items-center justify-center text-white space-y-1 hover:text-slate-300"
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
                              <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/50 hover:bg-blue-500">
                                  <Check className="w-8 h-8" />
                              </div>
                              <span className="text-xs">Confirmar</span>
                          </button>
                      </>
                  ) : (
                      <button 
                        onClick={takePicture}
                        className="w-16 h-16 rounded-full bg-white border-4 border-slate-300 shadow-lg active:scale-95 transition-transform hover:bg-slate-200"
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
              background-color: var(--input-bg, #f9fafb);
              border: 1px solid var(--input-border, #d1d5db);
              border-radius: 0.75rem;
              padding: 0.875rem;
              font-size: 0.95rem;
              color: var(--input-text, #111827); 
              outline: none;
              transition: all 0.2s;
              box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.05);
          }
          .dark .input-field {
              background-color: #0f172a; /* slate-900 */
              border-color: #334155; /* slate-700 */
              color: white;
              box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.2);
          }
          .input-field:focus {
              border-color: #3b82f6;
              box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
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