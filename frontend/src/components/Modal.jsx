import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, onConfirm, title, message, type = 'confirm', initialValue = '', initialNote = '', initialColor = '#0000ff', initialMode = 'car' }) => {
    const [inputValue, setInputValue] = useState(initialValue || '');
    const [noteValue, setNoteValue] = useState(initialNote || '');
    const [colorValue, setColorValue] = useState(initialColor || '#0000ff');
    const [modeValue, setModeValue] = useState(initialMode || 'car');

    useEffect(() => {
        console.log('Modal useEffect - initialMode:', initialMode, 'isOpen:', isOpen);
        setInputValue(initialValue || '');
        setNoteValue(initialNote || '');
        setColorValue(initialColor || '#0000ff');
        setModeValue(initialMode || 'car');
        console.log('Modal useEffect - modeValue set to:', initialMode || 'car');
    }, [isOpen, initialValue, initialNote, initialColor, initialMode]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (type === 'input') {
            onConfirm(inputValue);
        } else if (type === 'pin') {
            onConfirm({ name: inputValue, note: noteValue, color: colorValue });
        } else if (type === 'route_mode') {
            onConfirm(modeValue);
        } else {
            onConfirm();
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[3000] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-semibold text-gray-800">{title}</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    <p className="text-gray-600 mb-4">{message}</p>

                    {type === 'input' && (
                        <input
                            type="text"
                            className="w-full p-2 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            autoFocus
                        />
                    )}

                    {type === 'pin' && (
                        <div className="space-y-3 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nazwa</label>
                                <input
                                    type="text"
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notatka (opcjonalne)</label>
                                <textarea
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    value={noteValue}
                                    onChange={(e) => setNoteValue(e.target.value)}
                                    rows="2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Kolor</label>
                                <input
                                    type="color"
                                    className="w-full h-10 rounded cursor-pointer border border-gray-300"
                                    value={colorValue}
                                    onChange={(e) => setColorValue(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {type === 'route_mode' && (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Wybierz tryb transportu:</label>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setModeValue('car')}
                                    className={`p-3 rounded-lg border-2 transition-all ${modeValue === 'car' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                                >
                                    <div className="text-2xl mb-1">🚗</div>
                                    <div className="text-sm font-medium">Samochód</div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setModeValue('bike')}
                                    className={`p-3 rounded-lg border-2 transition-all ${modeValue === 'bike' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                                >
                                    <div className="text-2xl mb-1">🚴</div>
                                    <div className="text-sm font-medium">Rower</div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setModeValue('walk')}
                                    className={`p-3 rounded-lg border-2 transition-all ${modeValue === 'walk' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                                >
                                    <div className="text-2xl mb-1">🚶</div>
                                    <div className="text-sm font-medium">Pieszo</div>
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
                        >
                            Anuluj
                        </button>
                        <button
                            onClick={handleConfirm}
                            className={`px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors ${type === 'confirm' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            {type === 'confirm' ? 'Usuń' : 'Zatwierdź'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Modal;
