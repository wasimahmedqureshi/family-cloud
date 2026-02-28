// ============================================
// Drime Cloud Storage Integration
// ============================================

// Drime configuration (API key inserted)
const DRIME_CONFIG = {
    ACCESS_TOKEN: '26386|PE4t1f8RHAYoMJnSK5QIzAqlXeS9M18lbVQaei4Qde209bba', // ← आपकी Drime API key
    API_BASE_URL: 'https://api.drime.cloud/v1',
    ROOT_FOLDER: 'FamilyCloud'
};

// DrimeStorage class
class DrimeStorage {
    constructor() {
        this.accessToken = DRIME_CONFIG.ACCESS_TOKEN;
        this.baseUrl = DRIME_CONFIG.API_BASE_URL;
        this.folderId = null;
        this.workspaceId = null;
        this.isInitialized = false;
    }

    // Initialize – workspace और folder ID प्राप्त करें
    async init() {
        try {
            // 1. वर्कस्पेस जानकारी लें
            const workspace = await this.apiRequest('/workspace');
            this.workspaceId = workspace.id;

            // 2. FamilyCloud फ़ोल्डर बनाएँ / प्राप्त करें
            await this.ensureFolder();
            
            this.isInitialized = true;
            console.log('✅ Drime Cloud ready!');
            return true;
        } catch (error) {
            console.error('❌ Drime initialization failed:', error);
            return false;
        }
    }

    // API request helper
    async apiRequest(endpoint, method = 'GET', body = null) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
        };
        const options = { method, headers };
        if (body) options.body = JSON.stringify(body);

        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`Drime API error: ${response.status}`);
        }
        return await response.json();
    }

    // सुनिश्चित करें कि FamilyCloud फ़ोल्डर मौजूद है
    async ensureFolder() {
        // सभी फ़ोल्डर लें
        const folders = await this.apiRequest(`/workspace/${this.workspaceId}/folders`);
        let folder = folders.find(f => f.name === DRIME_CONFIG.ROOT_FOLDER);
        
        if (!folder) {
            // नहीं मिला तो बनाएँ
            folder = await this.apiRequest(`/workspace/${this.workspaceId}/folders`, 'POST', {
                name: DRIME_CONFIG.ROOT_FOLDER
            });
        }
        this.folderId = folder.id;
        return this.folderId;
    }

    // फोटो अपलोड करें (प्रोग्रेस के साथ)
    async uploadPhoto(file, onProgress) {
        if (!this.isInitialized) await this.init();

        return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folderId', this.folderId);

            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${this.baseUrl}/upload`);
            xhr.setRequestHeader('Authorization', `Bearer ${this.accessToken}`);

            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable && onProgress) {
                    const percent = (e.loaded / e.total) * 100;
                    onProgress(percent);
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve({
                            success: true,
                            fileId: response.id,
                            url: response.url,
                            name: response.name
                        });
                    } catch (e) {
                        reject(e);
                    }
                } else {
                    reject(new Error(`Upload failed: ${xhr.status}`));
                }
            });

            xhr.addEventListener('error', () => reject(new Error('Upload failed')));
            xhr.send(formData);
        });
    }

    // सभी फोटो लोड करें
    async getAllPhotos() {
        if (!this.isInitialized) await this.init();

        const response = await this.apiRequest(`/folders/${this.folderId}/files`);
        // केवल इमेज फ़ाइलें
        return response.files
            .filter(f => f.mimeType && f.mimeType.startsWith('image/'))
            .map(f => ({
                id: f.id,
                name: f.name,
                url: f.url,
                thumbnail: f.thumbnail || f.url,
                size: f.size,
                uploadedAt: f.createdAt,
                uploadedBy: localStorage.getItem('user') || 'family'
            }));
    }

    // स्टोरेज उपयोग जानकारी
    async getStorageUsage() {
        if (!this.isInitialized) await this.init();
        const usage = await this.apiRequest('/workspace/usage');
        return {
            used: usage.used,
            total: usage.total,
            percent: (usage.used / usage.total) * 100
        };
    }

    // फोटो डिलीट करें
    async deletePhoto(fileId) {
        await this.apiRequest(`/files/${fileId}`, 'DELETE');
        return true;
    }
}

// DrimeStorage का इंस्टेंस बनाएँ (ग्लोबल)
const drimeStorage = new DrimeStorage();

// ============================================
// मौजूदा फोटो मैनेजमेंट (album.js का बाकी हिस्सा)
// ============================================

// फोटो कलेक्शन (लोकल कैश)
let photos = [];

// डैशबोर्ड पर टोटल फोटो दिखाने के लिए
function updateTotalCount() {
    const totalSpan = document.getElementById('totalPhotos');
    if (totalSpan) totalSpan.textContent = photos.length;
}

// Drime से फोटो लोड करके डिस्प्ले करें
async function loadPhotosFromDrime() {
    try {
        photos = await drimeStorage.getAllPhotos();
        // लोकल स्टोरेज में मेटाडेटा कैश कर लें (बैकअप के लिए)
        localStorage.setItem('cachedPhotos', JSON.stringify(photos));
        displayPhotos();
        updateTotalCount();
        updateStorageDisplay();
    } catch (error) {
        console.error('Drime load failed:', error);
        // अगर Drime से लोड न हो तो कैश दिखाएँ
        const cached = localStorage.getItem('cachedPhotos');
        if (cached) {
            photos = JSON.parse(cached);
            displayPhotos();
        } else {
            // फॉलबैक: डमी डेटा
            photos = [
                { id: 1, name: 'Sample 1', url: null, thumbnail: null, uploadedAt: new Date().toISOString(), uploadedBy: 'system' }
            ];
        }
    }
}

// फोटो डिस्प्ले (album.html के ग्रिड में)
function displayPhotos(filteredPhotos = null) {
    const grid = document.getElementById('albumGrid');
    if (!grid) return;

    const toShow = filteredPhotos || photos;
    if (toShow.length === 0) {
        grid.innerHTML = '<div class="no-photos"><i class="fas fa-images"></i><p>No photos yet. Upload some memories!</p></div>';
        return;
    }

    grid.innerHTML = '';
    toShow.forEach((photo, index) => {
        const card = document.createElement('div');
        card.className = 'photo-card fade-in';
        card.dataset.id = photo.id;

        const imgUrl = photo.thumbnail || photo.url || `https://via.placeholder.com/300x200?text=${encodeURIComponent(photo.name)}`;

        card.innerHTML = `
            <img src="${imgUrl}" alt="${photo.name}" loading="lazy">
            <div class="photo-info">
                <h4>${photo.name}</h4>
                <p><i class="far fa-calendar-alt"></i> ${new Date(photo.uploadedAt).toLocaleDateString()} • <i class="far fa-user"></i> ${photo.uploadedBy}</p>
                <div class="photo-actions">
                    <button onclick="downloadPhoto('${photo.url}', '${photo.name}')" class="download-btn"><i class="fas fa-download"></i> Download</button>
                    <button onclick="sharePhoto('${photo.url}')" class="share-btn"><i class="fas fa-share-alt"></i> Share</button>
                </div>
            </div>
        `;

        card.onclick = (e) => {
            if (!e.target.closest('button')) {
                openPhotoViewer(index, toShow);
            }
        };
        grid.appendChild(card);
    });
}

// डाउनलोड फंक्शन
function downloadPhoto(url, filename) {
    if (!url) {
        alert('Photo URL not available');
        return;
    }
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// शेयर फंक्शन
function sharePhoto(url) {
    if (navigator.share) {
        navigator.share({
            title: 'Family Photo',
            text: 'Check out this family photo!',
            url: url
        }).catch(console.error);
    } else {
        prompt('Copy this link to share:', url);
    }
}

// फोटो व्यूअर (slideshow के साथ)
let currentPhotoIndex = 0;
let currentPhotoArray = [];

function openPhotoViewer(index, photoArray = photos) {
    currentPhotoArray = photoArray;
    currentPhotoIndex = index;
    const viewer = document.getElementById('photoViewer');
    const viewerImg = document.getElementById('viewerImage');
    if (viewer && viewerImg) {
        viewerImg.src = photoArray[index].url || `https://via.placeholder.com/800?text=${photoArray[index].name}`;
        viewer.classList.add('active');
    }
}

function closeViewer() {
    document.getElementById('photoViewer').classList.remove('active');
}

function changePhoto(direction) {
    currentPhotoIndex += direction;
    if (currentPhotoIndex < 0) currentPhotoIndex = currentPhotoArray.length - 1;
    else if (currentPhotoIndex >= currentPhotoArray.length) currentPhotoIndex = 0;

    const viewerImg = document.getElementById('viewerImage');
    viewerImg.src = currentPhotoArray[currentPhotoIndex].url || `https://via.placeholder.com/800?text=${currentPhotoArray[currentPhotoIndex].name}`;
}

function downloadCurrentPhoto() {
    const photo = currentPhotoArray[currentPhotoIndex];
    downloadPhoto(photo.url, photo.name);
}

function shareCurrentPhoto() {
    sharePhoto(currentPhotoArray[currentPhotoIndex].url);
}

// फिल्टर एल्बम (अभी सिर्फ UI के लिए)
function filterAlbum(albumName) {
    // अभी सभी फोटो दिखा रहे हैं – आगे album tag के हिसाब से फिल्टर कर सकते हैं
    displayPhotos();
    document.querySelectorAll('.album-list li').forEach(li => li.classList.remove('active'));
    event.target.classList.add('active');
}

// नया एल्बम बनाएँ (UI)
function createNewAlbum() {
    const albumName = prompt('Enter album name:');
    if (albumName) {
        const list = document.getElementById('albumList');
        const newItem = document.createElement('li');
        newItem.innerHTML = `<i class="fas fa-folder"></i> ${albumName}`;
        newItem.setAttribute('onclick', `filterAlbum('${albumName.toLowerCase()}')`);
        list.appendChild(newItem);
    }
}

// स्लाइडशो
let slideshowInterval;
function toggleSlideshow() {
    if (slideshowInterval) {
        clearInterval(slideshowInterval);
        slideshowInterval = null;
        alert('Slideshow stopped');
    } else {
        if (photos.length === 0) {
            alert('No photos to show');
            return;
        }
        openPhotoViewer(0);
        slideshowInterval = setInterval(() => changePhoto(1), 3000);
    }
}

// अपलोड मोडल
function showUploadModal() {
    document.getElementById('uploadModal').classList.add('active');
}
function closeUploadModal() {
    document.getElementById('uploadModal').classList.remove('active');
    document.getElementById('uploadPreview').innerHTML = '';
}

// फाइल अपलोड हैंडलर
async function handlePhotoUpload(event) {
    const files = event.target.files;
    const preview = document.getElementById('uploadPreview');
    preview.innerHTML = '';

    for (let file of files) {
        // प्रीव्यू दिखाएँ
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.className = 'preview-item';
            div.innerHTML = `<img src="${e.target.result}" alt="${file.name}"><span class="remove" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></span>`;
            preview.appendChild(div);
        };
        reader.readAsDataURL(file);
    }
}

// सेव फोटो – Drime पर अपलोड करें
async function savePhotos() {
    const files = document.getElementById('photoUpload').files;
    if (files.length === 0) {
        alert('Please select photos first.');
        return;
    }

    // प्रोग्रेस बार दिखाएँ
    showUploadProgress();

    let uploadedCount = 0;
    for (let file of files) {
        try {
            const result = await drimeStorage.uploadPhoto(file, (percent) => {
                updateUploadProgress((uploadedCount * 100 + percent) / files.length);
            });
            if (result.success) {
                uploadedCount++;
                // photos array में जोड़ें
                photos.push({
                    id: result.fileId,
                    name: result.name,
                    url: result.url,
                    thumbnail: result.url,
                    uploadedAt: new Date().toISOString(),
                    uploadedBy: localStorage.getItem('user') || 'family'
                });
            }
        } catch (error) {
            console.error('Upload error:', error);
        }
    }

    hideUploadProgress();
    alert(`${uploadedCount} photos uploaded successfully to Drime Cloud!`);
    closeUploadModal();
    displayPhotos();
    updateTotalCount();
    updateStorageDisplay();
}

// प्रोग्रेस बार UI
function showUploadProgress() {
    const div = document.createElement('div');
    div.id = 'uploadProgress';
    div.className = 'upload-progress';
    div.innerHTML = `
        <div class="progress-bar">
            <div class="progress-fill" style="width:0%"></div>
        </div>
        <p>Uploading to Drime Cloud...</p>
    `;
    document.body.appendChild(div);
}
function updateUploadProgress(percent) {
    const fill = document.querySelector('.progress-fill');
    if (fill) fill.style.width = percent + '%';
}
function hideUploadProgress() {
    const prog = document.getElementById('uploadProgress');
    if (prog) prog.remove();
}

// स्टोरेज उपयोग डिस्प्ले
async function updateStorageDisplay() {
    try {
        const usage = await drimeStorage.getStorageUsage();
        const storageEl = document.getElementById('storageUsage');
        if (storageEl) {
            storageEl.innerHTML = `
                <span>${formatBytes(usage.used)} / 20 GB</span>
                <div class="storage-bar"><div class="storage-fill" style="width:${usage.percent}%"></div></div>
            `;
        }
    } catch (e) {
        console.warn('Could not fetch storage usage');
    }
}
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// इनिशियलाइज़ – जब पेज लोड हो
document.addEventListener('DOMContentLoaded', async () => {
    // Drime को इनिशियलाइज़ करें
    const ready = await drimeStorage.init();
    if (ready) {
        await loadPhotosFromDrime();
    } else {
        alert('Drime Cloud connection failed. Check your API key.');
    }
});
