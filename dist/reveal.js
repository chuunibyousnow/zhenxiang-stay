(() => {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (motion.matches || !('IntersectionObserver' in window)) return;
  const selector = 'main section:not(.hero) h2, main section:not(.hero) h3, main section:not(.hero) p, .card-title, .values article, .partner-details li';
  const candidates = Array.from(document.querySelectorAll(selector));
  // Animate each text group once; nested text inherits its parent's reveal.
  const elements = candidates.filter(el => !candidates.some(parent => parent !== el && parent.contains(el)));
  let observer;
  const showAll = () => {
    observer?.disconnect();
    elements.forEach(el => el.classList.remove('reveal-pending'));
  };
  try {
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.remove('reveal-pending');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0, rootMargin: '0px 0px -35px 0px' });
    elements.forEach(el => {
      // Preserve immediate readability of the first viewport and anchor destinations.
      if (el.getBoundingClientRect().top < window.innerHeight) return;
      el.classList.add('scroll-reveal', 'reveal-pending');
      observer.observe(el);
    });
    motion.addEventListener('change', event => { if (event.matches) showAll(); });
    window.addEventListener('beforeprint', showAll);
    document.addEventListener('focusin', event => {
      event.target.closest('.reveal-pending')?.classList.remove('reveal-pending');
    });
  } catch { showAll(); }
})();
