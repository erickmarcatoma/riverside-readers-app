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
  initRewardsDemo(); 
  initFilterTags();
  initShopFilters(); 
  initSortHandler();
  initMobileMenu(); 
  initNavbarActions();
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

    const coverColors = ['#24422e', '#a84832', '#1e3a5f', '#8c5e3c', '#5c3d52', '#2b4c5f'];

    container.innerHTML = books.map((book, index) => {
      let stockText = `${book.stock_quantity} in stock`;
      let dotColor = '#2F855A'; // Soft green for normal stock

      if (book.stock_quantity === 0) {
        stockText = 'Out of stock';
        dotColor = '#A0AEC0'; // Muted grey for out of stock
      } else if (book.stock_quantity <= 2) {
        stockText = `Only ${book.stock_quantity} left`;
        dotColor = '#DD6B20'; // Orange for low stock
      }

      const displayTitle = book.title || book.tittle || 'Unknown Title';
      const safeTitle = displayTitle.replace(/'/g, "\\'");
      const bgColor = coverColors[index % coverColors.length];
      const staffBlurb = book.blurb ? `<p style="font-size: 0.85rem; color: #666; font-style: italic; margin: 0.5rem 0;">"${book.blurb}"</p>` : '';

      return `
        <article class="book-card" data-isbn="${book.isbn}">
          <div class="book-cover-mockup" style="background-color: ${bgColor}; height: 140px; display: flex; align-items: center; justify-content: center;">
            <div style="text-align: center; color: white;">
              <i class="fa-solid fa-book-open" style="font-size: 1.75rem; opacity: 0.8; margin-bottom: 0.4rem; display: block;"></i>
              <span class="mockup-genre" style="font-size: 0.75rem; letter-spacing: 2px;">${book.genre || 'Staff Pick'}</span>
            </div>
          </div>
          <div class="book-info">
            <h4>${displayTitle}</h4>
            <div style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; color: #4a5568; margin: 0.25rem 0 0.5rem 0;">
              <span style="width: 8px; height: 8px; background-color: ${dotColor}; border-radius: 50%; display: inline-block;"></span>
              <span>${stockText}</span>
            </div>
            <p class="book-author">by ${book.author}</p>
            ${staffBlurb}
            
            <!-- Price and Button Wrapper aligned uniformly at the bottom -->
            <div style="margin-top: auto; padding-top: 0.75rem;">
              <p class="book-price" style="margin-bottom: 0.5rem; font-weight: bold;">$${Number(book.regular_price || 0).toFixed(2)}</p>
              <button class="btn-dark btn-small" style="width: 100%;"
                ${book.stock_quantity === 0 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}
                onclick="openReserveModal('${safeTitle}', '${book.isbn}')">
                ${book.stock_quantity === 0 ? 'Unavailable' : 'Reserve for Pickup'}
              </button>
            </div>
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

// Helper function to render book cards with unique colored covers
function renderBookList(books, container) {
  if (!books || books.length === 0) {
    container.innerHTML = `<p class="subtitle" style="padding: 1rem;">No books found matching your criteria.</p>`;
    return;
  }

  const coverColors = ['#24422e', '#a84832', '#1e3a5f', '#8c5e3c', '#5c3d52', '#2b4c5f'];

  container.innerHTML = books.map((book, index) => {
    let stockText = `${book.stock_quantity} in stock`;
    let dotColor = '#2F855A'; // Soft green for normal stock

    if (book.stock_quantity === 0) {
      stockText = 'Out of stock';
      dotColor = '#A0AEC0'; // Muted grey for out of stock
    } else if (book.stock_quantity <= 2) {
      stockText = `Only ${book.stock_quantity} left`;
      dotColor = '#DD6B20'; // Orange for low stock
    }

    const displayTitle = book.title || book.tittle || 'Unknown Title';
    const safeTitle = displayTitle.replace(/'/g, "\\'");
    const bgColor = coverColors[index % coverColors.length];

    return `
      <article class="book-card" data-isbn="${book.isbn}">
        <div class="book-cover-mockup" style="background-color: ${bgColor}; height: 140px; display: flex; align-items: center; justify-content: center;">
          <div style="text-align: center; color: white;">
            <i class="fa-solid fa-book-open" style="font-size: 1.75rem; opacity: 0.8; margin-bottom: 0.4rem; display: block;"></i>
            <span class="mockup-genre" style="font-size: 0.75rem; letter-spacing: 2px;">${book.genre || 'Literature'}</span>
          </div>
        </div>
        <div class="book-info">
          <h4>${displayTitle}</h4>
          <div style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; color: #4a5568; margin: 0.25rem 0 0.5rem 0;">
            <span style="width: 8px; height: 8px; background-color: ${dotColor}; border-radius: 50%; display: inline-block;"></span>
            <span>${stockText}</span>
          </div>
          <p class="book-author">by ${book.author}</p>
          
          <!-- Price and Button Wrapper aligned uniformly at the bottom -->
          <div style="margin-top: auto; padding-top: 0.75rem;">
            <p class="book-price" style="margin-bottom: 0.5rem; font-weight: bold;">$${Number(book.regular_price || 0).toFixed(2)}</p>
            <button class="btn-dark btn-small" style="width: 100%;"
              ${book.stock_quantity === 0 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}
              onclick="openReserveModal('${safeTitle}', '${book.isbn}')">
              ${book.stock_quantity === 0 ? 'Unavailable' : 'Reserve for Pickup'}
            </button>
          </div>
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
   STEP 5: Reader Loyalty Stamp Rendering (With 10/10 Celebration)
---------------------------------------------------- */
function renderLoyaltyGrid(earnedCount = 0) {
  const grid = document.getElementById('stamp-grid');
  if (!grid) return;

  const container = grid.closest('.rewards-section');
  let banner = container?.querySelector('.reward-banner');

  // Trigger celebration effects if 10/10 milestone is reached
  if (earnedCount >= 10) {
    grid.classList.add('reward-unlocked');
    if (!banner && container) {
      banner = document.createElement('div');
      banner.className = 'reward-banner';
      banner.innerHTML = '🎉 <strong>REWARD UNLOCKED!</strong> Show this screen at the counter for your free book or drink!';
      container.insertBefore(banner, grid);
    }
  } else {
    grid.classList.remove('reward-unlocked');
    if (banner) banner.remove();
  }

  grid.innerHTML = '';
  for (let i = 1; i <= 10; i++) {
    const slot = document.createElement('div');
    slot.className = `stamp-slot ${i <= earnedCount ? 'earned' : ''}`;
    slot.innerHTML = i <= earnedCount ? '✓' : i;
    grid.appendChild(slot);
  }

  const progressText = document.getElementById('loyalty-progress-text');
  const navBadgeText = document.getElementById('nav-stamp-count');

  if (progressText) progressText.innerText = earnedCount >= 10 ? '✨ 10 / 10 Completed!' : `${earnedCount} / 10 Stamps collected`;
  if (navBadgeText) navBadgeText.innerText = earnedCount;
}

/* ----------------------------------------------------
   STEP 6: Dynamic Loyalty Lookup
---------------------------------------------------- */
function initLoyaltyCheck() {
  const viewRewardsBtn = document.querySelector('.rewards-footer .btn-dark:not(#rewards-demo-btn)');
  const accountModal = document.getElementById('account-modal');
  
  if (viewRewardsBtn) {
    viewRewardsBtn.addEventListener('click', () => {
      accountModal?.classList.remove('hidden');
    });
  }
}

/* ----------------------------------------------------
   NEW: Rewards Interactive Preview Demo
---------------------------------------------------- */
function initRewardsDemo() {
  const demoBtn = document.getElementById('rewards-demo-btn');
  if (!demoBtn) return;

  let demoStep = 0;
  const demoMilestones = [3, 7, 10, 0]; 

  demoBtn.addEventListener('click', () => {
    const currentStamps = demoMilestones[demoStep];
    renderLoyaltyGrid(currentStamps);
    
    if (currentStamps === 10) {
      demoBtn.innerText = "Reset Demo";
    } else if (currentStamps === 0) {
      demoBtn.innerText = "Preview Demo";
    } else {
      demoBtn.innerText = `Demo: ${currentStamps}/10 Stamps`;
    }

    demoStep = (demoStep + 1) % demoMilestones.length;
  });
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
   STEP 12: Interactive Account Modal & Cart Handlers
---------------------------------------------------- */
function initNavbarActions() {
  const accountBtn = document.getElementById('account-link');
  const cartBtn = document.getElementById('cart-link');
  
  const accountModal = document.getElementById('account-modal');
  const closeAccountModalBtn = document.getElementById('close-account-modal');
  const accountForm = document.getElementById('account-form');
  const accountLoginView = document.getElementById('account-login-view');
  const accountProfileView = document.getElementById('account-profile-view');
  const profileDisplayEmail = document.getElementById('profile-display-email');
  const profileStampSummary = document.getElementById('profile-stamp-summary');
  const logoutBtn = document.getElementById('logout-account-btn');

  const closeAccountModal = () => accountModal?.classList.add('hidden');
  closeAccountModalBtn?.addEventListener('click', closeAccountModal);

  accountBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    accountModal?.classList.remove('hidden');
  });

  accountForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailInput = document.getElementById('account-email-input').value.trim();
    if (!emailInput) return;

    try {
      const submitBtn = accountForm.querySelector('button[type="submit"]');
      submitBtn.innerText = "Loading...";

      const points = await InventoryAPI.getCustomerLoyaltyPoints(emailInput);
      
      profileDisplayEmail.innerText = emailInput;
      profileStampSummary.innerText = `${points} / 10 Stamps collected towards your reward`;
      
      renderLoyaltyGrid(points);

      accountLoginView.classList.add('hidden');
      accountProfileView.classList.remove('hidden');
      submitBtn.innerText = "View Profile";
    } catch (err) {
      alert("Could not find an account associated with this email.");
      accountForm.querySelector('button[type="submit"]').innerText = "View Profile";
    }
  });

  logoutBtn?.addEventListener('click', () => {
    accountProfileView.classList.add('hidden');
    accountLoginView.classList.remove('hidden');
    document.getElementById('account-email-input').value = '';
    renderLoyaltyGrid(0);
  });

  cartBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    const currentStamps = document.getElementById('nav-stamp-count')?.innerText || '0';
    alert(`Pre-Order & Pickup Cart Summary:\n- Active Status: Ready for counter verification\n- Rewards Progress: ${currentStamps} stamps earned`);
  });
}