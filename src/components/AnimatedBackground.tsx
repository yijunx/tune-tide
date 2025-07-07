"use client";

import { useEffect, useState } from 'react';

interface FloatingElement {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  type: 'note' | 'wave';
}

export default function AnimatedBackground() {
  const [elements, setElements] = useState<FloatingElement[]>([]);

  useEffect(() => {
    // Create initial floating elements
    const initialElements: FloatingElement[] = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 20 + 10,
      speed: Math.random() * 0.5 + 0.1,
      opacity: Math.random() * 0.3 + 0.1,
      type: Math.random() > 0.5 ? 'note' : 'wave'
    }));
    setElements(initialElements);

    // Animation loop
    const animate = () => {
      setElements(prev => prev.map(el => ({
        ...el,
        y: el.y - el.speed,
        x: el.x + Math.sin(el.y * 0.01) * 0.5,
        opacity: Math.sin(el.y * 0.02) * 0.2 + 0.1
      })));
    };

    const interval = setInterval(animate, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {elements.map((el) => (
        <div
          key={el.id}
          className="absolute text-blue-200 dark:text-blue-800/30"
          style={{
            left: `${el.x}%`,
            top: `${el.y}%`,
            fontSize: `${el.size}px`,
            opacity: el.opacity,
            transform: `rotate(${el.x * 2}deg)`,
          }}
        >
          {el.type === 'note' ? (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          )}
        </div>
      ))}
    </div>
  );
} 