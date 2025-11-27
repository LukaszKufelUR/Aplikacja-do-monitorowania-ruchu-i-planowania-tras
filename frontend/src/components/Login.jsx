import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, Mail, Lock, UserPlus, AlertCircle } from 'lucide-react';

const Login = ({ onSwitchToRegister, onSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const result = await login(email, password);

        if (result.success) {
            if (onSuccess) onSuccess();
        } else {
            setError(result.error);
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
                    <LogIn className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-gray-900">Witaj ponownie</h1>
                <p className="text-gray-500 mt-2">Zaloguj się do TrafficWatch</p>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <p className="text-sm text-red-800">{error}</p>
                </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                    </label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            placeholder="twoj@email.com"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Hasło
                    </label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            placeholder="••••••••"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
                >
                    {isLoading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Logowanie...
                        </>
                    ) : (
                        <>
                            <LogIn className="w-5 h-5" />
                            Zaloguj się
                        </>
                    )}
                </button>
            </form>

            {/* Switch to Register */}
            <div className="mt-6 text-center">
                <p className="text-gray-600">
                    Nie masz konta?{' '}
                    <button
                        onClick={onSwitchToRegister}
                        className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
                    >
                        Zarejestruj się
                    </button>
                </p>
            </div>
        </div>
    );
};

export default Login;
