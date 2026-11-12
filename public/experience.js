/* EzerMate visitor meter, direct contact form and visible motion effects. */
'use strict';
(() => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const visitorNumber = document.getElementById('visitor-count');

  function animateCount(end) {
    if (!visitorNumber) return;
    if (prefersReducedMotion.matches || end === 0) {
      visitorNumber.textContent = end.toLocaleString('en-PH');
      return;
    }
    const start = performance.now();
    const duration = 1100;
    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      visitorNumber.textContent = Math.floor(end * eased).toLocaleString('en-PH');
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  if (visitorNumber) {
    fetch('/api/visitors', { cache: 'no-store', credentials: 'same-origin' })
      .then(response => {
        if (!response.ok) throw new Error('Visitor counter unavailable');
        return response.json();
      })
      .then(data => {
        if (Number.isSafeInteger(data.visitors) && data.visitors >= 0) {
          animateCount(data.visitors);
        }
      })
      .catch(() => {
        visitorNumber.textContent = '—';
        visitorNumber.closest('.visitor-meter')?.setAttribute('title', 'Visitor count is temporarily unavailable');
      });
  }

  const form = document.getElementById('inquiry-form');
  const formStatus = document.getElementById('form-status');
  if (form && formStatus) {
    const submitButton = form.querySelector('[type="submit"]');
    const buttonText = submitButton.querySelector('.button-label');
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (submitButton.disabled || !form.reportValidity()) return;
      const fields = new FormData(form);
      const payload = Object.fromEntries(fields.entries());
      submitButton.disabled = true;
      buttonText.textContent = 'Sending your inquiry…';
      formStatus.hidden = true;
      formStatus.removeAttribute('data-state');
      try {
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.message || 'Unable to send the inquiry right now.');
        formStatus.dataset.state = 'success';
        formStatus.textContent = 'Thank you! Your inquiry was submitted successfully. We will get back to you soon.';
        form.reset();
      } catch (error) {
        formStatus.dataset.state = 'error';
        formStatus.textContent = (error && error.message ? error.message : 'A connection error occurred.') + ' You can also contact inquiries@ezermatesystems.com.';
      } finally {
        formStatus.hidden = false;
        submitButton.disabled = false;
        buttonText.textContent = 'Send inquiry directly';
      }
    });
  }

  const progress = document.querySelector('.scroll-progress');
  if (progress) {
    let ticking = false;
    const updateProgress = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      progress.style.transform = 'scaleX(' + Math.max(0, Math.min(1, window.scrollY / max)) + ')';
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(updateProgress);
      }
    }, { passive: true });
    window.addEventListener('resize', updateProgress, { passive: true });
    updateProgress();
  }

  window.addEventListener('load', () => {
    if (prefersReducedMotion.matches || !window.gsap || !window.ScrollTrigger) return;
    const gsap = window.gsap;
    gsap.from('.header .brand, .header .visitor-meter', {
      autoAlpha: 0, y: -16, duration: .75, stagger: .14, ease: 'power3.out'
    });
    gsap.from('.hero-art .terminal', {
      autoAlpha: 0, y: 34, scale: .94, duration: 1.15, ease: 'back.out(1.3)',
      scrollTrigger: { trigger: '.hero-art', start: 'top 92%', once: true }
    });
    gsap.from('.hero-art .art-label, .hero-art .art-caption', {
      autoAlpha: 0, y: 10, duration: .7, stagger: .2, delay: .2,
      scrollTrigger: { trigger: '.hero-art', start: 'top 88%', once: true }
    });
    gsap.from('.service-strip span, .service-strip i', {
      autoAlpha: 0, y: 16, duration: .55, stagger: .07,
      scrollTrigger: { trigger: '.service-strip', start: 'top 95%', once: true }
    });
    gsap.utils.toArray('.solution-card .card-visual').forEach(visual => {
      gsap.from(visual, {
        autoAlpha: 0, scale: .89, y: 23, duration: .85, ease: 'back.out(1.3)',
        scrollTrigger: { trigger: visual.closest('.solution-card'), start: 'top 87%', once: true }
      });
    });
    gsap.from('.process-grid .process-no', {
      autoAlpha: 0, scaleX: .35, transformOrigin: 'left center', duration: .8, stagger: .16,
      ease: 'power3.out', scrollTrigger: { trigger: '.process-grid', start: 'top 90%', once: true }
    });
    gsap.fromTo('.brand-banner img', { scale: 1.045 }, {
      scale: 1, ease: 'none', scrollTrigger: {
        trigger: '.brand-banner', start: 'top bottom', end: 'bottom top', scrub: .7
      }
    });
  }, { once: true });
})();
