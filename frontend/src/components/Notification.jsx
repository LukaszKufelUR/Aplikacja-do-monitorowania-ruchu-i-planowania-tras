import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

const Notification = ({ message, type = 'success', onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3000);

        return () => clearTimeout(timer);
    }, [onClose]);

    const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
    const Icon = type === 'success' ? CheckCircle : AlertCircle;

    return (
        <div className={`fixed top-4 right-4 z-[3000] flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white ${bgColor} animate-in slide-in-from-right fade-in duration-300`}>
            <Icon className="w-5 h-5" />
            <p className="font-medium text-sm">{message}</p>
            <button
                onClick={onClose}
                className="ml-2 p-1 hover:bg-white/20 rounded-full transition-colors"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

export default Notification;
