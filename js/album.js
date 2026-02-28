// ============================================
// Drime Cloud Storage Integration (Updated)
// ============================================

// Drime configuration with your new API key
const DRIME_CONFIG = {
    ACCESS_TOKEN: '26394|1H4pU1xYP7MU3OsJCFZ341DElxnNUXkeKZqQimsE7788f83a', // ← आपकी नई API key
    API_BASE_URL: 'https://api.drime.cloud/v1',
    ROOT_FOLDER: 'FamilyCloud' // यह फोल्डर Drime पर automatically बन जाएगा
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
            // 1. सबसे पहले टोकन वैलिडेट करें
            const tokenValid = await this.validateToken();
            if (!tokenValid) {
                console.error('❌ Invalid API token');
                return false;
            }

            // 2. वर्कस्पेस जानकारी लें
            const workspace = await this.apiRequest('/workspace');
            this.workspaceId = workspace.id;

            // 3. FamilyCloud फ़ोल्डर बनाएँ / प्राप्त करें
            await this.ensureFolder();
            
            this.isInitialized = true;
            console.log('✅ Drime Cloud ready!');
            return true;
        } catch (error) {
            console.error('❌ Drime initialization failed:', error);
            return false;
        }
    }

    // टोकन वैलिडेट करें
    async validateToken() {
        try {
            const response = await fetch(`${this.baseUrl}/auth/validate`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });
            return response.ok;
        } catch (error) {
            console.error('Token validation failed:', error);
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
            const errorText = await response.text();
            throw new Error(`Drime API error (${response.status}): ${errorText}`);
        }
        return await response.json();
    }

    // सुनिश्चित करें कि FamilyCloud फ़ोल्डर मौजूद है
    async ensureFolder() {
        try {
            // पहले देखें कि फोल्डर पहले से है या नहीं
            const response = await this.apiRequest('/folders');
            let folder = response.folders?.find(f => f.name === DRIME_CONFIG.ROOT_FOLDER);
            
            if (!folder) {
                // नहीं मिला तो नया फोल्डर बनाएँ
                folder = await this.apiRequest('/folders', 'POST', {
                    name: DRIME_CONFIG.ROOT_FOLDER,
                    description: 'Family Cloud Photos'
                });
            }
            
            this.folderId = folder.id;
            return this.folderId;
        } catch (error) {
            console.error('Folder creation failed:', error);
            throw error;
        }
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
                            fileId: response.id || response.fileId,
                            url: response.url || response.fileUrl,
                            name: response.name || file.name
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
        return (response.files || [])
            .filter(f => f.mimeType?.startsWith('image/') || f.type?.startsWith('image/'))
            .map(f => ({
                id: f.id,
                name: f.name,
                url: f.url || f.fileUrl,
                thumbnail: f.thumbnail || f.url,
                size: f.size,
                uploadedAt: f.createdAt || f.uploadedAt,
                uploadedBy: localStorage.getItem('user') || 'family'
            }));
    }

    // स्टोरेज उपयोग जानकारी
    async getStorageUsage() {
        try {
            const usage = await this.apiRequest('/storage/usage');
            return {
                used: usage.used || usage.bytesUsed || 0,
                total: usage.total || usage.bytesTotal || 20 * 1024 * 1024 * 1024, // 20GB default
                percent: ((usage.used || 0) / (usage.total || 20 * 1024 * 1024 * 1024)) * 100
            };
        } catch (error) {
            console.warn('Could not fetch storage usage, using defaults');
            return {
                used: 0,
                total: 20 * 1024 * 1024 * 1024,
                percent: 0
            };
        }
    }
}

// DrimeStorage का इंस्टेंस बनाएँ
const drimeStorage = new DrimeStorage();

// ============================================
// फोटो मैनेजमेंट (बाकी कोड वही रहेगा)
// ============================================

let photos = [];

// ... बाकी सारे फंक्शन वही रहेंगे जो पहले दिए थे (displayPhotos, downloadPhoto, etc.)
// बस savePhotos फंक्शन में थोड़ा बदलाव करें:

async function savePhotos() {
    const files = document.getElementById('photoUpload').files;
    if (files.length === 0) {
        alert('Please select photos first.');
        return;
    }

    showUploadProgress();

    let uploadedCount = 0;
    let failedCount = 0;

    for (let file of files) {
        try {
            const result = await drimeStorage.uploadPhoto(file, (percent) => {
                const overallPercent = ((uploadedCount * 100) + percent) / files.length;
                updateUploadProgress(overallPercent);
            });
            
            if (result.success) {
                uploadedCount++;
                photos.push({
                    id: result.fileId,
                    name: result.name,
                    url: result.url,
                    thumbnail: result.url,
                    uploadedAt: new Date().toISOString(),
                    uploadedBy: localStorage.getItem('user') || 'family'
                });
            } else {
                failedCount++;
            }
        } catch (error) {
            console.error('Upload error:', error);
            failedCount++;
        }
    }

    hideUploadProgress();
    
    if (uploadedCount > 0) {
        alert(`${uploadedCount} photos uploaded successfully to Drime Cloud! ${failedCount > 0 ? failedCount + ' failed.' : ''}`);
        displayPhotos();
        updateTotalCount();
        updateStorageDisplay();
    } else {
        alert('Upload failed. Please check your Drime API key and try again.');
    }
    
    closeUploadModal();
}

// इनिशियलाइज़
document.addEventListener('DOMContentLoaded', async () => {
    const ready = await drimeStorage.init();
    if (ready) {
        photos = await drimeStorage.getAllPhotos();
        displayPhotos();
        updateTotalCount();
        updateStorageDisplay();
    } else {
        alert('Drime Cloud connection failed. Please check your API key in album.js');
        // Fallback to localStorage
        photos = JSON.parse(localStorage.getItem('familyPhotos') || '[]');
        displayPhotos();
    }
});
