import React, { useMemo, memo } from 'react';
import ItemCard from './ItemCard';

const CollectionSection = memo(({
    title, allSectionItems, type, category,
    isHidden,
    onToggleVisibility, onToggleCollected, onToggleMastered,
    onEdit, onDelete, onDeleteCategory, onRenameCategory,
    onMoveUp, onMoveDown, isEditMode, allTypes,
    getFilteredItems,
    // Filter criteria for self-visibility logic
    searchQuery, statusFilter, typeFilter
}) => {
    const showContent = !isHidden;

    const items = useMemo(() => getFilteredItems(allSectionItems || []), [allSectionItems, getFilteredItems]);
    const isEmpty = items.length === 0;

    if (!isEditMode && isEmpty && (searchQuery || statusFilter !== 'all' || typeFilter !== 'all')) {
        return null;
    }

    const { collectedCount, masteredCount } = useMemo(() => ({
        collectedCount: (allSectionItems || []).filter(i => i.collected).length,
        masteredCount: (allSectionItems || []).filter(i => i.mastered).length
    }), [allSectionItems]);

    const renderGrid = (gridItems) => (
        <div className="collection-grid">
            {gridItems.map(item => {
                const itemType = allTypes.find(t => t.id === item.type);
                return (
                    <ItemCard
                        key={item.id}
                        item={item}
                        type={type}
                        category={category}
                        isEditMode={isEditMode}
                        itemType={itemType}
                        onToggleCollected={onToggleCollected}
                        onToggleMastered={onToggleMastered}
                        onEdit={onEdit}
                        onDelete={onDelete}
                    />
                );
            })}
        </div>
    );

    return (
        <div className="collection-section">
            <div className="section-header">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <h2>{title}</h2>
                        {!isEmpty && <span style={{ color: 'var(--wf-text-dim)', fontSize: '0.9rem' }}>Всего: {items.length}</span>}
                    </div>

                    {!isEmpty && (
                        <div
                            style={{ display: 'flex', gap: '20px', flex: 1, maxWidth: '600px', alignItems: 'center', cursor: 'pointer' }}
                            onClick={() => onToggleVisibility(category)}
                            title="Нажмите, чтобы свернуть/развернуть"
                        >
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '3px' }}>
                                    <span>Собрано</span>
                                    <span>{collectedCount}/{items.length}</span>
                                </div>
                                <div className="progress-bar" style={{ height: '6px' }}>
                                    <div className="progress-fill" style={{ width: `${(collectedCount / items.length) * 100}%`, background: 'linear-gradient(90deg, var(--wf-primary) 0%, var(--wf-secondary) 100%)' }}></div>
                                </div>
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '3px' }}>
                                    <span>Освоено</span>
                                    <span>{masteredCount}/{items.length}</span>
                                </div>
                                <div className="progress-bar" style={{ height: '6px' }}>
                                    <div className="progress-fill" style={{ width: `${(masteredCount / items.length) * 100}%`, background: 'var(--wf-success)' }}></div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button className="btn btn-secondary btn-small" onClick={() => onToggleVisibility(category)} title={isHidden ? 'Показать содержимое' : 'Скрыть содержимое'}>
                            {isHidden ? '👁️' : '🙈'}
                        </button>
                        {isEditMode && (
                            <>
                                <div style={{ display: 'flex', gap: '2px', marginRight: '5px' }}>
                                    <button className="btn btn-secondary btn-small" onClick={() => onMoveUp(category, 'up')} title="Вверх">▲</button>
                                    <button className="btn btn-secondary btn-small" onClick={() => onMoveDown(category, 'down')} title="Вниз">▼</button>
                                </div>
                                <button className="btn btn-secondary btn-small" onClick={() => onRenameCategory(category)} title="Переименовать категорию">✏️</button>
                                <button className="btn btn-danger btn-small" onClick={() => onDeleteCategory(category)} title="Удалить категорию">🗑️</button>
                            </>
                        )}
                    </div>
                </div>
            </div>
            {showContent && (
                isEmpty ? (
                    <div className="empty-state">
                        <h3>Нет элементов</h3>
                        <p>Добавьте элементы через меню редактирования</p>
                    </div>
                ) : (
                    <div>
                        {renderGrid(items)}
                    </div>
                )
            )}
        </div>
    );
});

export default CollectionSection;
