import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Lock, ArrowRight, UserPlus, LogIn } from 'lucide-react';

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
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
            <div className="relative z-10">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-4 border border-white/30">
                    <User className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white tracking-wide">Mina Serra Sul</h1>
                <p className="text-blue-100 text-sm mt-1">Gestão de Relatórios</p>
            </div>
        </div>

        {/* Form */}
        <div className="p-8">
            <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">
                {isRegistering ? 'Criar Nova Conta' : 'Acesse sua Conta'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Usuário</label>
                    <div className="relative">
                        <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                        <input 
                            type="text" 
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-slate-400 transition-all"
                            placeholder="Seu nome de usuário"
                        />
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Senha</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                        <input 
                            type="password" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-slate-400 transition-all"
                            placeholder="Sua senha"
                        />
                    </div>
                </div>

                {isRegistering && (
                    <div className="space-y-1 animate-fadeIn">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Confirmar Senha</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                            <input 
                                type="password" 
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 placeholder-slate-400 transition-all"
                                placeholder="Repita a senha"
                            />
                        </div>
                    </div>
                )}

                {error && (
                    <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center animate-shake">
                         <span className="mr-2">⚠️</span> {error}
                    </div>
                )}

                <button 
                    type="submit" 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 transition-transform active:scale-[0.98] mt-4"
                >
                    {isRegistering ? (
                        <><span>Criar Conta</span> <UserPlus className="w-5 h-5" /></>
                    ) : (
                        <><span>Entrar</span> <ArrowRight className="w-5 h-5" /></>
                    )}
                </button>
            </form>

            {/* Toggle Mode */}
            <div className="mt-6 text-center">
                <p className="text-sm text-slate-500 mb-2">
                    {isRegistering ? 'Já possui uma conta?' : 'Primeiro acesso?'}
                </p>
                <button 
                    onClick={toggleMode}
                    className="text-blue-600 font-bold text-sm hover:underline flex items-center justify-center mx-auto"
                >
                    {isRegistering ? (
                         <><LogIn className="w-4 h-4 mr-1" /> Fazer Login</>
                    ) : (
                         <><UserPlus className="w-4 h-4 mr-1" /> Criar Usuário</>
                    )}
                </button>
            </div>
        </div>
      </div>
      <style>{`
          @keyframes fadeIn {
              from { opacity: 0; transform: translateY(10px); }
              to { opacity: 1; transform: translateY(0); }
          }
          .animate-fadeIn {
              animation: fadeIn 0.4s ease-out forwards;
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