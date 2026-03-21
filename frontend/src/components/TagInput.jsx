import React, { useState, useRef, useEffect } from 'react';
import { X, Tag } from 'lucide-react';

export default function TagInput({ 
  value = '', 
  onChange, 
  placeholder = 'أدخل الكلمة ثم اضغط Enter...', 
  maxTags = 10,
  className = '' 
}) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef(null);

  // Convert comma-separated string to array
  const tags = value 
    ? value.split(',').map(tag => tag.trim()).filter(tag => tag !== '')
    : [];

  const addTag = (tag) => {
    const trimmedTag = tag.trim().replace(/,/g, '');
    if (!trimmedTag) return;
    
    if (tags.length >= maxTags) return;
    if (tags.includes(trimmedTag)) {
      setInputValue('');
      return;
    }

    const newTags = [...tags, trimmedTag];
    onChange(newTags.join(', '));
    setInputValue('');
  };

  const removeTag = (indexToRemove) => {
    const newTags = tags.filter((_, index) => index !== indexToRemove);
    onChange(newTags.join(', '));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const handleBlur = () => {
    if (inputValue) {
      addTag(inputValue);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div 
        className="app-surface flex min-h-[50px] flex-wrap gap-2 rounded-xl border-2 border-transparent p-2 transition-all duration-200 focus-within:border-primary-500/30 focus-within:ring-2 focus-within:ring-primary-500/20"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag, index) => (
          <span 
            key={index}
            className="app-surface inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-gray-100/80 dark:border-white/10 text-sm font-medium text-gray-800 dark:text-gray-200 animate-in fade-in zoom-in duration-200"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(index);
              }}
              className="p-0.5 rounded-full hover:bg-red-50 dark:hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        ))}
        
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 dark:text-gray-100 min-w-[120px] py-1"
          dir="rtl"
        />
      </div>
      
      <div className="flex justify-between text-[11px] text-gray-400 font-medium px-1">
        <span>افصل بين الكلمات بفاصلة (,) أو اضغط Enter</span>
        <span>{tags.length}/{maxTags} كلمات</span>
      </div>
    </div>
  );
}
