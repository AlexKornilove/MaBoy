import React from 'react';
import { useApp } from '../context/AppContext';
import StatCard from '../components/stats/StatCard';
import CollectionSection from '../components/collection/CollectionSection';

const CollectionPage = () => {
    const {
        stats, sortedCategories,
        handleMoveCategory, handleDeleteCategory,
        toggleCategoryVisibility, toggleCollected, toggleMastered, handleEdit, handleDelete,
        hiddenCategories,
        weaponTypeFilter,
        data,
        isEditMode,
        searchQuery, statusFilter, typeFilter,
        getFilteredItems,
        handleBulkUpload,
        handleAdd,
        handleAddCategory, handleRenameCategory, // Added handleRenameCategory
        handleScrollToCategory,
    } = useApp();


    return (
        <div className="collection-page">
            {/* Статистика */}
            <div className="stats-bar">
                <StatCard
                    title="Общий прогресс"
                    stats={stats.total}
                />
            </div>

            {/* Статистика групп прогресса */}
            {Object.keys(stats.progressGroups || {}).length > 0 && (
                <div className="stats-bar" style={{ marginTop: '15px' }}>
                    {Object.entries(stats.progressGroups).map(([groupId, stat]) => (
                        <StatCard
                            key={groupId}
                            title={stat.name}
                            stats={stat}
                        />
                    ))}
                </div>
            )}

            {/* Статистика по категориям оружия */}
            {Object.values(stats.categories || {}).length > 0 && (
                <div className="stats-bar" style={{ marginTop: '15px' }}>
                    {/* Use sorted categories for stats order too */}
                    {sortedCategories.map(cat => {
                        const stat = stats.categories[cat.id];
                        if (!stat) return null;
                        return (
                            <StatCard
                                key={cat.id}
                                title={stat.name}
                                stats={stat}
                                onClick={() => handleScrollToCategory(cat.id)}
                            />
                        );
                    })}
                </div>
            )}

            {/* Меню редактирования (только в режиме редактирования) */}
            {isEditMode && (
                <div className="controls" style={{ marginTop: '20px', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', width: '100%', justifyContent: 'center' }}>
                        {/* We moved handleAddCategory to Header or Sidebar or keep it here? 
                The Sidebar/Header doesn't have "Add Category" button. 
                Let's use useApp().handleAddCategory if we want to expose it in UI locally.
                Actually app.js had it in controls.
                Let's add it here for now or maybe later move to floating action or header actions.
            */}
                        <button className="btn btn-secondary" onClick={handleAddCategory}>
                            + Новая категория
                        </button>

                        {sortedCategories.map((cat) => {
                            const key = cat.id;
                            return (
                                <div key={key} className="btn-group">
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => handleAdd('item', key)}
                                        title={`Добавить в категорию "${cat.name}"`}
                                    >
                                        + {cat.name}
                                    </button>
                                    <label className="btn btn-secondary btn-icon-only" title={`Массовое добавление в "${cat.name}"`}>
                                        📂
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            style={{ display: 'none' }}
                                            onChange={(e) => handleBulkUpload(e.target.files, key, 'item')}
                                        />
                                    </label>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Render All Categories */}
            {
                sortedCategories.map(category => {
                    // Check top-level weapon type filter
                    if (weaponTypeFilter !== 'all' && weaponTypeFilter !== category.id) return null;

                    return (
                        <div
                            id={`category-${category.id}`}
                            key={category.id}
                            style={{ viewTransitionName: `category-${category.id}` }}
                        >
                            <CollectionSection
                                title={category.name}
                                allSectionItems={category.items || []}
                                type="item"
                                category={category.id}
                                isHidden={hiddenCategories.includes(category.id)}
                                onToggleVisibility={toggleCategoryVisibility}
                                onToggleCollected={toggleCollected}
                                onToggleMastered={toggleMastered}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                onDeleteCategory={handleDeleteCategory}
                                onRenameCategory={handleRenameCategory}
                                onMoveUp={handleMoveCategory}
                                onMoveDown={handleMoveCategory}
                                isEditMode={isEditMode}
                                allTypes={data.itemTypes}
                                getFilteredItems={getFilteredItems}
                                searchQuery={searchQuery}
                                statusFilter={statusFilter}
                                typeFilter={typeFilter}
                            />
                        </div>
                    );
                })
            }
        </div>
    );
};

export default CollectionPage;
