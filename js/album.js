// ============================================
// Family Cloud - Jottacloud (5GB) + LocalStorage Fallback
// ============================================

// Jottacloud configuration - आपका नया token डाल दिया गया है
const JOTTACLOUD_CONFIG = {
    ACCESS_TOKEN: 'eyJ1c2VybmFtZSI6IjY5YTNmNmJlYWE1ODliMDAwMTA2NTEyYiIsInJlYWxtIjoiam90dGFjbG91ZCIsIndlbGxfa25vd25fbGluayI6Imh0dHBzOi8vaWQuam90dGFjbG91ZC5jb20vYXV0aC9yZWFsbXMvam90dGFjbG91ZC8ud2VsbC1rbm93bi9vcGVuaWQtY29uZmlndXJhdGlvbiIsImF1dGhfdG9rZW4iOiI0MEVFMEFBMUY0N0ZGNzIxOUMyMzBDNTg2QjY3QUZCMCJ9',
    API_BASE_URL: 'https://api.jottacloud.com/v1',
    ROOT_FOLDER: 'FamilyCloud',
    USERNAME: '69a3f6beaa589b000106512b' // token से निकाला गया username
};

let photos = [];
let useJottacloud = false;
let jottacloudStorage = null;

// ========== Jottacloud Storage Class ==========
class JottacloudStorage {
    constructor(config) {
        this.accessToken = config.ACCESS_TOKEN;
        this.baseUrl = config.API_BASE_URL;
        this.username = config.USERNAME;
        this.folderPath = `/FamilyCloud`;
        this.isInitialized = false;
    }

    async init() {
        try {
            console.log('🔄 Jottacloud: Initializing...');
            
            // 1. टोकन वैलिडेट करें
            const tokenValid = await this.validateToken();
            if (!tokenValid) {
                console.warn('❌ Jottacloud: Invalid token');
                return false;
            }
            console.log('✅ Jottacloud: Token valid');

            // 2. फोल्डर बनाएँ / प्राप्त करें
            await this.ensureFolder();
            
            this.isInitialized = true;
            console.log('✅ Jottacloud: Ready (5GB)');
            return true;
        } catch (error) {
            console.error('❌ Jottacloud init failed:', error);
            return false;
        }
    }

    async validateToken() {
        try {
            const response = await fetch(`${this.baseUrl}/user`, {
                headers: { 
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Accept': 'application/json'
                }
            });
            return response.ok;
        } catch (e) {
            console.warn('Jottacloud validateToken error:', e);
            return false;
        }
    }

    async apiRequest(endpoint, method = 'GET', body = null) {
        const url = `${this.baseUrl}${endpoint}`;
        console.log(`Jottacloud API: ${method} ${url}`);
        
        const headers = {
            'Authorization': `Bearer ${this.accessToken}`,
            'Accept': 'application/json'
        };
        
        if (body && !(body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        const options = {
            method,
            headers
        };

        if (body) {
            options.body = body instanceof FormData ? body : JSON.stringify(body);
        }

        const response = await fetch(url, options);
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Jottacloud API error (${response.status}): ${text}`);
        }
        
        if (response.status === 204) {
            return { success: true };
        }
        
        return await response.json();
    }

    async ensureFolder() {
        try {
            // चेक करें कि फोल्डर पहले से है या नहीं
            const response = await this.apiRequest(`/files/${this.username}/FamilyCloud`);
            console.log('✅ Jottacloud: Folder exists');
        } catch (error) {
            // फोल्डर नहीं है तो बनाएँ
            console.log('📁 Jottacloud: Creating folder...');
            await this.apiRequest(`/files/${this.username}/`, 'POST', {
                name: 'FamilyCloud',
                type: 'folder'
            });
            console.log('✅ Jottacloud: Folder created');
        }
    }

    async uploadPhoto(file, onProgress) {
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('file', file);

            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${this.baseUrl}/files/${this.username}/FamilyCloud/${encodeURIComponent(file.name)}`);
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
                            fileId: resp.id || resp.path,
                            url: this.getPhotoUrl(file.name),
                            name: file.name
                        });
                    } catch (e) {
                        // अगर response JSON नहीं है तो भी सफल मानें
                        resolve({
                            success: true,
                            fileId: Date.now().toString(),
                            url: this.getPhotoUrl(file.name),
                            name: file.name
                        });
                    }
                } else {
                    reject(new Error(`Upload failed: ${xhr.status}`));
                }
            };
            xhr.onerror = () => reject(new Error('Network error'));
            xhr.send(formData);
        });
    }

    getPhotoUrl(filename) {
        // Jottacloud पर फोटो का public URL
        return `https://www.jottacloud.com/s/${this.username}/FamilyCloud/${encodeURIComponent(filename)}`;
    }

    async getAllPhotos() {
        try {
            const response = await this.apiRequest(`/files/${this.username}/FamilyCloud`);
            
            if (!response || !response.children) {
                return [];
            }

            return response.children
                .filter(item => item.type === 'file' && item.mimeType?.startsWith('image/'))
                .map(item => ({
                    id: item.path || item.name,
                    name: item.name,
                    url: this.getPhotoUrl(item.name),
                    thumbnail: this.getPhotoUrl(item.name),
                    uploadedAt: item.modifiedAt || new Date().toISOString(),
                    uploadedBy: 'family'
                }));
        } catch (error) {
            console.error('❌ Jottacloud getAllPhotos error:', error);
            return [];
        }
    }

    async getStorageUsage() {
        try {
            const response = await this.apiRequest(`/user/${this.username}/usage`);
            return {
                used: response.used || 0,
                total: response.total || 5 * 1024 * 1024 * 1024, // 5GB default
                percent: ((response.used || 0) / (response.total || 5e9)) * 100
            };
        } catch {
            return { used: 0, total: 5e9, percent: 0 };
        }
    }
}

// ========== सामान्य फोटो फंक्शन ==========

function loadPhotos() {
    console.log('📸 Loading photos... useJottacloud =', useJottacloud);
    if (useJottacloud && jottacloudStorage?.isInitialized) {
        loadPhotosFromJottacloud();
    } else {
        loadPhotosFromLocal();
    }
}

async function loadPhotosFromJottacloud() {
    try {
        photos = await jottacloudStorage.getAllPhotos();
        console.log('📸 Jottacloud photos loaded:', photos.length);
        displayPhotos();
        updateStats();
        updateMemberCounts();
        updateStorageDisplay();
    } catch (error) {
        console.error('❌ Jottacloud load failed, switching to localStorage', error);
        useJottacloud = false;
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
                <p><i class="far fa-calendar-alt"></i> ${new Date(photo.uploadedAt || photo.date).toLocaleDateString('en-IN')} • <i class="far fa-user"></i> ${photo.uploadedBy || 'family'}</p>
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
        if (file.size > (useJottacloud ? 100 : 5) * 1024 * 1024) { // Jottacloud 100MB तक, Local 5MB
            alert(`${file.name} बहुत बड़ा है। ${useJottacloud ? '100MB' : '5MB'} से छोटी फोटो चुनें।`);
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

    if (useJottacloud) {
        // Jottacloud अपलोड
        console.log('☁️ Uploading to Jottacloud...');
        for (let file of files) {
            try {
                const result = await jottacloudStorage.uploadPhoto(file, (percent) => {
                    const overall = (successCount * 100 + percent) / files.length;
                    updateUploadProgress(overall);
                });
                if (result.success) {
                    photos.push({
                        id: result.fileId,
                        name: result.name,
                        url: result.url,
                        uploadedAt: new Date().toISOString(),
                        uploadedBy: localStorage.getItem('user') || 'family'
                    });
                    successCount++;
                }
            } catch (error) {
                console.error('❌ Jottacloud upload error:', error);
            }
        }
        hideUploadProgress();
        if (successCount > 0) {
            alert(`${successCount} फोटो Jottacloud पर अपलोड हुईं! 5GB स्टोरेज ✅`);
            closeUploadModal();
            loadPhotos();
        } else {
            alert('Jottacloud अपलोड विफल। अब LocalStorage में अपलोड करते हैं।');
            useJottacloud = false;
            savePhotosLocal(files);
        }
    } else {
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
    if (useJottacloud) {
        jottacloudStorage.getStorageUsage().then(usage => {
            const usedMB = (usage.used / (1024*1024)).toFixed(2);
            storageEl.innerHTML = `<span>${usedMB} MB / 5 GB (Jottacloud)</span><div class="storage-bar"><div class="storage-fill" style="width:${usage.percent}%"></div></div>`;
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
    jottacloudStorage = new JottacloudStorage(JOTTACLOUD_CONFIG);
    useJottacloud = await jottacloudStorage.init();
    console.log('🔌 Jottacloud available:', useJottacloud);
    
    loadPhotos();
    
    const welcomeEl = document.getElementById('welcomeMessage');
    if (welcomeEl) {
        const user = localStorage.getItem('user') || 'Guest';
        welcomeEl.innerHTML = `<i class="fas fa-hand-peace"></i> Welcome, ${user}! ${useJottacloud ? '(5GB Jottacloud)' : '(Local Storage)'}`;
    }
});