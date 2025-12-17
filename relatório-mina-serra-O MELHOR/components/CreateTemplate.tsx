import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveTemplate } from '../utils/storage';
import { ArrowLeft, Save, FileType } from 'lucide-react';

const CreateTemplate: React.FC = () => {
  const navigate = useNavigate();
  const [omDescription, setOmDescription] = useState('');
  const [activityExecuted, setActivityExecuted] = useState('');

  const handleSave = () => {
    if (!omDescription || !activityExecuted) {
      alert("Por favor, preencha todos os campos.");
      return;
    }

    saveTemplate({
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(), // Fallback for older browsers
      omDescription,
      activityExecuted,
      createdAt: Date.now(),
    });

    navigate('/');
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-100 px-4 py-4 flex items-center sticky top-0 z-20">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-slate-600">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold text-slate-800 ml-2">Novo Modelo</h1>
      </div>

      <div className="p-6 space-y-6 flex-1">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
             <FileType className="w-5 h-5 text-blue-600 mt-0.5" />
             <p className="text-sm text-blue-800 leading-relaxed">
               Este modelo servirá de base para futuros relatórios. 
               <br/>
               <span className="font-semibold">Nota:</span> A Descrição da OM e a Atividade Executada serão fixas nos relatórios gerados a partir deste modelo.
             </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            📝 Descrição da OM
          </label>
          <input
            type="text"
            value={omDescription}
            onChange={(e) => setOmDescription(e.target.value)}
            placeholder="Ex: Manutenção Preventiva Correia 01"
            className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            🛠 Atividade Executada
          </label>
          <textarea
            value={activityExecuted}
            onChange={(e) => setActivityExecuted(e.target.value)}
            placeholder="Ex: Inspeção de roletes, troca de rolamento..."
            rows={4}
            className="w-full bg-white border border-slate-300 rounded-lg p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      <div className="p-4 bg-white border-t border-slate-100">
        <button
          onClick={handleSave}
          className="w-full bg-blue-600 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-blue-600/20 active:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
        >
          <Save className="w-5 h-5" />
          <span>Salvar Modelo</span>
        </button>
      </div>
    </div>
  );
};

export default CreateTemplate;