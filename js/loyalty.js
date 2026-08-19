document.addEventListener('DOMContentLoaded', () => {
  const showQrBtn = document.getElementById('show-qr-btn');
  const qrModal = document.getElementById('qr-modal');
  const closeQrBtn = document.getElementById('close-qr-btn');

  // Open QR modal
  showQrBtn?.addEventListener('click', () => {
    qrModal?.classList.remove('hidden');
  });

  // Close QR modal
  closeQrBtn?.addEventListener('click', () => {
    qrModal?.classList.add('hidden');
  });

  // Close modal when clicking outside content area
  qrModal?.addEventListener('click', (e) => {
    if (e.target === qrModal) {
      qrModal.classList.add('hidden');
    }
  });
});