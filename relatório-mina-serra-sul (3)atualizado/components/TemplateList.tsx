import React, { useState, useEffect, useRef } from 'react';
import { ReportTemplate, ReportData } from '../types';
import { FileText, Plus, Trash2, ChevronRight, History, FileCheck, Database, Download, Upload, X, LogOut, Search, Smartphone, Sun, Moon, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { deleteTemplate, getTemplates, getReports, deleteReport, exportBackup, importBackup } from '../utils/storage';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const TemplateList: React.FC = () => {
  const navigate = useNavigate();
  const { logout, currentUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'templates' | 'history'>('templates');
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [reports, setReports] = useState<ReportData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Menu State
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
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
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
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
    <div className="flex flex-col h-full bg-gray-100 dark:bg-slate-900 relative transition-colors duration-300">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 px-6 pt-6 pb-6 rounded-b-[2rem] shadow-lg shadow-gray-200 dark:shadow-black/20 border-b border-gray-200 dark:border-slate-700 relative z-10 transition-colors duration-300">
        <div className="flex justify-between items-center mb-5">
            <div>
               <h1 className="text-2xl font-bold text-gray-800 dark:text-white tracking-tight">Mina Serra Sul</h1>
               {currentUser && <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">Olá, {currentUser}</p>}
            </div>
            <div className="flex items-center space-x-2">
                
                {deferredPrompt && (
                  <button 
                      onClick={handleInstallClick}
                      className="flex items-center gap-2 px-3 py-2 bg-gradient-to-br from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white rounded-full shadow-lg shadow-green-500/30 hover:shadow-green-500/50 transition-all active:scale-95 animate-fadeIn"
                      title="Instalar Aplicativo"
                  >
                      <Smartphone className="w-4 h-4 animate-pulse" />
                      <span className="text-xs font-bold whitespace-nowrap">Instalar</span>
                  </button>
                )}

                {/* Dropdown Menu */}
                <div className="relative">
                    <button 
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="p-2 bg-gray-100 dark:bg-slate-700 rounded-full hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors border border-gray-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                        <MoreVertical className="w-5 h-5 text-gray-600 dark:text-slate-300" />
                    </button>

                    {isMenuOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}></div>
                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 z-50 overflow-hidden animate-fadeIn origin-top-right">
                                <button 
                                    onClick={() => { toggleTheme(); setIsMenuOpen(false); }}
                                    className="w-full text-left px-4 py-3 flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-slate-700 text-sm font-medium text-gray-700 dark:text-slate-200 transition-colors"
                                >
                                    {theme === 'dark' ? <Sun className="w-4 h-4 text-yellow-500" /> : <Moon className="w-4 h-4 text-blue-500" />}
                                    <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
                                </button>
                                
                                <button 
                                    onClick={() => { setBackupModalOpen(true); setIsMenuOpen(false); }}
                                    className="w-full text-left px-4 py-3 flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-slate-700 text-sm font-medium text-gray-700 dark:text-slate-200 transition-colors"
                                >
                                    <Database className="w-4 h-4 text-blue-500" />
                                    <span>Backup</span>
                                </button>
                                
                                <div className="h-px bg-gray-100 dark:bg-slate-700 my-0"></div>
                                
                                <button 
                                    onClick={() => { logout(); setIsMenuOpen(false); }}
                                    className="w-full text-left px-4 py-3 flex items-center space-x-3 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium text-red-600 dark:text-red-400 transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span>Sair</span>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
        
        {/* Search Bar */}
        <div className="relative mb-6">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400 dark:text-slate-500" />
            <input 
                type="text" 
                placeholder={activeTab === 'templates' ? "Buscar modelos..." : "Buscar relatórios..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500 rounded-xl border border-gray-200 dark:border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm font-medium"
            />
            {searchTerm && (
                <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300"
                >
                    <X className="w-4 h-4" />
                </button>
            )}
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 dark:bg-slate-900 p-1 rounded-xl border border-gray-200 dark:border-slate-700">
          <button 
            onClick={() => setActiveTab('templates')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center space-x-2 ${activeTab === 'templates' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300'}`}
          >
            <FileText className="w-4 h-4" />
            <span>Modelos</span>
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center justify-center space-x-2 ${activeTab === 'history' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300'}`}
          >
            <History className="w-4 h-4" />
            <span>Histórico</span>
          </button>
        </div>
      </div>

      <div className="flex-1 px-4 pt-6 relative z-0 overflow-y-auto pb-24">
        
        {activeTab === 'templates' ? (
          <>
            <div className="mb-4 ml-2 text-xs font-bold text-gray-500 dark:text-slate-500 uppercase tracking-wider flex justify-between items-center">
                <span>Modelos Disponíveis</span>
                <span className="text-[10px] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 px-2 py-0.5 rounded-full">{filteredTemplates.length}</span>
            </div>
            
            {filteredTemplates.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 text-center shadow-sm border border-gray-200 dark:border-slate-700 mt-4 transition-colors duration-300">
                <div className="w-16 h-16 bg-gray-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100 dark:border-slate-700">
                  <FileText className="text-blue-500 w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">{searchTerm ? 'Nenhum resultado' : 'Nenhum Modelo'}</h3>
                <p className="text-gray-500 dark:text-slate-500 text-sm mt-2">{searchTerm ? 'Tente buscar por outro termo.' : 'Crie seu primeiro modelo de relatório para começar.'}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTemplates.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => navigate(`/report/${t.id}`)}
                    className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm dark:shadow-lg dark:shadow-black/10 border border-gray-200 dark:border-slate-700 active:scale-[0.98] transition-all flex items-center justify-between group cursor-pointer hover:border-blue-400 dark:hover:border-blue-500/50"
                  >
                    <div className="flex items-center space-x-4 overflow-hidden">
                      <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0 border border-blue-100 dark:border-blue-900/50">
                        <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-800 dark:text-slate-100 truncate pr-2 text-base">{t.omDescription}</h3>
                        <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{t.activityExecuted}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button 
                        onClick={(e) => handleDeleteTemplate(e, t.id)}
                        className="p-3 text-gray-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all z-10"
                        title="Excluir"
                      >
                        <Trash2 className="w-5 h-5 pointer-events-none" />
                      </button>
                      <ChevronRight className="w-5 h-5 text-gray-400 dark:text-slate-600" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
             <div className="mb-4 ml-2 text-xs font-bold text-gray-500 dark:text-slate-500 uppercase tracking-wider flex justify-between items-center">
                 <span>Relatórios Salvos</span>
                 <span className="text-[10px] bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 px-2 py-0.5 rounded-full">{filteredReports.length}</span>
             </div>

             {filteredReports.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-10 text-center shadow-sm border border-gray-200 dark:border-slate-700 mt-4 transition-colors duration-300">
                <div className="w-16 h-16 bg-gray-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100 dark:border-slate-700">
                  <History className="text-green-500 w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">{searchTerm ? 'Nenhum resultado' : 'Sem Histórico'}</h3>
                <p className="text-gray-500 dark:text-slate-500 text-sm mt-2">{searchTerm ? 'Tente buscar por OM ou Equipamento.' : 'Os relatórios gerados aparecerão aqui.'}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredReports.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => handleReportClick(r)}
                    className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm dark:shadow-lg dark:shadow-black/10 border border-gray-200 dark:border-slate-700 active:scale-[0.98] transition-all flex items-center justify-between group cursor-pointer hover:border-green-400 dark:hover:border-green-500/50"
                  >
                    <div className="flex items-center space-x-4 overflow-hidden">
                      <div className="w-12 h-12 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0 border border-green-100 dark:border-green-900/50">
                        <FileCheck className="w-6 h-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-800 dark:text-slate-100 truncate pr-2 text-base">OM: {r.omNumber}</h3>
                        <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{r.equipment} • {r.date.split('-').reverse().join('/')}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button 
                        onClick={(e) => handleDeleteReport(e, r.id)}
                        className="p-3 text-gray-400 hover:text-red-600 dark:text-slate-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all z-10"
                         title="Excluir"
                      >
                        <Trash2 className="w-5 h-5 pointer-events-none" />
                      </button>
                      <ChevronRight className="w-5 h-5 text-gray-400 dark:text-slate-600" />
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
            className="bg-blue-600 hover:bg-blue-500 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-xl shadow-blue-900/40 transition-transform active:scale-90"
          >
            <Plus className="w-7 h-7" />
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 transform transition-all scale-100 border border-gray-200 dark:border-slate-700">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4 mx-auto border border-red-200 dark:border-red-900/40">
              <Trash2 className="w-6 h-6 text-red-600 dark:text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white text-center mb-2">Excluir {deleteModal.type === 'template' ? 'Modelo' : 'Relatório'}?</h3>
            <p className="text-gray-600 dark:text-slate-400 text-center text-sm mb-6">
              Essa ação não pode ser desfeita. Você tem certeza que deseja remover este item permanentemente?
            </p>
            <div className="flex space-x-3">
              <button 
                onClick={() => setDeleteModal({ ...deleteModal, isOpen: false })}
                className="flex-1 py-3 px-4 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 py-3 px-4 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-500 transition-colors shadow-lg shadow-red-900/30"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backup Modal */}
      {backupModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100 border border-gray-200 dark:border-slate-700">
                  <div className="bg-white dark:bg-slate-800 p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
                      <h3 className="font-bold text-gray-800 dark:text-white flex items-center">
                          <Database className="w-5 h-5 mr-2 text-blue-500 dark:text-blue-400" />
                          Backup de Dados
                      </h3>
                      <button onClick={() => setBackupModalOpen(false)} className="text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200">
                          <X className="w-5 h-5" />
                      </button>
                  </div>
                  
                  <div className="p-6 space-y-4">
                      <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">
                          Salve seus modelos e relatórios em um arquivo seguro ou restaure dados de um backup anterior.
                      </p>

                      <button 
                          onClick={handleExport}
                          className="w-full flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/50 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors group"
                      >
                          <div className="flex items-center">
                              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mr-3 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50">
                                  <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                              </div>
                              <div className="text-left">
                                  <div className="font-semibold text-gray-800 dark:text-slate-200">Exportar Backup</div>
                                  <div className="text-xs text-gray-500 dark:text-slate-500">Baixar arquivo .json</div>
                              </div>
                          </div>
                      </button>

                      <button 
                          onClick={handleImportClick}
                          className="w-full flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors group"
                      >
                          <div className="flex items-center">
                              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mr-3 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/50">
                                  <Upload className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                              </div>
                              <div className="text-left">
                                  <div className="font-semibold text-gray-800 dark:text-slate-200">Importar Backup</div>
                                  <div className="text-xs text-gray-500 dark:text-slate-500">Carregar arquivo .json</div>
                              </div>
                          </div>
                      </button>

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
              animation: fadeIn 0.1s ease-out forwards;
          }
      `}</style>
    </div>
  );
};

export default TemplateList;