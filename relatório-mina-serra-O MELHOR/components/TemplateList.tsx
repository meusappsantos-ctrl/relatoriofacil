import React, { useState, useEffect, useRef } from 'react';
import { ReportTemplate, ReportData } from '../types';
import { FileText, Plus, Trash2, ChevronRight, History, FileCheck, Database, Download, Upload, X, LogOut, Search, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { deleteTemplate, getTemplates, getReports, deleteReport, exportBackup, importBackup } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';

const TemplateList: React.FC = () => {
  const navigate = useNavigate();
  const { logout, currentUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'templates' | 'history'>('templates');
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [reports, setReports] = useState<ReportData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  // Modals state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'template' | 'report';
    id: string | null;
  }>({
    isOpen: false,
    type: 'template',
    id: null,
  });

  const [backupModalOpen, setBackupModalOpen] = useState(false);

  const loadData = () => {
    setTemplates(getTemplates());
    setReports(getReports());
  };

  useEffect(() => {
    loadData();

    // PWA Install Event Listener
    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    // Optionally, send analytics event with outcome of user choice
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  // --- Deletion Logic ---
  const handleDeleteTemplate = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); 
    setDeleteModal({ isOpen: true, type: 'template', id });
  };

  const handleDeleteReport = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); 
    setDeleteModal({ isOpen: true, type: 'report', id });
  };

  const confirmDelete = () => {
    if (deleteModal.id) {
      if (deleteModal.type === 'template') {
        deleteTemplate(deleteModal.id);
      } else {
        deleteReport(deleteModal.id);
      }
      loadData();
    }
    setDeleteModal({ ...deleteModal, isOpen: false });
  };

  // --- Backup Logic ---
  const handleExport = () => {
    const jsonString = exportBackup();
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_mina_serra_sul_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importBackup(content);
      if (success) {
        alert("Backup restaurado com sucesso!");
        loadData();
        setBackupModalOpen(false);
      } else {
        alert("Erro ao restaurar backup. Verifique se o arquivo é válido.");
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const handleReportClick = (report: ReportData) => {
    navigate(`/report/${report.templateId}`, { state: { reportData: report } });
  };

  // --- Search Logic ---
  const filteredTemplates = templates.filter(t => 
    t.omDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.activityExecuted.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredReports = reports.filter(r => 
    r.omNumber.includes(searchTerm) ||
    r.equipment.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.date.includes(searchTerm)
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="bg-slate-900 text-white p-6 pb-6 rounded-b-[2.5rem] shadow-lg relative z-10 transition-all duration-300">
        <div className="flex justify-between items-center mb-4">
            <div>
               <h1 className="text-2xl font-bold">Mina Serra Sul</h1>
               {currentUser && <p className="text-xs text-slate-400">Olá, {currentUser}</p>}
            </div>
            <div className="flex items-center space-x-2">
                {/* Install Button - Only shows if available */}
                {deferredPrompt && (
                  <button 
                      onClick={handleInstallClick}
                      className="p-2 bg-gradient-to-br from-green-500 to-emerald-700 rounded-full hover:shadow-lg transition-all animate-pulse"
                      title="Instalar Aplicativo"
                  >
                      <Smartphone className="w-5 h-5 text-white" />
                  </button>
                )}

                <button 
                    onClick={() => setBackupModalOpen(true)}
                    className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors"
                    title="Backup e Restauração"
                >
                    <Database className="w-5 h-5 text-blue-400" />
                </button>
                <button 
                    onClick={logout}
                    className="p-2 bg-slate-800 rounded-full hover:bg-red-900/50 transition-colors"
                    title="Sair"
                >
                    <LogOut className="w-5 h-5 text-red-400" />
                </button>
            </div>
        </div>
        
        {/* Search Bar */}
        <div className="relative mb-4">
            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <input 
                type="text" 
                placeholder={activeTab === 'templates' ? "Buscar modelos..." : "Buscar relatórios (OM, Equip...)"}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800 text-white placeholder-slate-400 rounded-xl border border-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
            />
            {searchTerm && (
                <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-3 text-slate-400 hover:text-white"
                >
                    <X className="w-4 h-4" />
                </button>
            )}
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-800/50 p-1 rounded-xl backdrop-blur-sm">
          <button 
            onClick={() => setActiveTab('templates')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center space-x-2 ${activeTab === 'templates' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            <FileText className="w-4 h-4" />
            <span>Modelos</span>
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center space-x-2 ${activeTab === 'history' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
            <History className="w-4 h-4" />
            <span>Histórico</span>
          </button>
        </div>
      </div>

      <div className="flex-1 px-4 pt-4 relative z-0 overflow-y-auto pb-24">
        
        {activeTab === 'templates' ? (
          <>
            <div className="mb-4 ml-1 text-xs font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                <span>Modelos Disponíveis</span>
                <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{filteredTemplates.length}</span>
            </div>
            
            {filteredTemplates.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-slate-100">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="text-slate-400 w-8 h-8" />
                </div>
                <h3 className="text-lg font-medium text-slate-800">{searchTerm ? 'Nenhum resultado' : 'Nenhum Modelo'}</h3>
                <p className="text-slate-500 text-sm mt-2">{searchTerm ? 'Tente buscar por outro termo.' : 'Crie seu primeiro modelo de relatório para começar.'}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTemplates.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => navigate(`/report/${t.id}`)}
                    className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 active:scale-[0.98] transition-transform flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center space-x-4 overflow-hidden">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-800 truncate pr-2">{t.omDescription}</h3>
                        <p className="text-xs text-slate-500 truncate">{t.activityExecuted}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button 
                        onClick={(e) => handleDeleteTemplate(e, t.id)}
                        className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all z-10"
                        title="Excluir"
                      >
                        <Trash2 className="w-5 h-5 pointer-events-none" />
                      </button>
                      <ChevronRight className="w-5 h-5 text-slate-300" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
             <div className="mb-4 ml-1 text-xs font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                 <span>Relatórios Salvos</span>
                 <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{filteredReports.length}</span>
             </div>

             {filteredReports.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-slate-100">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <History className="text-slate-400 w-8 h-8" />
                </div>
                <h3 className="text-lg font-medium text-slate-800">{searchTerm ? 'Nenhum resultado' : 'Sem Histórico'}</h3>
                <p className="text-slate-500 text-sm mt-2">{searchTerm ? 'Tente buscar por OM ou Equipamento.' : 'Os relatórios gerados aparecerão aqui.'}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReports.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => handleReportClick(r)}
                    className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 active:scale-[0.98] transition-transform flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center space-x-4 overflow-hidden">
                      <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                        <FileCheck className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-800 truncate pr-2">OM: {r.omNumber}</h3>
                        <p className="text-xs text-slate-500 truncate">{r.equipment} • {r.date.split('-').reverse().join('/')}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button 
                        onClick={(e) => handleDeleteReport(e, r.id)}
                        className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all z-10"
                         title="Excluir"
                      >
                        <Trash2 className="w-5 h-5 pointer-events-none" />
                      </button>
                      <ChevronRight className="w-5 h-5 text-slate-300" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {activeTab === 'templates' && (
        <div className="fixed bottom-6 right-6 z-30">
          <button
            onClick={() => navigate('/create')}
            className="bg-blue-600 hover:bg-blue-700 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-xl shadow-blue-600/30 transition-transform active:scale-90"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 transform transition-all scale-100">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 mx-auto">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 text-center mb-2">Excluir {deleteModal.type === 'template' ? 'Modelo' : 'Relatório'}?</h3>
            <p className="text-slate-500 text-center text-sm mb-6">
              Essa ação não pode ser desfeita. Você tem certeza que deseja remover este item permanentemente?
            </p>
            <div className="flex space-x-3">
              <button 
                onClick={() => setDeleteModal({ ...deleteModal, isOpen: false })}
                className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 py-3 px-4 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-600/30"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backup Modal */}
      {backupModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
                  <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="font-bold text-slate-800 flex items-center">
                          <Database className="w-5 h-5 mr-2 text-blue-600" />
                          Backup de Dados
                      </h3>
                      <button onClick={() => setBackupModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  
                  <div className="p-6 space-y-4">
                      <p className="text-sm text-slate-600 mb-4">
                          Salve seus modelos e relatórios em um arquivo seguro ou restaure dados de um backup anterior.
                      </p>

                      <button 
                          onClick={handleExport}
                          className="w-full flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 transition-colors group"
                      >
                          <div className="flex items-center">
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3 group-hover:bg-blue-200">
                                  <Download className="w-5 h-5 text-blue-600" />
                              </div>
                              <div className="text-left">
                                  <div className="font-semibold text-slate-800">Exportar Backup</div>
                                  <div className="text-xs text-slate-500">Baixar arquivo .json</div>
                              </div>
                          </div>
                      </button>

                      <button 
                          onClick={handleImportClick}
                          className="w-full flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-xl hover:bg-emerald-100 transition-colors group"
                      >
                          <div className="flex items-center">
                              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center mr-3 group-hover:bg-emerald-200">
                                  <Upload className="w-5 h-5 text-emerald-600" />
                              </div>
                              <div className="text-left">
                                  <div className="font-semibold text-slate-800">Importar Backup</div>
                                  <div className="text-xs text-slate-500">Carregar arquivo .json</div>
                              </div>
                          </div>
                      </button>

                      {/* Hidden File Input */}
                      <input 
                          type="file" 
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept=".json"
                          className="hidden"
                      />
                  </div>
              </div>
          </div>
      )}

      <style>{`
          @keyframes fadeIn {
              from { opacity: 0; transform: scale(0.95); }
              to { opacity: 1; transform: scale(1); }
          }
          .animate-fadeIn {
              animation: fadeIn 0.2s ease-out forwards;
          }
      `}</style>
    </div>
  );
};

export default TemplateList;