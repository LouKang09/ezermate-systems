'use strict';
const money = value => new Intl.NumberFormat('en-PH',{style:'currency',currency:'PHP',maximumFractionDigits:0}).format(value);
const products = [
  {id:'latte',name:'Iced latte',price:120,category:'coffee',art:'<span class="cup"></span>'},
  {id:'matcha',name:'Matcha latte',price:140,category:'coffee',art:'<span class="cup matcha"></span>'},
  {id:'croissant',name:'Butter croissant',price:85,category:'bites',art:'<span class="pastry">🥐</span>'},
  {id:'cookie',name:'Chocolate cookie',price:65,category:'bites',art:'<span class="pastry">🍪</span>'}
];
const cart = new Map();
function renderProducts(category='all') {
  document.querySelector('#products').innerHTML=products.filter(p=>category==='all'||p.category===category).map(p=>`<button class="product" data-product="${p.id}" aria-label="Add ${p.name}, ${money(p.price)}"><span class="product-art" aria-hidden="true">${p.art}</span><span class="product-name">${p.name}</span><span class="product-bottom"><span>${money(p.price)}</span><span aria-hidden="true">+</span></span></button>`).join('');
}
function renderOrder(){
  let total=0;
  const rows=[];
  for (const [id,qty] of cart){const p=products.find(item=>item.id===id);total+=p.price*qty;rows.push(`<div class="order-item"><div>${qty} × ${p.name}<small>${money(p.price*qty)}</small></div><button class="remove-item" data-remove="${id}" aria-label="Remove one ${p.name}">−</button></div>`);}
  document.querySelector('#order-items').innerHTML=rows.join('')||'<div class="empty-order"><span>＋</span>Your next great order<br>starts with a tap.</div>';
  document.querySelector('#order-total').textContent=money(total);
  document.querySelector('#checkout').disabled=cart.size===0;
}
document.querySelector('#products').addEventListener('click',e=>{const button=e.target.closest('[data-product]');if(!button)return;const id=button.dataset.product;cart.set(id,Math.min(99,(cart.get(id)||0)+1));document.querySelector('#demo-toast').hidden=true;renderOrder();});
document.querySelector('#order-items').addEventListener('click',e=>{const button=e.target.closest('[data-remove]');if(!button)return;const id=button.dataset.remove;const qty=cart.get(id);if(qty>1)cart.set(id,qty-1);else cart.delete(id);renderOrder();});
document.querySelectorAll('[data-category]').forEach(button=>button.addEventListener('click',()=>{document.querySelectorAll('[data-category]').forEach(item=>{item.classList.toggle('active',item===button);item.setAttribute('aria-pressed',String(item===button));});renderProducts(button.dataset.category);}));
document.querySelector('#clear-order').addEventListener('click',()=>{cart.clear();renderOrder();document.querySelector('#demo-toast').hidden=true;});
document.querySelector('#checkout').addEventListener('click',()=>{if(!cart.size)return;cart.clear();renderOrder();document.querySelector('#demo-toast').hidden=false;document.querySelector('#dismiss-toast').focus();});
document.querySelector('#dismiss-toast').addEventListener('click',()=>{document.querySelector('#demo-toast').hidden=true;document.querySelector('.product')?.focus();});
renderProducts();
const industries={
  cafe:{symbol:'☕',label:'FROM FIRST BREW TO LAST ORDER',kicker:'BUILT AROUND YOUR COUNTER',title:'Good coffee. Great operations.',description:'Connect ordering, ingredient tracking, and recipe costing, so your team can focus on serving the next cup.',tags:['Menu & add-ons','Recipe costing','Sales insights']},
  retail:{symbol:'▦',label:'EVERY ITEM HAS ITS PLACE',kicker:'A CLEARER VIEW OF YOUR STORE',title:'More clarity on every shelf.',description:'Bring your products, checkout, and inventory into one workflow, with reporting that helps you understand what is moving.',tags:['Product catalog','Stock tracking','Sales reports']},
  laundry:{symbol:'◉',label:'FROM DROP-OFF TO PICKUP',kicker:'KEEP EVERY ORDER MOVING',title:'A fresh approach to your day.',description:'Track laundry orders through each stage, manage payment status, and give your team a clear picture of what is ready for pickup.',tags:['Order stages','Payment tracking','Pickup records']},
  water:{symbol:'◕',label:'KEEP THE EVERYDAY FLOWING',kicker:'A SYSTEM THAT GOES WITH THE FLOW',title:'Every delivery, accounted for.',description:'Organize pickup and delivery orders, keep customer and unit details close, and bring your daily sales and cash flow into focus.',tags:['Delivery orders','Customer details','Daily cash flow']},
  custom:{symbol:'✳',label:'YOUR IDEA. YOUR WAY FORWARD.',kicker:'LET’S BUILD AROUND YOUR AMBITION',title:'Different is a good place to start.',description:'Have a process that spreadsheets cannot keep up with? Let’s map your needs and design a practical tool around the way you work.',tags:['Custom workflows','Business websites','Automation']}
};
const tabs=[...document.querySelectorAll('[data-industry]')];
function selectIndustry(button){const d=industries[button.dataset.industry];tabs.forEach(tab=>{tab.setAttribute('aria-selected',String(tab===button));tab.tabIndex=tab===button?0:-1;});document.querySelector('#industry-panel').setAttribute('aria-labelledby',button.id);for(const [id,key] of [['industry-symbol','symbol'],['industry-art-label','label'],['industry-kicker','kicker'],['industry-title','title'],['industry-description','description']])document.getElementById(id).textContent=d[key];document.querySelector('#industry-tags').replaceChildren(...d.tags.map(tag=>{const el=document.createElement('span');el.textContent=tag;return el;}));}
tabs.forEach((button,index)=>{button.addEventListener('click',()=>selectIndustry(button));button.addEventListener('keydown',e=>{let next;if(['ArrowRight','ArrowDown'].includes(e.key))next=(index+1)%tabs.length;else if(['ArrowLeft','ArrowUp'].includes(e.key))next=(index+tabs.length-1)%tabs.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=tabs.length-1;else return;e.preventDefault();tabs[next].focus();selectIndustry(tabs[next]);});});
const menuButton=document.querySelector('.menu-toggle');const menu=document.querySelector('#mobile-nav');
function closeMenu(){menu.hidden=true;menuButton.setAttribute('aria-expanded','false');menuButton.setAttribute('aria-label','Open navigation');menuButton.textContent='☰';}
menuButton.addEventListener('click',()=>{const isOpen=menu.hidden;menu.hidden=!isOpen;menuButton.setAttribute('aria-expanded',String(isOpen));menuButton.setAttribute('aria-label',isOpen?'Close navigation':'Open navigation');menuButton.textContent=isOpen?'×':'☰';});
menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){closeMenu();menuButton.focus();}});document.addEventListener('click',e=>{if(!e.target.closest('.header'))closeMenu();});
document.querySelector('#inquiry-form').addEventListener('submit',e=>{e.preventDefault();const data=new FormData(e.currentTarget);const subject=`Website inquiry — ${data.get('business')}`;const body=`Hello EzerMate Systems,\n\nMy name is ${data.get('name')}.\nBusiness: ${data.get('business')}\nInterested in: ${data.get('service')}\n\n${data.get('message')||'I would like to discuss a solution for my business.'}\n\nThank you!`;window.location.href=`mailto:inquiries@ezermatesystems.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;document.querySelector('#form-status').hidden=false;});
document.querySelector('#year').textContent=new Date().getFullYear();
if(!window.gsap&&'IntersectionObserver'in window&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target);}}),{threshold:.08});document.documentElement.classList.add('js-reveal');document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));}
