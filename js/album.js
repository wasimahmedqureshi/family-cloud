// ============================================
// सरल फोटो मैनेजमेंट (LocalStorage आधारित)
// ============================================

let photos = [];

// लोकल स्टोरेज से फोटो लोड करें
function loadPhotos() {
    const saved = localStorage.getItem('familyPhotos');
    photos = saved ? JSON.parse(saved) : [];
    displayPhotos();
    updateTotalCount();
    updateStorageDisplay();
}

// फोटो डिस्प्ले करें
function displayPhotos() {
    const grid = document.getElementById('albumGrid');
    if (!grid) return;

    if (photos.length === 0) {
        grid.innerHTML = '<div class="no-photos"><i class="fas fa-images"></i><p>कोई फोटो नहीं। फोटो अपलोड करें!</p></div>';
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

// फोटो अपलोड हैंडलर
function handlePhotoUpload(event) {
    const files = event.target.files;
    const preview = document.getElementById('uploadPreview');
    preview.innerHTML = '';

    for (let file of files) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const div = document.createElement('div');
            div.className = 'preview-item';
            div.innerHTML = `<img src="${e.target.result}" alt="${file.name}"><span class="remove" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></span>`;
            preview.appendChild(div);
        };
        reader.readAsDataURL(file);
    }
}

// फोटो सेव करें
function savePhotos() {
    const files = document.getElementById('photoUpload').files;
    if (files.length === 0) {
        alert('कोई फोटो नहीं चुनी गई।');
        return;
    }

    let uploadedCount = 0;

    for (let file of files) {
        const reader = new FileReader();
        reader.onload = function(e) {
            photos.push({
                id: Date.now() + Math.random(),
                name: file.name,
                dataUrl: e.target.result,
                date: new Date().toISOString().split('T')[0],
                uploadedBy: localStorage.getItem('user') || 'family'
            });
            uploadedCount++;
            
            if (uploadedCount === files.length) {
                localStorage.setItem('familyPhotos', JSON.stringify(photos));
                alert(`${uploadedCount} फोटो सफलतापूर्वक अपलोड हुईं!`);
                closeUploadModal();
                displayPhotos();
                updateTotalCount();
                updateStorageDisplay();
            }
        };
        reader.readAsDataURL(file);
    }
}

// डाउनलोड फंक्शन
function downloadPhoto(index) {
    const photo = photos[index];
    const link = document.createElement('a');
    link.href = photo.dataUrl;
    link.download = photo.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// शेयर फंक्शन
function sharePhoto(index) {
    const photo = photos[index];
    if (navigator.share) {
        navigator.share({
            title: photo.name,
            text: 'हमारी फैमिली फोटो देखें!',
            url: window.location.href
        });
    } else {
        alert('फोटो शेयर करने के लिए लिंक कॉपी करें: ' + window.location.href);
    }
}

// फोटो व्यूअर
let currentPhotoIndex = 0;

function openPhotoViewer(index) {
    currentPhotoIndex = index;
    const viewer = document.getElementById('photoViewer');
    const viewerImg = document.getElementById('viewerImage');
    viewerImg.src = photos[index].dataUrl;
    viewer.classList.add('active');
}

function closeViewer() {
    document.getElementById('photoViewer').classList.remove('active');
}

function changePhoto(direction) {
    currentPhotoIndex += direction;
    if (currentPhotoIndex < 0) currentPhotoIndex = photos.length - 1;
    if (currentPhotoIndex >= photos.length) currentPhotoIndex = 0;
    
    document.getElementById('viewerImage').src = photos[currentPhotoIndex].dataUrl;
}

function downloadCurrentPhoto() {
    downloadPhoto(currentPhotoIndex);
}

function shareCurrentPhoto() {
    sharePhoto(currentPhotoIndex);
}

// टोटल काउंट अपडेट
function updateTotalCount() {
    const totalSpan = document.getElementById('totalPhotos');
    if (totalSpan) totalSpan.textContent = photos.length;
}

// स्टोरेज डिस्प्ले
function updateStorageDisplay() {
    const storageEl = document.getElementById('storageUsage');
    if (storageEl) {
        const totalSize = JSON.stringify(photos).length;
        const totalMB = (totalSize / (1024 * 1024)).toFixed(2);
        storageEl.innerHTML = `<span>${totalMB} MB / 10 MB (Local)</span>`;
    }
}

// मोडल फंक्शन
function showUploadModal() {
    document.getElementById('uploadModal').classList.add('active');
}

function closeUploadModal() {
    document.getElementById('uploadModal').classList.remove('active');
    document.getElementById('uploadPreview').innerHTML = '';
    document.getElementById('photoUpload').value = '';
}

function filterAlbum() {}
function createNewAlbum() { alert('एल्बम फीचर जल्द आ रहा है!'); }
function toggleSlideshow() { alert('स्लाइडशो जल्द आ रहा है!'); }

// पेज लोड होने पर
document.addEventListener('DOMContentLoaded', () => {
    loadPhotos();
});
