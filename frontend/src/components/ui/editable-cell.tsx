'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

interface EditableCellProps {
  value: string | number;
  onChange: (value: string | number) => void;
  type?: 'text' | 'number';
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  suggestions?: string[];  // For expense description autocomplete
  onTab?: (direction: 'next' | 'prev') => void;
  format?: 'currency' | 'none';
}

export function EditableCell({
  value,
  onChange,
  type = 'text',
  placeholder = '',
  className,
  disabled = false,
  autoFocus = false,
  suggestions = [],
  onTab,
  format = 'none',
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(String(value));
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalValue(String(value === 0 && type === 'number' ? '' : value));
  }, [value, type]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    if (suggestions.length > 0 && localValue) {
      const filtered = suggestions.filter(s => 
        s.toLowerCase().includes(localValue.toLowerCase())
      ).slice(0, 5);
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0 && isEditing);
    } else {
      setShowSuggestions(false);
    }
  }, [localValue, suggestions, isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    setShowSuggestions(false);
    
    if (type === 'number') {
      const numValue = parseFloat(localValue) || 0;
      onChange(numValue);
    } else {
      onChange(localValue);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Tab') {
      handleBlur();
      if (onTab) {
        e.preventDefault();
        onTab(e.shiftKey ? 'prev' : 'next');
      }
    } else if (e.key === 'Escape') {
      setLocalValue(String(value));
      setIsEditing(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setLocalValue(suggestion);
    onChange(suggestion);
    setIsEditing(false);
    setShowSuggestions(false);
  };

  const displayValue = () => {
    if (type === 'number' && format === 'currency') {
      const numVal = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
      return numVal === 0 ? '-' : `₹${numVal.toLocaleString('en-IN')}`;
    }
    return value === 0 ? '-' : String(value);
  };

  if (disabled) {
    return (
      <div className={cn(
        "px-2 py-1.5 text-right font-medium bg-muted/50 text-muted-foreground",
        className
      )}>
        {displayValue()}
      </div>
    );
  }

  if (!isEditing) {
    return (
      <div
        onClick={() => setIsEditing(true)}
        className={cn(
          "px-2 py-1.5 cursor-text hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors",
          type === 'number' ? "text-right" : "text-left",
          value === 0 || value === '' ? "text-muted-foreground" : "",
          className
        )}
      >
        {displayValue() || <span className="text-muted-foreground/50">{placeholder}</span>}
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type={type}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          "w-full px-2 py-1 border-2 border-blue-500 outline-none bg-white dark:bg-gray-900",
          type === 'number' ? "text-right" : "text-left",
          className
        )}
        step={type === 'number' ? '0.01' : undefined}
        min={type === 'number' ? '0' : undefined}
      />
      
      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-900 border rounded-md shadow-lg max-h-40 overflow-auto">
          {filteredSuggestions.map((suggestion, idx) => (
            <div
              key={idx}
              className="px-3 py-2 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950"
              onMouseDown={() => handleSuggestionClick(suggestion)}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}