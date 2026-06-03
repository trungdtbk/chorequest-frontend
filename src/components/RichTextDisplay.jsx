// src/components/RichTextDisplay.jsx
import { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';

export default function RichTextDisplay({ content, className = '' }) {
  const contentRef = useRef(null);
  const [selectedImage, setSelectedImage] = useState(null);

  if (!content) return null;

  const isHtml = /<[^>]+>/.test(content);

  if (!isHtml) {
    return <p className={`text-sm text-muted ${className}`}>{content}</p>;
  }

  useEffect(() => {
    if (!contentRef.current) return;
    const images = contentRef.current.querySelectorAll('img');
    const handleImageClick = (e) => {
      setSelectedImage(e.target.src);
    };
    images.forEach((img) => {
      img.style.cursor = 'pointer';
      img.addEventListener('click', handleImageClick);
    });
    return () => {
      images.forEach((img) => {
        img.removeEventListener('click', handleImageClick);
      });
    };
  }, [content]);

  return (
    <>
      <div
        ref={contentRef}
        className={`
          text-sm text-muted leading-relaxed
          [&_strong]:font-bold [&_strong]:text-cream
          [&_em]:italic
          [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1
          [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1
          [&_li]:my-0.5
          [&_a]:text-accent [&_a]:underline [&_a]:hover:opacity-80
          [&_p]:my-0.5
          [&_img]:w-[200px] [&_img]:rounded-md [&_img]:border [&_img]:border-border [&_img]:my-2 [&_img]:object-cover
          ${className}
        `}
        dangerouslySetInnerHTML={{ __html: content }}
      />

      {/* Image Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="relative max-w-2xl max-h-[80vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImage}
              alt="Enlarged"
              className="max-w-full max-h-full rounded-lg"
            />
            <button
              className="absolute top-2 right-2 p-2 bg-surface-raised hover:bg-surface rounded-lg transition-colors"
              onClick={() => setSelectedImage(null)}
              title="Close"
            >
              <X size={20} className="text-cream" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}