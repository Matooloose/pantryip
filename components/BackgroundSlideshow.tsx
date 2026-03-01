'use client';

import { useEffect, useState } from 'react';

export default function BackgroundSlideshow() {
    const [images, setImages] = useState<string[]>([]);
    const [current, setCurrent] = useState(0);

    // Fetch image list from the API
    useEffect(() => {
        fetch('/api/backgrounds')
            .then((r) => r.json())
            .then((data) => {
                if (data.images?.length) setImages(data.images);
            })
            .catch(() => { });
    }, []);

    // Cycle every 8 seconds
    useEffect(() => {
        if (images.length <= 1) return;
        const timer = setInterval(() => {
            setCurrent((prev) => (prev + 1) % images.length);
        }, 8000);
        return () => clearInterval(timer);
    }, [images]);

    if (!images.length) return null;

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 0,
                overflow: 'hidden',
                pointerEvents: 'none',
            }}
            aria-hidden="true"
        >
            {images.map((src, i) => (
                <div
                    key={src}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: `url(${src})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        opacity: i === current ? 1 : 0,
                        transition: 'opacity 1.5s ease-in-out',
                    }}
                />
            ))}
        </div>
    );
}
