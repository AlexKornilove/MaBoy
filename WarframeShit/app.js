const { useState, useEffect, useMemo } = React;

const DEFAULT_ITEM_TYPES = [
  { id: 'prime', name: 'Prime', color: '#ffd700' },
  { id: 'kuva', name: 'Кува', color: '#e63946' },
  { id: 'tenet', name: 'Догмат', color: '#2a9d8f' },
  { id: 'vandal', name: 'Вандал', color: '#264653' },
  { id: 'wraith', name: 'Призрак', color: '#7f5539' },
  { id: 'prisma', name: 'Призма', color: '#4cc9f0' },
  { id: 'coda', name: 'Кода', color: '#f77f00' },
];

// Главный компонент приложения
function App() {
  const [data, setData] = useState({ categories: {}, itemTypes: DEFAULT_ITEM_TYPES });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [primeFilter, setPrimeFilter] = useState('all');
  const [weaponTypeFilter, setWeaponTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [importStatus, setImportStatus] = useState(null);
  const [bulkDuplicateModal, setBulkDuplicateModal] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [progressGroupsModal, setProgressGroupsModal] = useState(false);
  const [typesManagerModal, setTypesManagerModal] = useState(false);
  const [showSubcategories, setShowSubcategories] = useState(false);
  const [hiddenCategories, setHiddenCategories] = useState(() => {
    const saved = localStorage.getItem('hiddenCategories');
    return saved ? JSON.parse(saved) : [];
  });

  // Сохранение скрытых категорий в localStorage
  useEffect(() => {
    localStorage.setItem('hiddenCategories', JSON.stringify(hiddenCategories));
  }, [hiddenCategories]);

  // Загрузка данных
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (newDataParam) => {
    try {
      let newData = newDataParam;
      if (!newData) {
        const response = await fetch('data/collection.json');
        newData = await response.json();
      }

      // ... (migration logic) ...

      // Migration: Categories Structure
      if (!newData.categories) {
        // ... (existing migration logic) ...
        const categories = {};
        if (newData.frames) {
          categories.frames = { id: 'frames', name: 'Варфреймы', items: newData.frames, subcategories: [] };
        }
        if (newData.weapons) {
          Object.entries(newData.weapons).forEach(([key, items]) => {
            categories[key] = { id: key, name: key, items: items, subcategories: [] };
          });
        }
        newData.categories = categories;
        delete newData.frames;
        delete newData.weapons;
      }

      // Migration: Item Types
      if (!newData.itemTypes) {
        newData.itemTypes = DEFAULT_ITEM_TYPES;
      }

      // Ensure all categories have subcategories array and migrate items
      // Also ensure 'order' property exists
      let maxOrder = 0;
      Object.values(newData.categories).forEach(cat => {
        if (typeof cat.order === 'number') {
          maxOrder = Math.max(maxOrder, cat.order);
        }
      });

      Object.values(newData.categories).forEach((cat, index) => {
        if (!cat.subcategories) {
          cat.subcategories = [];
        }
        if (typeof cat.order !== 'number') {
          cat.order = maxOrder + index + 1;
        }

        if (cat.items) {
          cat.items.forEach(item => {
            // Migrate isPrime to type
            if (item.isPrime && !item.type) {
              item.type = 'prime';
            }
          });
        }
      });

      setData(newData);
      setLoading(false);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      setLoading(false);
    }
  };

  const saveData = async (newData) => {
    try {
      await fetch('save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData, null, 2)
      });
      // We update state optimistically in most cases, but this ensures sync
      setData(newData);
    } catch (error) {
      console.error('Ошибка сохранения данных:', error);
      alert('Ошибка сохранения данных');
    }
  };

  // Получение элементов из категории (для групп прогресса)
  const getItemsFromCategory = (categoryKey) => {
    // Check if it's a direct category key
    if (data.categories && data.categories[categoryKey]) {
      return data.categories[categoryKey].items || [];
    }
    // Backward compatibility for "weapon-" prefix in groups
    if (categoryKey.startsWith('weapon-')) {
      const key = categoryKey.replace('weapon-', '');
      return data.categories?.[key]?.items || [];
    }
    return [];
  };

  // Helper to update status globally across all categories
  const updateGlobalStatus = (itemName, updates) => {
    // 1. Optimistic Update
    const newData = { ...data };
    let updatedCount = 0;

    Object.values(newData.categories).forEach(cat => {
      cat.items.forEach(item => {
        if (item.name === itemName) {
          Object.assign(item, updates);
          updatedCount++;
        }
      });
    });

    if (updatedCount > 0) {
      setData(newData); // Update UI immediately

      // 2. Background Save
      saveData(newData); // Send to server
    }
  };

  // Helper to check duplicates across a specific category
  const checkDuplicateInCategory = (categoryKey, name) => {
    const items = data.categories[categoryKey]?.items || [];
    return items.some(item => item.name.toLowerCase() === name.trim().toLowerCase());
  };

  // Helper to transform category ID for display/logic
  const getCategoryDisplayName = (catId) => {
    // You can extend this mapping or store proper names in the category object itself
    const names = {
      frames: 'Варфреймы',
      rifles: 'Винтовки',
      melee: 'Ближнее оружие',
      companions: 'Компаньоны'
    };
    return data.categories[catId]?.name || names[catId] || catId;
  };

  // Sorted categories for display
  const sortedCategories = useMemo(() => {
    if (!data.categories) return [];
    return Object.values(data.categories).sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [data.categories]);

  // Вычисление статистики
  const stats = useMemo(() => {
    // ... (keep existing stats logic)
    const allCategories = data.categories || {};
    const progressGroups = data.progressGroups || [];

    // Статистика по категориям
    const categoryStats = {};
    Object.values(allCategories).forEach(cat => {
      const items = cat.items || [];
      const collected = items.filter(i => i.collected).length;
      const mastered = items.filter(i => i.mastered).length;
      const total = items.length;

      categoryStats[cat.id] = {
        name: cat.name || cat.id,
        collected,
        mastered,
        total,
        percentage: total > 0 ? Math.round((collected / total) * 100) : 0,
        order: cat.order // Include order for sorting stats if needed
      };
    });

    // Вычисление статистики для групп прогресса
    const groupStats = {};
    progressGroups.forEach(group => {
      let collected = 0;
      let mastered = 0;
      let total = 0;

      group.categories.forEach(categoryKey => {
        // handle weapon- prefix removal if needed
        const key = categoryKey.startsWith('weapon-') ? categoryKey.replace('weapon-', '') : categoryKey;
        const cat = allCategories[key];
        if (cat) {
          const items = cat.items || [];
          collected += items.filter(i => i.collected).length;
          mastered += items.filter(i => i.mastered).length;
          total += items.length;
        }
      });

      groupStats[group.id] = {
        name: group.name,
        collected,
        mastered,
        total
      };
    });

    // Общий прогресс (все элементы)
    const allItems = Object.values(allCategories).flatMap(c => c.items || []);
    // Remove potential duplicates for total count if items share names? 
    // Spec says "unify items", but current structure is items per category. 
    // For now calculate raw total.

    const totalCollected = allItems.filter(item => item.collected).length;
    const totalMastered = allItems.filter(item => item.mastered).length;
    const total = allItems.length;

    return {
      total: {
        collected: totalCollected,
        mastered: totalMastered,
        total: total
      },
      categories: categoryStats,
      progressGroups: groupStats
    };
  }, [data]);


  // Переключение видимости категории
  const toggleCategoryVisibility = (categoryKey) => {
    setHiddenCategories(prev => {
      if (prev.includes(categoryKey)) {
        return prev.filter(c => c !== categoryKey);
      } else {
        return [...prev, categoryKey];
      }
    });
  };

  // Универсальная фильтрация элементов
  const getFilteredItems = (items) => {
    let filtered = [...items];

    // Поиск
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Фильтр по статусу
    if (statusFilter === 'collected') {
      filtered = filtered.filter(item => item.collected);
    } else if (statusFilter === 'not-collected') {
      filtered = filtered.filter(item => !item.collected);
    } else if (statusFilter === 'mastered') {
      filtered = filtered.filter(item => item.mastered);
    } else if (statusFilter === 'not-mastered') {
      filtered = filtered.filter(item => !item.mastered);
    } else if (statusFilter === 'collected-not-mastered') {
      filtered = filtered.filter(item => item.collected && !item.mastered);
    } else if (statusFilter === 'mastered-not-collected') {
      filtered = filtered.filter(item => item.mastered && !item.collected);
    }

    // Фильтр по типу
    if (typeFilter !== 'all') {
      filtered = filtered.filter(item => item.type === typeFilter);
    }

    // Сортировка
    if (sortBy === 'name') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'name-desc') {
      filtered.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortBy === 'prime') {
      filtered.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        if (a.type === 'prime') return -1;
        if (b.type === 'prime') return 1;
        return a.name.localeCompare(b.name);
      });
    }

    return filtered;
  };

  // Переключение статуса сбора
  const toggleCollected = (type, categoryKey, id) => {
    // Находим предмет, чтобы узнать его имя для глобального обновления
    const category = data.categories[categoryKey];
    const item = category?.items.find(i => i.id === id);

    if (item) {
      updateGlobalStatus(item.name, { collected: !item.collected });
    }
  };

  // Переключение статуса освоения
  const toggleMastered = (type, categoryKey, id) => {
    const category = data.categories[categoryKey];
    const item = category?.items.find(i => i.id === id);

    if (item) {
      updateGlobalStatus(item.name, { mastered: !item.mastered });
    }
  };

  // Добавление элемента
  const handleAdd = (type, category = null) => {
    const newItem = {
      id: `new-${Date.now()}`,
      name: '',
      collected: false,
      mastered: false,
      type: null,
      image: ''
    };
    setEditModal({ type, category, item: newItem, isNew: true });
  };

  // Редактирование элемента
  const handleEdit = (type, category, item) => {
    setEditModal({ type, category, item: { ...item }, isNew: false });
  };

  // Удаление элемента
  const handleDelete = (type, category, id) => {
    if (!confirm('Вы уверены, что хотите удалить этот элемент?')) return;

    const newData = { ...data };

    if (newData.categories[category]) {
      newData.categories[category].items = newData.categories[category].items.filter(i => i.id !== id);
      saveData(newData);
    }
  };

  // Сохранение элемента
  const handleSaveItem = (itemData, targetCategory = null) => {
    const newData = { ...data };
    const finalCategory = targetCategory || editModal.category;

    // Handle Category Move or New Item
    const targetCatData = newData.categories[finalCategory];

    if (!targetCatData) {
      alert('Категория не найдена');
      return;
    }

    if (editModal.isNew) {
      targetCatData.items.push(itemData);
    } else {
      // Check if moving categories
      if (editModal.category !== finalCategory) {
        // Remove from old
        const oldCatData = newData.categories[editModal.category];
        if (oldCatData) {
          oldCatData.items = oldCatData.items.filter(i => i.id !== itemData.id);
        }
        // Add to new
        targetCatData.items.push(itemData);
      } else {
        // Update in place
        const index = targetCatData.items.findIndex(i => i.id === itemData.id);
        if (index !== -1) {
          targetCatData.items[index] = itemData;
        }
      }
    }

    saveData(newData);
    setEditModal(null);
  };

  // Массовое добавление (обработка файлов)
  const handleBulkUpload = async (files, category, type) => {
    if (!files || files.length === 0) return;

    const newData = { ...data };
    const catData = newData.categories[category];
    const existingItems = catData ? catData.items : [];

    // Create promises for processing each file
    const processPromises = Array.from(files).map(file => {
      return new Promise((resolve) => {
        // Парсинг имени файла
        let name = file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");

        const isDuplicate = existingItems.some(
          item => item.name.toLowerCase() === name.toLowerCase()
        );

        // Auto-detect type from filename
        let detectedType = null;
        const nameLower = name.toLowerCase();

        if (data.itemTypes) {
          for (const itemType of data.itemTypes) {
            // Check name and keywords if available
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

    // Wait for all files to be read
    const results = await Promise.all(processPromises);

    const newItems = [];
    const duplicates = [];

    results.forEach(result => {
      if (result.error) return;

      if (result.isDuplicate) {
        duplicates.push(result.newItem);
      } else {
        newItems.push(result.newItem);
      }
    });

    if (duplicates.length > 0) {
      setBulkDuplicateModal({
        duplicates,
        newItems,
        category,
        type
      });
    } else {
      addBulkItems(newItems, category, type);
    }
  };

  // Финальное добавление элементов
  const addBulkItems = (itemsToAdd, category, type) => {
    const newData = { ...data };

    if (!newData.categories[category]) {
      // Create category if missing? Should exist by UI definition though
      newData.categories[category] = { id: category, name: category, items: [] };
    }

    newData.categories[category].items.push(...itemsToAdd);

    saveData(newData);
    setBulkDuplicateModal(null);
  };

  // Разрешение дубликатов
  const resolveBulkDuplicates = (action) => {
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
  };

  const handleAddCategory = () => {
    const categoryName = prompt('Введите название новой категории:');
    if (categoryName && categoryName.trim()) {
      const newData = { ...data };

      // Better ID generation
      let categoryKey = categoryName.toLowerCase().replace(/[^a-z0-9]/g, '');

      // If ID is empty (e.g. Cyrillic only) or exists, generate random
      if (!categoryKey || newData.categories[categoryKey]) {
        categoryKey = `cat-${Date.now().toString(36)}`;
      }

      if (!newData.categories[categoryKey]) {
        // Clone categories
        newData.categories = { ...data.categories };

        // Find max order for new category
        let maxOrder = 0;
        Object.values(newData.categories).forEach(cat => {
          if (typeof cat.order === 'number') {
            maxOrder = Math.max(maxOrder, cat.order);
          }
        });

        newData.categories[categoryKey] = {
          id: categoryKey,
          name: categoryName.trim(),
          items: [],
          order: maxOrder + 1,
          subcategories: []
        };

        setData(newData); // Optimistic Update
        saveData(newData);
      } else {
        // Should realistically never happen with timestamp
        alert('Ошибка создания категории: ID занят');
      }
    }
  };

  // Инициализация групп прогресса при загрузке (Migrated to work with categories)
  useEffect(() => {
    if (!loading && data && (!data.progressGroups || data.progressGroups.length === 0)) {
      // Default group logic if needed, skipping for now to avoid overwriting user data logic
    }
  }, [loading]);

  const handleSaveProgressGroup = (groupData) => {
    const newData = { ...data };
    if (!newData.progressGroups) {
      newData.progressGroups = [];
    }

    const existingIndex = newData.progressGroups.findIndex(g => g.id === groupData.id);
    if (existingIndex !== -1) {
      newData.progressGroups[existingIndex] = groupData;
    } else {
      newData.progressGroups.push(groupData);
    }

    saveData(newData);
  };

  const handleDeleteProgressGroup = (groupId) => {
    const newData = { ...data };
    if (newData.progressGroups) {
      newData.progressGroups = newData.progressGroups.filter(g => g.id !== groupId);
      saveData(newData);
    }
  };

  // Универсальное удаление категории
  const handleDeleteCategory = (categoryKey) => {
    const categoryName = data.categories[categoryKey]?.name || categoryKey;
    const itemsCount = (data.categories[categoryKey]?.items || []).length;

    let message = `Вы уверены, что хотите удалить категорию "${categoryName}"?`;
    if (itemsCount > 0) {
      message += `\n\nВ категории находится ${itemsCount} элементов. Они будут удалены.`;
    }

    if (!confirm(message)) return;

    const newData = { ...data };
    // Clone categories map
    newData.categories = { ...data.categories };

    delete newData.categories[categoryKey];

    // Also remove from hidden categories
    setHiddenCategories(prev => prev.filter(c => c !== categoryKey));

    setData(newData); // Optimistic Update
    saveData(newData);
  };

  // Добавление подкатегории
  const handleAddSubcategory = (categoryKey) => {
    const name = prompt('Введите название подкатегории:');
    if (name && name.trim()) {
      const newData = { ...data };
      // Clone categories map
      newData.categories = { ...data.categories };

      const category = { ...newData.categories[categoryKey] }; // Clone specific category
      newData.categories[categoryKey] = category;

      if (!category) {
        alert('Категория не найдена');
        return;
      }

      if (!category.subcategories) {
        category.subcategories = [];
      } else {
        category.subcategories = [...category.subcategories]; // Clone subcategories array
      }

      // Generate ID from name
      const subId = name.toLowerCase().replace(/[^a-z0-9а-я]/g, '');

      // Check for duplicate
      if (category.subcategories.some(s => s.id === subId)) {
        alert('Подкатегория с таким названием уже существует');
        return;
      }

      category.subcategories.push({
        id: subId,
        name: name.trim()
      });

      setData(newData); // Optimistic Update
      saveData(newData);
    }
  };

  // Удаление подкатегории
  const handleDeleteSubcategory = (categoryKey, subId) => {
    if (!confirm('Удалить подкатегорию? Предметы останутся в категории.')) return;

    const newData = { ...data };
    // Clone categories map
    newData.categories = { ...data.categories };

    const category = { ...newData.categories[categoryKey] }; // Clone specific category
    newData.categories[categoryKey] = category;

    if (!category) return;

    // Remove subcategory
    category.subcategories = category.subcategories.filter(s => s.id !== subId);

    // Clear subcategory from items (This modifies items, so we should clone items array mostly for correctness, but mutating item objects inside might be fine if we only care about top-level category change trigger. 
    // BUT we should probably clone data structure properly.)
    if (category.items) {
      // We want to trigger item re-renders too if needed? Items are usually own components.
      // But let's clone items array to be safe for category.items ref change.
      category.items = category.items.map(item => {
        if (item.subcategory === subId) {
          return { ...item, subcategory: undefined }; // Clone item being modified
        }
        return item;
      });
    }

    setData(newData); // Optimistic Update
    saveData(newData);
  };


  // Scroll to Top
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Category Reordering
  const handleMoveCategory = (categoryId, direction) => {
    const newData = { ...data };

    // CRITICAL: Clone categories map to trigger re-render of useMemo
    newData.categories = { ...data.categories };

    const categoriesArray = Object.values(newData.categories).sort((a, b) => (a.order || 0) - (b.order || 0));

    const currentIndex = categoriesArray.findIndex(c => c.id === categoryId);
    if (currentIndex === -1) return;

    let changed = false;

    if (direction === 'up' && currentIndex > 0) {
      // Swap orders with previous
      const prevCat = categoriesArray[currentIndex - 1];
      const currentCat = categoriesArray[currentIndex];

      // Clone specific category objects to be safe (though not strictly required if only swapping primitive numbers, good practice)
      newData.categories[prevCat.id] = { ...prevCat, order: currentCat.order };
      newData.categories[currentCat.id] = { ...currentCat, order: prevCat.order };

      changed = true;
    } else if (direction === 'down' && currentIndex < categoriesArray.length - 1) {
      // Swap orders with next
      const nextCat = categoriesArray[currentIndex + 1];
      const currentCat = categoriesArray[currentIndex];

      newData.categories[nextCat.id] = { ...nextCat, order: currentCat.order };
      newData.categories[currentCat.id] = { ...currentCat, order: nextCat.order };

      changed = true;
    }

    if (changed) {
      // View Transition API for smooth sorting
      if (document.startViewTransition) {
        document.startViewTransition(() => {
          setData(newData);
        });
      } else {
        setData(newData);
      }
      saveData(newData);
    }
  };


  // Прокрутка к категории
  const handleScrollToCategory = (categoryId) => {
    // Если категория скрыта, показываем её
    if (hiddenCategories.includes(categoryId)) {
      toggleCategoryVisibility(categoryId);
    }

    // Даем время на рендер (если была скрыта)
    setTimeout(() => {
      const element = document.getElementById(`category-${categoryId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        // Подсветка (опционально)
        element.style.transition = 'background 0.5s';
        element.style.background = 'rgba(0, 212, 255, 0.1)';
        setTimeout(() => {
          element.style.background = 'transparent';
        }, 1000);
      }
    }, 100);
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading">Загрузка данных...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1>WARFRAME COLLECTION</h1>
        <p>Отслеживание вашей коллекции варфреймов и оружия</p>
      </header>

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

      {/* Управление */}
      <div className="controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Поиск по имени..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-group">
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
            <option value="prime">Prime сначала</option>
          </select>
        </div>

        <div className="filter-group" style={{ alignItems: 'center' }}>
          <div className="checkbox-group" style={{
            background: 'rgba(0,0,0,0.3)',
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid var(--wf-border)',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              id="showSubcategories"
              checked={showSubcategories}
              onChange={(e) => setShowSubcategories(e.target.checked)}
            />
            <label htmlFor="showSubcategories" style={{ margin: 0, cursor: 'pointer', color: 'var(--wf-text)', textTransform: 'none', fontSize: '0.9rem' }}>
              Показать подкатегории
            </label>
          </div>
        </div>

        <button
          className={`btn ${isEditMode ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setIsEditMode(!isEditMode)}
          style={isEditMode ? { boxShadow: '0 0 10px var(--wf-primary)', borderColor: 'var(--wf-primary)' } : {}}
          title={isEditMode ? "Выключить режим редактирования" : "Включить режим редактирования"}
        >
          {isEditMode ? '✏️ Редактирование: ВКЛ' : '✏️ Редактирование: ВЫКЛ'}
        </button>

        {isEditMode && (
          <>
            <button className="btn btn-primary" onClick={() => setProgressGroupsModal(true)}>
              📊 Группы прогресса
            </button>
            <button className="btn btn-primary" onClick={() => setTypesManagerModal(true)}>
              🏷️ Виды предметов
            </button>
          </>
        )}
      </div>

      {/* Меню редактирования (только в режиме редактирования) */}
      {isEditMode && (
        <div className="controls" style={{ marginTop: '-15px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', width: '100%' }}>
            <button className="btn btn-secondary" onClick={handleAddCategory}>
              + Новая категория
            </button>
            {sortedCategories.map((cat) => {
              const key = cat.id;
              // Actually user wanted no "special" frames category, so we can iterate all for "New Category" button but maybe keep "Add Warframe" as a quick action or just generic "Add Item"
              // Let's keep it simple: Generic "Add Item" button per category in the edit mode view below.
              // Here in top controls for "New Category", we just need to list existing ones for bulk upload? 
              // The query was to have "Move to Category". 
              // Let's simplify the controls section to just generic actions.

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
          // Check filters
          if (weaponTypeFilter !== 'all' && weaponTypeFilter !== category.id) return null;

          const filteredItems = getFilteredItems(category.items || []);

          // Hide empty categories in specific cases if strictly needed, but let's conform to previous logic or better.
          if (!isEditMode && filteredItems.length === 0 && (searchQuery || statusFilter !== 'all' || typeFilter !== 'all')) {
            return null;
          }

          return (
            <div
              id={`category-${category.id}`}
              key={category.id}
              style={{ viewTransitionName: `category-${category.id}` }}
            >
              <CollectionSection
                title={category.name}
                items={filteredItems}
                type="item"
                category={category.id}
                categoryKey={category.id}
                subcategories={category.subcategories}
                showSubcategories={showSubcategories}
                isHidden={hiddenCategories.includes(category.id)}
                onToggleVisibility={() => toggleCategoryVisibility(category.id)}
                onToggleCollected={(id) => toggleCollected('item', category.id, id)}
                onToggleMastered={(id) => toggleMastered('item', category.id, id)}
                onEdit={(item) => handleEdit('item', category.id, item)}
                onDelete={(id) => handleDelete('item', category.id, id)}
                onDeleteCategory={() => handleDeleteCategory(category.id)}
                onAddSubcategory={() => handleAddSubcategory(category.id)}
                onDeleteSubcategory={(subId) => handleDeleteSubcategory(category.id, subId)}
                onMoveUp={() => handleMoveCategory(category.id, 'up')}
                onMoveDown={() => handleMoveCategory(category.id, 'down')}
                weaponTypeFilter={weaponTypeFilter}
                isEditMode={isEditMode}
                allTypes={data.itemTypes}
              />
            </div>
          );
        })
      }

      {/* Модальное окно редактирования */}
      {
        editModal && (
          <EditModal
            modal={editModal}
            data={data}
            onClose={() => setEditModal(null)}
            onSave={handleSaveItem}
          />
        )
      }

      {/* Модальное окно управления группами прогресса */}
      {progressGroupsModal && (
        <ProgressGroupsModal
          data={data}
          onClose={() => setProgressGroupsModal(false)}
          onSave={handleSaveProgressGroup}
          onDelete={handleDeleteProgressGroup}
        />
      )}

      {/* Модальное окно разрешения дубликатов при массовом добавлении */}
      {bulkDuplicateModal && (
        <BulkDuplicateResolutionModal
          duplicates={bulkDuplicateModal.duplicates}
          onResolve={resolveBulkDuplicates}
        />
      )}

      {/* Модальное окно управления видами */}
      {typesManagerModal && (
        <TypesManagerModal
          data={data}
          onClose={() => setTypesManagerModal(false)}
          onSave={(newTypes) => {
            const newData = { ...data, itemTypes: newTypes };
            saveData(newData);
            setTypesManagerModal(false);
          }}
        />
      )}

      {/* Кнопка "Наверх" */}
      {showScrollTop && (
        <button
          className="scroll-to-top"
          onClick={scrollToTop}
          title="Наверх"
        >
          ↑
        </button>
      )}
    </div>
  );
}

// Компонент карточки статистики с двойным прогрессом
function StatCard({ title, stats, onClick }) {
  const { collected, mastered, total } = stats;

  const collectedPercent = total > 0 ? Math.round((collected / total) * 100) : 0;
  const masteredPercent = total > 0 ? Math.round((mastered / total) * 100) : 0;

  return (
    <div
      className="stat-card"
      style={{
        textAlign: 'left',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s, box-shadow 0.2s'
      }}
      onClick={onClick}
    >
      <h3 style={{ textAlign: 'center', marginBottom: '15px' }}>{title}</h3>

      {/* Collected Progress */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 'bold', marginBottom: '4px' }}>
          <span style={{ color: 'var(--wf-primary)' }}>Собрано</span>
          <span style={{ color: 'var(--wf-text)' }}>{collected} / {total} ({collectedPercent}%)</span>
        </div>
        <div className="progress-bar" style={{ height: '10px', background: 'rgba(0,0,0,0.5)' }}>
          <div className="progress-fill" style={{
            width: `${collectedPercent}%`,
            background: 'linear-gradient(90deg, var(--wf-primary) 0%, var(--wf-secondary) 100%)'
          }}></div>
        </div>
      </div>

      {/* Mastered Progress */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 'bold', marginBottom: '4px' }}>
          <span style={{ color: 'var(--wf-success)' }}>Освоено</span>
          <span style={{ color: 'var(--wf-text)' }}>{mastered} / {total} ({masteredPercent}%)</span>
        </div>
        <div className="progress-bar" style={{ height: '10px', background: 'rgba(0,0,0,0.5)' }}>
          <div className="progress-fill" style={{
            width: `${masteredPercent}%`,
            background: 'var(--wf-success)'
          }}></div>
        </div>
      </div>
    </div>
  );
}

// Компонент секции коллекции
function CollectionSection({ title, items, type, category, categoryKey, subcategories, showSubcategories, isHidden, onToggleVisibility, onToggleCollected, onToggleMastered, onEdit, onDelete, onDeleteCategory, onAddSubcategory, onDeleteSubcategory, onMoveUp, onMoveDown, weaponTypeFilter, isEditMode, allTypes }) {
  const isEmpty = items.length === 0;
  const showContent = !isHidden;

  // Группировка по подкатегориям
  const groupedItems = useMemo(() => {
    const groups = { 'other': [] };

    // Если подкатегории выключены, просто возвращаем все элементы как 'other' (или обрабатываем это во время рендеринга)
    // Но чтобы сохранить логику фильтрации, лучше просто игнорировать группировку при рендере.
    // Однако `groupedItems` используется для рендера. 
    // Давайте оставим группировку, но изменим рендер.

    if (subcategories) {
      subcategories.forEach(sub => {
        groups[sub.id] = [];
      });
    }

    items.forEach(item => {
      if (item.subcategory && groups[item.subcategory]) {
        groups[item.subcategory].push(item);
      } else {
        groups['other'].push(item);
      }
    });

    return groups;
  }, [items, subcategories]);

  const renderGrid = (gridItems) => (
    <div className="collection-grid">
      {gridItems.map(item => (
        <ItemCard
          key={item.id}
          item={item}
          type={type}
          category={category}
          onToggleCollected={() => onToggleCollected(item.id)}
          onToggleMastered={() => onToggleMastered(item.id)}
          onEdit={() => onEdit(item)}
          onDelete={() => onDelete(item.id)}
          isEditMode={isEditMode}
          allTypes={allTypes}
        />
      ))}
    </div>
  );

  return (
    <div className="collection-section">
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <h2>{title}</h2>
            {!isEmpty && (
              <span style={{ color: 'var(--wf-text-dim)', fontSize: '0.9rem' }}>
                Всего: {items.length}
              </span>
            )}
          </div>

          {!isEmpty && (
            <div
              style={{ display: 'flex', gap: '20px', flex: 1, maxWidth: '600px', alignItems: 'center', cursor: 'pointer' }}
              onClick={onToggleVisibility}
              title="Нажмите, чтобы свернуть/развернуть"
            >
              {/* Collected Progress */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '3px' }}>
                  <span>Собрано</span>
                  <span>{items.filter(i => i.collected).length}/{items.length}</span>
                </div>
                <div className="progress-bar" style={{ height: '6px' }}>
                  <div
                    className="progress-fill"
                    style={{
                      width: `${(items.filter(i => i.collected).length / items.length) * 100}%`,
                      background: 'linear-gradient(90deg, var(--wf-primary) 0%, var(--wf-secondary) 100%)'
                    }}
                  ></div>
                </div>
              </div>

              {/* Mastered Progress */}
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '3px' }}>
                  <span>Освоено</span>
                  <span>{items.filter(i => i.mastered).length}/{items.length}</span>
                </div>
                <div className="progress-bar" style={{ height: '6px' }}>
                  <div
                    className="progress-fill"
                    style={{
                      width: `${(items.filter(i => i.mastered).length / items.length) * 100}%`,
                      background: 'var(--wf-success)'
                    }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            {onToggleVisibility && (
              <button
                className="btn btn-secondary btn-small"
                onClick={onToggleVisibility}
                title={isHidden ? 'Показать содержимое' : 'Скрыть содержимое'}
              >
                {isHidden ? '👁️' : '🙈'}
              </button>
            )}
            {isEditMode && (
              <>
                <div style={{ display: 'flex', gap: '2px', marginRight: '5px' }}>
                  <button
                    className="btn btn-secondary btn-small"
                    onClick={onMoveUp}
                    title="Вверх"
                    disabled={!onMoveUp}
                  >
                    ▲
                  </button>
                  <button
                    className="btn btn-secondary btn-small"
                    onClick={onMoveDown}
                    title="Вниз"
                    disabled={!onMoveDown}
                  >
                    ▼
                  </button>
                </div>
                {onAddSubcategory && (
                  <button
                    className="btn btn-secondary btn-small"
                    onClick={onAddSubcategory}
                    title="Добавить подкатегорию"
                  >
                    📁+
                  </button>
                )}
                {onDeleteCategory && (
                  <button
                    className="btn btn-danger btn-small"
                    onClick={onDeleteCategory}
                    title="Удалить категорию"
                  >
                    🗑️
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      {showContent ? (
        isEmpty ? (
          <div className="empty-state">
            <h3>Нет элементов</h3>
            <p>Добавьте элементы через меню редактирования</p>
          </div>
        ) : (
          <div>
            {/* Logic for Subcategories Toggle */}
            {showSubcategories ? (
              <>
                {/* Subcategories Rendering */}
                {subcategories && subcategories.map(sub => {
                  const subItems = groupedItems[sub.id];
                  if (!subItems || subItems.length === 0) {
                    if (!isEditMode) return null;
                  }

                  return (
                    <div key={sub.id} style={{ marginBottom: '30px', paddingLeft: '20px', borderLeft: '2px solid var(--wf-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h3 style={{ color: 'var(--wf-text)', fontSize: '1.2rem' }}>{sub.name}</h3>
                        {isEditMode && (
                          <button
                            className="btn btn-danger btn-small"
                            onClick={() => onDeleteSubcategory && onDeleteSubcategory(sub.id)}
                            title="Удалить подкатегорию"
                          >
                            ×
                          </button>
                        )}
                      </div>
                      {(!subItems || subItems.length === 0) ? (
                        <div style={{ fontStyle: 'italic', color: 'var(--wf-text-dim)', padding: '10px' }}>Пустая подкатегория</div>
                      ) : renderGrid(subItems)}
                    </div>
                  );
                })}

                {/* General/Other Items */}
                {groupedItems['other'].length > 0 && (
                  <div>
                    {subcategories && subcategories.length > 0 && (
                      <h3 style={{ color: 'var(--wf-text-dim)', fontSize: '1.1rem', marginBottom: '15px', marginTop: '20px' }}>Общее</h3>
                    )}
                    {renderGrid(groupedItems['other'])}
                  </div>
                )}
              </>
            ) : (
              // Flat view (Subcategories hidden)
              <div>
                {renderGrid(items)}
              </div>
            )}
          </div>
        )
      ) : null}
    </div>
  );
}

// Компонент карточки элемента
function ItemCard({ item, type, category, onToggleCollected, onToggleMastered, onEdit, onDelete, isEditMode, allTypes }) {
  // Определяем класс состояния
  const getStateClass = () => {
    if (item.collected && item.mastered) return 'collected-mastered';
    if (item.collected) return 'collected';
    if (item.mastered) return 'mastered';
    return '';
  };

  // Find type display info
  const itemType = allTypes ? allTypes.find(t => t.id === item.type) : null;

  return (
    <div
      className={`item-card ${getStateClass()}`}
      onClick={onToggleCollected}
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
              onToggleMastered();
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
                  onEdit();
                }}
              >
                ✏️
              </button>
              <button
                className="btn btn-danger btn-small"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
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
}

// Компонент модального окна редактирования
function EditModal({ modal, data, onClose, onSave }) {
  const [formData, setFormData] = useState(modal.item);
  const [selectedCategory, setSelectedCategory] = useState(modal.category || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Введите название элемента');
      return;
    }

    // Check if category is selected
    if (!selectedCategory) {
      alert('Выберите категорию');
      return;
    }

    // Check for duplicates if new or name changed
    // Logic moved to generic handler in App or stays here? 
    // The previous implementation had check here. Let's keep it but make it generic.

    // Actually, App handleSaveItem does moving logic. Duplicate check is good here.
    if (modal.isNew || formData.name !== modal.item.name) {
      // Check duplicate in target category
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
            <label>Изображение</label>
            <div className="image-upload-group">
              {formData.image && (
                <div className="image-preview">
                  <img src={formData.image} alt="Preview" onError={(e) => e.target.style.display = 'none'} />
                </div>
              )}
              <div className="image-input-row">
                <input
                  type="file"
                  accept="image/*"
                  id="imageFile"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        const updates = { image: reader.result };

                        // Extract name from filename if name is empty
                        if (!formData.name.trim()) {
                          // Remove extension
                          const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
                          updates.name = nameWithoutExt;

                          // Auto-detect type from filename
                          const nameLower = nameWithoutExt.toLowerCase();
                          if (data.itemTypes) {
                            for (const itemType of data.itemTypes) {
                              if (nameLower.includes(itemType.name.toLowerCase())) {
                                updates.type = itemType.id;
                                break;
                              }
                            }
                          }
                        }

                        setFormData(prev => ({ ...prev, ...updates }));
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => document.getElementById('imageFile').click()}
                >
                  📁 Выбрать файл
                </button>
                <span style={{ color: 'var(--wf-text-dim)', fontSize: '0.85rem' }}>или</span>
              </div>
              <input
                type="text"
                value={formData.image}
                onChange={(e) => handleChange('image', e.target.value)}
                placeholder={modal.type === 'frame' ? "img/frames/name.png" : "img/weapons/name.png"}
              />
            </div>
          </div>
          <div className="form-group">
            <div className="checkbox-group">
              <label style={{ marginRight: '10px' }}>Вид предмета:</label>
              <select
                value={formData.type || ''}
                onChange={(e) => handleChange('type', e.target.value)}
                style={{ flex: 1 }}
              >
                <option value="">Обычный</option>
                {data.itemTypes && data.itemTypes.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Подкатегория</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <select
                value={formData.subcategory || ''}
                onChange={(e) => handleChange('subcategory', e.target.value)}
                style={{ flex: 1 }}
              >
                <option value="">Без подкатегории</option>
                {data.categories[selectedCategory]?.subcategories.map(sub => (
                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-secondary"
                title="Добавить новую подкатегорию"
                onClick={() => {
                  const name = prompt("Название новой подкатегории:");
                  if (name) {
                    // Quick hack: modify data directly via hack? No, use onSave logic?
                    // We need to update subcategories list in data for this category.
                    // This modal doesn't have updating data capability except item save.
                    // For proper UX, we need a handler passed down. 
                    alert("Пожалуйста, используйте кнопку '📁+' рядом с названием категории в списке для добавления подкатегорий.");
                  }
                }}
              >
                +
              </button>
            </div>
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
}

// Компонент модального окна управления группами прогресса
function ProgressGroupsModal({ data, onClose, onSave, onDelete }) {
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupName, setGroupName] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);

  const progressGroups = data.progressGroups || [];
  const allCategories = [
    { key: 'frames', name: 'Варфреймы' },
    ...Object.keys(data.weapons || {}).map(cat => {
      const categoryNames = {
        rifles: 'Винтовки',
        melee: 'Ближнее оружие',
        companions: 'Компаньоны'
      };
      return {
        key: `weapon-${cat}`,
        name: categoryNames[cat] || cat
      };
    })
  ];

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
                          const cat = allCategories.find(c => c.key === catKey);
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
                  {allCategories.map(cat => (
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
}

// Компонент модального окна разрешения дубликатов
function BulkDuplicateResolutionModal({ duplicates, onResolve }) {
  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2>Обнаружены дубликаты</h2>
        </div>
        <div style={{ marginBottom: '20px' }}>
          <p>При добавлении файлов обнаружены совпадения имен со следующими предметами:</p>
          <ul style={{
            maxHeight: '200px',
            overflowY: 'auto',
            background: 'rgba(0,0,0,0.2)',
            padding: '10px',
            borderRadius: '4px',
            listStyle: 'none'
          }}>
            {duplicates.map((item, index) => (
              <li key={index} style={{ padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                Item: <strong>{item.name}</strong>
              </li>
            ))}
          </ul>
          <p>Как вы хотите поступить?</p>
        </div>
        <div className="form-actions" style={{ flexDirection: 'column', gap: '10px' }}>
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => onResolve('all')}>
            Добавить всё (создать дубликаты)
          </button>
          <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => onResolve('unique')}>
            Пропустить дубликаты (добавить только новые)
          </button>
          <button className="btn btn-danger" style={{ width: '100%' }} onClick={() => onResolve('cancel')}>
            Отмена (ничего не добавлять)
          </button>
        </div>
      </div>
    </div>
  );
}

// Компонент модального окна управления видами предметов
function TypesManagerModal({ data, onClose, onSave }) {
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
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '15px' }}>
            <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
              <label>Название</label>
              <input
                type="text"
                value={newType.name}
                onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                placeholder="Например: Wraith"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0, width: '80px' }}>
              <label>Цвет</label>
              <input
                type="color"
                value={newType.color}
                onChange={(e) => setNewType({ ...newType, color: e.target.value })}
                style={{ padding: '2px', height: '42px' }}
              />
            </div>
            <button className="btn btn-secondary" onClick={handleAdd}>+</button>
          </div>

          <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--wf-border)', borderRadius: '6px', padding: '10px' }}>
            {types.map(type => (
              <div key={type.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="color"
                    value={type.color}
                    onChange={(e) => {
                      const newColor = e.target.value;
                      setTypes(types.map(t => t.id === type.id ? { ...t, color: newColor } : t));
                    }}
                    style={{ width: '40px', height: '30px', padding: 0, border: 'none', background: 'none', cursor: 'pointer' }}
                  />
                  <span>{type.name}</span>
                </div>
                <button className="btn btn-danger btn-small" onClick={() => handleDelete(type.id)}>×</button>
              </div>
            ))}
          </div>
        </div>

        <div className="form-actions">
          <button className="btn btn-secondary" onClick={onClose}>Отмена</button>
          <button className="btn btn-primary" onClick={handleSaveAll}>Сохранить</button>
        </div>
      </div>
    </div>
  );
}

// Рендеринг приложения
ReactDOM.render(<App />, document.getElementById('root'));
