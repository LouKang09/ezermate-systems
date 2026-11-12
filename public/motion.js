/* EzerMate motion: progressive enhancement, GSAP 3.13 + ScrollTrigger. */
(() => {
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!gsap || !ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  const media = gsap.matchMedia();
  const cleanup = [];
  const listen = (el, event, handler, options) => {
    el.addEventListener(event, handler, options);
    return () => el.removeEventListener(event, handler, options);
  };
  media.add('(prefers-reduced-motion: no-preference)', context => {
    document.documentElement.classList.add('gsap-motion');
    // Content remains in the document and is revealed only once per visit.
    gsap.from('.brand-banner', {opacity:0, y:14, duration:.55, ease:'power2.out'});
    gsap.from('.hero-copy > *', {
      opacity:0, y:24, duration:.65, stagger:.08, ease:'power3.out',
      scrollTrigger:{trigger:'.hero', start:'top 88%', once:true}
    });
    gsap.from('.hero-art', {
      opacity:0, y:32, duration:.8, ease:'power3.out',
      scrollTrigger:{trigger:'.hero-art', start:'top 88%', once:true}
    });
    gsap.from('.hero-chart > div', {
      scaleY:0, transformOrigin:'bottom', duration:.7, stagger:.035, ease:'power3.out',
      scrollTrigger:{trigger:'.hero-chart',start:'top 90%',once:true}
    });
    gsap.utils.toArray('.reveal').forEach(el => {
      gsap.from(el, {opacity:0,y:26,duration:.6,ease:'power3.out',
        scrollTrigger:{trigger:el,start:'top 93%',once:true}});
    });
    const floats = gsap.to('.floating', {y:-7, duration:2.6, stagger:.35, yoyo:true, repeat:-1, ease:'sine.inOut',paused:true});
    const floatTrigger = ScrollTrigger.create({trigger:'.hero-art',start:'top bottom',end:'bottom top',
      onToggle:self=>self.isActive&&!document.hidden?floats.resume():floats.pause()});
    const visibility = () => document.hidden||!floatTrigger.isActive?floats.pause():floats.resume();
    const unlistenVisibility=listen(document,'visibilitychange',visibility);
    let saleTimeline;
    const tap = context.add(null, event => {
      const product=event.target.closest('.product');
      if (product) {
        gsap.fromTo(product,{scale:.95},{scale:1,duration:.35,ease:'back.out(2)',overwrite:true});
        gsap.fromTo('.order-total strong',{y:6,opacity:.4},{y:0,opacity:1,duration:.22,overwrite:true});
        gsap.fromTo('.order-items',{opacity:.6},{opacity:1,duration:.2,overwrite:true});
      }
      if(event.target.closest('.remove-item, #clear-order')){
        gsap.fromTo('.order-total strong',{opacity:.4},{opacity:1,duration:.2,overwrite:true});
      }
      if(event.target.closest('#checkout')&&!document.querySelector('#demo-toast').hidden){
        saleTimeline?.kill();
        saleTimeline=gsap.timeline()
          .fromTo('.pos-order',{boxShadow:'inset 0 0 0 2px rgba(40,80,255,.55)'},{boxShadow:'inset 0 0 0 0px rgba(40,80,255,0)',duration:.5})
          .fromTo('#demo-toast',{y:18,opacity:0,scale:.97},{y:0,opacity:1,scale:1,duration:.38,ease:'back.out(1.4)'},0)
          .fromTo('#demo-toast > span',{scale:0,rotation:-35},{scale:1,rotation:0,duration:.4,ease:'back.out(2)'},.12);
      }
      if(event.target.closest('[data-industry]')){
        gsap.fromTo('.industry-content',{opacity:.45,y:8},{opacity:1,y:0,duration:.28,overwrite:true});
        gsap.fromTo('#industry-symbol',{scale:.88},{scale:1,duration:.35,ease:'back.out(1.4)',overwrite:true});
      }
      if(event.target.closest('[data-category]')){
        gsap.fromTo('.product',{opacity:.5,y:6},{opacity:1,y:0,duration:.22,stagger:.025,overwrite:true});
      }
    });
    const removeTap=listen(document,'click',tap);
    const resize=()=>ScrollTrigger.refresh();
    const removeLoad=listen(window,'load',resize,{once:true});
    // DOM changes in accordions shift sections below them.
    const removes=[...document.querySelectorAll('details')].map(el=>listen(el,'toggle',resize));
    return () => {
      removeTap();unlistenVisibility();removeLoad();removes.forEach(fn=>fn());
      document.documentElement.classList.remove('gsap-motion');
      gsap.set(['.product','.order-items','.order-total strong','.pos-order','#demo-toast','#demo-toast > span','.industry-content','#industry-symbol'],{clearProps:'transform,opacity,boxShadow'});
    };
  });
  media.add('(hover: hover) and (pointer: fine) and (min-width: 901px) and (prefers-reduced-motion: no-preference)', context => {
    const removers=[];
    const terminal=document.querySelector('.pos-demo');
    gsap.set(terminal,{transformPerspective:1100,transformOrigin:'center'});
    const rotateX=gsap.quickTo(terminal,'rotationX',{duration:.45,ease:'power3.out'});
    const rotateY=gsap.quickTo(terminal,'rotationY',{duration:.45,ease:'power3.out'});
    removers.push(listen(terminal,'pointermove',context.add(null, event=>{
      const r=terminal.getBoundingClientRect();
      rotateX((.5-(event.clientY-r.top)/r.height)*3);
      rotateY(((event.clientX-r.left)/r.width-.5)*4);
    }),{passive:true}));
    removers.push(listen(terminal,'pointerleave',()=>{rotateX(0);rotateY(0);}));
    return ()=>removers.forEach(fn=>fn());
  });
  cleanup.push(()=>media.revert());
  window.addEventListener('pagehide',event=>{if(!event.persisted)cleanup.forEach(fn=>fn());});
})();
