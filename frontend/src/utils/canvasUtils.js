/**
 * Utility functions for extracting a cropped image using an HTML5 Canvas.
 */

export const createImage = (url) =>
    new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.setAttribute('crossOrigin', 'anonymous'); // needed to avoid CORS issues on some image hosts
        image.src = url;
    });

export async function getCroppedImg(
    imageSrc,
    pixelCrop,
    fileName = 'cropped.jpg',
    mimeType = 'image/jpeg'
) {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        throw new Error('No 2d context');
    }

    // Set the canvas size to the cropped area
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    // Draw the cropped image onto the canvas
    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    );

    // Return as a Blob/File
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                console.error('Canvas is empty');
                reject(new Error('Canvas is empty'));
                return;
            }
            // Create a File object from the blob so it's ready to upload
            const file = new File([blob], fileName, { type: mimeType });
            resolve(file);
        }, mimeType, 1.0); // 1.0 quality for jpeg/webp
    });
}
