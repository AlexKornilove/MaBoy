import React, { useState } from 'react';

const TypesManagerModal = ({ data, onClose, onSave }) => {
    const [types, setTypes] = useState(data.itemTypes || []);
    const [newType, setNewType] = useState({ id: '', name: '', color: '#ffffff' });

    const handleAdd = () => {
        if (!newType.name.trim()) return;
        const id = newType.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (types.some(t => t.id === id)) {
            alert('Такой ID вида уже существует');
            return;
        }
        const updated = [...types, { ...newType, id }];
        setTypes(updated);
        setNewType({ id: '', name: '', color: '#ffffff' });
    };

    const handleDelete = (id) => {
        if (confirm('Вы уверены? Предметы этого вида потеряют свою привязку (будут отображаться как обычные).')) {
            setTypes(types.filter(t => t.id !== id));
        }
    };

    const handleSaveAll = () => {
        onSave(types);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                <div className="modal-header">
                    <h2>Управление видами предметов</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '20px', background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px' }}>
                        <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--wf-text-dim)' }}>Название нового вида</label>
                            <input
                                type="text"
                                value={newType.name}
                                onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                                placeholder="Например: Wraith"
                                style={{ marginTop: '5px' }}
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0, width: '80px' }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--wf-text-dim)' }}>Цвет</label>
                            <input
                                type="color"
                                value={newType.color}
                                onChange={(e) => setNewType({ ...newType, color: e.target.value })}
                                style={{ padding: '2px', height: '42px', marginTop: '5px', borderRadius: '4px', cursor: 'pointer' }}
                            />
                        </div>
                        <button className="btn btn-secondary" onClick={handleAdd} style={{ height: '42px', padding: '0 20px' }}>Добавить</button>
                    </div>

                    <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid var(--wf-border)', borderRadius: '8px', background: 'rgba(0,0,0,0.1)' }}>
                        {types.length === 0 ? (
                            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--wf-text-dim)' }}>Список пуст</div>
                        ) : (
                            types.map(type => (
                                <div key={type.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <input
                                            type="color"
                                            value={type.color}
                                            onChange={(e) => {
                                                const newColor = e.target.value;
                                                setTypes(types.map(t => t.id === type.id ? { ...t, color: newColor } : t));
                                            }}
                                            style={{ width: '30px', height: '30px', padding: 0, border: 'none', background: 'none', cursor: 'pointer', borderRadius: '50%' }}
                                        />
                                        <span style={{ fontWeight: '500' }}>{type.name}</span>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--wf-text-dim)', opacity: 0.5 }}>({type.id})</span>
                                    </div>
                                    <button className="btn btn-danger btn-small" onClick={() => handleDelete(type.id)} title="Удалить">×</button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="form-actions" style={{ marginTop: '25px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
                    <button className="btn btn-primary" onClick={handleSaveAll}>Сохранить изменения</button>
                </div>
            </div>
        </div>
    );
};

export default TypesManagerModal;
