// public/register-sw.js
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none'
      });

      await navigator.serviceWorker.ready;
      console.log('✅ Scramjet SW ready:', registration.scope);
      window.dispatchEvent(new Event('scramjet-sw-ready'));
    } catch (error) {
      console.error('❌ Scramjet SW registration failed:', error);
      window.dispatchEvent(new CustomEvent('scramjet-sw-error', { detail: error }));
    }
  });
}
