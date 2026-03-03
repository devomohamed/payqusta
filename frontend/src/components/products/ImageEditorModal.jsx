import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../../utils/canvasUtils';
import { Button } from '../UI';
import { X, Crop, ZoomIn, ZoomOut, Check, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ImageEditorModal({ isOpen, onClose, files, onComplete }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    // Store the processed results
    const [processedFiles, setProcessedFiles] = useState([]);

    if (!isOpen || !files || files.length === 0) return null;

    const currentFile = files[currentIndex];
    // Create object URL just once per file viewing. Keep in mind to revoke them eventually.
    const imageUrl = URL.createObjectURL(currentFile);

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleNextOrFinish = async () => {
        try {
            // Get the cropped image file
            const croppedFile = await getCroppedImg(imageUrl, croppedAreaPixels, currentFile.name, currentFile.type);

            const newProcessed = [...processedFiles, croppedFile];
            setProcessedFiles(newProcessed);

            if (currentIndex < files.length - 1) {
                // Move to next image
                setCrop({ x: 0, y: 0 });
                setZoom(1);
                setCurrentIndex(currentIndex + 1);
            } else {
                // Finished all images
                onComplete(newProcessed);
                resetState();
            }
        } catch (e) {
            console.error(e);
            // Fallback: use original file if cropping fails
            const newProcessed = [...processedFiles, currentFile];
            setProcessedFiles(newProcessed);

            if (currentIndex < files.length - 1) {
                setCurrentIndex(currentIndex + 1);
            } else {
                onComplete(newProcessed);
                resetState();
            }
        }
    };

    const skipCrop = () => {
        const newProcessed = [...processedFiles, currentFile];
        setProcessedFiles(newProcessed);

        if (currentIndex < files.length - 1) {
            setCrop({ x: 0, y: 0 });
            setZoom(1);
            setCurrentIndex(currentIndex + 1);
        } else {
            onComplete(newProcessed);
            resetState();
        }
    };

    const resetState = () => {
        setCurrentIndex(0);
        setProcessedFiles([]);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-900 w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[85vh] sm:h-[80vh]">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/30">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-xl">
                            <Crop className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100">تعديل وقص الصور</h3>
                            <p className="text-xs text-gray-500 font-medium">
                                صورة {currentIndex + 1} من {files.length}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={resetState}
                        className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Cropper Area */}
                <div className="relative flex-1 bg-gray-100 dark:bg-gray-950 flex items-center justify-center p-4">
                    <div className="absolute top-4 left-4 z-10 bg-black/50 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full font-bold tracking-wider">
                        1:1 Square
                    </div>

                    <div className="relative w-full h-full max-h-full max-w-full overflow-hidden rounded-xl">
                        <Cropper
                            image={imageUrl}
                            crop={crop}
                            zoom={zoom}
                            aspect={1} // Force 1:1 aspect ratio
                            onCropChange={setCrop}
                            onCropComplete={onCropComplete}
                            onZoomChange={setZoom}
                            objectFit="contain"
                        />
                    </div>
                </div>

                {/* Controls */}
                <div className="p-6 bg-white dark:bg-gray-900 flex flex-col gap-6">
                    <div className="flex items-center gap-4 max-w-md mx-auto w-full">
                        <ZoomOut className="w-5 h-5 text-gray-400" />
                        <input
                            type="range"
                            value={zoom}
                            min={1}
                            max={3}
                            step={0.1}
                            aria-labelledby="Zoom"
                            onChange={(e) => setZoom(e.target.value)}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-primary-500"
                        />
                        <ZoomIn className="w-5 h-5 text-gray-400" />
                    </div>

                    <div className="flex justify-between items-center w-full">
                        <Button variant="ghost" onClick={skipCrop} className="text-gray-500">
                            تخطي (بدون قص)
                        </Button>

                        <Button
                            variant="primary"
                            onClick={handleNextOrFinish}
                            icon={currentIndex === files.length - 1 ? <Check className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                            className="px-8 shadow-lg shadow-primary-500/20"
                        >
                            {currentIndex === files.length - 1 ? 'إنهاء وحفظ' : 'التالي'}
                        </Button>
                    </div>
                </div>

            </div>
        </div>
    );
}
