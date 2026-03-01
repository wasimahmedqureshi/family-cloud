// ============================================
// Family Cloud - LocalStorage Photo Management
// ============================================

let photos = [];

// ========== फोटो लोड करें ==========
function loadPhotos() {
    const saved = localStorage.getItem('familyPhotos');
    photos = saved ? JSON.parse(saved) : [];
    displayPhotos();
    updateTotalCount();
    updateStorageDisplay();
    updateMemberCounts();
}

// ========== फोटो डिस्प्ले करें ==========
function displayPhotos() {
    const grid = document.getElementById('albumGrid');
    if (!grid) return;

    if (photos.length === 0) {
        grid.innerHTML = '<div class="no-photos"><i class="fas fa-images"></i><p>कोई फोटो नहीं। "Upload Photos" बटन पर क्लिक करें 📸</p></div>';
        return;
    }

    grid.innerHTML = '';
    photos.forEach((photo, index) => {
        const card = document.createElement('div');
        card.className = 'photo-card fade-in';
        
        card.innerHTML = `
            <img src="${photo.dataUrl}" alt="${photo.name}" loading="lazy">
            <div class="photo-info">
                <h4>${photo.name.substring(0, 20)}${photo.name.length > 20 ? '...' : ''}</h4>
                <p><i class="far fa-calendar-alt"></i> ${photo.date} • <i class="far fa-user"></i> ${photo.uploadedBy}</p>
                <div class="photo-actions">
                    <button onclick="downloadPhoto(${index})" class="download-btn"><i class="fas fa-download"></i> Download</button>
                    <button onclick="sharePhoto(${index})" class="share-btn"><i class="fas fa-share-alt"></i> Share</button>
                </div>
            </div>
        `;
        
        card.onclick = (e) => {
            if (!e.target.closest('button')) {
                openPhotoViewer(index);
            }
        };
        grid.appendChild(card);
    });
}

// ========== फोटो अपलोड हैंडलर ==========
window.handlePhotoUpload = function(event) {
    const files = event.target.files;
    const preview = document.getElementById('uploadPreview');
    if (!preview) return;
    
    preview.innerHTML = '';

    for (let file of files) {
        if (file.size > 5 * 1024 * 1024) {
            alert(`${file.name} बहुत बड़ा है। 5MB से छोटी फोटो चुनें।`);
            continue;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            const div = document.createElement('div');
            div.className = 'preview-item';
            div.innerHTML = `<img src="${e.target.result}" alt="${file.name}">
                <span class="remove" onclick="this.parentElement.remove()">×</span>`;
            preview.appendChild(div);
        };
        reader.readAsDataURL(file);
    }
};

// ========== फोटो सेव करें ==========
window.savePhotos = function() {
    const fileInput = document.getElementById('photoUpload');
    if (!fileInput) {
        alert('File input not found');
        return;
    }
    
    const files = fileInput.files;
    if (files.length === 0) {
        alert('कोई फोटो नहीं चुनी गई।');
        return;
    }

    let processed = 0;
    const currentUser = localStorage.getItem('user') || 'family';

    for (let file of files) {
        if (file.size > 5 * 1024 * 1024) {
            processed++;
            if (processed === files.length) {
                alert('सभी फोटो सेव हो गईं!');
                closeUploadModal();
                loadPhotos();
            }
            continue;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            photos.push({
                id: Date.now() + Math.random(),
                name: file.name,
                dataUrl: e.target.result,
                date: new Date().toLocaleDateString('en-IN'),
                uploadedBy: currentUser
            });

            processed++;
            if (processed === files.length) {
                localStorage.setItem('familyPhotos', JSON.stringify(photos));
                alert(`${files.length} फोटो सफलतापूर्वक अपलोड हुईं! 🎉`);
                closeUploadModal();
                loadPhotos();
            }
        };
        reader.readAsDataURL(file);
    }
};

// ========== डाउनलोड फोटो ==========
window.downloadPhoto = function(index) {
    const photo = photos[index];
    const link = document.createElement('a');
    link.href = photo.dataUrl;
    link.download = photo.name;
    link.click();
};

// ========== शेयर फोटो ==========
window.sharePhoto = function(index) {
    const photo = photos[index];
    if (navigator.share) {
        navigator.share({
            title: photo.name,
            text: 'हमारी फैमिली फोटो देखें!',
            url: window.location.href
        }).catch(() => {
            alert('Share cancelled');
        });
    } else {
        prompt('फोटो शेयर करने के लिए लिंक कॉपी करें:', window.location.href);
    }
};

// ========== फोटो व्यूअर ==========
let currentPhotoIndex = 0;

window.openPhotoViewer = function(index) {
    if (photos.length === 0) return;
    currentPhotoIndex = index;
    const viewer = document.getElementById('photoViewer');
    const viewerImg = document.getElementById('viewerImage');
    
    if (viewer && viewerImg) {
        viewerImg.src = photos[index].dataUrl;
        viewer.classList.add('active');
    }
};

window.closeViewer = function() {
    const viewer = document.getElementById('photoViewer');
    if (viewer) viewer.classList.remove('active');
};

window.changePhoto = function(direction) {
    currentPhotoIndex += direction;
    if (currentPhotoIndex < 0) currentPhotoIndex = photos.length - 1;
    if (currentPhotoIndex >= photos.length) currentPhotoIndex = 0;
    
    const viewerImg = document.getElementById('viewerImage');
    if (viewerImg) viewerImg.src = photos[currentPhotoIndex].dataUrl;
};

window.downloadCurrentPhoto = function() {
    if (photos.length > 0) downloadPhoto(currentPhotoIndex);
};

window.shareCurrentPhoto = function() {
    if (photos.length > 0) sharePhoto(currentPhotoIndex);
};

// ========== काउंट और स्टोरेज अपडेट ==========
function updateTotalCount() {
    const totalSpan = document.getElementById('totalPhotos');
    if (totalSpan) totalSpan.textContent = photos.length;
}

function updateStorageDisplay() {
    const storageEl = document.getElementById('storageUsage');
    if (storageEl) {
        const totalSize = JSON.stringify(photos).length;
        const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
        storageEl.innerHTML = `<span>${sizeInMB} MB / 10 MB</span>`;
    }
}

function updateMemberCounts() {
    const members = ['papa', 'mama', 'bhaiya', 'didi', 'dada', 'dadi'];
    members.forEach(member => {
        const count = photos.filter(p => p.uploadedBy?.toLowerCase() === member).length;
        const el = document.getElementById(`count-${member}`);
        if (el) el.innerHTML = count + ' photos';
    });
}

// ========== मोडल फंक्शन ==========
window.showUploadModal = function() {
    const modal = document.getElementById('uploadModal');
    if (modal) modal.classList.add('active');
};

window.closeUploadModal = function() {
    const modal = document.getElementById('uploadModal');
    const preview = document.getElementById('uploadPreview');
    const fileInput = document.getElementById('photoUpload');
    
    if (modal) modal.classList.remove('active');
    if (preview) preview.innerHTML = '';
    if (fileInput) fileInput.value = '';
};

// ========== इनिशियलाइज़ ==========
document.addEventListener('DOMContentLoaded', function() {
    loadPhotos();
    
    // Welcome message
    const welcomeEl = document.getElementById('welcomeMessage');
    if (welcomeEl) {
        const user = localStorage.getItem('user') || 'Guest';
        welcomeEl.innerHTML = `<i class="fas fa-hand-peace"></i> Welcome, ${user}!`;
    }
});