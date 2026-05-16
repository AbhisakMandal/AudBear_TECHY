/* ============================================================
   AUDBEAR TECHY — PREMIUM IMAGE CROPPER LOGIC
   ============================================================ */

let cropper = null;
let currentCropShape = 'square';
let onCropDoneCallback = null;

/**
 * Initialize Cropper with an image file or URL
 */
function openCropper(imageSrc, callback) {
    const modal = document.getElementById('audbear-cropper-modal');
    const image = document.getElementById('cropper-target-img');
    
    if (!modal || !image) return;

    image.src = imageSrc;
    onCropDoneCallback = callback;
    modal.style.display = 'flex';

    if (cropper) {
        cropper.destroy();
    }

    cropper = new Cropper(image, {
        aspectRatio: 1,
        viewMode: 1,
        dragMode: 'move',
        autoCropArea: 0.8,
        restore: false,
        guides: true,
        center: true,
        highlight: false,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: false,
        ready() {
            // Apply initial shape mask
            setCropShape(currentCropShape);
        }
    });
}

/**
 * Switch between 11 shapes
 */
function setCropShape(shape) {
    currentCropShape = shape;
    
    // Update UI buttons
    document.querySelectorAll('.shape-opt').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.shape === shape);
    });

    // Apply mask to cropper view box and face
    const cropperContainer = document.querySelector('.cropper-container');
    if (!cropperContainer) return;

    const viewBox = cropperContainer.querySelector('.cropper-view-box');
    const face = cropperContainer.querySelector('.cropper-face');

    // Remove all mask classes
    const maskClasses = [
        'mask-circle', 'mask-rounded-soft', 'mask-rounded-elite', 'mask-arch',
        'mask-pentagon', 'mask-hexagon', 'mask-elongated-hexagon',
        'mask-beveled', 'mask-slope-cut', 'mask-standard-frame'
    ];
    
    [viewBox, face].forEach(el => {
        if (el) {
            maskClasses.forEach(cls => el.classList.remove(cls));
            if (shape !== 'square') {
                el.classList.add(`mask-${shape}`);
            }
        }
    });
}

/**
 * Close the cropper modal
 */
function closeCropper() {
    const modal = document.getElementById('audbear-cropper-modal');
    if (modal) modal.style.display = 'none';
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
}

/**
 * Save the cropped image and return data URL
 */
function saveCroppedImage() {
    if (!cropper) return;

    // We get the square crop at high resolution
    const canvas = cropper.getCroppedCanvas({
        width: 800,
        height: 800,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
    });

    const dataUrl = canvas.toDataURL('image/png');
    
    if (onCropDoneCallback) {
        onCropDoneCallback(dataUrl, currentCropShape);
    }
    
    closeCropper();
}

/**
 * Integration Helper for Builder Page
 */
function handleBuilderPhotoEdit(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        openCropper(e.target.result, (croppedDataUrl, selectedShape) => {
            // Update the builder's state
            if (window.updatePhotoInBuilder) {
                window.updatePhotoInBuilder(croppedDataUrl, selectedShape);
            }
        });
    };
    reader.readAsDataURL(file);
}

window.openCropper = openCropper;
window.closeCropper = closeCropper;
window.setCropShape = setCropShape;
window.saveCroppedImage = saveCroppedImage;
window.handleBuilderPhotoEdit = handleBuilderPhotoEdit;
