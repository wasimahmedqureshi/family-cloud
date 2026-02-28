// Album data
let photos = [];

// Load photos from localStorage
function loadPhotos() {
    const saved = localStorage.getItem('familyPhotos');
    photos = saved ? JSON.parse(saved) : [
        // Sample data
        { id: 1, name: 'Family Vacation', file: 'vacation.jpg', album: 'vacation', date: '2024-01-15', uploadedBy: 'dad', dataUrl: null },
        { id: 2, name: 'Birthday Party', file: 'birthday.jpg', album: 'birthday', date: '2024-02-20', uploadedBy: 'mom', dataUrl: null },
        { id: 3, name: 'Weekend Dinner', file: 'dinner.jpg', album: 'family', date: '2024-03-10', uploadedBy: 'family', dataUrl: null }
    ];
    return photos;
}

// Save photos
function savePhotos() {
    localStorage.setItem('familyPhotos', JSON.stringify(photos));
    displayPhotos();
    updateTotalCount();
}

// Display photos in grid
function displayPhotos(filterAlbum = 'all') {
    loadPhotos();
    const grid = document.getElementById('albumGrid');
    if (!grid) return;
    
    let filtered = filterAlbum === 'all' ? photos : photos.filter(p => p.album === filterAlbum);
    
    if (filtered.length === 0) {
        grid.innerHTML = '<div class="no-photos"><i class="fas fa-images"></i><p>No photos found. Upload some memories!</p></div>';
        return;
    }
    
    grid.innerHTML = '';
    filtered.forEach((photo, index) => {
        const card = createPhotoCard(photo, index);
        grid.appendChild(card);
    });
    
    updateTotalCount(filtered.length);
}

// Create photo card element
function createPhotoCard(photo, index) {
    const card = document.createElement('div');
    card.className = 'photo-card fade-in';
    card.setAttribute('data-id', photo.id);
    
    const imageUrl = photo.dataUrl || `https://via.placeholder.com/300x200?text=${encodeURIComponent(photo.name)}`;
    
    card.innerHTML = `
        <img src="${imageUrl}" alt="${photo.name}" loading="lazy">
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
    
    return card;
}

// Update total photos count
function updateTotalCount(count) {
    const totalSpan = document.getElementById('totalAlbumPhotos');
    if (totalSpan) totalSpan.textContent = count || photos.length;
}

// Handle photo upload
function handlePhotoUpload(event) {
    const files = event.target.files;
    const preview = document.getElementById('uploadPreview');
    preview.innerHTML = '';
    
    Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const previewItem = document.createElement('div');
            previewItem.className = 'preview-item';
            previewItem.innerHTML = `
                <img src="${e.target.result}" alt="${file.name}">
                <span class="remove" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></span>
            `;
            preview.appendChild(previewItem);
            
            // Add to photos array
            photos.push({
                id: Date.now() + Math.random(),
                name: file.name.split('.')[0],
                file: file.name,
                album: 'family',
                date: new Date().toISOString().split('T')[0],
                uploadedBy: localStorage.getItem('user') || 'family',
                dataUrl: e.target.result
            });
        };
        reader.readAsDataURL(file);
    });
}

// Save uploaded photos
function savePhotos() {
    savePhotos();
    closeUploadModal();
    displayPhotos();
    alert('Photos uploaded successfully! 🎉');
}

// Download single photo
function downloadPhoto(index) {
    loadPhotos();
    const photo = photos[index];
    
    if (photo.dataUrl) {
        const link = document.createElement('a');
        link.href = photo.dataUrl;
        link.download = photo.file || 'photo.jpg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } else {
        alert(`Downloading: ${photo.name}`);
    }
}

// Download all photos
function downloadAllPhotos() {
    loadPhotos();
    if (photos.length === 0) {
        alert('No photos to download!');
        return;
    }
    
    alert(`Downloading ${photos.length} photos...`);
    photos.forEach((photo, i) => {
        setTimeout(() => downloadPhoto(i), i * 300);
    });
}

// Share photo
function sharePhoto(index) {
    loadPhotos();
    const photo = photos[index];
    
    if (navigator.share) {
        navigator.share({
            title: photo.name,
            text: `Check out this family photo: ${photo.name}`,
            url: window.location.href
        }).catch(console.error);
    } else {
        prompt('Copy this link to share:', window.location.href);
    }
}

// Photo viewer
let currentPhotoIndex = 0;

function openPhotoViewer(index) {
    loadPhotos();
    currentPhotoIndex = index;
    const viewer = document.getElementById('photoViewer');
    const viewerImg = document.getElementById('viewerImage');
    
    if (viewer && viewerImg) {
        viewerImg.src = photos[index].dataUrl || `https://via.placeholder.com/800?text=${photos[index].name}`;
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
    else if (currentPhotoIndex >= photos.length) currentPhotoIndex = 0;
    
    const viewerImg = document.getElementById('viewerImage');
    viewerImg.src = photos[currentPhotoIndex].dataUrl || `https://via.placeholder.com/800?text=${photos[currentPhotoIndex].name}`;
}

function downloadCurrentPhoto() {
    downloadPhoto(currentPhotoIndex);
}

function shareCurrentPhoto() {
    sharePhoto(currentPhotoIndex);
}

// Filter album
function filterAlbum(albumName) {
    displayPhotos(albumName);
    
    document.querySelectorAll('.album-list li').forEach(li => {
        li.classList.remove('active');
    });
    event.target.classList.add('active');
}

// Create new album
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

// Slideshow
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

// Modal functions
function showUploadModal() {
    document.getElementById('uploadModal').classList.add('active');
}

function closeUploadModal() {
    document.getElementById('uploadModal').classList.remove('active');
    document.getElementById('uploadPreview').innerHTML = '';
}

function createAlbum() {
    alert('Create album feature coming soon!');
}

function shareWithFamily() {
    alert('Share feature coming soon!');
}

// Load on page load
document.addEventListener('DOMContentLoaded', () => {
    loadPhotos();
    displayPhotos();
});
