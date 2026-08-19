// Function called when user clicks 'Reserve' button on a book card
function openReserveModal(title, isbn) {
  const modal = document.getElementById('reserve-modal');
  const titleElem = document.getElementById('modal-book-title');
  const isbnElem = document.getElementById('modal-isbn');

  if (modal && titleElem && isbnElem) {
    titleElem.innerText = title;
    isbnElem.value = isbn;
    modal.classList.remove('hidden');
  }
}

// Modal event listeners for close/cancel/submit
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('reserve-modal');
  const closeBtn = document.getElementById('close-modal-btn');
  const cancelBtn = document.getElementById('cancel-modal-btn');
  const form = document.getElementById('reserve-form');

  const closeModal = () => {
    if (modal) modal.classList.add('hidden');
  };

  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const bookTitle = document.getElementById('modal-book-title')?.innerText;
    alert(`Reservation confirmed for "${bookTitle}"! Store staff have been notified.`);
    closeModal();
    form.reset();
  });
});