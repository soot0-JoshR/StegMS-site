const b=document.querySelector('.nav-toggle'),n=document.querySelector('nav');b?.addEventListener('click',()=>{const o=n.classList.toggle('open');b.setAttribute('aria-expanded',String(o))});
