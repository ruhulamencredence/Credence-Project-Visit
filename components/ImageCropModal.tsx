import React, { useEffect, useRef } from 'react';

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (image: string) => void;
  imageSrc: string | null;
}

const ImageCropModal: React.FC<ImageCropModalProps> = ({ isOpen, onClose, onSave, imageSrc }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Accessibility: Close on escape key & Focus Trap
  useEffect(() => {
    if (!isOpen) return;
    const modalElement = modalRef.current;
    if (!modalElement) return;

    const focusableElements = modalElement.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    firstElement.focus();
    
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
        if (e.key !== 'Tab') return;

        if (e.shiftKey) { // Shift + Tab
            if (document.activeElement === firstElement) {
                lastElement.focus();
                e.preventDefault();
            }
        } else { // Tab
            if (document.activeElement === lastElement) {
                firstElement.focus();
                e.preventDefault();
            }
        }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !imageSrc) {
    return null;
  }

  const handleSave = () => {
    if (imageSrc) {
      onSave(imageSrc); // Save the original image, as cropping is removed.
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 fade-in backdrop-blur-sm" 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="preview-image-title" 
      onClick={onClose}
    >
      <div ref={modalRef} className="bg-white rounded-xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex justify-between items-center">
            <h2 id="preview-image-title" className="text-xl font-bold text-slate-800">Image Preview</h2>
             <button type="button" onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-100" aria-label="Close modal">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
        <div className="p-6 bg-slate-100 flex justify-center items-center">
          <img src={imageSrc} alt="Preview" className="max-w-full max-h-[60vh] rounded-md shadow-md" />
        </div>
        <div className="bg-slate-50 px-6 py-4 rounded-b-xl flex justify-end items-center gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={handleSave} className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500">
            Save Image
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropModal;
