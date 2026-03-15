import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Toast } from '../Toast';
import './Layout.css';

export const Layout = () => {
    const location = useLocation();

    // A simple map to get the title from the path
    const getTitle = (path) => {
        switch (path) {
            case '/': return 'Dashboard';
            case '/profile': return 'MSME Profile';
            case '/guidance': return 'Compliance Guidance';
            case '/alerts': return 'Alerts & Deadlines';
            case '/schemes': return 'Govt Schemes';
            case '/loans': return 'Loan Recommendations';
            case '/assistant': return 'AI Query Assistant';
            case '/storage': return 'Document Storage';
            case '/settings': return 'Settings';
            default: return 'CompliAssist';
        }
    };

    return (
        <div className="layout-container">
            <Sidebar />
            <div className="main-wrapper">
                <Header title={getTitle(location.pathname)} />
                <main className="main-content">
                    <Outlet />
                </main>
            </div>
            <Toast />
        </div>
    );
};
