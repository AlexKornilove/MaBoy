import React from 'react';
import { RotateCcw } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const Header = () => {
    const {
        searchQuery, setSearchQuery,
        statusFilter, setStatusFilter,
        typeFilter, setTypeFilter,
        data,
        isEditMode, setProgressGroupsModal, setTypesManagerModal,
        resetFilters, handleScrollToCategory, sortedCategories,
        weaponTypeFilter,
        sortBy, setSortBy
    } = useApp();

    const hasActiveFilters = searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || weaponTypeFilter !== 'all' || sortBy !== 'name';

    return (
        <header className="sticky-header" style={{
            position: 'sticky',
            top: 0,
            zIndex: 1000,
            background: 'rgba(10, 14, 26, 0.95)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid var(--wf-border)',
            padding: '15px 20px',
            marginBottom: '30px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '15px',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '0 0 12px 12px',
            maxWidth: '100%',
            boxSizing: 'border-box'
        }}>
            <div style={{ width: '50px' }} className="header-spacer-desktop"></div>

            <div className="search-box" style={{ maxWidth: '400px', flex: '0 1 300px' }}>
                <input
                    type="text"
                    placeholder="Поиск по имени..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ width: '100%' }}
                />
            </div>

            <div className="filter-group" style={{ display: 'flex', gap: '10px' }}>
                <select
                    className="filter-select"
                    value=""
                    onChange={(e) => handleScrollToCategory(e.target.value)}
                    style={{
                        background: 'rgba(10, 14, 26, 0.98)',
                        borderColor: 'var(--wf-primary)',
                        color: 'var(--wf-primary)',
                        maxWidth: '200px',
                        fontWeight: '600',
                        boxShadow: '0 0 10px rgba(0, 212, 255, 0.2)'
                    }}
                >
                    <option value="" disabled style={{ background: 'var(--wf-bg-dark)', color: 'var(--wf-text-dim)' }}>Перейти к...</option>
                    {sortedCategories.map(cat => (
                        <option key={cat.id} value={cat.id} style={{ background: 'var(--wf-bg-dark)', color: 'var(--wf-text)' }}>{cat.name}</option>
                    ))}
                </select>
            </div>

            <div className="filter-group" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
                <select
                    className="filter-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                >
                    <option value="all">Все статусы</option>
                    <option value="collected">Собрано</option>
                    <option value="not-collected">Не собрано</option>
                    <option value="mastered">Освоено</option>
                    <option value="not-mastered">Не освоено</option>
                    <option value="collected-not-mastered">Собрано, не освоено</option>
                    <option value="mastered-not-collected">Освоено, не собрано</option>
                </select>

                <select
                    className="filter-select"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                >
                    <option value="all">Все версии</option>
                    {data.itemTypes && data.itemTypes.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>

                <select
                    className="filter-select"
                    value={weaponTypeFilter}
                    onChange={(e) => setWeaponTypeFilter(e.target.value)}
                >
                    <option value="all">Все типы оружия</option>
                    {Object.values(data.categories || {}).map(cat => (
                        <option key={cat.id} value={cat.id}>
                            {cat.name}
                        </option>
                    ))}
                </select>

                <select
                    className="filter-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                >
                    <option value="name">По алфавиту</option>
                    <option value="name-desc">По алфавиту (Я-А)</option>
                    <option value="prime">Прайм сначала</option>
                </select>
            </div>

            <div className="filter-group" style={{ display: 'flex', alignItems: 'center' }}>
                {hasActiveFilters && (
                    <button
                        className="btn btn-secondary btn-small"
                        onClick={resetFilters}
                        title="Сбросить фильтры"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: 'rgba(230, 57, 70, 0.1)',
                            borderColor: 'var(--wf-danger)',
                            color: 'var(--wf-danger)'
                        }}
                    >
                        <RotateCcw size={14} />
                        <span className="hide-mobile">Сброс</span>
                    </button>
                )}
            </div>

            {isEditMode && (
                <div className="filter-group" style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn btn-primary btn-small" onClick={() => setProgressGroupsModal(true)}>
                        📊 Группы
                    </button>
                    <button className="btn btn-primary btn-small" onClick={() => setTypesManagerModal(true)}>
                        🏷️ Виды
                    </button>
                </div>
            )}

            <div style={{ width: '50px' }} className="header-spacer-desktop"></div>
        </header>
    );
};

export default Header;
