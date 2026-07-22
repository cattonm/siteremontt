// src/components/Portfolio.jsx
// Галерея «Наші роботи» (патч 10.2) — статика, без бекенду: дані з
// public/portfolio.json. Поки власник не додав реальні фото завершених
// об'єктів, файл — порожній масив, і екран чесно показує заглушку
// «скоро тут з'являться наші роботи», а не вигадані проєкти.
//
// Формат запису в portfolio.json (масив таких об'єктів):
//   {
//     "id": "zk-lipky-2024",              // унікальний рядок
//     "name": "ЖК Липки, 2-кімнатна",       // назва ЖК + короткий опис
//     "area": 62,                          // площа, м²
//     "tier": "Комфорт",                   // "Стандарт" | "Комфорт" | "Преміум"
//     "photos": ["/portfolio/lipky-1.webp", "/portfolio/lipky-2.webp"],
//     "description": "1-2 речення про об'єкт."
//   }
// Фото — 1080px, ≤150 КБ, у public/portfolio/.
import { useEffect, useState } from 'react';
import { ArrowLeft, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';

const TIER_COLOR = { Стандарт: 'var(--hint-color)', Комфорт: 'var(--accent)', Преміум: 'var(--money)' };

function ProjectDetail({ project, onBack, onStartSurvey }) {
    const [photoIdx, setPhotoIdx] = useState(0);
    const photos = project.photos?.length ? project.photos : [];
    const total = photos.length;

    return (
        <div className="animated-step">
            <button type="button" className="btn-reset" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--hint-color)', fontSize: '14px', marginBottom: '14px' }} onClick={onBack}>
                <ArrowLeft size={16} aria-hidden="true" /> Усі роботи
            </button>

            {total > 0 && (
                <div style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden', marginBottom: '14px', background: 'var(--secondary-bg)' }}>
                    <img src={photos[photoIdx]} alt={`${project.name} — фото ${photoIdx + 1} з ${total}`} style={{ width: '100%', display: 'block', aspectRatio: '4 / 3', objectFit: 'cover' }} loading="lazy" decoding="async" />
                    {total > 1 && (
                        <>
                            <button
                                type="button" aria-label="Попереднє фото"
                                onClick={() => setPhotoIdx((i) => (i - 1 + total) % total)}
                                style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.45)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                            ><ChevronLeft size={18} aria-hidden="true" /></button>
                            <button
                                type="button" aria-label="Наступне фото"
                                onClick={() => setPhotoIdx((i) => (i + 1) % total)}
                                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', width: '32px', height: '32px', borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.45)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                            ><ChevronRight size={18} aria-hidden="true" /></button>
                            <div style={{ position: 'absolute', bottom: '8px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '5px' }}>
                                {photos.map((_, i) => (
                                    <span key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: i === photoIdx ? '#fff' : 'rgba(255,255,255,0.5)' }} />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

            <h3 style={{ margin: '0 0 4px' }}>{project.name}</h3>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px', fontSize: '13px', color: 'var(--hint-color)' }}>
                <span>{project.area} м²</span>
                <span style={{ fontWeight: 700, color: TIER_COLOR[project.tier] || 'var(--text-color)' }}>{project.tier}</span>
            </div>
            {project.description && (
                <p style={{ color: 'var(--text-color)', fontSize: '14.5px', lineHeight: 1.5 }}>{project.description}</p>
            )}

            <button
                type="button" className="btn-next" style={{ width: '100%', marginTop: '18px' }}
                onClick={() => onStartSurvey(project.tier)}
            >
                Хочу так само
            </button>
        </div>
    );
}

export default function Portfolio({ onBack, onStartSurvey }) {
    const [projects, setProjects] = useState(null); // null = ще вантажиться
    const [activeId, setActiveId] = useState(null);

    useEffect(() => {
        let alive = true;
        fetch('/portfolio.json')
            .then((r) => (r.ok ? r.json() : []))
            .then((d) => { if (alive) setProjects(Array.isArray(d) ? d : []); })
            .catch(() => { if (alive) setProjects([]); });
        return () => { alive = false; };
    }, []);

    const active = projects?.find((p) => p.id === activeId) || null;

    if (active) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--bg-color)', color: 'var(--text-color)', padding: '20px' }}>
                <ProjectDetail project={active} onBack={() => setActiveId(null)} onStartSurvey={onStartSurvey} />
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-color)', color: 'var(--text-color)', padding: '20px' }}>
            <button type="button" className="btn-reset" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--hint-color)', fontSize: '14px', marginBottom: '14px' }} onClick={onBack}>
                <ArrowLeft size={16} aria-hidden="true" /> До калькулятора
            </button>
            <h2 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 800 }}>Наші роботи</h2>
            <p style={{ color: 'var(--hint-color)', fontSize: '14px', marginTop: 0, marginBottom: '18px' }}>
                Завершені об'єкти — метраж, рівень матеріалів і реальні фото.
            </p>

            {projects === null && (
                <div style={{ textAlign: 'center', color: 'var(--hint-color)', padding: '40px 0' }}>Завантаження…</div>
            )}

            {projects?.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--hint-color)', padding: '50px 20px' }}>
                    <ImageIcon size={36} style={{ opacity: 0.5, marginBottom: '10px' }} aria-hidden="true" />
                    <div style={{ fontWeight: 700, color: 'var(--text-color)', marginBottom: '6px' }}>Скоро тут з'являться наші роботи</div>
                    <div style={{ fontSize: '13.5px', lineHeight: 1.45 }}>Ми готуємо фото завершених об'єктів — заглядайте пізніше.</div>
                </div>
            )}

            {projects && projects.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }} className="portfolio-grid">
                    {projects.map((p) => (
                        <button
                            key={p.id} type="button" className="btn-reset"
                            style={{ textAlign: 'left', borderRadius: '14px', overflow: 'hidden', background: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
                            onClick={() => setActiveId(p.id)}
                        >
                            <div style={{ aspectRatio: '4 / 3', background: 'var(--secondary-bg)' }}>
                                {p.photos?.[0] && (
                                    <img src={p.photos[0]} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="lazy" decoding="async" />
                                )}
                            </div>
                            <div style={{ padding: '9px 10px' }}>
                                <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '3px' }}>{p.name}</div>
                                <div style={{ display: 'flex', gap: '8px', fontSize: '11.5px', color: 'var(--hint-color)' }}>
                                    <span>{p.area} м²</span>
                                    <span style={{ fontWeight: 700, color: TIER_COLOR[p.tier] || 'var(--hint-color)' }}>{p.tier}</span>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
