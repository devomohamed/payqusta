import { useEffect, useRef } from 'react';

export const useScrollReveal = (options = { threshold: 0.08 }) => {
  const elementsRef = useRef([]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-visible');
          // If it's a grid, we might want to stagger children
          const staggerChildren = entry.target.querySelectorAll('.stagger-child');
          staggerChildren.forEach((child, index) => {
            child.style.transitionDelay = `${index * 0.07}s`;
            child.style.opacity = '1';
            child.style.transform = 'translateY(0)';
          });
        }
      });
    }, options);

    const currentElements = elementsRef.current;
    currentElements.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => {
      currentElements.forEach((el) => {
        if (el) observer.unobserve(el);
      });
    };
  }, [options]);

  const addToRefs = (el) => {
    if (el && !elementsRef.current.includes(el)) {
      elementsRef.current.push(el);
    }
  };

  return addToRefs;
};
