import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import CollectionPage from './pages/CollectionPage';
import { AppProvider } from './context/AppContext';

function App() {
    return (
        <AppProvider>
            <Router>
                <Routes>
                    <Route path="/" element={<MainLayout />}>
                        <Route index element={<CollectionPage />} />
                    </Route>
                </Routes>
            </Router>
        </AppProvider>
    );
}

export default App;
