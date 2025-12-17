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
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-slate-900 transition-colors duration-300">
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 py-4 flex items-center sticky top-0 z-20 shadow-md">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold text-gray-800 dark:text-white ml-2">Novo Modelo</h1>
      </div>

      <div className="p-6 space-y-6 flex-1">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
             <FileType className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
             <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
               Este modelo servirá de base para futuros relatórios. 
               <br/>
               <span className="font-semibold text-blue-900 dark:text-blue-100">Nota:</span> A Descrição da OM e a Atividade Executada serão fixas nos relatórios gerados a partir deste modelo.
             </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1">
            📝 Descrição da OM
          </label>
          <input
            type="text"
            value={omDescription}
            onChange={(e) => setOmDescription(e.target.value)}
            placeholder="Ex: Manutenção Preventiva Correia 01"
            className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg p-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1">
            🛠 Atividade Executada
          </label>
          <textarea
            value={activityExecuted}
            onChange={(e) => setActivityExecuted(e.target.value)}
            placeholder="Ex: Inspeção de roletes, troca de rolamento..."
            rows={4}
            className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg p-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="p-4 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700">
        <button
          onClick={handleSave}
          className="w-full bg-blue-600 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-blue-900/20 dark:shadow-blue-900/40 hover:bg-blue-500 transition-colors flex items-center justify-center space-x-2"
        >
          <Save className="w-5 h-5" />
          <span>Salvar Modelo</span>
        </button>
      </div>
    </div>
  );
};

export default CreateTemplate;