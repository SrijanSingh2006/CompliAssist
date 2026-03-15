export function showToast(message) {
  window.dispatchEvent(new CustomEvent('show-toast', { detail: message }));
}
