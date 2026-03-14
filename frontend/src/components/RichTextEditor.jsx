import React, { useEffect, useMemo, useRef } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { api } from '../store';
import { getUserFriendlyErrorMessage } from '../utils/errorMapper';
import { resolveMediaUrl } from '../utils/media';

const SizeAttributor = Quill.import('attributors/class/size');
SizeAttributor.whitelist = ['small', 'large', 'huge'];
Quill.register(SizeAttributor, true);

const TOOLBAR_LAYOUT = [
  [{ header: [1, 2, 3, false] }, { size: ['small', false, 'large', 'huge'] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ color: [] }, { background: [] }],
  [{ list: 'ordered' }, { list: 'bullet' }, 'blockquote', 'code-block'],
  [{ direction: 'rtl' }, { align: [] }],
  ['link', 'image', 'video'],
  [{ script: 'sub' }, { script: 'super' }],
  ['clean'],
];

const SUPPORTED_FORMATS = [
  'header',
  'size',
  'bold',
  'italic',
  'underline',
  'strike',
  'color',
  'background',
  'list',
  'bullet',
  'blockquote',
  'code-block',
  'direction',
  'align',
  'link',
  'image',
  'video',
  'script',
];

const MAX_EDITOR_IMAGE_UPLOADS = 5;

const getSafeSelection = (quill) => {
  const selection = quill.getSelection(true);
  if (selection) return selection;

  return {
    index: quill.getLength(),
    length: 0,
  };
};

const normalizeUploadedImageUrls = (responseData) => {
  const rawUrls = Array.isArray(responseData?.urls)
    ? responseData.urls
    : responseData?.url
      ? [responseData.url]
      : [];

  return rawUrls
    .map((url) => resolveMediaUrl(url))
    .filter(Boolean);
};

const closeExpandedPickers = (toolbar, keepOpenPicker = null) => {
  toolbar.querySelectorAll('.ql-picker.ql-expanded').forEach((picker) => {
    if (picker !== keepOpenPicker) {
      picker.classList.remove('ql-expanded');
    }
  });
};

const normalizeExternalUrl = (rawValue) => {
  const normalizedValue = String(rawValue || '').trim();
  if (!normalizedValue) return '';

  if (/^(https?:|mailto:|tel:)/i.test(normalizedValue)) {
    return normalizedValue;
  }

  return `https://${normalizedValue.replace(/^\/+/, '')}`;
};

const getImageUploadErrorMessage = (error, t) => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return t('editor.image_upload_offline', {
      defaultValue: 'لا يمكن رفع الصورة أثناء عدم الاتصال بالإنترنت',
    });
  }

  if (error?.code === 'ERR_NETWORK' || /network error/i.test(String(error?.message || ''))) {
    return t('editor.image_upload_network_error', {
      defaultValue: 'تعذر رفع الصورة بسبب مشكلة في الاتصال بالشبكة',
    });
  }

  if (error?.code === 'ECONNABORTED' || /timeout/i.test(String(error?.message || ''))) {
    return t('editor.image_upload_timeout', {
      defaultValue: 'استغرق رفع الصورة وقتًا أطول من اللازم. جرب صورة أصغر حجمًا',
    });
  }

  return getUserFriendlyErrorMessage(
    error,
    t('editor.image_upload_failed', { defaultValue: 'فشل رفع الصورة' })
  );
};

const createImageBitmapFallback = (file) => (
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = (error) => {
      URL.revokeObjectURL(objectUrl);
      reject(error);
    };

    image.src = objectUrl;
  })
);

const canvasToBlob = (canvas, type, quality) => (
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to optimize image before upload'));
        return;
      }

      resolve(blob);
    }, type, quality);
  })
);

const optimizeEditorImage = async (file) => {
  if (!(file instanceof File) || !file.type.startsWith('image/')) {
    return file;
  }

  const maxDimension = 1080;
  const maxTargetBytes = 1024 * 1024;
  const targetType = 'image/webp';
  const sourceImage = typeof createImageBitmap === 'function'
    ? await createImageBitmap(file)
    : await createImageBitmapFallback(file);

  const width = sourceImage.width || sourceImage.naturalWidth;
  const height = sourceImage.height || sourceImage.naturalHeight;

  if (!width || !height) {
    if ('close' in sourceImage && typeof sourceImage.close === 'function') {
      sourceImage.close();
    }
    return file;
  }

  const scale = Math.min(1, maxDimension / Math.max(width, height));
  const nextWidth = Math.max(1, Math.round(width * scale));
  const nextHeight = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = nextWidth;
  canvas.height = nextHeight;

  const context = canvas.getContext('2d', { alpha: false });
  if (!context) {
    if ('close' in sourceImage && typeof sourceImage.close === 'function') {
      sourceImage.close();
    }
    return file;
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, nextWidth, nextHeight);
  context.drawImage(sourceImage, 0, 0, nextWidth, nextHeight);

  if ('close' in sourceImage && typeof sourceImage.close === 'function') {
    sourceImage.close();
  }

  const qualitySteps = [0.8, 0.72, 0.64, 0.56, 0.48];
  let optimizedBlob = null;

  for (const quality of qualitySteps) {
    optimizedBlob = await canvasToBlob(canvas, targetType, quality);

    if (optimizedBlob.size <= maxTargetBytes) {
      break;
    }
  }

  const originalBaseName = file.name.replace(/\.[^.]+$/, '') || 'editor-image';
  return new File([optimizedBlob], `${originalBaseName}.webp`, {
    type: targetType,
    lastModified: Date.now(),
  });
};

export default function RichTextEditor({ value, onChange, label, className = '', minHeight = 250 }) {
  const rootRef = useRef(null);
  const quillRef = useRef(null);
  const { t, i18n } = useTranslation('admin');

  const headerPickerLabels = useMemo(() => ({
    1: t('editor.h1', { defaultValue: 'عنوان 1' }),
    2: t('editor.h2', { defaultValue: 'عنوان 2' }),
    3: t('editor.h3', { defaultValue: 'عنوان 3' }),
    false: t('editor.normal', { defaultValue: 'عادي' }),
  }), [t]);

  const sizePickerLabels = useMemo(() => ({
    small: t('editor.small', { defaultValue: 'صغير' }),
    false: t('editor.normal', { defaultValue: 'عادي' }),
    large: t('editor.large', { defaultValue: 'كبير' }),
    huge: t('editor.huge', { defaultValue: 'ضخم' }),
  }), [t]);

  const toolbarLabels = useMemo(() => ({
    '.ql-bold': t('editor.bold'),
    '.ql-italic': t('editor.italic'),
    '.ql-underline': t('editor.underline'),
    '.ql-strike': t('editor.strike'),
    '.ql-blockquote': t('editor.blockquote'),
    '.ql-code-block': t('editor.code_block'),
    '.ql-list[value="ordered"]': t('editor.list_ordered'),
    '.ql-list[value="bullet"]': t('editor.list_bullet'),
    '.ql-script[value="sub"]': t('editor.sub'),
    '.ql-script[value="super"]': t('editor.super'),
    '.ql-direction[value="rtl"]': t('editor.rtl'),
    '.ql-align': t('editor.align'),
    '.ql-link': t('editor.link'),
    '.ql-image': t('editor.image'),
    '.ql-video': t('editor.video'),
    '.ql-clean': t('editor.clean'),
    '.ql-color': t('editor.color', { defaultValue: 'لون الخط' }),
    '.ql-background': t('editor.background', { defaultValue: 'لون الخلفية' }),
    '.ql-size': t('editor.size', { defaultValue: 'حجم الخط' }),
    '.ql-header': t('editor.header', { defaultValue: 'نوع النص' }),
    '.ql-emoji': t('editor.emoji', { defaultValue: 'ملصقات وفيسات' })
  }), [t]);

  const handlers = useMemo(() => ({
    image: () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = true;
      input.click();

      input.onchange = async () => {
        const selectedFiles = Array.from(input.files || [])
          .filter((file) => file instanceof File && file.type.startsWith('image/'))
          .slice(0, MAX_EDITOR_IMAGE_UPLOADS);

        if (!selectedFiles.length) return;

        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          toast.error(
            t('editor.image_upload_offline', {
              defaultValue: 'لا يمكن رفع الصورة أثناء عدم الاتصال بالإنترنت',
            })
          );
          return;
        }

        if ((input.files?.length || 0) > MAX_EDITOR_IMAGE_UPLOADS) {
          toast(
            t('editor.image_upload_limit', {
              defaultValue: 'يمكن رفع {{count}} صور كحد أقصى في كل مرة',
              count: MAX_EDITOR_IMAGE_UPLOADS,
            }),
            { icon: 'ℹ️' }
          );
        }

        const loadingToast = toast.loading(
          t('editor.uploading_image', { defaultValue: 'جارٍ رفع الصورة...' })
        );

        try {
          const optimizedFiles = await Promise.all(selectedFiles.map((file) => optimizeEditorImage(file)));
          const formData = new FormData();
          optimizedFiles.forEach((file) => {
            formData.append('images', file);
          });

          const response = await api.post('/products/upload-image', formData, {
            timeout: Math.max(45000, optimizedFiles.length * 30000),
            onUploadProgress: (event) => {
              const total = Number(event.total) || 0;
              const loaded = Number(event.loaded) || 0;

              if (!total) {
                return;
              }

              const progress = Math.max(1, Math.min(99, Math.round((loaded / total) * 100)));
              toast.loading(
                t('editor.uploading_image_progress', {
                  defaultValue: 'جارٍ رفع الصورة... {{progress}}%',
                  progress,
                }),
                { id: loadingToast }
              );
            },
          });

          const imageUrls = normalizeUploadedImageUrls(response?.data?.data);
          if (!imageUrls.length) {
            throw new Error('Missing uploaded image URL');
          }

          const quill = quillRef.current?.getEditor();
          if (!quill) return;

          const selection = getSafeSelection(quill);
          let insertIndex = selection.index;

          imageUrls.forEach((imageUrl) => {
            quill.insertEmbed(insertIndex, 'image', imageUrl, 'user');
            insertIndex += 1;
            quill.insertText(insertIndex, '\n', 'user');
            insertIndex += 1;
          });

          quill.setSelection(insertIndex, 0, 'silent');

          toast.success(
            t('editor.image_uploaded', { defaultValue: 'تم رفع الصورة بنجاح' }),
            { id: loadingToast }
          );
        } catch (error) {
          if (!error?.response?.data?.message) {
            error.response = {
              ...(error.response || {}),
              data: {
                ...(error.response?.data || {}),
                message: getImageUploadErrorMessage(error, t),
              },
            };
          }

          toast.error(
            error?.response?.data?.message ||
            t('editor.image_upload_failed', { defaultValue: 'فشل رفع الصورة' }),
            { id: loadingToast }
          );
        }
      };
    },
    link: () => {
      const quill = quillRef.current?.getEditor();
      if (!quill) return;

      const selection = getSafeSelection(quill);
      const currentFormats = quill.getFormat(selection);
      const currentLink = typeof currentFormats.link === 'string' ? currentFormats.link : '';
      const rawUrl = window.prompt(
        t('editor.link_prompt', { defaultValue: 'أدخل الرابط' }),
        currentLink || 'https://'
      );

      if (rawUrl === null) return;

      const normalizedUrl = normalizeExternalUrl(rawUrl);
      if (!normalizedUrl) {
        quill.format('link', false, 'user');
        return;
      }

      if (selection.length > 0) {
        quill.format('link', normalizedUrl, 'user');
        return;
      }

      const selectedText = quill.getText(selection.index, selection.length).trim();
      const linkText = selectedText || normalizedUrl;
      quill.insertText(selection.index, linkText, 'link', normalizedUrl, 'user');
      quill.setSelection(selection.index + linkText.length, 0, 'silent');
    },
    video: () => {
      const quill = quillRef.current?.getEditor();
      if (!quill) return;

      const selection = getSafeSelection(quill);
      const rawUrl = window.prompt(
        t('editor.video_prompt', { defaultValue: 'أدخل رابط الفيديو' }),
        'https://'
      );

      if (rawUrl === null) return;

      const normalizedUrl = normalizeExternalUrl(rawUrl);
      if (!normalizedUrl) return;

      quill.insertEmbed(selection.index, 'video', normalizedUrl, 'user');
      quill.setSelection(selection.index + 1, 0, 'silent');
    },
  }), [t]);

  const modules = useMemo(() => ({
    toolbar: {
      container: TOOLBAR_LAYOUT,
      handlers,
    },
    clipboard: {
      matchVisual: false,
    },
  }), [handlers]);

  useEffect(() => {
    let frameId = 0;
    let cleanup = () => { };

    const setupToolbar = () => {
      const quill = quillRef.current?.getEditor();
      const toolbar = quill?.getModule('toolbar')?.container;

      if (!quill || !toolbar) {
        frameId = window.requestAnimationFrame(setupToolbar);
        return;
      }

      quill.root.setAttribute('dir', 'rtl');
      quill.root.setAttribute('lang', i18n.language || 'ar');

      const initializePickerItems = (picker, labels) => {
        if (!picker) return;
        const pickerItems = picker.querySelectorAll('.ql-picker-item');
        pickerItems.forEach((item) => {
          const itemValue = item.getAttribute('data-value');
          const itemKey = itemValue === '' || itemValue == null ? 'false' : itemValue;
          item.setAttribute('data-label', labels[itemKey] || labels.false || '');
        });
      };

      const syncPickerLabel = (picker, labels) => {
        if (!picker) return;

        const pickerLabelElement = picker.querySelector('.ql-picker-label');
        if (!pickerLabelElement) return;

        const currentValue = pickerLabelElement.getAttribute('data-value');
        const currentKey = currentValue === '' || currentValue == null ? 'false' : currentValue;
        const currentLabel = labels[currentKey] || labels.false || '';
        const pickerPrefix = picker.classList.contains('ql-size')
          ? t('editor.size_prefix', { defaultValue: 'حجم الخط: ' })
          : picker.classList.contains('ql-header')
            ? t('editor.header_prefix', { defaultValue: 'نوع النص: ' })
            : '';

        // Only update if changed to prevent reflows
        if (pickerLabelElement.getAttribute('data-label') !== currentLabel) {
          pickerLabelElement.setAttribute('data-label', currentLabel);
        }
        if (pickerLabelElement.getAttribute('data-prefix') !== pickerPrefix) {
          pickerLabelElement.setAttribute('data-prefix', pickerPrefix);
        }
      };

      const syncToolbarLabels = () => {
        syncPickerLabel(toolbar.querySelector('.ql-picker.ql-header'), headerPickerLabels);
        syncPickerLabel(toolbar.querySelector('.ql-picker.ql-size'), sizePickerLabels);
      };

      // Initialize items once
      initializePickerItems(toolbar.querySelector('.ql-picker.ql-header'), headerPickerLabels);
      initializePickerItems(toolbar.querySelector('.ql-picker.ql-size'), sizePickerLabels);

      Object.entries(toolbarLabels).forEach(([selector, text]) => {
        toolbar.querySelectorAll(selector).forEach((element) => {
          if (element.classList.contains('ql-picker')) {
            element.removeAttribute('title');
            element.removeAttribute('aria-label');
            element.removeAttribute('data-tooltip');
            const labelEl = element.querySelector('.ql-picker-label');
            if (labelEl) {
              labelEl.setAttribute('title', text);
              labelEl.setAttribute('aria-label', text);
              labelEl.setAttribute('data-tooltip', text);
            }
          } else {
            element.setAttribute('title', text);
            element.setAttribute('aria-label', text);
            element.setAttribute('data-tooltip', text);
          }
        });
      });

      toolbar.querySelectorAll('.ql-picker').forEach((picker) => {
        picker.removeAttribute('title');
        picker.removeAttribute('aria-label');
        picker.removeAttribute('data-tooltip');

        const pickerLabelElement = picker.querySelector('.ql-picker-label');
        const label = picker.classList.contains('ql-size')
          ? t('editor.size')
          : picker.classList.contains('ql-header')
            ? t('editor.header')
            : picker.classList.contains('ql-align')
              ? t('editor.align')
              : '';

        if (label && pickerLabelElement) {
          pickerLabelElement.setAttribute('title', label);
          pickerLabelElement.setAttribute('aria-label', label);
          pickerLabelElement.setAttribute('data-tooltip', label);
        }
      });

      syncToolbarLabels();

      const handleToolbarClick = (event) => {
        const pickerLabel = event.target.closest('.ql-picker-label');
        const pickerItem = event.target.closest('.ql-picker-item');

        if (pickerLabel) {
          const picker = pickerLabel.closest('.ql-picker');
          window.requestAnimationFrame(() => {
            closeExpandedPickers(
              toolbar,
              picker?.classList.contains('ql-expanded') ? picker : null
            );
            syncToolbarLabels();
          });
          return;
        }

        if (pickerItem) {
          window.requestAnimationFrame(() => {
            closeExpandedPickers(toolbar);
            syncToolbarLabels();
          });
        }
      };

      const handleDocumentMouseDown = (event) => {
        if (!rootRef.current?.contains(event.target)) {
          closeExpandedPickers(toolbar);
        }
      };

      toolbar.addEventListener('click', handleToolbarClick);
      document.addEventListener('mousedown', handleDocumentMouseDown);
      quill.on('editor-change', syncToolbarLabels);

      cleanup = () => {
        toolbar.removeEventListener('click', handleToolbarClick);
        document.removeEventListener('mousedown', handleDocumentMouseDown);
        quill.off('editor-change', syncToolbarLabels);
      };
    };

    frameId = window.requestAnimationFrame(setupToolbar);

    return () => {
      window.cancelAnimationFrame(frameId);
      cleanup();
    };
  }, [headerPickerLabels, i18n.language, sizePickerLabels, t, toolbarLabels]);

  return (
    <div ref={rootRef} className={`rich-text-editor ${className}`}>
      {label && (
        <label className="mb-2 block text-sm font-bold text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}

      <div className="rich-text-editor__shell rounded-[26px] border border-slate-200/80 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)] transition-all duration-300 focus-within:border-primary-500/40 dark:border-slate-700/70 dark:bg-slate-900">
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={value}
          onChange={onChange}
          modules={modules}
          formats={SUPPORTED_FORMATS}
          className="text-gray-900 dark:text-gray-100"
        />
      </div>

      <style>{`
        .rich-text-editor {
          width: 100%;
          min-width: 0;
        }

        .rich-text-editor .rich-text-editor__shell {
          position: relative;
          overflow: visible;
          backdrop-filter: blur(12px);
        }

        .rich-text-editor .ql-toolbar.ql-snow {
          position: relative;
          z-index: 5;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: flex-start;
          row-gap: 10px;
          column-gap: 8px;
          overflow: visible;
          direction: rtl;
          border: none !important;
          border-bottom: 1px solid #e2e8f0 !important;
          border-radius: 26px 26px 0 0;
          background: linear-gradient(180deg, rgba(248, 250, 252, 0.98) 0%, rgba(241, 245, 249, 0.94) 100%) !important;
          backdrop-filter: blur(10px);
          padding: 14px 16px !important;
          white-space: normal;
        }

        .dark .rich-text-editor .ql-toolbar.ql-snow {
          border-color: #1e293b !important;
          background: linear-gradient(180deg, rgba(15, 23, 42, 0.98) 0%, rgba(15, 23, 42, 0.92) 100%) !important;
        }

        .rich-text-editor .ql-formats {
          margin-right: 0 !important;
          margin-left: 0 !important;
          display: inline-flex;
          flex-wrap: nowrap;
          align-items: center;
          gap: 4px;
          direction: ltr;
          padding: 4px 8px;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.72);
          flex-shrink: 0;
        }

        .dark .rich-text-editor .ql-formats {
          border-color: #334155;
          background: rgba(15, 23, 42, 0.72);
        }

        .rich-text-editor .ql-snow.ql-toolbar button,
        .rich-text-editor .ql-snow .ql-toolbar button {
          width: 30px;
          height: 30px;
          padding: 5px !important;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .rich-text-editor .ql-snow.ql-toolbar button:hover,
        .rich-text-editor .ql-snow .ql-toolbar button:hover {
          background-color: #ffffff;
          color: #6366f1 !important;
          box-shadow: 0 8px 18px -12px rgb(15 23 42 / 0.35);
        }

        .dark .rich-text-editor .ql-snow.ql-toolbar button:hover {
          background-color: #1e293b;
        }

        .rich-text-editor .ql-snow.ql-toolbar button.ql-active {
          background: #eef2ff !important;
          color: #6366f1 !important;
        }

        .dark .rich-text-editor .ql-snow.ql-toolbar button.ql-active {
          background: #312e81 !important;
        }

        .rich-text-editor .ql-snow .ql-stroke {
          stroke: #64748b !important;
          stroke-width: 2;
          transition: stroke 0.2s;
        }

        .dark .rich-text-editor .ql-snow .ql-stroke {
          stroke: #94a3b8 !important;
        }

        .rich-text-editor .ql-snow button:hover .ql-stroke,
        .rich-text-editor .ql-snow button.ql-active .ql-stroke {
          stroke: #6366f1 !important;
        }

        .rich-text-editor .ql-snow .ql-fill {
          fill: #64748b !important;
          transition: fill 0.2s;
        }

        .dark .rich-text-editor .ql-snow .ql-fill {
          fill: #94a3b8 !important;
        }

        .rich-text-editor .ql-snow button:hover .ql-fill,
        .rich-text-editor .ql-snow button.ql-active .ql-fill {
          fill: #6366f1 !important;
        }

        .rich-text-editor .ql-snow .ql-picker {
          position: relative;
          height: 30px;
          font-family: 'Cairo', sans-serif !important;
          font-weight: 600;
          flex-shrink: 0;
        }

        .rich-text-editor .ql-snow .ql-picker.ql-header,
        .rich-text-editor .ql-snow .ql-picker.ql-size {
          min-width: 128px;
        }

        .rich-text-editor .ql-snow .ql-picker.ql-align {
          min-width: 44px;
        }

        .rich-text-editor .ql-snow .ql-picker.ql-color,
        .rich-text-editor .ql-snow .ql-picker.ql-background {
          min-width: 30px;
          width: 30px;
        }

        .rich-text-editor .ql-snow .ql-picker-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          height: 30px;
          padding: 0 8px !important;
          border: 1px solid transparent !important;
          border-radius: 8px;
          color: #475569 !important;
          background: transparent;
        }

        .rich-text-editor .ql-snow .ql-picker.ql-color .ql-picker-label,
        .rich-text-editor .ql-snow .ql-picker.ql-background .ql-picker-label {
          width: 30px;
          min-width: 30px;
          padding: 0 !important;
          justify-content: center;
          gap: 0;
        }

        .dark .rich-text-editor .ql-snow .ql-picker-label {
          color: #cbd5e1 !important;
        }

        .rich-text-editor .ql-snow .ql-picker.ql-header .ql-picker-label,
        .rich-text-editor .ql-snow .ql-picker.ql-size .ql-picker-label {
          height: 30px;
          align-items: center;
          justify-content: flex-start;
          padding: 0 24px 0 10px !important;
        }

        .rich-text-editor .ql-snow .ql-picker.ql-header .ql-picker-label::before,
        .rich-text-editor .ql-snow .ql-picker.ql-size .ql-picker-label::before {
          content: attr(data-prefix) ": " attr(data-label) !important;
          font-family: 'Cairo', sans-serif !important;
          font-size: 12px;
          font-weight: 700;
          color: #334155;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 120px;
        }

        .dark .rich-text-editor .ql-snow .ql-picker.ql-header .ql-picker-label::before,
        .dark .rich-text-editor .ql-snow .ql-picker.ql-size .ql-picker-label::before {
          color: #e2e8f0;
        }

        .rich-text-editor .ql-snow .ql-picker.ql-header .ql-picker-item::before,
        .rich-text-editor .ql-snow .ql-picker.ql-size .ql-picker-item::before {
          content: attr(data-label) !important;
          font-family: 'Cairo', sans-serif !important;
          font-size: 13px;
          font-weight: 700;
          white-space: nowrap;
        }

        .rich-text-editor .ql-snow .ql-picker.ql-header .ql-picker-item,
        .rich-text-editor .ql-snow .ql-picker.ql-size .ql-picker-item {
          display: flex;
          align-items: center;
        }

        .rich-text-editor .ql-snow .ql-picker.ql-expanded .ql-picker-label,
        .rich-text-editor .ql-snow .ql-picker-label:hover {
          border-color: #c7d2fe !important;
          background: #ffffff !important;
          color: #4f46e5 !important;
        }

        .dark .rich-text-editor .ql-snow .ql-picker.ql-expanded .ql-picker-label,
        .dark .rich-text-editor .ql-snow .ql-picker-label:hover {
          background: #1e293b !important;
          border-color: #4338ca !important;
          color: #c7d2fe !important;
        }

        .rich-text-editor .ql-snow .ql-picker-options {
          left: auto !important;
          right: 0 !important;
          z-index: 30 !important;
          max-height: 240px;
          overflow-y: auto;
          margin-top: 8px;
          padding: 6px;
          border-radius: 12px;
          border: 1px solid #dbeafe !important;
          box-shadow: 0 14px 32px rgba(15, 23, 42, 0.18);
        }

        .rich-text-editor .ql-snow .ql-picker.ql-color .ql-picker-options,
        .rich-text-editor .ql-snow .ql-picker.ql-background .ql-picker-options {
          width: 214px;
        }

        .dark .rich-text-editor .ql-snow .ql-picker-options {
          border-color: #334155 !important;
          background: #0f172a;
          box-shadow: 0 14px 32px rgba(2, 6, 23, 0.45);
        }

        .rich-text-editor .ql-snow .ql-picker-item {
          border-radius: 8px;
          padding: 6px 10px;
        }

        .rich-text-editor .ql-snow .ql-picker-item:hover,
        .rich-text-editor .ql-snow .ql-picker-item.ql-selected {
          background: #eef2ff;
          color: #4f46e5;
        }

        .dark .rich-text-editor .ql-snow .ql-picker-item:hover,
        .dark .rich-text-editor .ql-snow .ql-picker-item.ql-selected {
          background: #312e81;
          color: #e0e7ff;
        }

        .rich-text-editor .ql-toolbar [data-tooltip] {
          position: relative;
        }

        .rich-text-editor .ql-toolbar [data-tooltip]::after {
          content: attr(data-tooltip);
          position: absolute;
          top: calc(100% + 8px);
          left: 50%;
          transform: translateX(-50%);
          padding: 6px 10px;
          border-radius: 8px;
          background: rgba(15, 23, 42, 0.96);
          color: #f8fafc;
          font-size: 11px;
          font-weight: 700;
          line-height: 1.2;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.16s ease, transform 0.16s ease;
          z-index: 60;
          box-shadow: 0 10px 24px rgba(15, 23, 42, 0.22);
        }

        .rich-text-editor .ql-toolbar [data-tooltip]::before {
          content: '';
          position: absolute;
          top: calc(100% + 2px);
          left: 50%;
          transform: translateX(-50%);
          border: 6px solid transparent;
          border-bottom-color: rgba(15, 23, 42, 0.96);
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.16s ease, transform 0.16s ease;
          z-index: 60;
        }

        .rich-text-editor .ql-toolbar [data-tooltip]:hover::after,
        .rich-text-editor .ql-toolbar [data-tooltip]:hover::before {
          opacity: 1;
        }

        .dark .rich-text-editor .ql-toolbar [data-tooltip]::after {
          background: rgba(30, 41, 59, 0.98);
        }

        .dark .rich-text-editor .ql-toolbar [data-tooltip]::before {
          border-bottom-color: rgba(30, 41, 59, 0.98);
        }

        .rich-text-editor .ql-container {
          border: none !important;
          border-radius: 0 0 26px 26px;
          min-height: ${minHeight}px;
          font-family: 'Cairo', sans-serif !important;
          background: transparent !important;
        }

        .rich-text-editor .ql-editor {
          min-height: ${minHeight}px;
          padding: 1.35rem 1.5rem !important;
          direction: rtl;
          text-align: right;
          unicode-bidi: isolate;
          line-height: 1.95;
          color: #1e293b;
        }

        .dark .rich-text-editor .ql-editor {
          color: #f1f5f9;
        }

        .rich-text-editor .ql-editor p {
          margin-bottom: 1em;
        }

        .rich-text-editor .ql-editor ol,
        .rich-text-editor .ql-editor ul {
          margin: 0 0 1em;
          padding-right: 1.75em;
          padding-left: 0;
        }

        .rich-text-editor .ql-editor li {
          direction: rtl;
          text-align: right;
          padding-right: 0.35em;
          padding-left: 0;
        }

        .rich-text-editor .ql-editor li::before {
          margin-right: -1.6em;
          margin-left: 0.45em;
          text-align: left;
        }

        .rich-text-editor .ql-editor li.ql-direction-rtl::before {
          margin-right: -1.6em;
          margin-left: 0.45em;
        }

        .rich-text-editor .ql-editor li > .ql-ui {
          right: -1.6em;
          left: auto;
        }

        .rich-text-editor .ql-editor h1,
        .rich-text-editor .ql-editor h2,
        .rich-text-editor .ql-editor h3 {
          margin-top: 1.25em;
          font-weight: 800;
          color: #0f172a;
        }

        .dark .rich-text-editor .ql-editor h1,
        .dark .rich-text-editor .ql-editor h2,
        .dark .rich-text-editor .ql-editor h3 {
          color: #f8fafc;
        }

        .rich-text-editor .ql-editor blockquote {
          border-right: 4px solid #6366f1;
          border-left: none;
          border-radius: 0 10px 10px 0;
          background: #f8fafc;
          padding: 1rem 1.25rem;
          color: #475569;
          font-style: italic;
        }

        .dark .rich-text-editor .ql-editor blockquote {
          background: #1e293b;
          color: #94a3b8;
        }

        .rich-text-editor .ql-editor .ql-size-small {
          font-size: 0.875rem;
        }

        .rich-text-editor .ql-editor .ql-size-large {
          font-size: 1.375rem;
        }

        .rich-text-editor .ql-editor .ql-size-huge {
          font-size: 1.875rem;
        }

        .rich-text-editor .ql-editor.ql-blank::before {
          right: 1.5rem !important;
          left: auto !important;
          font-style: normal;
          color: #94a3b8;
          opacity: 0.7;
        }

        @media (max-width: 640px) {
          .rich-text-editor .ql-toolbar.ql-snow {
            row-gap: 8px;
            column-gap: 6px;
            padding: 10px !important;
          }

          .rich-text-editor .ql-formats {
            gap: 2px;
            padding: 3px 6px;
          }

          .rich-text-editor .ql-snow .ql-picker.ql-header,
          .rich-text-editor .ql-snow .ql-picker.ql-size {
            min-width: 74px;
          }

          .rich-text-editor .ql-editor {
            padding: 1rem 1.25rem !important;
          }
        }
      `}</style>
    </div>
  );
}
