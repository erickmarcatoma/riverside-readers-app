// js/app.js - Main Application Controller

import { InventoryAPI } from './api.js';
import { initSearch } from './search.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize modular search logic and pass loadFeaturedBooks as the callback
  initSearch((category, query) => {
    loadFeaturedBooks(category, query);
  });

  initReservationForm();
  loadFeaturedBooks();
  renderLoyaltyGrid(3);
});

/* ----------------------------------------------------
   STEP 1 & 2: Search, Filter & Load Inventory
---------------------------------------------------- */
async function loadFeaturedBooks(category = 'all', searchQuery = '') {
  const container = document.getElementById('books-container');
  container.innerHTML = `<div class="book-card-loading">Searching Supabase catalog...</div>`;

  try {
    const books = await InventoryAPI.getBooks(category, searchQuery);

    if (!books || books.length === 0) {
      container.innerHTML = `<p class="subtitle" style="padding: 1rem;">No books found matching your search criteria.</p>`;
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

      const safeTitle = (book.title || 'Untitled').replace(/'/g, "\\'");

      return `
        <article class="book-card" data-isbn="${book.isbn}">
          <img src="${book.cover_image_url || 'https://via.placeholder.com/80x115'}" alt="${book.title}" class="book-cover" />
          <div class="book-info">
            <h4>${book.title} <span class="stock-badge ${stockBadgeClass}">${stockText}</span></h4>
            <p class="book-author">by ${book.author}</p>
            <p class="book-price">$${Number(book.price || 0).toFixed(2)}</p>
            <button class="btn-primary" style="padding: 0.4rem 0.9rem; font-size: 0.85rem; margin-top: 0.3rem;" 
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
        <strong>Database Search Error:</strong>
        <p style="font-size: 0.85rem; margin-top: 0.25rem;">${err.message || err}</p>
      </div>
    `;
  }
}

/* ----------------------------------------------------
   STEP 3: Reserve Modal Handler
---------------------------------------------------- */
window.openReserveModal = function(title, isbn) {
  const modal = document.getElementById('reserve-modal');
  document.getElementById('modal-book-title').innerText = title;
  document.getElementById('modal-isbn').value = isbn;
  modal?.classList.remove('hidden');
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

    const reservationData = {
      isbn: document.getElementById('modal-isbn').value,
      customer_name: document.getElementById('customer-name').value,
      customer_contact: document.getElementById('customer-contact').value,
      reserved_at: new Date().toISOString()
    };

    try {
      const response = await InventoryAPI.createReservation(reservationData);
      
      alert('Hold request submitted! We are notifying staff at Riverside Books.');
      closeModal();
      reserveForm.reset();

      // Step 4: Start polling order status for pickup alert
      if (response && response.id) {
        startPickupAlertPolling(response.id);
      }
    } catch (err) {
      alert(`Unable to submit reservation: ${err.message || 'Check database permissions.'}`);
    }
  });
}

/* ----------------------------------------------------
   STEP 4: Pickup Alert Status Polling
---------------------------------------------------- */
function startPickupAlertPolling(reservationId) {
  const pollInterval = setInterval(async () => {
    try {
      const data = await InventoryAPI.getReservationStatus(reservationId);

      if (data && data.status === 'ready_for_pickup') {
        clearInterval(pollInterval);
        alert(`🎉 Order Ready! Your hold for "${data.book_title || 'your book'}" is set aside at the counter. Show your QR code to collect!`);
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

  if (progressText) progressText.innerText = `You have ${earnedCount} of 10 stamps`;
  if (navBadgeText) navBadgeText.innerText = `${earnedCount}/10 Stamps`;
}