/* ===== How to read a page =====
   Each clickable spot is measured in the PDF's own units:
   the full page is 450 wide and 666 tall. [left, top, right, bottom]  */
const CROP = [55, 35, 375, 625];   // the part of the page shown in the picture
const PAGE_W = CROP[2]-CROP[0], PAGE_H = CROP[3]-CROP[1];
const spots = [
  {key:"text",    box:[69,77,357,488],  cls:"big"},
  {key:"runhead", box:[150,45,357,63]},
  {key:"folio",   box:[67,45,84,63]},
  {key:"chapter", box:[68,206,93,250]},
  {key:"verse",   box:[115,94,130,108], cls:"small"},
  {key:"verse",   box:[224,127,239,141], cls:"small"},
  {key:"verse",   box:[253,159,268,174], cls:"small"},
  {key:"marker",  box:[200,77,212,91],  cls:"small"},
  {key:"marker",  box:[172,175,185,189], cls:"small"},
  {key:"app1",    box:[69,494,357,566]},
  {key:"app2",    box:[69,567,357,609]},
  {key:"marker",  box:[70,541,81,552], cls:"small"},
  {key:"marker",  box:[70,573,81,584], cls:"small"}
];
const parts = {
  text:    {name:"Main text", html:"<p>The Greek text of the Robinson-Pierpont Byzantine Textform 2026. It reads cleanly on its own; all the notes wait at the bottom of the page.</p>"},
  verse:   {name:"Verse numbers", html:"<p>Small numbers in the text mark where each verse begins. Here you can see verses 23, 24 and 25 of Matthew 1.</p>"},
  chapter: {name:"Chapter number", html:"<p>A large number in the margin marks the start of a new chapter. Here, Matthew 2 begins.</p>"},
  marker:  {name:"Footnote letters", zoom:["text","edition","manuscript"], html:"<p>A small letter sits just before any words that have a note. The note with the same letter in the footnotes explains what other editions read.</p><p>The letter <i>e</i> in 1:25, before <span class='greek'>τὸν υἱὸν αὐτῆς τὸν πρωτότοκον</span>, matches note <i>e</i> in the Edition Apparatus. Because this is also one of the fifty selected variants, the same letter <i>e</i> appears again in the Manuscript Apparatus below it.</p>"},
  app1:    {name:"Edition Apparatus", zoom:["edition"], html:"<p>The first set of footnotes shows where eleven landmark printed Greek New Testaments differ from the main text.</p><p>Each note gives the letter, the verse and the main-text wording, then a broken bar (¦), then the editions that differ and what they read. In note <i>e</i>, “CT υιον” means the critical-text editions read only <span class='greek'>υἱόν</span>, “a son,” instead of “her firstborn son.”</p>"},
  app2:    {name:"Manuscript Apparatus", zoom:["manuscript"], html:"<p>The second set of footnotes always sits below the first, and appears only where one of the fifty selected variants falls on the page. It adds manuscript evidence for a variant already noted in the Edition Apparatus, so it uses the same footnote letter.</p><p>Here, note <i>e</i> lists the handwritten manuscripts on each side of Matthew 1:25: C, D, E, K, W and many others support the main text, while Codex Sinaiticus (ℵ), Codex Vaticanus (B), Z and 33 have the shorter reading.</p>"},
  runhead: {name:"Running head", html:"<p>The top line shows the book's Greek title, <span class='greek'>ΚΑΤΑ ΜΑΤΘΑΙΟΝ</span> (“According to Matthew”), and the verses on this page, 1:23–2:9, so you can find your place quickly.</p>"},
  folio:   {name:"Page number", html:"<p>Page numbers appear on the outer edge of each page.</p>"}
};
const zooms = {
  text:       {src:"images/zoom-caller-text.jpg",       w:796, h:223, cap:"In the main text, the letter e sits just before the words it marks."},
  edition:    {src:"images/zoom-caller-edition.jpg",    w:1057, h:257, cap:"Edition Apparatus, note e."},
  manuscript: {src:"images/zoom-caller-manuscript.jpg", w:1053, h:183, cap:"Manuscript Apparatus: the same letter e begins the entry."}
};
const info = document.getElementById('info');
const chips = document.getElementById('chips');
const sheet = document.getElementById('sheet');
spots.forEach(s=>{
  const [l,t,r,b] = [s.box[0]-CROP[0], s.box[1]-CROP[1], s.box[2]-CROP[0], s.box[3]-CROP[1]];
  const el = document.createElement('button');
  el.className = 'hot' + (s.cls ? ' ' + s.cls : '');
  el.dataset.key = s.key;
  el.setAttribute('aria-label', parts[s.key].name);
  el.style.left = (l/PAGE_W*100)+'%';  el.style.top = (t/PAGE_H*100)+'%';
  el.style.width = ((r-l)/PAGE_W*100)+'%'; el.style.height = ((b-t)/PAGE_H*100)+'%';
  el.addEventListener('click', ()=>show(s.key));
  sheet.appendChild(el);
});
Object.keys(parts).forEach(k=>{
  const b=document.createElement('button');
  b.className='chip'; b.textContent=parts[k].name; b.dataset.key=k;
  b.onclick=()=>show(k); chips.appendChild(b);
});
function show(key){
  const p=parts[key]; if(!p) return;
  const zhtml = p.zoom ? '<div class="zoomset">'+p.zoom.map(z=>{const q=zooms[z];return `<figure class="zoom"><img src="${q.src}" width="${q.w}" height="${q.h}" alt="Magnified: ${q.cap}"><figcaption>${q.cap}</figcaption></figure>`}).join('')+'</div>' : '';
  info.innerHTML=`<h3>${p.name}</h3>${p.html}${zhtml}`;
  sheet.querySelectorAll('.hot').forEach(el=>el.classList.toggle('on',el.dataset.key===key));
  chips.querySelectorAll('.chip').forEach(el=>el.classList.toggle('on',el.dataset.key===key));
}

/* Enlarge the page */
const lb=document.getElementById('lightbox');
document.getElementById('enlarge').addEventListener('click',()=>lb.showModal());
document.getElementById('lbclose').addEventListener('click',()=>lb.close());
lb.addEventListener('click',e=>{ if(e.target===lb) lb.close(); });

/* ===== Sample pages carousel =====
   To add or change a page: put the image in the "images" folder
   and add a line below with its file name and a caption.          */
const samples = [
  {src:"images/matthew-1.jpg",    title:"Matthew 1, page 1"},
  {src:"images/matthew-1-23.jpg", title:"Matthew 1:23–2:9, with both apparatuses"},
  {src:"images/john-1.jpg",       title:"The opening of John"},
  {src:"images/1-john-5.jpg",     title:"1 John 5, with manuscript evidence for 5:7–8"},
  {src:"images/appendix-a.jpg",   title:"Appendix A: Robinson-Pierpont edition changes"},
  {src:"images/appendix-d.jpg",   title:"Appendix D: List of cited manuscripts"}
];
const track=document.getElementById('track'), dots=document.getElementById('dots'), cap=document.getElementById('sampleCaption');
samples.forEach((s,i)=>{
  const slide=document.createElement('div'); slide.className='slide';
  slide.setAttribute('role','group'); slide.setAttribute('aria-label',`${i+1} of ${samples.length}: ${s.title}`);
  slide.innerHTML=`<a href="${s.src}" target="_blank" rel="noopener"><img src="${s.src}" width="1000" height="1480" alt="Sample page: ${s.title}" ${i>1?'loading="lazy"':''}></a>`;
  track.appendChild(slide);
  const d=document.createElement('button'); d.className='dot'; d.setAttribute('aria-label',`Go to page ${i+1}`);
  d.onclick=()=>go(i); dots.appendChild(d);
});
let cur=0;
function go(i){
  cur=(i+samples.length)%samples.length;
  track.style.transform=`translateX(-${cur*100}%)`;
  dots.querySelectorAll('.dot').forEach((d,j)=>d.classList.toggle('on',j===cur));
  cap.innerHTML=`<b>${samples[cur].title}</b><br>${cur+1} of ${samples.length}`;
}
document.getElementById('prev').onclick=()=>go(cur-1);
document.getElementById('next').onclick=()=>go(cur+1);
document.getElementById('carousel').addEventListener('keydown',e=>{
  if(e.key==='ArrowLeft') go(cur-1); if(e.key==='ArrowRight') go(cur+1);
});
let x0=null;
track.addEventListener('touchstart',e=>{x0=e.touches[0].clientX},{passive:true});
track.addEventListener('touchend',e=>{ if(x0===null) return; const dx=e.changedTouches[0].clientX-x0; if(Math.abs(dx)>40) go(cur+(dx<0?1:-1)); x0=null; });
go(0);
