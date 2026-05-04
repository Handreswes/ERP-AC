// SW v61 - KILL SWITCH
// This script unregisters itself and reloads to clear any SW loops
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((names) => {
            return Promise.all(names.map(name => caches.delete(name)));
        }).then(() => self.registration.unregister())
    );
});
