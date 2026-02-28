// User credentials
const USERS = {
    'family': 'family123',
    'mom': 'mom123',
    'dad': 'dad123',
    'admin': 'admin123'
};

// Handle login form submission
function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('errorMessage');
    const remember = document.getElementById('remember')?.checked || false;
    
    if (USERS[username] && USERS[username] === password) {
        // Successful login
        localStorage.setItem('loggedIn', 'true');
        localStorage.setItem('user', username);
        localStorage.setItem('loginTime', new Date().toISOString());
        
        if (remember) {
            localStorage.setItem('rememberUser', username);
        }
        
        // Redirect to dashboard
        window.location.href = 'dashboard.html';
    } else {
        errorDiv.textContent = 'Invalid username or password!';
        errorDiv.style.color = '#f56565';
        document.getElementById('password').value = '';
    }
}

// Check authentication on page load
function checkAuth() {
    const isLoggedIn = localStorage.getItem('loggedIn') === 'true';
    const currentPage = window.location.pathname.split('/').pop();
    
    if (!isLoggedIn && currentPage !== 'login.html' && currentPage !== 'index.html') {
        window.location.href = 'login.html';
        return false;
    }
    
    if (isLoggedIn && currentPage === 'dashboard.html') {
        const user = localStorage.getItem('user');
        const welcomeElement = document.getElementById('welcomeMessage');
        if (welcomeElement) {
            welcomeElement.innerHTML = `<i class="fas fa-hand-peace"></i> Welcome, ${user}!`;
        }
        
        // Load recent photos
        loadRecentPhotos();
    }
    
    return true;
}

// Load recent photos for dashboard
function loadRecentPhotos() {
    const photos = JSON.parse(localStorage.getItem('familyPhotos') || '[]');
    const previewGrid = document.getElementById('recentPhotos');
    if (!previewGrid) return;
    
    const recent = photos.slice(-6).reverse(); // Last 6 photos
    
    if (recent.length === 0) {
        previewGrid.innerHTML = '<p class="no-photos">No photos yet. Upload some memories!</p>';
        return;
    }
    
    previewGrid.innerHTML = '';
    recent.forEach(photo => {
        const div = document.createElement('div');
        div.className = 'preview-item';
        div.onclick = () => window.location.href = 'album.html';
        div.innerHTML = `<img src="${photo.dataUrl || 'https://via.placeholder.com/150'}" alt="${photo.name}">`;
        previewGrid.appendChild(div);
    });
}

// Logout function
function logout() {
    localStorage.removeItem('loggedIn');
    localStorage.removeItem('user');
    localStorage.removeItem('loginTime');
    
    if ('caches' in window) {
        caches.keys().then(cacheNames => {
            cacheNames.forEach(cacheName => {
                caches.delete(cacheName);
            });
        });
    }
    
    window.location.href = 'index.html';
}

// Inactivity timer
let inactivityTimer;
function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        alert('You have been logged out due to inactivity.');
        logout();
    }, 30 * 60 * 1000);
}

document.addEventListener('mousemove', resetInactivityTimer);
document.addEventListener('keypress', resetInactivityTimer);
document.addEventListener('click', resetInactivityTimer);

// Run checkAuth on load
document.addEventListener('DOMContentLoaded', checkAuth);
