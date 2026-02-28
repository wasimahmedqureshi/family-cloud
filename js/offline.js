// Offline mode management

// Check if service worker is supported
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js')
            .then(registration => {
                console.log('ServiceWorker registered');
            })
            .catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}

// Enable offline mode
function enableOfflineMode() {
    if ('caches' in window) {
        caches.open('family-cloud-v1').then(cache => {
            // Cache all important files
            cache.addAll([
                '/',
                '/index.html',
                '/login.html',
                '/dashboard.html',
                '/album.html',
                '/css/style.css',
                '/js/auth.js',
                '/js/album.js',
                '/js/offline.js',
                'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
                'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap'
            ]).then(() => {
                alert('Offline mode enabled! You can now access the app without internet.');
                
                // Also cache photos if any
                const photos = JSON.parse(localStorage.getItem('familyPhotos') || '[]');
                photos.forEach(photo => {
                    if (photo.dataUrl) {
                        cache.add(photo.dataUrl);
                    }
                });
            }).catch(err => {
                console.log('Cache add failed: ', err);
            });
        });
    } else {
        alert('Your browser does not support offline mode.');
    }
}

// Check if online
function isOnline() {
    return navigator.onLine;
}

// Listen for online/offline events
window.addEventListener('online', () => {
    console.log('You are back online!');
    // Could sync data here
});

window.addEventListener('offline', () => {
    console.log('You are offline - using cached version');
});
