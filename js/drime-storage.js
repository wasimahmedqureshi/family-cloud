// js/drime-storage.js

class DrimeCloudStorage {
    constructor() {
        this.accessToken = DRIME_CONFIG.ACCESS_TOKEN;
        this.baseUrl = DRIME_CONFIG.API_BASE_URL;
        this.workspaceId = DRIME_CONFIG.WORKSPACE_ID;
        this.folderId = null;
    }

    // API request helper
    async apiRequest(endpoint, method = 'GET', body = null) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
        };

        const options = {
            method,
            headers
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Drime API request failed:', error);
            throw error;
        }
    }

    // वर्कस्पेस ID ऑटो-डिटेक्ट करें
    async init() {
        try {
            // Get workspace info
            const data = await this.apiRequest('/workspace');
            this.workspaceId = data.id;
            
            // FamilyCloud फोल्डर बनाएं या उसकी ID लें
            await this.ensureFamilyFolder();
            
            return true;
        } catch (error) {
            console.error('Drime init failed:', error);
            return false;
        }
    }

    // FamilyCloud फोल्डर बनाएं या ढूंढें
    async ensureFamilyFolder() {
        try {
            // सभी फोल्डर लिस्ट करें
            const folders = await this.apiRequest(`/workspace/${this.workspaceId}/folders`);
            
            // FamilyCloud फोल्डर ढूंढें
            let familyFolder = folders.find(f => f.name === 'FamilyCloud');
            
            if (!familyFolder) {
                // नहीं मिला तो बनाएं
                const newFolder = await this.apiRequest(`/workspace/${this.workspaceId}/folders`, 'POST', {
                    name: 'FamilyCloud'
                });
                this.folderId = newFolder.id;
            } else {
                this.folderId = familyFolder.id;
            }
            
            return this.folderId;
        } catch (error) {
            console.error('Failed to create folder:', error);
            throw error;
        }
    }

    // फोटो अपलोड करें
    async uploadPhoto(file, onProgress = null) {
        try {
            // फोल्डर ID सुनिश्चित करें
            if (!this.folderId) {
                await this.ensureFamilyFolder();
            }

            // FormData में फाइल डालें
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folderId', this.folderId);

            // अपलोड request
            const xhr = new XMLHttpRequest();
            
            return new Promise((resolve, reject) => {
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable && onProgress) {
                        const percent = (e.loaded / e.total) * 100;
                        onProgress(percent);
                    }
                });

                xhr.addEventListener('load', () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        const response = JSON.parse(xhr.responseText);
                        resolve({
                            success: true,
                            fileId: response.id,
                            url: response.url,
                            name: response.name
                        });
                    } else {
                        reject(new Error(`Upload failed: ${xhr.status}`));
                    }
                });

                xhr.addEventListener('error', () => reject(new Error('Upload failed')));

                xhr.open('POST', `${this.baseUrl}/upload`);
                xhr.setRequestHeader('Authorization', `Bearer ${this.accessToken}`);
                xhr.send(formData);
            });

        } catch (error) {
            console.error('Upload failed:', error);
            return { success: false, error: error.message };
        }
    }

    // सभी फोटो लोड करें
    async getAllPhotos() {
        try {
            if (!this.folderId) {
                await this.ensureFamilyFolder();
            }

            const response = await this.apiRequest(`/folders/${this.folderId}/files`);
            
            // सिर्फ इमेज फाइल्स फिल्टर करें
            const photos = response.files
                .filter(file => file.mimeType?.startsWith('image/'))
                .map(file => ({
                    id: file.id,
                    name: file.name,
                    url: file.url,
                    thumbnail: file.thumbnail || file.url,
                    size: file.size,
                    uploadedAt: file.createdAt,
                    uploadedBy: localStorage.getItem('user') || 'family'
                }));

            return photos;
        } catch (error) {
            console.error('Failed to load photos:', error);
            return [];
        }
    }

    // फोटो डिलीट करें
    async deletePhoto(fileId) {
        try {
            await this.apiRequest(`/files/${fileId}`, 'DELETE');
            return true;
        } catch (error) {
            console.error('Delete failed:', error);
            return false;
        }
    }

    // स्टोरेज यूसेज चेक करें
    async getStorageUsage() {
        try {
            const data = await this.apiRequest('/workspace/usage');
            return {
                used: data.used,
                total: data.total,
                percent: (data.used / data.total) * 100
            };
        } catch (error) {
            console.error('Failed to get storage usage:', error);
            return null;
        }
    }
}

// Drime storage instance बनाएं
const drimeStorage = new DrimeCloudStorage();
