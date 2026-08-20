// js/search.js - Handles real-time search input, debouncing, and category filters

/**
 * Initializes search input listeners and category filter button clicks
 * @param {Function} onSearchCallback - Callback function receiving (category, searchQuery)
 */
export function initSearch(onSearchCallback) {
  const searchInput = document.getElementById('catalog-search-input');
  const searchBtn = document.getElementById('search-btn');
  const filterBtns = document.querySelectorAll('.filter-btn');

  let activeCategory = 'all';
  let debounceTimer = null;

  // Helper function to execute the search callback
  const triggerSearch = () => {
    const query = searchInput ? searchInput.value.trim() : '';
    if (typeof onSearchCallback === 'function') {
      onSearchCallback(activeCategory, query);
    }
  };

  // 1. Search button click handler
  searchBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    triggerSearch();
  });

  // 2. Real-time typing with 300ms debounce
  searchInput?.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      triggerSearch();
    }, 300);
  });

  // 3. Category Filter Buttons (All, In Stock, Fiction, etc.)
  filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      filterBtns.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      
      activeCategory = e.target.dataset.filter || 'all';
      triggerSearch();
    });
  });
}