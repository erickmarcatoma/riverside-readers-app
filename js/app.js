// js/app.js - Main Application Controller

import { InventoryAPI } from './api.js';
import { initSearch } from './search.js'; 

let currentBooksCache = [];

document.addEventListener('DOMContentLoaded', () => {
  if (typeof initSearch === 'function') {
    initSearch((category, query) => {
      loadFeaturedBooks(category, query);
    });
  }

  initReservationForm();
  loadFeaturedBooks();
  loadStaffPicks(); 
  
  renderLoyaltyGrid(0); 
  initLoyaltyCheck();   
  initFilterTags();
  initShopFilters(); 
  initSortHandler();
  initMobileMenu(); 
  initNavbarActions(); // Initialize functional Account and Cart buttons
});

/* ----------------------------------------------------
   STEP 1 & 2: Search, Filter & Load Inventory (Home & Shop)
---------------------------------------------------- */
async function loadFeaturedBooks(category = 'all', searchQuery = '') {
  const container = document.getElementById('books-container') || document.getElementById('full-inventory-container');
  if (!container) return;
  
  container.innerHTML = `<div class="book-card-loading">Searching Supabase catalog...</div>`;

  try {
    const books = await InventoryAPI.getBooks(category, searchQuery);
    currentBooksCache = books || [];

    renderBookList(currentBooksCache, container);

  } catch (err) {
    container.innerHTML = `
      <div style="padding: 1rem; color: #c62828; background: #ffebee; border-radius: 8px;">
        <strong>Database Search Error:</strong>
        <p style="font-size: 0.85rem; margin-top: 0.25rem;">${err.message || err}</p>
      </div>
    `;
  }
}

/* ----------------------------------------------------
   STEP 10: Local Picks & Staff Favorites Loader
---------------------------------------------------- */
async function loadStaffPicks() {
  const container = document.getElementById('local-picks-container');
  if (!container) return;
  
  container.innerHTML = `<div class="book-card-loading">Loading staff recommendations from Supabase...</div>`;

  try {
    const books = await InventoryAPI.getBooks('staff-pick', ''); 

    if (!books || books.length === 0) {
      container.innerHTML = `<p class="subtitle" style="padding: 1rem;">No staff picks currently available. Check back soon!</p>`;
      return;
    }

    container.innerHTML = books.map(book => {
      let stockBadgeClass = 'in-stock';
      let stockText = `${book.stock_quantity} in stock`;

      if (book.stock_quantity === 0) {
        stockBadgeClass = 'out-of-stock';
        stockText = 'Out of stock';
      } else if (book.stock_quantity <= 2) {
        stockBadgeClass = 'low-stock';
        stockText = `Only ${book.stock_quantity} left`;
      }

      const displayTitle = book.title || book.tittle || 'Unknown Title';
      const safeTitle = displayTitle.replace(/'/g, "\\'");
      
      const isValidUrl = book.cover_image_url && book.cover_image_url.startsWith('http');
      const displayImage = isValidUrl ? book.cover_image_url : 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop';

      const staffBlurb = book.blurb ? `<p style="font-size: 0.85rem; color: #666; font-style: italic; margin: 0.5rem 0;">"${book.blurb}"</p>` : '';

      return `
        <article class="book-card" data-isbn="${book.isbn}">
          <img src="${displayImage}" alt="${displayTitle}" class="book-cover" />
          <div class="book-info">
            <h4>${displayTitle} <span class="stock-badge ${stockBadgeClass}">${stockText}</span></h4>
            <p class="book-author">by ${book.author}</p>
            ${staffBlurb}
            <p class="book-price">$${Number(book.regular_price || 0).toFixed(2)}</p>
            <button class="btn-dark btn-small" 
              ${book.stock_quantity === 0 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}
              onclick="openReserveModal('${safeTitle}', '${book.isbn}')">
              ${book.stock_quantity === 0 ? 'Unavailable' : 'Reserve for Pickup'}
            </button>
          </div>
        </article>
      `;
    }).join('');

  } catch (err) {
    container.innerHTML = `
      <div style="padding: 1rem; color: #c62828; background: #ffebee; border-radius: 8px;">
        <strong>Error loading staff picks:</strong>
        <p style="font-size: 0.85rem; margin-top: 0.25rem;">${err.message || err}</p>
      </div>
    `;
  }
}

// Helper function to render book cards
function renderBookList(books, container) {
  if (!books || books.length === 0) {
    container.innerHTML = `<p class="subtitle" style="padding: 1rem;">No books found matching your criteria.</p>`;
    return;
  }

  container.innerHTML = books.map(book => {
    let stockBadgeClass = 'in-stock';
    let stockText = `${book.stock_quantity} in stock`;

    if (book.stock_quantity === 0) {
      stockBadgeClass = 'out-of-stock';
      stockText = 'Out of stock';
    } else if (book.stock_quantity <= 2) {
      stockBadgeClass = 'low-stock';
      stockText = `Only ${book.stock_quantity} left`;
    }

    const displayTitle = book.title || book.tittle || 'Unknown Title';
    const safeTitle = displayTitle.replace(/'/g, "\\'");
    
    const isValidUrl = book.cover_image_url && book.cover_image_url.startsWith('http');
    const displayImage = isValidUrl ? book.cover_image_url : 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&auto=format&fit=crop';

    return `
      <article class="book-card" data-isbn="${book.isbn}">
        <img src="${displayImage}" alt="${displayTitle}" class="book-cover" />
        <div class="book-info">
          <h4>${displayTitle} <span class="stock-badge ${stockBadgeClass}">${stockText}</span></h4>
          <p class="book-author">by ${book.author}</p>
          <p class="book-price">$${Number(book.regular_price || 0).toFixed(2)}</p>
          <button class="btn-dark btn-small" 
            ${book.stock_quantity === 0 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}
            onclick="openReserveModal('${safeTitle}', '${book.isbn}')">
            ${book.stock_quantity === 0 ? 'Unavailable' : 'Reserve for Pickup'}
          </button>
        </div>
      </article>
    `;
  }).join('');
}

/* ----------------------------------------------------
   STEP 3: Reserve Modal Handler
---------------------------------------------------- */
window.openReserveModal = function(title, isbn) {
  const modal = document.getElementById('reserve-modal');
  const titleEl = document.getElementById('modal-book-title');
  const isbnEl = document.getElementById('modal-isbn');
  
  if (titleEl) titleEl.innerText = title;
  if (isbnEl) isbnEl.value = isbn;
  if (modal) modal.classList.remove('hidden');
};

function initReservationForm() {
  const modal = document.getElementById('reserve-modal');
  const reserveForm = document.getElementById('reserve-form');
  const closeBtn = document.getElementById('close-modal-btn');
  const cancelBtn = document.getElementById('cancel-modal-btn');

  const closeModal = () => modal?.classList.add('hidden');
  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);

  reserveForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const isbn = document.getElementById('modal-isbn').value;
    const customerName = document.getElementById('customer-name').value;
    const customerEmail = document.getElementById('customer-email').value;
    const customerPhone = document.getElementById('customer-phone').value;

    try {
      const book = await InventoryAPI.getBookByIsbn(isbn);

      const response = await InventoryAPI.createReservation({
        bookId: book.book_id,
        customerName,
        customerEmail,
        customerPhone,
        quantity: 1,
        regularPrice: book.regular_price
      });

      alert('Hold request submitted! We are notifying staff at Riverside Books.');
      closeModal();
      reserveForm.reset();

      if (response && response.purchase_id) {
        startPickupAlertPolling(response.purchase_id);
      }
    } catch (err) {
      alert(`Unable to submit reservation: ${err.message || 'Check database permissions.'}`);
    }
  });
}

/* ----------------------------------------------------
   STEP 4: Pickup Alert Status Polling
---------------------------------------------------- */
function startPickupAlertPolling(purchaseId) {
  const pollInterval = setInterval(async () => {
    try {
      const data = await InventoryAPI.getReservationStatus(purchaseId);

      if (data && data.status === 'Ready') {
        clearInterval(pollInterval);
        alert(`🎉 Order Ready! Your book is set aside at the counter. Show your QR code to collect!`);
      }
    } catch (err) {
      console.warn('Polling reservation status...', err);
    }
  }, 5000);
}

/* ----------------------------------------------------
   STEP 5: Reader Loyalty Stamp Rendering
---------------------------------------------------- */
function renderLoyaltyGrid(earnedCount = 0) {
  const grid = document.getElementById('stamp-grid');
  if (!grid) return;

  grid.innerHTML = '';
  for (let i = 1; i <= 10; i++) {
    const slot = document.createElement('div');
    slot.className = `stamp-slot ${i <= earnedCount ? 'earned' : ''}`;
    slot.innerHTML = i <= earnedCount ? '📚' : i;
    grid.appendChild(slot);
  }

  const progressText = document.getElementById('loyalty-progress-text');
  const navBadgeText = document.getElementById('nav-stamp-count');

  if (progressText) progressText.innerText = `${earnedCount} / 10 Stamps collected`;
  if (navBadgeText) navBadgeText.innerText = earnedCount;
}

/* ----------------------------------------------------
   STEP 6: Dynamic Loyalty Lookup
---------------------------------------------------- */
function initLoyaltyCheck() {
  const viewRewardsBtn = document.querySelector('.rewards-footer .btn-dark');
  
  if (viewRewardsBtn) {
    viewRewardsBtn.addEventListener('click', async () => {
      const email = prompt("Enter your email address to check your Riverside Rewards:");
      
      if (email && email.trim() !== "") {
        const originalText = viewRewardsBtn.innerText;
        viewRewardsBtn.innerText = "Checking...";
        
        try {
          const points = await InventoryAPI.getCustomerLoyaltyPoints(email.trim());
          renderLoyaltyGrid(points);
          alert(`Success! We found ${points} stamps for ${email}.`);
        } catch (err) {
          alert("Unable to pull rewards data right now.");
        } finally {
          viewRewardsBtn.innerText = originalText;
        }
      }
    });
  }
}

/* ----------------------------------------------------
   STEP 7: Interactive Filter Tags (Home Page)
---------------------------------------------------- */
function initFilterTags() {
  const tags = document.querySelectorAll('.tag');
  
  tags.forEach(tag => {
    tag.style.cursor = 'pointer';
    tag.addEventListener('click', () => {
      const text = tag.innerText.toLowerCase();
      let category = 'all';

      if (text.includes('new arrivals')) {
        category = 'all';
      } else if (text.includes('best sellers')) {
        category = 'bestseller';
      } else if (text.includes('local authors')) {
        category = 'staff-pick';
      } else if (text.includes('gift ideas')) {
        category = 'all'; 
      }

      loadFeaturedBooks(category, '');
    });
  });
}

/* ----------------------------------------------------
   STEP 8: Shop Page Interactive Filter Buttons
---------------------------------------------------- */
function initShopFilters() {
  const filterContainer = document.getElementById('shop-filter-buttons');
  if (!filterContainer) return; 

  const buttons = filterContainer.querySelectorAll('.filter-btn');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => {
        b.style.background = 'white';
        b.style.color = 'inherit';
        b.style.borderColor = '#ccc';
      });

      btn.style.background = 'var(--primary-green)';
      btn.style.color = 'white';
      btn.style.borderColor = 'var(--primary-green)';

      const category = btn.getAttribute('data-filter');
      loadFeaturedBooks(category, '');
    });
  });
}

/* ----------------------------------------------------
   STEP 9: Shop Page Sort Dropdown Handler
---------------------------------------------------- */
function initSortHandler() {
  const sortSelect = document.getElementById('sort-select');
  if (!sortSelect) return;

  sortSelect.addEventListener('change', (e) => {
    const sortBy = e.target.value;
    const container = document.getElementById('books-container') || document.getElementById('full-inventory-container');
    if (!container) return;

    let sortedBooks = [...currentBooksCache];

    if (sortBy === 'price-asc') {
      sortedBooks.sort((a, b) => Number(a.regular_price || 0) - Number(b.regular_price || 0));
    } else if (sortBy === 'price-desc') {
      sortedBooks.sort((a, b) => Number(b.regular_price || 0) - Number(a.regular_price || 0));
    } else if (sortBy === 'alpha') {
      sortedBooks.sort((a, b) => {
        const titleA = (a.title || a.tittle || '').toLowerCase();
        const titleB = (b.title || b.tittle || '').toLowerCase();
        return titleA.localeCompare(titleB);
      });
    }

    renderBookList(sortedBooks, container);
  });
}

/* ----------------------------------------------------
   STEP 11: Mobile Navigation Menu Toggle (Mobile Viewports Only)
---------------------------------------------------- */
function initMobileMenu() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  let hamburger = navbar.querySelector('.mobile-menu-toggle');
  const navLinks = navbar.querySelector('.nav-links');

  if (!hamburger && navLinks && window.innerWidth <= 768) {
    hamburger = document.createElement('button');
    hamburger.className = 'mobile-menu-toggle';
    hamburger.innerHTML = '☰ Menu';
    
    navbar.insertBefore(hamburger, navLinks);

    hamburger.addEventListener('click', () => {
      navLinks.classList.toggle('mobile-open');
    });
  }
}

/* ----------------------------------------------------
   STEP 12: Interactive Account & Cart Navigation Handlers
---------------------------------------------------- */
function initNavbarActions() {
  const accountBtn = document.getElementById('account-link');
  const cartBtn = document.getElementById('cart-link');

  accountBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = prompt("Enter your account email to view your Loyalty Profile & Stamps:");
    if (!email || email.trim() === "") return;

    try {
      const points = await InventoryAPI.getCustomerLoyaltyPoints(email.trim());
      renderLoyaltyGrid(points);
      alert(`Account Found!\nEmail: ${email.trim()}\nLoyalty Stamps: ${points} / 10 collected towards your reward.`);
    } catch (err) {
      alert("Could not retrieve account details. Please check the email address.");
    }
  });

  cartBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    const currentStamps = document.getElementById('nav-stamp-count')?.innerText || '0';
    alert(`Pre-Order & Pickup Cart:\n- Active Pickup Hold: Ready via counter verification\n- Loyalty Progress: ${currentStamps} stamps earned`);
  });
}