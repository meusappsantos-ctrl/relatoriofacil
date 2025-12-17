import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Lock, ArrowRight, UserPlus, HardHat, AlertCircle } from 'lucide-react';

const Login: React.FC = () => {
  const { login, register, userExists } = useAuth();
  
  const [isRegistering, setIsRegistering] = useState(!userExists);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Preencha todos os campos.');
      return;
    }

    if (isRegistering) {
      if (password !== confirmPassword) {
        setError('As senhas não coincidem.');
        return;
      }
      if (password.length < 4) {
          setError('A senha deve ter pelo menos 4 caracteres.');
          return;
      }
      register(username, password);
    } else {
      const success = login(username, password);
      if (!success) {
        setError('Usuário ou senha incorretos.');
      }
    }
  };

  const toggleMode = () => {
      setIsRegistering(!isRegistering);
      setError('');
      setUsername('');
      setPassword('');
      setConfirmPassword('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-200 via-gray-100 to-white dark:from-slate-900 dark:via-slate-800 dark:to-black flex items-center justify-center p-4 transition-colors duration-300">
      
      {/* Background Pattern Decoration (Optional) */}
      <div className="absolute inset-0 z-0 opacity-[0.05] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#888 1px, transparent 1px)', backgroundSize: '30px 30px' }}>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl shadow-gray-300 dark:shadow-black/50 w-full max-w-xs overflow-hidden animate-fadeIn z-10 relative border border-white dark:border-slate-700/50 transition-colors duration-300">
        
        {/* Brand Header */}
        <div className="bg-white dark:bg-slate-800 pt-8 pb-4 px-6 text-center border-b border-gray-100 dark:border-slate-700/50 transition-colors duration-300">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-gray-100 to-white dark:from-slate-700 dark:to-slate-800 rounded-full mb-4 shadow-inner border border-gray-100 dark:border-slate-600 relative group">
                <div className="absolute inset-0 rounded-full bg-blue-500/10 blur-lg transform group-hover:scale-110 transition-transform"></div>
                <HardHat className="w-8 h-8 text-blue-600 dark:text-blue-400 relative z-10" />
            </div>
            <h1 className="text-xl font-black text-gray-800 dark:text-white tracking-tight uppercase transition-colors">Mina Serra Sul</h1>
            <div className="h-1 w-10 bg-blue-600 dark:bg-blue-500 mx-auto rounded-full my-2"></div>
            <p className="text-gray-500 dark:text-slate-400 text-[10px] font-medium tracking-wide uppercase">Controle & Automação</p>
        </div>

        {/* Form Body */}
        <div className="px-6 pb-8 pt-6 bg-white dark:bg-slate-800 transition-colors duration-300">
            <div className="mb-5 flex justify-center">
                 <span className={`px-3 py-0.5 rounded-full text-[10px] font-bold transition-all ${isRegistering ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-100 dark:border-blue-500/30' : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400 border border-gray-200 dark:border-slate-600'}`}>
                    {isRegistering ? 'Criar Nova Credencial' : 'Acesso ao Sistema'}
                 </span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase ml-1 flex items-center gap-1">
                        Usuário
                    </label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <User className="h-4 w-4 text-gray-400 dark:text-slate-500 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors" />
                        </div>
                        <input 
                            type="text" 
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-500/50 focus:border-blue-500 dark:focus:border-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-600 transition-all text-sm font-medium shadow-sm dark:shadow-inner"
                            placeholder="Identificação"
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase ml-1 flex items-center gap-1">
                        Senha
                    </label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Lock className="h-4 w-4 text-gray-400 dark:text-slate-500 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors" />
                        </div>
                        <input 
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-500/50 focus:border-blue-500 dark:focus:border-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-600 transition-all text-sm font-medium shadow-sm dark:shadow-inner"
                            placeholder="••••••••"
                        />
                    </div>
                </div>

                {isRegistering && (
                    <div className="space-y-1 animate-slideDown">
                        <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase ml-1">Confirmar Senha</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-4 w-4 text-gray-400 dark:text-slate-500 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors" />
                            </div>
                            <input 
                                type="password" 
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-500/50 focus:border-blue-500 dark:focus:border-blue-500 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-600 transition-all text-sm font-medium shadow-sm dark:shadow-inner"
                                placeholder="Repita a senha"
                            />
                        </div>
                    </div>
                )}

                {error && (
                    <div className="p-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[10px] font-semibold rounded-lg flex items-center animate-shake border border-red-100 dark:border-red-900/30">
                         <AlertCircle className="w-3.5 h-3.5 mr-2 flex-shrink-0" />
                         {error}
                    </div>
                )}

                <button 
                    type="submit" 
                    className="w-full bg-gray-900 dark:bg-blue-600 hover:bg-gray-800 dark:hover:bg-blue-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-gray-900/20 dark:shadow-blue-900/20 flex items-center justify-center space-x-2 transition-all active:scale-[0.98] mt-2 group"
                >
                    {isRegistering ? (
                        <><span>Criar Acesso</span> <UserPlus className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
                    ) : (
                        <><span>Entrar</span> <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
                    )}
                </button>
            </form>

            {/* Toggle Mode */}
            <div className="mt-6 pt-4 border-t border-dashed border-gray-200 dark:border-slate-700 text-center">
                <button 
                    onClick={toggleMode}
                    className="text-gray-500 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 font-medium text-xs transition-colors flex items-center justify-center mx-auto space-x-1 py-1.5 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50"
                >
                    {isRegistering ? (
                         <><span>Já tem conta?</span> <span className="font-bold underline decoration-2 underline-offset-2">Fazer Login</span></>
                    ) : (
                         <><span>Novo na equipe?</span> <span className="font-bold underline decoration-2 underline-offset-2">Cadastrar</span></>
                    )}
                </button>
            </div>
        </div>
      </div>
      <style>{`
          @keyframes fadeIn {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
          }
          @keyframes slideDown {
              from { opacity: 0; transform: translateY(-10px); height: 0; }
              to { opacity: 1; transform: translateY(0); height: auto; }
          }
          .animate-fadeIn {
              animation: fadeIn 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          }
          .animate-slideDown {
              animation: slideDown 0.3s ease-out forwards;
          }
           @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
            20%, 40%, 60%, 80% { transform: translateX(4px); }
          }
          .animate-shake {
            animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
          }
      `}</style>
    </div>
  );
};

export default Login;