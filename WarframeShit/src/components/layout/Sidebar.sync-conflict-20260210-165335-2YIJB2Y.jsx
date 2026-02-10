import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Menu, X, Grid, BookOpen, Layers } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const Sidebar = () => {
    const { stats } = useApp();
    const [isOpen, setIsOpen] = useState(false);

    const toggleSidebar = () => setIsOpen(!isOpen);

    return (
        <>
            {/* Mobile Toggle Button */}
            <button
                className="sidebar-toggle btn btn-secondary"
                onClick={toggleSidebar}
                style={{
                    position: 'fixed',
                    top: '70px', // 50px (nav) + 20px
                    left: '20px',
                    zIndex: 1200,
                    padding: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setIsOpen(false)}
                    style={{
                        position: 'fixed',
                        top: '50px', left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        zIndex: 1090
                    }}
                />
            )}

            {/* Sidebar Container */}
            <aside className={`sidebar ${isOpen ? 'open' : ''}`} style={{
                position: 'fixed',
                top: '50px', left: 0, bottom: 0,
                width: '260px',
                height: 'calc(100vh - 50px)',
                background: 'var(--wf-bg-card)',
                borderRight: '1px solid var(--wf-border)',
                transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
                transition: 'transform 0.3s ease',
                zIndex: 1100,
                padding: '80px 20px 20px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
            }}>
                <div className="sidebar-header">
                    <h2 style={{ color: 'var(--wf-primary)', fontSize: '1.5rem', marginBottom: '30px' }}>Warframe Collection</h2>
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <NavLink
                        to="/"
                        className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                        style={({ isActive }) => ({
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '10px 15px',
                            borderRadius: '8px',
                            background: isActive ? 'rgba(0, 212, 255, 0.1)' : 'transparent',
                            color: isActive ? 'var(--wf-primary)' : 'var(--wf-text)',
                            textDecoration: 'none',
                            transition: 'all 0.2s'
                        })}
                        onClick={() => setIsOpen(false)}
                    >
                        <Grid size={20} />
                        <span>Коллекция</span>
                    </NavLink>

                    <div style={{ color: 'var(--wf-text-dim)', fontSize: '0.8rem', marginTop: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                        Скоро
                    </div>

                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 15px',
                        color: 'var(--wf-text-dim)',
                        cursor: 'not-allowed',
                        opacity: 0.7
                    }}>
                        <BookOpen size={20} />
                        <span>Гайды</span>
                    </div>

                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 15px',
                        color: 'var(--wf-text-dim)',
                        cursor: 'not-allowed',
                        opacity: 0.7
                    }}>
                        <Layers size={20} />
                        <span>Билды</span>
                    </div>
                </nav>

                <div className="sidebar-stats" style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--wf-border)' }}>
                    <div style={{ marginBottom: '15px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '5px' }}>
                            <span style={{ color: 'var(--wf-text-dim)' }}>Коллекция</span>
                            <span style={{ color: 'var(--wf-primary)' }}>{stats.total.collected}/{stats.total.total}</span>
                        </div>
                        <div className="progress-bar" style={{ height: '6px', background: 'rgba(0,0,0,0.3)' }}>
                            <div
                                className="progress-fill"
                                style={{
                                    width: `${stats.total.total > 0 ? (stats.total.collected / stats.total.total) * 100 : 0}%`,
                                    background: 'linear-gradient(90deg, var(--wf-primary) 0%, var(--wf-secondary) 100%)',
                                    transition: 'width 0.5s ease-out'
                                }}
                            ></div>
                        </div>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '5px' }}>
                            <span style={{ color: 'var(--wf-text-dim)' }}>Мастерство</span>
                            <span style={{ color: 'var(--wf-success)' }}>{stats.total.mastered}/{stats.total.total}</span>
                        </div>
                        <div className="progress-bar" style={{ height: '6px', background: 'rgba(0,0,0,0.3)' }}>
                            <div
                                className="progress-fill"
                                style={{
                                    width: `${stats.total.total > 0 ? (stats.total.mastered / stats.total.total) * 100 : 0}%`,
                                    background: 'var(--wf-success)',
                                    transition: 'width 0.5s ease-out'
                                }}
                            ></div>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
