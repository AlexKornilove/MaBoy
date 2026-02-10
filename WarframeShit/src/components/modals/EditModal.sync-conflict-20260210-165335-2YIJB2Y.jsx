import React, { useState } from 'react';

const EditModal = ({ modal, data, onClose, onSave }) => {
    const [formData, setFormData] = React.useState(modal.item || {});
    const [selectedCategory, setSelectedCategory] = React.useState(modal.category || '');

    // Synchronize local state when modal props change
    React.useEffect(() => {
        if (modal && modal.item) {
            setFormData(modal.item);
            setSelectedCategory(modal.category || '');
        }
    }, [modal]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            alert('Введите название элемента');
            return;
        }

        if (!selectedCategory) {
            alert('Выберите категорию');
            return;
        }

        if (modal.isNew || formData.name !== modal.item.name) {
            const targetCat = data.categories[selectedCategory];
            if (targetCat) {
                const exists = targetCat.items.some(i => i.name.toLowerCase() === formData.name.toLowerCase() && i.id !== formData.id);
                if (exists) {
                    if (!confirm(`Предмет с именем "${formData.name}" уже существует в категории "${targetCat.name}". Добавить дубликат?`)) {
                        return;
                    }
                }
            }
        }

        onSave(formData, selectedCategory);
    };

    const handleChange = (field, value) => {
        setFormData({ ...formData, [field]: value });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{modal.isNew ? 'Добавить элемент' : 'Редактировать элемент'}</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Категория</label>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            required
                        >
                            <option value="" disabled>Выберите категорию</option>
                            {Object.values(data.categories || {}).map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Название *</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Вид предмета:</label>
                        <select
                            value={formData.type || ''}
                            onChange={(e) => handleChange('type', e.target.value)}
                        >
                            <option value="">Обычный</option>
                            {data.itemTypes && data.itemTypes.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <div className="checkbox-group">
                            <input
                                type="checkbox"
                                id="collected"
                                checked={formData.collected}
                                onChange={(e) => handleChange('collected', e.target.checked)}
                            />
                            <label htmlFor="collected" style={{ margin: 0, textTransform: 'none', cursor: 'pointer' }}>
                                Собрано
                            </label>
                        </div>
                    </div>

                    <div className="form-group">
                        <div className="checkbox-group">
                            <input
                                type="checkbox"
                                id="mastered"
                                checked={formData.mastered || false}
                                onChange={(e) => handleChange('mastered', e.target.checked)}
                            />
                            <label htmlFor="mastered" style={{ margin: 0, textTransform: 'none', cursor: 'pointer' }}>
                                ⭐ Освоено
                            </label>
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Отмена
                        </button>
                        <button type="submit" className="btn btn-primary">
                            Сохранить
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditModal;
