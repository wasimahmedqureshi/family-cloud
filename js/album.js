// ============================================
// Family Cloud - Drime Cloud (20GB) + LocalStorage Fallback (Debug Mode)
// ============================================

// Drime configuration - आपकी नई API key
const DRIME_CONFIG = {
    ACCESS_TOKEN: '26596|bJjTxyCdlhmAAlunGjIs0A4c7YXxWorpt7kjDFKs7edddb66',
    API_BASE_URL: 'https://api.drime.cloud/v1',
    ROOT_FOLDER: 'FamilyCloud'
};

let photos = [];
let useDrime = false;
let drimeStorage = null;

// ========== Drime Storage Class ==========
class DrimeStorage {
    constructor(config) {
        this.accessToken = config.ACCESS_TOKEN;
        this.baseUrl = config.API_BASE_URL;
        this.folderId = null;
        this.workspaceId = null;
        this.isInitialized = false;
    }

    async init() {
        try {
            console.log('🔄 Drime: Initializing...');
            // 1. टोकन वैलिडेट करें
            const tokenValid = await this.validateToken();
            if (!tokenValid) {
                console.warn('❌ Drime: Invalid token');
                return false;
            }
            console.log('✅ Drime: Token valid');

            // 2. वर्कस्पेस जानकारी
            const workspace = await this.apiRequest('/workspace');
            this.workspaceId = workspace.id;
            console.log('✅ Drime: Workspace ID =', this.workspaceId);

            // 3. फोल्डर बनाएँ / प्राप्त करें
            await this.ensureFolder();
            
            this.isInitialized = true;
            console.log('✅ Drime: Ready (20GB)');
            return true;
        } catch (error) {
            console.error('❌ Drime init failed:', error);
            return false;
        }
    }

    async validateToken() {
        try {
            const response = await fetch(`${this.baseUrl}/auth/validate`, {
                headers: { 'Authorization': `Bearer ${this.accessToken}` }
            });
            return response.ok;
        } catch (e) {
            console.warn('Drime validateToken error:', e);
            return false;
        }
    }

    async apiRequest(endpoint, method = 'GET', body = null) {
        const url = `${this.baseUrl}${endpoint}`;
        console.log(`Drime API: ${method} ${url}`);
        const response = await fetch(url, {
            method,
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: body ? JSON.stringify(body) : null
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Drime API error (${response.status}): ${text}`);
        }
        return await response.json();
    }

    async ensureFolder() {
        const folders = await this.apiRequest('/folders');
        let folder = folders.find(f => f.name === DRIME_CONFIG.ROOT_FOLDER);
        if (!folder) {
            folder = await this.apiRequest('/folders', 'POST', {
                name: DRIME_CONFIG.ROOT_FOLDER
            });
            console.log('✅ Drime: Folder created');
        } else {
            console.log('✅ Drime: Folder exists');
        }
        this.folderId = folder.id;
    }

    async uploadPhoto(file, onProgress) {
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folderId', this.folderId);

            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${this.baseUrl}/upload`);
            xhr.setRequestHeader('Authorization', `Bearer ${this.accessToken}`);

            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable && onProgress) {
                    onProgress((e.loaded / e.total) * 100);
                }
            });

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const resp = JSON.parse(xhr.responseText);
                        resolve({
                            success: true,
                            fileId: resp.id,
                            url: resp.url,
                            name: resp.name
                        });
                    } catch (e) {
                        reject(e);
                    }
                } else {
                    reject(new Error(`Upload failed: ${xhr.status}`));
                }
            };
            xhr.onerror = () => reject(new Error('Network error'));
            xhr.send(formData);
        });
    }

    async getAllPhotos() {
        const response = await this.apiRequest(`/folders/${this.folderId}/files`);
        return response.files
            .filter(f => f.mimeType?.startsWith('image/'))
            .map(f => ({
                id: f.id,
                name: f.name,
                url: f.url,
                thumbnail: f.thumbnail || f.url,
                uploadedAt: f.createdAt,
                uploadedBy: 'family'
            }));
    }

    async getStorageUsage() {
        try {
            const usage = await this.apiRequest('/storage/usage');
            return {
                used: usage.used || 0,
                total: usage.total || 20 * 1024 * 1024 * 1024,
                percent: ((usage.used || 0) / (usage.total || 20e9)) * 100
            };
        } catch {
            return { used: 0, total: 20e9, percent: 0 };
        }
    }
}

// ========== सामान्य फोटो फंक्शन ==========

function loadPhotos() {
    console.log('📸 Loading photos... useDrime =', useDrime);
    if (useDrime && drimeStorage?.isInitialized) {
        loadPhotosFromDrime();
    } else {
        loadPhotosFromLocal();
    }
}

async function loadPhotosFromDrime() {
    try {
        photos = await drimeStorage.getAllPhotos();
        console.log('📸 Drime photos loaded:', photos.length);
        displayPhotos();
        updateStats();
        updateMemberCounts();
        updateStorageDisplay();
    } catch (error) {
        console.error('❌ Drime load failed, switching to localStorage', error);
        useDrime = false;
        loadPhotosFromLocal();
    }
}

function loadPhotosFromLocal() {
    const saved = localStorage.getItem('familyPhotos');
    photos = saved ? JSON.parse(saved) : [];
    console.log('📸 Local photos loaded:', photos.length);
    displayPhotos();
    updateStats();
    updateMemberCounts();
    updateStorageDisplay();
}

function displayPhotos() {
    const grid = document.getElementById('albumGrid');
    if (!grid) return;

    if (photos.length === 0) {
        grid.innerHTML = '<div class="no-photos"><i class="fas fa-images"></i><p>कोई फोटो नहीं। "Upload Photos" बटन पर क्लिक करें 📸</p></div>';
        return;
    }

    grid.innerHTML = '';
    photos.forEach((photo, index) => {
        const imgUrl = photo.url || photo.dataUrl || 'https://via.placeholder.com/300';
        const card = document.createElement('div');
        card.className = 'photo-card fade-in';
        card.innerHTML = `
            <img src="${imgUrl}" alt="${photo.name}" loading="lazy">
            <div class="photo-info">
                <h4>${photo.name.substring(0, 20)}${photo.name.length > 20 ? '...' : ''}</h4>
                <p><i class="far fa-calendar-alt"></i> ${photo.uploadedAt || photo.date || 'अज्ञात'} • <i class="far fa-user"></i> ${photo.uploadedBy || 'family'}</p>
                <div class="photo-actions">
                    <button onclick="downloadPhoto(${index})" class="download-btn"><i class="fas fa-download"></i> Download</button>
                    <button onclick="sharePhoto(${index})" class="share-btn"><i class="fas fa-share-alt"></i> Share</button>
                </div>
            </div>
        `;
        card.onclick = (e) => {
            if (!e.target.closest('button')) openPhotoViewer(index);
        };
        grid.appendChild(card);
    });
}

// ========== अपलोड हैंडलर ==========

window.handlePhotoUpload = function(event) {
    const files = event.target.files;
    const preview = document.getElementById('uploadPreview');
    if (!preview) {
        console.error('❌ Preview element not found');
        return;
    }
    preview.innerHTML = '';
    console.log('📤 Files selected:', files.length);

    for (let file of files) {
        if (file.size > (useDrime ? 2000 : 5) * 1024 * 1024) {
            alert(`${file.name} बहुत बड़ा है। ${useDrime ? '2GB' : '5MB'} से छोटी फोटो चुनें।`);
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

window.savePhotos = async function() {
    const fileInput = document.getElementById('photoUpload');
    if (!fileInput) {
        console.error('❌ File input not found');
        alert('फाइल इनपुट नहीं मिला। पेज रिफ्रेश करें।');
        return;
    }
    if (fileInput.files.length === 0) {
        alert('कोई फोटो नहीं चुनी गई।');
        return;
    }

    const files = Array.from(fileInput.files);
    console.log('💾 Saving', files.length, 'photos...');
    showUploadProgress();

    let successCount = 0;

    if (useDrime) {
        // Drime अपलोड
        console.log('☁️ Uploading to Drime...');
        for (let file of files) {
            try {
                const result = await drimeStorage.uploadPhoto(file, (percent) => {
                    const overall = (successCount * 100 + percent) / files.length;
                    updateUploadProgress(overall);
                });
                if (result.success) {
                    photos.push({
                        id: result.fileId,
                        name: result.name,
                        url: result.url,
                        uploadedAt: new Date().toLocaleDateString('en-IN'),
                        uploadedBy: localStorage.getItem('user') || 'family'
                    });
                    successCount++;
                }
            } catch (error) {
                console.error('❌ Drime upload error:', error);
            }
        }
        hideUploadProgress();
        if (successCount > 0) {
            alert(`${successCount} फोटो Drime Cloud पर अपलोड हुईं! 20GB स्टोरेज ✅`);
            closeUploadModal();
            loadPhotos();
        } else {
            alert('Drime अपलोड विफल। अब LocalStorage में अपलोड करते हैं।');
            // Drime fail होने पर localStorage से प्रयास करें
            useDrime = false;
            savePhotosLocal(files);
        }
    } else {
        // सीधे LocalStorage अपलोड
        savePhotosLocal(files);
    }
};

function savePhotosLocal(files) {
    console.log('💾 Saving to localStorage...');
    const currentUser = localStorage.getItem('user') || 'family';
    let processed = 0;
    let totalFiles = files.length;

    files.forEach(file => {
        if (file.size > 5 * 1024 * 1024) {
            alert(`${file.name} 5MB से बड़ा है, छोड़ा गया।`);
            processed++;
            if (processed === totalFiles) {
                finalizeLocalSave();
            }
            return;
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
            if (processed === totalFiles) {
                finalizeLocalSave();
            }
        };
        reader.onerror = function(err) {
            console.error('FileReader error:', err);
            processed++;
            if (processed === totalFiles) {
                finalizeLocalSave();
            }
        };
        reader.readAsDataURL(file);
    });

    function finalizeLocalSave() {
        localStorage.setItem('familyPhotos', JSON.stringify(photos));
        hideUploadProgress();
        alert(`${totalFiles} फोटो सफलतापूर्वक LocalStorage में अपलोड हुईं! 🎉`);
        closeUploadModal();
        loadPhotos();
    }
}

// ========== डाउनलोड / शेयर / व्यूअर ==========

window.downloadPhoto = function(index) {
    const photo = photos[index];
    const url = photo.url || photo.dataUrl;
    if (!url) return alert('URL उपलब्ध नहीं');
    const link = document.createElement('a');
    link.href = url;
    link.download = photo.name;
    link.click();
};

window.sharePhoto = function(index) {
    const photo = photos[index];
    if (navigator.share) {
        navigator.share({
            title: photo.name,
            text: 'हमारी फैमिली फोटो देखें!',
            url: window.location.href
        }).catch(() => {});
    } else {
        prompt('फोटो शेयर करने के लिए लिंक कॉपी करें:', window.location.href);
    }
};

let currentPhotoIndex = 0;
window.openPhotoViewer = function(index) {
    if (photos.length === 0) return;
    currentPhotoIndex = index;
    const viewer = document.getElementById('photoViewer');
    const img = document.getElementById('viewerImage');
    if (viewer && img) {
        img.src = photos[index].url || photos[index].dataUrl;
        viewer.classList.add('active');
    }
};
window.closeViewer = function() {
    document.getElementById('photoViewer')?.classList.remove('active');
};
window.changePhoto = function(direction) {
    currentPhotoIndex = (currentPhotoIndex + direction + photos.length) % photos.length;
    document.getElementById('viewerImage').src = photos[currentPhotoIndex].url || photos[currentPhotoIndex].dataUrl;
};
window.downloadCurrentPhoto = function() { downloadPhoto(currentPhotoIndex); };
window.shareCurrentPhoto = function() { sharePhoto(currentPhotoIndex); };

// ========== स्टैट्स अपडेट ==========
function updateStats() {
    const totalSpan = document.getElementById('totalPhotos');
    if (totalSpan) totalSpan.textContent = photos.length;
}

function updateStorageDisplay() {
    const storageEl = document.getElementById('storageUsage');
    if (!storageEl) return;
    if (useDrime) {
        drimeStorage.getStorageUsage().then(usage => {
            const usedGB = (usage.used / (1024**3)).toFixed(2);
            storageEl.innerHTML = `<span>${usedGB} GB / 20 GB (Drime)</span><div class="storage-bar"><div class="storage-fill" style="width:${usage.percent}%"></div></div>`;
        });
    } else {
        const totalSize = JSON.stringify(photos).length;
        const mb = (totalSize / (1024*1024)).toFixed(2);
        const percent = Math.min((totalSize / (10 * 1024 * 1024)) * 100, 100);
        storageEl.innerHTML = `<span>${mb} MB / 10 MB (Local)</span><div class="storage-bar"><div class="storage-fill" style="width:${percent}%"></div></div>`;
    }
}

function updateMemberCounts() {
    const members = ['papa', 'mama', 'bhaiya', 'didi', 'dada', 'dadi'];
    members.forEach(member => {
        const count = photos.filter(p => (p.uploadedBy || '').toLowerCase() === member).length;
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

// प्रोग्रेस बार
function showUploadProgress() {
    let bar = document.getElementById('uploadProgress');
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'uploadProgress';
        bar.className = 'upload-progress';
        bar.innerHTML = `<div class="progress-bar"><div class="progress-fill"></div></div><p>Uploading...</p>`;
        document.body.appendChild(bar);
    }
}
function updateUploadProgress(percent) {
    const fill = document.querySelector('.progress-fill');
    if (fill) fill.style.width = percent + '%';
}
function hideUploadProgress() {
    const prog = document.getElementById('uploadProgress');
    if (prog) prog.remove();
}

// ========== इनिशियलाइज़ ==========
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 App starting...');
    drimeStorage = new DrimeStorage(DRIME_CONFIG);
    useDrime = await drimeStorage.init();
    console.log('🔌 Drime available:', useDrime);
    
    loadPhotos();
    
    const welcomeEl = document.getElementById('welcomeMessage');
    if (welcomeEl) {
        const user = localStorage.getItem('user') || 'Guest';
        welcomeEl.innerHTML = `<i class="fas fa-hand-peace"></i> Welcome, ${user}! ${useDrime ? '(20GB Drime)' : '(Local Storage)'}`;
    }
});