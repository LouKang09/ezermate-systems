/* EzerMate visitor meter, direct contact form and visible motion effects. */
'use strict';
(() => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  // Real values from the server; nothing is simulated or seeded in the browser.
  // Total counts first-party tracked browsers, not page loads or identified people.
  // Online counts sessions refreshed within the last 60 seconds.
  const visitorNumber = document.getElementById('visitor-count');
  const onlineNumber = document.getElementById('visitor-online');
  const visitorMeter = document.querySelector('.visitor-meter');
  const visitorTooltip = visitorMeter?.getAttribute('title') || '';
  let visitorsLoading = false;

  function updateNumber(element, next) {
    if (!element || !Number.isSafeInteger(next) || next < 0) return;
    const previous = Number(element.dataset.current);
    if (element.dataset.current === String(next)) return;
    const begin = Number.isFinite(previous) && element.dataset.current !== undefined
      ? previous : Math.max(0, next - 12);
    element.dataset.current = String(next);
    if (prefersReducedMotion.matches) {
      element.textContent = next.toLocaleString('en-PH');
      return;
    }
    element.getAnimations().forEach(animation => animation.cancel());
    const start = performance.now();
    const duration = 650;
    function frame(now) {
      if (element.dataset.current !== String(next)) return;
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = Math.round(begin + (next - begin) * eased).toLocaleString('en-PH');
      if (progress < 1) window.requestAnimationFrame(frame);
    }
    window.requestAnimationFrame(frame);
  }

  async function refreshVisitors() {
    if (!visitorNumber || !onlineNumber || visitorsLoading || document.hidden) return;
    visitorsLoading = true;
    try {
      const response = await fetch('/api/visitors', {
        cache: 'no-store',
        credentials: 'same-origin'
      });
      if (!response.ok) throw new Error('Visitor service not available');
      const data = await response.json();
      if (!Number.isSafeInteger(data.visitors) || !Number.isSafeInteger(data.online)) {
        throw new Error('Incomplete visitor data');
      }
      updateNumber(visitorNumber, data.visitors);
      updateNumber(onlineNumber, data.online);
      if (visitorMeter) {
        visitorMeter.classList.remove('is-stale');
        visitorMeter.title = visitorTooltip;
      }
    } catch {
      // Don't replace a previously valid visitor total with a fabricated value.
      if (visitorNumber && !visitorNumber.dataset.current) visitorNumber.textContent = '—';
      if (onlineNumber && !onlineNumber.dataset.current) onlineNumber.textContent = '—';
      if (visitorMeter) {
        visitorMeter.classList.add('is-stale');
        visitorMeter.title = 'Traffic data temporarily unavailable. ' + visitorTooltip;
      }
    } finally {
      visitorsLoading = false;
    }
  }

  if (visitorNumber && onlineNumber) {
    refreshVisitors();
    // Poll only while the page is visible; hidden tabs expire from the live count.
    window.setInterval(refreshVisitors, 10_000);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) refreshVisitors();
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
    // The supplied brand artwork remains fully visible without image zoom or cropping.
    gsap.from('.faq-list details', {
      autoAlpha: 0, y: 18, duration: .55, stagger: .10, ease: 'power2.out',
      scrollTrigger: { trigger: '.faq-list', start: 'top 90%', once: true }
    });
    gsap.from('.industry-tabs button', {
      autoAlpha: 0, x: -18, duration: .50, stagger: .08, ease: 'power2.out',
      scrollTrigger: { trigger: '.industry-layout', start: 'top 87%', once: true }
    });
    gsap.from('.contact-card', {
      autoAlpha: 0, y: 36, duration: .85, ease: 'power3.out',
      scrollTrigger: { trigger: '.contact-card', start: 'top 91%', once: true }
    });
  }, { once: true });
})();
