import React, { memo } from 'react';

const ItemCard = memo(({
    item,
    category,
    type,
    isEditMode,
    itemType,
    onToggleCollected,
    onToggleMastered,
    onEdit,
    onDelete
}) => {
    // Определяем класс состояния
    const getStateClass = () => {
        if (item.collected && item.mastered) return 'collected-mastered';
        if (item.collected) return 'collected';
        if (item.mastered) return 'mastered';
        return '';
    };

    return (
        <div
            className={`item-card ${getStateClass()}`}
            onClick={() => onToggleCollected(category, item.id)}
            style={itemType ? { borderColor: itemType.color } : {}}
        >
            <div className={`status-indicator ${getStateClass()}`}></div>
            <div className="item-image">
                {item.image ? (
                    <img src={item.image} alt={item.name} onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.textContent = '🖼️';
                    }} />
                ) : (
                    <span>🖼️</span>
                )}
            </div>
            <div className="item-info">
                <div className="item-name">
                    {item.name || 'Без названия'}
                </div>
                <div className="item-badges">
                    {itemType && (
                        <span className="badge" style={{ background: itemType.color, color: '#fff' }}>
                            {itemType.name}
                        </span>
                    )}
                    {item.mastered && (
                        <span className="badge badge-mastered">Освоено</span>
                    )}
                    <span className={`badge ${item.collected ? 'badge-collected' : 'badge-not-collected'}`}>
                        {item.collected ? 'Собрано' : 'Не собрано'}
                    </span>
                </div>
                <div className="item-actions">
                    <button
                        className={`btn ${item.mastered ? 'btn-mastered' : 'btn-secondary'} btn-small`}
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleMastered(category, item.id);
                        }}
                        title={item.mastered ? 'Снять освоение' : 'Отметить как освоенное'}
                    >
                        {item.mastered ? '⭐' : '☆'}
                    </button>
                    {isEditMode && (
                        <>
                            <button
                                className="btn btn-secondary btn-small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(item);
                                }}
                            >
                                ✏️
                            </button>
                            <button
                                className="btn btn-danger btn-small"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(item.id);
                                }}
                            >
                                🗑️
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
});

export default ItemCard;
