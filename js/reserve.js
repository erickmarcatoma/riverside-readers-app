import { InventoryAPI } from './api.js';

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

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('reserve-modal');
  const closeBtn = document.getElementById('close-modal-btn');
  const cancelBtn = document.getElementById('cancel-modal-btn');
  const form = document.getElementById('reserve-form');

  const closeModal = () => {
    if (modal) modal.classList.add('hidden');
    form?.reset();
  };

  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const bookTitle = document.getElementById('modal-book-title')?.innerText;
    const isbn = document.getElementById('modal-isbn')?.value;
    const customerName = document.getElementById('modal-customer-name')?.value;
    const customerContact = document.getElementById('modal-customer-contact')?.value;

    if (!bookTitle || !customerName || !customerContact) {
      alert('Please fill in all fields.');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    try {
      const reservationData = {
        book_title: bookTitle,
        isbn: isbn,
        customer_name: customerName,
        customer_contact: customerContact,
        status: 'pending'
      };

      await InventoryAPI.createReservation(reservationData);

      alert(`Reservation confirmed for "${bookTitle}"! Store staff have been notified.`);
      closeModal();
    } catch (error) {
      alert(`Unable to submit reservation: ${error.message}`);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
});

export { openReserveModal };