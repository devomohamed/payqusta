import React, { useRef, useState } from 'react';
import { X, RotateCcw, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const SignatureCanvas = ({ onSave, onClose }) => {
  const { t } = useTranslation('admin');
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);

  const startDrawing = (event) => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const pointX = event.clientX ?? event.touches?.[0]?.clientX;
    const pointY = event.clientY ?? event.touches?.[0]?.clientY;

    if (pointX == null || pointY == null) return;

    context.beginPath();
    context.moveTo(pointX - rect.left, pointY - rect.top);
    setIsDrawing(true);
    setIsEmpty(false);
  };

  const draw = (event) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const pointX = event.clientX ?? event.touches?.[0]?.clientX;
    const pointY = event.clientY ?? event.touches?.[0]?.clientY;

    if (pointX == null || pointY == null) return;

    context.lineTo(pointX - rect.left, pointY - rect.top);
    context.strokeStyle = '#111827';
    context.lineWidth = 2;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  };

  const save = () => {
    if (isEmpty) return;
    onSave(canvasRef.current.toDataURL('image/png'));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm md:items-center">
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="app-surface w-full rounded-t-3xl p-6 md:max-w-lg md:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('signature_canvas.ui.kixjmgz')}</h3>
          <button
            onClick={onClose}
            className="app-surface-muted rounded-xl p-2 text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400"
          >
            <X size={24} />
          </button>
        </div>

        <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          {t('signature_canvas.ui.k9ob2pc')}
        </p>

        <div className="app-surface-muted mb-4 rounded-2xl border-2 border-dashed border-gray-300/80 p-2 dark:border-white/10">
          <canvas
            ref={canvasRef}
            width={500}
            height={250}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full cursor-crosshair touch-none rounded-xl bg-white"
            style={{ touchAction: 'none' }}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={clear}
            className="app-surface-muted flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-gray-700 transition-colors hover:border-primary-500/30 dark:text-gray-300"
          >
            <RotateCcw size={18} />
            {t('signature_canvas.ui.ky5b3')}
          </button>

          <button
            onClick={save}
            disabled={isEmpty}
            className="flex-1 rounded-xl bg-blue-600 px-4 py-3 font-bold text-white transition hover:bg-blue-700 disabled:bg-gray-400"
          >
            <span className="flex items-center justify-center gap-2">
              <Check size={18} />
              {t('signature_canvas.ui.ke7g012')}
            </span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default SignatureCanvas;
