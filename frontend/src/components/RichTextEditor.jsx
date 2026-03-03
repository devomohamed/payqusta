import React, { useRef, useMemo } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { api } from '../store';
import toast from 'react-hot-toast';

export default function RichTextEditor({ value, onChange, label, className = '' }) {
  const quillRef = useRef(null);

  const imageHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('image', file);

      const loadToast = toast.loading('جاري رفع الصورة...');
      try {
        const res = await api.post('/products/upload-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        // Ensure the URL is correctly resolved from the backend path
        const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
        const baseUrl = backendUrl.replace('/api/v1', '');
        const url = `${baseUrl}${res.data.data.url}`;

        const quill = quillRef.current.getEditor();
        const range = quill.getSelection(true);
        quill.insertEmbed(range.index, 'image', url);
        quill.setSelection(range.index + 1);

        toast.success('تم رفع الصورة', { id: loadToast });
      } catch (error) {
        toast.error('فشل رفع الصورة', { id: loadToast });
      }
    };
  };

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'font': [] }, { 'size': ['small', false, 'large', 'huge'] }],
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'script': 'sub' }, { 'script': 'super' }],
        [{ 'header': 1 }, { 'header': 2 }, 'blockquote', 'code-block'],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'indent': '-1' }, { 'indent': '+1' }],
        [{ 'direction': 'rtl' }, { 'align': [] }],
        ['link', 'image', 'video'],
        ['clean']
      ],
      handlers: {
        image: imageHandler
      }
    }
  }), []);

  const formats = [
    'font', 'size',
    'header',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'script', 'blockquote', 'code-block',
    'list', 'bullet', 'indent',
    'direction', 'align',
    'link', 'image', 'video'
  ];

  return (
    <div className={`rich-text-editor ${className}`}>
      {label && <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{label}</label>}
      <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700 focus-within:border-primary-500 transition-colors">
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={value}
          onChange={onChange}
          modules={modules}
          formats={formats}
          className="text-gray-900 dark:text-gray-100"
        />
      </div>
      <style>{`
        .ql-toolbar {
          border: none !important;
          border-bottom: 2px solid #e5e7eb !important;
          background: #f8fafc;
          border-top-left-radius: 0.75rem;
          border-top-right-radius: 0.75rem;
          padding: 12px 8px !important;
        }
        .dark .ql-toolbar {
          border-color: #374151 !important;
          background: #1e293b;
        }
        .ql-toolbar .ql-picker {
          color: #475569;
        }
        .dark .ql-toolbar .ql-picker {
          color: #cbd5e1;
        }
        .ql-toolbar .ql-stroke {
          stroke: #475569;
        }
        .dark .ql-toolbar .ql-stroke {
          stroke: #cbd5e1 !important;
        }
        .ql-toolbar .ql-fill {
          fill: #475569;
        }
        .dark .ql-toolbar .ql-fill {
          fill: #cbd5e1 !important;
        }
        .dark .ql-picker {
          color: #cbd5e1 !important;
        }
        .ql-container {
          border: none !important;
          min-height: 250px;
          font-family: 'Cairo', 'Tajawal', system-ui, -apple-system, sans-serif !important;
          font-size: 1.05rem !important;
          border-bottom-left-radius: 0.75rem;
          border-bottom-right-radius: 0.75rem;
        }
        .ql-editor {
          min-height: 250px;
          line-height: 1.8;
          padding: 1rem 1.5rem !important;
        }
        .ql-editor p {
          margin-bottom: 0.75em;
        }
        .ql-editor.ql-blank::before {
          color: #94a3b8;
          font-style: normal;
          opacity: 0.7;
        }
        .dark .ql-editor.ql-blank::before {
          color: #64748b;
        }
      `}</style>
    </div>
  );
}
