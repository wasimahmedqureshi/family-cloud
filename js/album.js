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
    updateMemberPhotoCounts(); // Member count update
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
                <h4>${photo.name}</h4>
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
function handlePhotoUpload(event) {
    const files = event.target.files;
    const preview = document.getElementById('uploadPreview');
    preview.innerHTML = '';

    if (files.length === 0) return;

    for (let file of files) {
        // File size check (max 5MB per photo)
        if (file.size > 5 * 1024 * 1024) {
            alert(`${file.name} बहुत बड़ा है। 5MB से छोटी फोटो चुनें।`);
            continue;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            const div = document.createElement('div');
            div.className = 'preview-item';
            div.innerHTML = `<img src="${e.target.result}" alt="${file.name}">
                <span class="remove" onclick="this.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </span>`;
            preview.appendChild(div);
        };
        reader.readAsDataURL(file);
    }
}

// ========== फोटो सेव करें ==========
function savePhotos() {
    const files = document.getElementById('photoUpload').files;
    if (files.length === 0) {
        alert('कोई फोटो नहीं चुनी गई।');
        return;
    }

    let uploadedCount = 0;
    let totalFiles = files.length;
    let currentUser = localStorage.getItem('user') || 'family';

    for (let file of files) {
        // File size check again
        if (file.size > 5 * 1024 * 1024) {
            totalFiles--;
            continue;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            photos.push({
                id: Date.now() + Math.random(),
                name: file.name,
                dataUrl: e.target.result,
                date: new Date().toISOString().split('T')[0],
                uploadedBy: currentUser
            });
            
            uploadedCount++;
            
            if (uploadedCount === totalFiles) {
                // Save to localStorage
                localStorage.setItem('familyPhotos', JSON.stringify(photos));
                
                alert(`${uploadedCount} फोटो सफलतापूर्वक अपलोड हुईं! 🎉`);
                closeUploadModal();
                displayPhotos();
                updateTotalCount();
                updateStorageDisplay();
                updateMemberPhotoCounts();
                
                // Clear file input
                document.getElementById('photoUpload').value = '';
            }
        };
        reader.readAsDataURL(file);
    }
}

// ========== डाउनलोड फोटो ==========
function downloadPhoto(index) {
    const photo = photos[index];
    const link = document.createElement('a');
    link.href = photo.dataUrl;
    link.download = photo.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ========== शेयर फोटो ==========
function sharePhoto(index) {
    const photo = photos[index];
    if (navigator.share) {
        navigator.share({
            title: photo.name,
            text: 'हमारी फैमिली फोटो देखें!',
            url: window.location.href
        }).catch(() => {
            prompt('फोटो शेयर करने के लिए लिंक कॉपी करें:', window.location.href);
        });
    } else {
        prompt('फोटो शेयर करने के लिए लिंक कॉपी करें:', window.location.href);
    }
}

// ========== फोटो व्यूअर ==========
let currentPhotoIndex = 0;

function openPhotoViewer(index) {
    if (photos.length === 0) return;
    
    currentPhotoIndex = index;
    const viewer = document.getElementById('photoViewer');
    const viewerImg = document.getElementById('viewerImage');
    
    if (viewer && viewerImg) {
        viewerImg.src = photos[index].dataUrl;
        viewer.classList.add('active');
    }
}

function closeViewer() {
    const viewer = document.getElementById('photoViewer');
    if (viewer) viewer.classList.remove('active');
}

function changePhoto(direction) {
    currentPhotoIndex += direction;
    if (currentPhotoIndex < 0) currentPhotoIndex = photos.length - 1;
    if (currentPhotoIndex >= photos.length) currentPhotoIndex = 0;
    
    const viewerImg = document.getElementById('viewerImage');
    if (viewerImg) viewerImg.src = photos[currentPhotoIndex].dataUrl;
}

function downloadCurrentPhoto() {
    if (photos.length > 0) downloadPhoto(currentPhotoIndex);
}

function shareCurrentPhoto() {
    if (photos.length > 0) sharePhoto(currentPhotoIndex);
}

// ========== काउंट अपडेट ==========
function updateTotalCount() {
    const totalSpan = document.getElementById('totalPhotos');
    if (totalSpan) totalSpan.textContent = photos.length;
}

// ========== स्टोरेज डिस्प्ले ==========
function updateStorageDisplay() {
    const storageEl = document.getElementById('storageUsage');
    if (storageEl) {
        const totalSize = JSON.stringify(photos).length;
        const totalKB = (totalSize / 1024).toFixed(2);
        const totalMB = (totalSize / (1024 * 1024)).toFixed(2);
        
        if (totalMB < 1) {
            storageEl.innerHTML = `<span>${totalKB} KB / 10 MB (Local)</span>`;
        } else {
            storageEl.innerHTML = `<span>${totalMB} MB / 10 MB (Local)</span>`;
        }
        
        // Progress bar
        const percent = Math.min((totalSize / (10 * 1024 * 1024)) * 100, 100);
        storageEl.innerHTML += `<div class="storage-bar"><div class="storage-fill" style="width:${percent}%"></div></div>`;
    }
}

// ========== MEMBER PHOTO COUNTS UPDATE ==========
function updateMemberPhotoCounts() {
    // Member counts update for dashboard
    const members = ['Papa', 'Mama', 'Bhaiya', 'Didi', 'Dada', 'Dadi'];
    
    members.forEach(member => {
        const count = photos.filter(p => p.uploadedBy?.toLowerCase() === member.toLowerCase()).length;
        
        // Update in dashboard if exists
        const memberElement = document.getElementById(`count-${member.toLowerCase()}`);
        if (memberElement) {
            memberElement.textContent = count + ' photos uploaded';
        }
    });
}

// ========== मोडल फंक्शन ==========
function showUploadModal() {
    const modal = document.getElementById('uploadModal');
    if (modal) modal.classList.add('active');
}

function closeUploadModal() {
    const modal = document.getElementById('uploadModal');
    const preview = document.getElementById('uploadPreview');
    const fileInput = document.getElementById('photoUpload');
    
    if (modal) modal.classList.remove('active');
    if (preview) preview.innerHTML = '';
    if (fileInput) fileInput.value = '';
}

// ========== डमी फंक्शन (बाद में implement करेंगे) ==========
function filterAlbum(albumName) {
    displayPhotos();
    if (event) {
        document.querySelectorAll('.album-list li').forEach(li => li.classList.remove('active'));
        event.target.classList.add('active');
    }
}

function createNewAlbum() {
    alert('एल्बम फीचर जल्द आ रहा है! 📁');
}

function toggleSlideshow() {
    if (photos.length === 0) {
        alert('कोई फोटो नहीं है');
        return;
    }
    alert('स्लाइडशो फीचर जल्द आ रहा है! 🎬');
}

function downloadAllPhotos() {
    if (photos.length === 0) {
        alert('कोई फोटो नहीं है');
        return;
    }
    alert('डाउनलोड ऑल फीचर जल्द आ रहा है! ⬇️');
}

// ========== इनिशियलाइज़ ==========
document.addEventListener('DOMContentLoaded', () => {
    loadPhotos();
    
    // Welcome message update
    const welcomeEl = document.getElementById('welcomeMessage');
    if (welcomeEl) {
        const user = localStorage.getItem('user') || 'Guest';
        welcomeEl.innerHTML = `<i class="fas fa-hand-peace"></i> Welcome, ${user}!`;
    }
});
