// src/components/modals/ImageModal.jsx
// Збільшене фото матеріалу — той самий div лишається в DOM завжди
// (клас .open перемикає видимість), щоб фокус-пастка й перехід мали з чим
// працювати.
export default function ImageModal({ img, trapRef, onClose }) {
    return (
        <div ref={trapRef} className={`image-modal ${img ? 'open' : ''}`} role="dialog" aria-modal={!!img} aria-label="Збільшене фото">
            {img && <img src={img} alt="Збільшене фото" />}
            <button type="button" className="cart-close-btn" onClick={onClose} style={{ marginTop: '15px' }}>Закрити</button>
        </div>
    );
}
