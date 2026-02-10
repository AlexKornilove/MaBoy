import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import ScrollToTop from './ScrollToTop';
import { useApp } from '../../context/AppContext';
import { Pencil, FileText, Database } from 'lucide-react';

// Modals
// We will import them here or in App? 
// If they rely on AppContext state, we can put them here so they are always available.
// However, I haven't created the Modals files yet. 
// I'll add placeholders or create an index for modals later.
// For now, I will comment them out or expect to add them.

import EditModal from '../modals/EditModal';
import ProgressGroupsModal from '../modals/ProgressGroupsModal';
import TypesManagerModal from '../modals/TypesManagerModal';
import BulkDuplicateResolutionModal from '../modals/BulkDuplicateResolutionModal';

const MainLayout = () => {
    const {
        isEditMode, setIsEditMode,
        editModal, bulkDuplicateModal, progressGroupsModal, typesManagerModal,
        setEditModal, setBulkDuplicateModal, setProgressGroupsModal, setTypesManagerModal,
        data, handleSaveItem, handleSaveProgressGroup, handleDeleteProgressGroup,
        resolveBulkDuplicates, saveData
    } = useApp();

    return (
        <div className="layout" style={{ minHeight: '100vh', display: 'flex' }}>
            <Sidebar />

            <div className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Header />

                <main style={{ flex: 1, padding: '0 20px 40px 20px', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
                    <Outlet />
                </main>
            </div>

            <ScrollToTop />

            {/* Floating Edit Button */}
            <button
                className={`btn ${isEditMode ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setIsEditMode(!isEditMode)}
                title={isEditMode ? "Выключить режим редактирования" : "Включить режим редактирования"}
                style={{
                    position: 'fixed',
                    bottom: '30px',
                    right: '90px', // Left of ScrollToTop (which is right: 30px)
                    zIndex: 900,
                    borderRadius: '50%',
                    width: '50px',
                    height: '50px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: isEditMode ? '0 0 15px var(--wf-primary)' : '0 4px 15px rgba(0,0,0,0.3)',
                    padding: 0
                }}
            >
                <Pencil size={24} />
            </button>

            {/* Render Modals Global */}
            {editModal && (
                <EditModal
                    modal={editModal}
                    data={data}
                    onClose={() => setEditModal(null)}
                    onSave={handleSaveItem}
                />
            )}

            {progressGroupsModal && (
                <ProgressGroupsModal
                    data={data}
                    onClose={() => setProgressGroupsModal(false)}
                    onSave={handleSaveProgressGroup}
                    onDelete={handleDeleteProgressGroup}
                />
            )}

            {bulkDuplicateModal && (
                <BulkDuplicateResolutionModal
                    duplicates={bulkDuplicateModal.duplicates}
                    onResolve={resolveBulkDuplicates}
                />
            )}

            {typesManagerModal && (
                <TypesManagerModal
                    data={data}
                    onClose={() => setTypesManagerModal(false)}
                    onSave={(newTypes) => {
                        const newData = { ...data, itemTypes: newTypes };
                        setData(newData);
                        setTypesManagerModal(false);
                    }}
                />
            )}
        </div>
    );
};

export default MainLayout;
