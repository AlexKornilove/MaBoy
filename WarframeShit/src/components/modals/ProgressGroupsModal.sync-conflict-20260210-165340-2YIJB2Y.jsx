import React, { useState } from 'react';

const ProgressGroupsModal = ({ data, onClose, onSave, onDelete }) => {
    const [editingGroup, setEditingGroup] = useState(null);
    const [groupName, setGroupName] = useState('');
    const [selectedCategories, setSelectedCategories] = useState([]);

    const progressGroups = data.progressGroups || [];
    const allCategories = [
        { key: 'frames', name: 'Варфреймы' },
        ...Object.keys(data.weapons || {}).map(cat => {
            // NOTE: data.weapons might not exist in migrated structure?
            // In AppContext migration logic, we deleted data.weapons.
            // So this modal needs to iterate categories.
            // But AppContext code for this component was copied from app.js which might have relied on old data structure or new?
            // In AppContext `loadData`: newData.categories = categories; delete newData.weapons;
            // So `data.weapons` will be undefined.
            // We should use `data.categories`.
            return null;
        }).filter(Boolean)
    ];

    // Reworked category listing to use `data.categories`
    const availableCategories = Object.values(data.categories || {}).map(cat => ({
        key: cat.id,
        name: cat.name
    }));

    const handleEditGroup = (group) => {
        setEditingGroup(group);
        setGroupName(group.name);
        setSelectedCategories([...group.categories]);
    };

    const handleNewGroup = () => {
        setEditingGroup({ id: `group-${Date.now()}`, name: '', categories: [] });
        setGroupName('');
        setSelectedCategories([]);
    };

    const handleSave = (e) => {
        e.preventDefault();
        if (!groupName.trim()) {
            alert('Введите название группы');
            return;
        }
        if (selectedCategories.length === 0) {
            alert('Выберите хотя бы одну категорию');
            return;
        }

        const groupData = {
            id: editingGroup.id,
            name: groupName.trim(),
            categories: selectedCategories
        };

        onSave(groupData);
        setEditingGroup(null);
        setGroupName('');
        setSelectedCategories([]);
    };

    const handleCancel = () => {
        setEditingGroup(null);
        setGroupName('');
        setSelectedCategories([]);
    };

    const toggleCategory = (categoryKey) => {
        setSelectedCategories(prev => {
            if (prev.includes(categoryKey)) {
                return prev.filter(c => c !== categoryKey);
            } else {
                return [...prev, categoryKey];
            }
        });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
                <div className="modal-header">
                    <h2>Группы прогресса</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                    {!editingGroup ? (
                        <div>
                            <div style={{ marginBottom: '20px' }}>
                                <button className="btn btn-primary" onClick={handleNewGroup}>
                                    + Создать новую группу
                                </button>
                            </div>

                            {progressGroups.length === 0 ? (
                                <div className="empty-state">
                                    <h3>Нет групп прогресса</h3>
                                    <p>Создайте группу прогресса для объединения категорий</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {progressGroups.map(group => (
                                        <div
                                            key={group.id}
                                            style={{
                                                background: 'var(--wf-bg-card)',
                                                border: '1px solid var(--wf-border)',
                                                borderRadius: '8px',
                                                padding: '15px'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                                <h3 style={{ color: 'var(--wf-primary)', margin: 0 }}>{group.name}</h3>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button
                                                        className="btn btn-secondary btn-small"
                                                        onClick={() => handleEditGroup(group)}
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        className="btn btn-danger btn-small"
                                                        onClick={() => {
                                                            if (confirm(`Удалить группу "${group.name}"?`)) {
                                                                onDelete(group.id);
                                                            }
                                                        }}
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </div>
                                            <div style={{ color: 'var(--wf-text-dim)', fontSize: '0.9rem' }}>
                                                Категории: {group.categories.map(catKey => {
                                                    const cat = availableCategories.find(c => c.key === catKey);
                                                    // Fallback check for old ID format if needed, but strict key matching is better now
                                                    return cat ? cat.name : catKey;
                                                }).join(', ')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <form onSubmit={handleSave}>
                            <div className="form-group">
                                <label>Название группы *</label>
                                <input
                                    type="text"
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                    placeholder="Например: Оружие"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Категории *</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                                    {availableCategories.map(cat => (
                                        <div key={cat.key} className="checkbox-group" style={{ padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
                                            <input
                                                type="checkbox"
                                                id={`cat-${cat.key}`}
                                                checked={selectedCategories.includes(cat.key)}
                                                onChange={() => toggleCategory(cat.key)}
                                            />
                                            <label htmlFor={`cat-${cat.key}`} style={{ margin: 0, textTransform: 'none', cursor: 'pointer', flex: 1 }}>
                                                {cat.name}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="form-actions">
                                <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                                    Отмена
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Сохранить
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProgressGroupsModal;
