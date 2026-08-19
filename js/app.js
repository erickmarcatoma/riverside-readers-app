document.addEventListener('DOMContentLoaded', () => {
  loadFeaturedBooks();
  renderLoyaltyGrid(3); // Default demo state showing 3 earned stamps
});

// Fetch & render dynamic book cards with stock status
async function loadFeaturedBooks() {
  const container = document.getElementById('books-container');
  try {
    const res = await fetch('data/mockData.json');
    const books = await res.json();

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

      return `
        <article class="book-card">
          <img src="${book.cover_image_url}" alt="${book.title}" class="book-cover" />
          <div class="book-info">
            <h4>${book.title} <span class="stock-badge ${stockBadgeClass}">${stockText}</span></h4>
            <p class="book-author">by ${book.author}</p>
            <p class="book-price">$${Number(book.price).toFixed(2)}</p>
            <button class="btn-primary" style="padding: 0.4rem 0.9rem; font-size: 0.85rem; margin-top: 0.3rem;" 
              ${book.stock_quantity === 0 ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}
              onclick="openReserveModal('${book.title}', '${book.isbn}')">
              ${book.stock_quantity === 0 ? 'Unavailable' : 'Reserve for Pickup'}
            </button>
          </div>
        </article>
      `;
    }).join('');
  } catch (err) {
    container.innerHTML = `<p style="color: red; font-size: 0.85rem;">Failed to load catalog.</p>`;
  }
}

// Render 10-stamp loyalty card grid
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