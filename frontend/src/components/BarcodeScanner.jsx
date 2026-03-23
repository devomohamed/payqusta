import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Camera, CheckCircle, Flashlight, ScanLine, Upload, X } from 'lucide-react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import { Button, Input } from './UI';

function createScanPayload(value, format = 'UNKNOWN') {
  return {
    value: String(value || '').trim(),
    format: String(format || 'UNKNOWN').trim().toUpperCase() || 'UNKNOWN',
  };
}

export default function BarcodeScanner({ onScan, onClose, autoFocus = true }) {
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const inputRef = useRef(null);
  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const activeTrackRef = useRef(null);
  const barcodeBuffer = useRef('');
  const lastKeyTime = useRef(0);

  useEffect(() => {
    if (autoFocus && inputRef.current) inputRef.current.focus();
  }, [autoFocus]);

  const stopCameraScanning = useCallback(() => {
    if (activeTrackRef.current && torchEnabled) {
      activeTrackRef.current.applyConstraints?.({ advanced: [{ torch: false }] }).catch(() => {});
    }
    activeTrackRef.current = null;
    setTorchEnabled(false);
    setTorchSupported(false);
    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset();
      } catch (_) {}
    }
    codeReaderRef.current = null;
    setScanning(false);
  }, [torchEnabled]);

  const handleBarcodeScan = useCallback((payload) => {
    const normalizedPayload = createScanPayload(payload?.value ?? payload, payload?.format);
    if (!normalizedPayload.value) return;
    setSuccess(`تم مسح: ${normalizedPayload.value}`);
    setError('');
    stopCameraScanning();
    onScan(normalizedPayload);
    window.setTimeout(() => {
      setSuccess('');
      onClose();
    }, 900);
  }, [onClose, onScan, stopCameraScanning]);

  const startCameraScanning = useCallback(async () => {
    try {
      setError('');
      setScanning(true);
      const reader = new BrowserMultiFormatReader();
      codeReaderRef.current = reader;
      const devices = await reader.listVideoInputDevices();
      if (!devices.length) throw new Error('no_camera');
      const selectedDeviceId = devices.length > 1 ? devices[devices.length - 1].deviceId : devices[0].deviceId;
      await reader.decodeFromVideoDevice(selectedDeviceId, videoRef.current, (result, scanError) => {
        if (result) {
          handleBarcodeScan({
            value: result.getText(),
            format: result.getBarcodeFormat?.() || 'UNKNOWN',
          });
          return;
        }
        if (scanError && !(scanError instanceof NotFoundException)) {
          setError('تعذر قراءة الباركود من الكاميرا');
        }
      });

      const stream = videoRef.current?.srcObject;
      const track = stream?.getVideoTracks?.()?.[0];
      activeTrackRef.current = track || null;
      const capabilities = track?.getCapabilities?.();
      setTorchSupported(Boolean(capabilities?.torch));
    } catch (_) {
      setError('لا يمكن الوصول إلى الكاميرا. تأكد من منح الإذن للمتصفح.');
      stopCameraScanning();
    }
  }, [handleBarcodeScan, stopCameraScanning]);

  const toggleTorch = useCallback(async () => {
    const track = activeTrackRef.current;
    if (!track?.applyConstraints) return;
    try {
      const nextTorch = !torchEnabled;
      await track.applyConstraints({ advanced: [{ torch: nextTorch }] });
      setTorchEnabled(nextTorch);
    } catch (_) {
      setError('الكشاف غير مدعوم على هذا الجهاز أو المتصفح');
    }
  }, [torchEnabled]);

  const handleManualSubmit = (event) => {
    event.preventDefault();
    if (manualCode.trim().length < 3) {
      setError('الباركود يجب أن يكون 3 أحرف على الأقل');
      return;
    }
    handleBarcodeScan({ value: manualCode, format: 'UNKNOWN' });
    setManualCode('');
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setError('');
      const imageUrl = URL.createObjectURL(file);
      const image = new Image();
      image.src = imageUrl;
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
      });
      const result = await new BrowserMultiFormatReader().decodeFromImageElement(image);
      URL.revokeObjectURL(imageUrl);
      handleBarcodeScan({
        value: result.getText(),
        format: result.getBarcodeFormat?.() || 'UNKNOWN',
      });
    } catch (_) {
      setError('لم يتم العثور على باركود واضح داخل الصورة');
    }
  };

  useEffect(() => {
    const handleKeyPress = (event) => {
      const targetTag = event.target?.tagName;
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA') return;
      const now = Date.now();
      if (now - lastKeyTime.current > 80) barcodeBuffer.current = '';
      lastKeyTime.current = now;
      if (event.key === 'Enter') {
        if (barcodeBuffer.current.length >= 3) {
          handleBarcodeScan({ value: barcodeBuffer.current, format: 'UNKNOWN' });
          barcodeBuffer.current = '';
          event.preventDefault();
        }
        return;
      }
      if (event.key.length === 1 && /[a-zA-Z0-9\-_.]/.test(event.key)) {
        barcodeBuffer.current += event.key;
      }
    };
    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [handleBarcodeScan]);

  useEffect(() => () => stopCameraScanning(), [stopCameraScanning]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
        dir="rtl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 p-4">
          <div className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary-500" />
            <h3 className="font-bold">مسح الباركود</h3>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          {error ? (
            <div className="flex items-center gap-2 rounded-2xl bg-red-50 p-3 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-600">
              <CheckCircle className="h-4 w-4" />
              {success}
            </div>
          ) : null}

          {scanning ? (
            <div className="relative overflow-hidden rounded-2xl bg-black">
              <video ref={videoRef} className="aspect-video w-full object-cover" playsInline muted />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative h-32 w-64 rounded-xl border-2 border-primary-500">
                  <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-primary-500" />
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Button type="button" onClick={startCameraScanning} className="h-16 justify-center rounded-2xl">
                <Camera className="ml-2 h-5 w-5" />
                مسح بالكاميرا
              </Button>
              <label className="flex h-16 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 font-semibold text-gray-600 transition-colors hover:border-primary-400 hover:bg-primary-50">
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                <Upload className="ml-2 h-5 w-5" />
                رفع صورة
              </label>
            </div>
          )}

          {scanning ? (
            <div className="grid grid-cols-2 gap-3">
              <Button type="button" variant="ghost" onClick={stopCameraScanning} className="rounded-2xl">
                <X className="ml-2 h-4 w-4" />
                إيقاف
              </Button>
              {torchSupported ? (
                <Button type="button" variant={torchEnabled ? 'primary' : 'outline'} onClick={toggleTorch} className="rounded-2xl">
                  <Flashlight className="ml-2 h-4 w-4" />
                  تشغيل الفلاش
                </Button>
              ) : <div />}
            </div>
          ) : null}

          <form onSubmit={handleManualSubmit} className="flex items-stretch gap-2 pt-1">
            <Input
              ref={inputRef}
              className="flex-1"
              value={manualCode}
              onChange={(event) => setManualCode(event.target.value)}
              placeholder="أدخل الباركود..."
              inputMode="text"
              dir="ltr"
            />
            <Button type="submit" className="min-w-[5.5rem] rounded-2xl">إضافة</Button>
          </form>

          <div className="rounded-2xl bg-gray-50 p-3 text-xs text-gray-500">
            يدعم الكاميرا، قارئ USB keyboard، الإدخال اليدوي، ورفع صورة من الجهاز.
          </div>
        </div>
      </div>
    </div>
  );
}

export function useBarcodeScanner(onScan, enabled = true) {
  const barcodeBuffer = useRef('');
  const lastKeyTime = useRef(0);

  useEffect(() => {
    if (!enabled) return undefined;
    const handleKeyPress = (event) => {
      const targetTag = event.target?.tagName;
      if (targetTag === 'INPUT' || targetTag === 'TEXTAREA') return;
      const now = Date.now();
      if (now - lastKeyTime.current > 50) barcodeBuffer.current = '';
      lastKeyTime.current = now;
      if (event.key === 'Enter') {
        if (barcodeBuffer.current.length >= 3) {
          onScan(createScanPayload(barcodeBuffer.current, 'UNKNOWN'));
          barcodeBuffer.current = '';
          event.preventDefault();
        }
        return;
      }
      if (event.key.length === 1 && /[a-zA-Z0-9\-_.]/.test(event.key)) {
        barcodeBuffer.current += event.key;
      }
    };
    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [enabled, onScan]);
}
