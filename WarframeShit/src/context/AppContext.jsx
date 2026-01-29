import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';

export const AppContext = createContext();

export const DEFAULT_ITEM_TYPES = [
    { id: 'prime', name: 'Prime', color: '#ffd700' },
    { id: 'kuva', name: 'Кува', color: '#e63946' },
    { id: 'tenet', name: 'Догмат', color: '#2a9d8f' },
    { id: 'vandal', name: 'Вандал', color: '#264653' },
    { id: 'wraith', name: 'Призрак', color: '#7f5539' },
    { id: 'prisma', name: 'Призма', color: '#4cc9f0' },
    { id: 'coda', name: 'Кода', color: '#f77f00' },
];

export function AppProvider({ children }) {
    // --- State ---
    const [data, setData] = useState({ categories: {}, itemTypes: DEFAULT_ITEM_TYPES });
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [weaponTypeFilter, setWeaponTypeFilter] = useState('all');
    const [sortBy, setSortBy] = useState('name');

    // UI State
    const [isEditMode, setIsEditMode] = useState(false);
    const [hiddenCategories, setHiddenCategories] = useState(() => {
        const saved = localStorage.getItem('hiddenCategories');
        return saved ? JSON.parse(saved) : [];
    });

    // Modals State
    const [editModal, setEditModal] = useState(null);
    const [bulkDuplicateModal, setBulkDuplicateModal] = useState(null);
    const [progressGroupsModal, setProgressGroupsModal] = useState(false);
    const [typesManagerModal, setTypesManagerModal] = useState(false);

    // --- Effects ---
    useEffect(() => {
        localStorage.setItem('hiddenCategories', JSON.stringify(hiddenCategories));
    }, [hiddenCategories]);

    useEffect(() => {
        loadData();
    }, []);

    // --- Core Funcs ---
    const loadData = async (newDataParam) => {
        try {
            let newData = newDataParam;
            if (!newData) {
                const response = await fetch('data/collection.json');
                if (!response.ok) {
                    throw new Error(`Не удалось загрузить данные (${response.status} ${response.statusText}). Возможно, сервер отключен.`);
                }
                const text = await response.text();
                try {
                    newData = JSON.parse(text);
                } catch (e) {
                    console.error('Raw response:', text.substring(0, 100));
                    throw new Error('Ответ сервера не является корректным JSON. Проверьте работу бэкенда.');
                }
            }

            // Migration Logic
            if (!newData.categories) {
                const categories = {};
                if (newData.frames) categories.frames = { id: 'frames', name: 'Варфреймы', items: newData.frames };
                if (newData.weapons) {
                    Object.entries(newData.weapons).forEach(([key, items]) => {
                        categories[key] = { id: key, name: key, items: items };
                    });
                }
                newData.categories = categories;
                delete newData.frames;
                delete newData.weapons;
            }
            if (!newData.itemTypes) newData.itemTypes = DEFAULT_ITEM_TYPES;

            let maxOrder = 0;
            Object.values(newData.categories).forEach(cat => {
                if (typeof cat.order === 'number') maxOrder = Math.max(maxOrder, cat.order);
            });

            Object.values(newData.categories).forEach((cat, index) => {
                if (typeof cat.order !== 'number') cat.order = maxOrder + index + 1;
                if (cat.items) {
                    cat.items.forEach(item => {
                        if (item.isPrime && !item.type) item.type = 'prime';
                    });
                }
            });

            setData(newData);
            setLoading(false);
        } catch (error) {
            console.error('Error loading data:', error);
            alert(`Ошибка загрузки данных: ${error.message}. Попробуйте обновить страницу.`);
            setLoading(false);
        }
    };

    const initialLoadDone = useRef(false);

    useEffect(() => {
        if (loading || !data || !data.categories) return;

        // Skip saving on the very first data change (which is the loadData completion)
        if (!initialLoadDone.current) {
            initialLoadDone.current = true;
            return;
        }

        const timer = setTimeout(async () => {
            try {
                await fetch('save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data, null, 2)
                });
            } catch (error) {
                console.error('Error saving data:', error);
                alert('Ошибка сохранения данных (синхронизация с сервером прервана)');
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [data, loading]);

    // Legacy helper for components that might still call it, simply updates state now
    const saveData = useCallback((newData) => {
        setData(newData);
    }, []);

    // --- Helpers ---
    const updateGlobalStatus = useCallback((itemName, updates) => {
        setData(prevData => {
            const newCategories = { ...prevData.categories };
            let updated = false;

            Object.keys(newCategories).forEach(catKey => {
                const category = newCategories[catKey];
                const itemIndex = category.items.findIndex(i => i.name === itemName);

                if (itemIndex !== -1) {
                    const newItems = [...category.items];
                    newItems[itemIndex] = { ...newItems[itemIndex], ...updates };
                    newCategories[catKey] = { ...category, items: newItems };
                    updated = true;
                }
            });

            if (updated) {
                const newData = { ...prevData, categories: newCategories };
                return newData;
            }
            return prevData;
        });
    }, [saveData]);

    const getFilteredItems = useCallback((items) => {
        let filtered = [...items];

        if (searchQuery) {
            filtered = filtered.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
        }

        if (statusFilter === 'collected') filtered = filtered.filter(item => item.collected);
        else if (statusFilter === 'not-collected') filtered = filtered.filter(item => !item.collected);
        else if (statusFilter === 'mastered') filtered = filtered.filter(item => item.mastered);
        else if (statusFilter === 'not-mastered') filtered = filtered.filter(item => !item.mastered);
        else if (statusFilter === 'collected-not-mastered') filtered = filtered.filter(item => item.collected && !item.mastered);
        else if (statusFilter === 'mastered-not-collected') filtered = filtered.filter(item => item.mastered && !item.collected);

        if (typeFilter !== 'all') filtered = filtered.filter(item => item.type === typeFilter);

        if (sortBy === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name));
        else if (sortBy === 'name-desc') filtered.sort((a, b) => b.name.localeCompare(a.name));
        else if (sortBy === 'prime') {
            filtered.sort((a, b) => {
                if (a.type === b.type) return a.name.localeCompare(b.name);
                if (a.type === 'prime') return -1;
                if (b.type === 'prime') return 1;
                return a.name.localeCompare(b.name);
            });
        }

        return filtered;
    }, [searchQuery, statusFilter, typeFilter, sortBy]);

    // Stats Check
    const stats = useMemo(() => {
        const allCategories = data.categories || {};
        const progressGroups = data.progressGroups || [];
        const categoryStats = {};
        Object.values(allCategories).forEach(cat => {
            const items = cat.items || [];
            const collected = items.filter(i => i.collected).length;
            const mastered = items.filter(i => i.mastered).length;
            categoryStats[cat.id] = {
                name: cat.name || cat.id,
                collected,
                mastered,
                total: items.length,
                percentage: items.length > 0 ? Math.round((collected / items.length) * 100) : 0,
                order: cat.order
            };
        });

        const groupStats = {};
        progressGroups.forEach(group => {
            let collected = 0, mastered = 0, total = 0;
            group.categories.forEach(categoryKey => {
                const key = categoryKey.startsWith('weapon-') ? categoryKey.replace('weapon-', '') : categoryKey;
                const cat = allCategories[key];
                if (cat) {
                    collected += cat.items.filter(i => i.collected).length;
                    mastered += cat.items.filter(i => i.mastered).length;
                    total += cat.items.length;
                }
            });
            groupStats[group.id] = { name: group.name, collected, mastered, total };
        });

        const allItems = Object.values(allCategories).flatMap(c => c.items || []);
        return {
            total: {
                collected: allItems.filter(i => i.collected).length,
                mastered: allItems.filter(i => i.mastered).length,
                total: allItems.length
            },
            categories: categoryStats,
            progressGroups: groupStats
        };
    }, [data]);

    const sortedCategories = useMemo(() => {
        if (!data.categories) return [];
        return Object.values(data.categories).sort((a, b) => (a.order || 0) - (b.order || 0));
    }, [data.categories]);

    // --- Actions ---
    const toggleCategoryVisibility = useCallback((categoryKey) => {
        setHiddenCategories(prev => prev.includes(categoryKey) ? prev.filter(c => c !== categoryKey) : [...prev, categoryKey]);
    }, []);

    const toggleCollected = useCallback((categoryKey, id) => {
        const category = data.categories[categoryKey];
        const item = category?.items.find(i => i.id === id);
        if (item) updateGlobalStatus(item.name, { collected: !item.collected });
    }, [data, updateGlobalStatus]);

    const toggleMastered = useCallback((categoryKey, id) => {
        const category = data.categories[categoryKey];
        const item = category?.items.find(i => i.id === id);
        if (item) updateGlobalStatus(item.name, { mastered: !item.mastered });
    }, [data, updateGlobalStatus]);

    // Add/Edit Actions
    const handleAdd = useCallback((type, category = null) => {
        const newItem = {
            id: `new-${Date.now()}`,
            name: '',
            collected: false,
            mastered: false,
            type: null,
            image: ''
        };
        setEditModal({ type, category, item: newItem, isNew: true });
    }, []);

    const handleEdit = useCallback((type, category, item) => {
        setEditModal({ type, category, item: { ...item }, isNew: false });
    }, []);

    const handleDelete = (type, category, id) => {
        if (!confirm('Вы уверены, что хотите удалить этот элемент?')) return;
        const newData = { ...data };
        if (newData.categories[category]) {
            newData.categories[category].items = newData.categories[category].items.filter(i => i.id !== id);
            setData(newData);
        }
    };

    const handleDeleteCategory = useCallback((categoryKey) => {
        if (!confirm(`Вы уверены, что хотите удалить категорию?`)) return;
        const newData = {
            ...data,
            categories: { ...data.categories }
        };
        delete newData.categories[categoryKey];
        setHiddenCategories(prev => prev.filter(c => c !== categoryKey));
        setData(newData);
    }, [data]);

    const handleMoveCategory = useCallback((categoryId, direction) => {
        const categoriesMap = { ...data.categories };
        const categoriesArray = Object.values(categoriesMap).sort((a, b) => (a.order || 0) - (b.order || 0));
        const currentIndex = categoriesArray.findIndex(c => c.id === categoryId);
        if (currentIndex === -1) return;

        if (direction === 'up' && currentIndex > 0) {
            const prev = categoriesArray[currentIndex - 1];
            const curr = categoriesArray[currentIndex];
            categoriesMap[prev.id] = { ...prev, order: curr.order };
            categoriesMap[curr.id] = { ...curr, order: prev.order };
            setData({ ...data, categories: categoriesMap });
        } else if (direction === 'down' && currentIndex < categoriesArray.length - 1) {
            const next = categoriesArray[currentIndex + 1];
            const curr = categoriesArray[currentIndex];
            categoriesMap[next.id] = { ...next, order: curr.order };
            categoriesMap[curr.id] = { ...curr, order: next.order };
            setData({ ...data, categories: categoriesMap });
        }
    }, [data]);


    // --- Item Handlers ---
    const handleSaveItem = useCallback((itemData, targetCategory = null) => {
        const finalCategory = targetCategory || editModal.category;
        const categories = { ...data.categories };

        const targetCatData = { ...categories[finalCategory] };
        if (!targetCatData) {
            alert('Категория не найдена');
            return;
        }
        targetCatData.items = [...(targetCatData.items || [])];

        if (editModal.isNew) {
            targetCatData.items.push(itemData);
        } else {
            if (editModal.category !== finalCategory) {
                const oldCatData = { ...categories[editModal.category] };
                if (oldCatData) {
                    oldCatData.items = oldCatData.items.filter(i => i.id !== itemData.id);
                    categories[editModal.category] = oldCatData;
                }
                targetCatData.items.push(itemData);
            } else {
                const index = targetCatData.items.findIndex(i => i.id === itemData.id);
                if (index !== -1) {
                    targetCatData.items[index] = itemData;
                }
            }
        }

        categories[finalCategory] = targetCatData;
        setData({ ...data, categories });
        setEditModal(null);
    }, [data, editModal]);

    // --- Progress Group Handlers ---
    const handleSaveProgressGroup = useCallback((groupData) => {
        const progressGroups = [...(data.progressGroups || [])];

        const existingIndex = progressGroups.findIndex(g => g.id === groupData.id);
        if (existingIndex !== -1) {
            progressGroups[existingIndex] = groupData;
        } else {
            progressGroups.push(groupData);
        }

        setData({ ...data, progressGroups });
    }, [data]);

    const handleDeleteProgressGroup = useCallback((groupId) => {
        const progressGroups = (data.progressGroups || []).filter(g => g.id !== groupId);
        setData({ ...data, progressGroups });
    }, [data]);

    const handleRenameCategory = useCallback((categoryKey) => {
        const category = data.categories[categoryKey];
        if (!category) return;

        const newName = prompt('Введите новое название категории:', category.name);
        if (newName && newName.trim() && newName.trim() !== category.name) {
            const categories = { ...data.categories };
            categories[categoryKey] = { ...category, name: newName.trim() };
            setData({ ...data, categories });
        }
    }, [data]);

    const handleAddCategory = useCallback(() => {
        const categoryName = prompt('Введите название новой категории:');
        if (categoryName && categoryName.trim()) {
            const categories = { ...data.categories };
            let categoryKey = categoryName.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (!categoryKey || categories[categoryKey]) categoryKey = `cat-${Date.now().toString(36)}`;

            let maxOrder = 0;
            Object.values(categories).forEach(cat => { if (typeof cat.order === 'number') maxOrder = Math.max(maxOrder, cat.order); });

            categories[categoryKey] = {
                id: categoryKey, name: categoryName.trim(), items: [], order: maxOrder + 1, subcategories: []
            };

            setData({ ...data, categories });
        }
    }, [data]);

    const handleScrollToCategory = useCallback((categoryId) => {
        if (hiddenCategories.includes(categoryId)) {
            toggleCategoryVisibility(categoryId);
        }
        setTimeout(() => {
            const element = document.getElementById(`category-${categoryId}`);
            if (element) {
                const headerOffset = 180;
                const elementPosition = element.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });

                element.style.transition = 'background 0.5s';
                element.style.background = 'rgba(0, 212, 255, 0.1)';
                setTimeout(() => {
                    element.style.background = 'transparent';
                }, 1000);
            }
        }, 150);
    }, [hiddenCategories, toggleCategoryVisibility]);

    // --- Bulk Upload Handlers ---
    const addBulkItems = useCallback((itemsToAdd, category, type) => {
        const categories = { ...data.categories };

        if (!categories[category]) {
            categories[category] = { id: category, name: category, items: [] };
        } else {
            categories[category] = {
                ...categories[category],
                items: [...(categories[category].items || []), ...itemsToAdd]
            };
        }

        setData({ ...data, categories });
        setBulkDuplicateModal(null);
    }, [data]);

    const handleBulkUpload = useCallback(async (files, category, type) => {
        if (!files || files.length === 0) return;

        const newData = { ...data };
        const catData = newData.categories[category];
        const existingItems = catData ? catData.items : [];

        const processPromises = Array.from(files).map(file => {
            return new Promise((resolve) => {
                let name = file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
                const isDuplicate = existingItems.some(item => item.name.toLowerCase() === name.toLowerCase());

                let detectedType = null;
                const nameLower = name.toLowerCase();

                if (data.itemTypes) {
                    for (const itemType of data.itemTypes) {
                        const typeName = itemType.name.toLowerCase();
                        const keywords = itemType.keywords || [];
                        if (nameLower.includes(typeName) || keywords.some(k => nameLower.includes(k.toLowerCase()))) {
                            detectedType = itemType.id;
                            break;
                        }
                    }
                }

                const newItem = {
                    id: `new-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    name: name,
                    collected: false,
                    mastered: false,
                    type: detectedType,
                    image: ''
                };

                const reader = new FileReader();
                reader.onloadend = () => {
                    newItem.image = reader.result;
                    resolve({ newItem, isDuplicate });
                };
                reader.onerror = () => {
                    console.error("Failed to read file", file.name);
                    resolve({ newItem, isDuplicate: false, error: true });
                };
                reader.readAsDataURL(file);
            });
        });

        const results = await Promise.all(processPromises);
        const newItems = [];
        const duplicates = [];

        results.forEach(result => {
            if (result.error) return;
            if (result.isDuplicate) duplicates.push(result.newItem);
            else newItems.push(result.newItem);
        });

        if (duplicates.length > 0) {
            setBulkDuplicateModal({ duplicates, newItems, category, type });
        } else {
            addBulkItems(newItems, category, type);
        }
    }, [data, addBulkItems]);

    const resolveBulkDuplicates = useCallback((action) => {
        if (!bulkDuplicateModal) return;
        const { duplicates, newItems, category, type } = bulkDuplicateModal;
        let finalItems = [...newItems];
        if (action === 'all') {
            finalItems = [...finalItems, ...duplicates];
            addBulkItems(finalItems, category, type);
        } else if (action === 'unique') {
            addBulkItems(finalItems, category, type);
        } else {
            setBulkDuplicateModal(null);
        }
    }, [bulkDuplicateModal, addBulkItems]);

    const resetFilters = useCallback(() => {
        setSearchQuery('');
        setStatusFilter('all');
        setTypeFilter('all');
        setWeaponTypeFilter('all');
        setSortBy('name');
    }, []);

    const value = {
        data, loading, loadData, saveData,
        searchQuery, setSearchQuery,
        statusFilter, setStatusFilter,
        typeFilter, setTypeFilter,
        weaponTypeFilter, setWeaponTypeFilter,
        sortBy, setSortBy,
        isEditMode, setIsEditMode,
        hiddenCategories, toggleCategoryVisibility,
        stats, sortedCategories, getFilteredItems,
        toggleCollected, toggleMastered,
        handleAdd, handleEdit, handleDelete, handleSaveItem, // Added handleSaveItem
        handleDeleteCategory, handleAddCategory, handleRenameCategory, // Added handleRenameCategory
        handleMoveCategory,
        handleBulkUpload, resolveBulkDuplicates,
        resetFilters, handleScrollToCategory,
        handleSaveProgressGroup, handleDeleteProgressGroup, // Added these
        editModal, setEditModal,
        bulkDuplicateModal, setBulkDuplicateModal,
        progressGroupsModal, setProgressGroupsModal,
        typesManagerModal, setTypesManagerModal
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
    return useContext(AppContext);
}
