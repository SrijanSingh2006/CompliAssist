import React, { useState, useEffect } from 'react';
import { CheckCircle, X } from 'lucide-react';
import './Toast.css';

export const Toast = () => {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        const handleShowToast = (e) => {
            const id = Date.now();
            const message = e.detail || 'Action completed successfully!';
            setToasts(prev => [...prev, { id, message }]);

            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, 3000);
        };

        window.addEventListener('show-toast', handleShowToast);
        return () => window.removeEventListener('show-toast', handleShowToast);
    }, []);

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return (
        <div className="toast-container">
            {toasts.map(toast => (
                <div key={toast.id} className="toast">
                    <CheckCircle className="text-success" size={20} />
                    <span>{toast.message}</span>
                    <button className="toast-close" onClick={() => removeToast(toast.id)}>
                        <X size={16} />
                    </button>
                </div>
            ))}
        </div>
    );
};
