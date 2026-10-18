(function(){
'use strict';
var D=window.GNT_DATA, M=D.manuscripts, I=window.GNT_MSINFO||{};
var CONTENT={e:'Gospels',a:'Acts and Catholic Epistles',p:'Pauline Epistles and Hebrews',r:'Revelation'};
var SHORT={e:'Gospels',a:'Acts and Catholic Epistles',p:'Paul and Hebrews',r:'Revelation'};
var LETTER={e:'G',a:'A',p:'P',r:'R'};
var ROMAN=['','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
var KIND={p:'Papyrus',u:'Uncial',m:'Minuscule'};
function $(id){return document.getElementById(id);}
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e;}
function kind(m){return m.ga.charAt(0)==='\uD835'?'p':(m.ga.charAt(0)==='0'?'u':'m');}
function cent(m){return Math.ceil(m.mid/100);}
function ccls(m){var c=cent(m);return 'cc'+(c>=2&&c<=11?c:0);}
function dateText(m){return /^\d+$/.test(m.date)?'AD '+m.date:m.date;}
function ordinal(n){var s=['th','st','nd','rd'],v=n%100;return n+(s[(v-20)%10]||s[v]||s[0]);}
function glyphText(m){
  /* the large letter: the Greek/Latin letter if there is one, else the number */
  if(m.ga.charAt(0)==='\uD835')return ['𝔓',m.ga.slice(2)];
  if(m.w){return [m.supp?m.w.slice(0,-1):m.w,m.supp?'s':''];}
  return [m.ga,''];
}
var rows=M.map(function(m,i){
  var x=I[m.ga]||{};
  return {m:m,i:i,x:x,kind:kind(m),cent:cent(m),pct:x.own?x.ag/x.own:null};
});
function search(r){
  var m=r.m,x=r.x;
  return [m.ga,m.w||'',x.n||'',x.lib||'',x.city||'',x.ctry||'',x.sh||'',(x.tags||[]).join(' '),KIND[r.kind]].join(' ').toLowerCase();
}
rows.forEach(function(r){r.s=search(r);});

var st={q:'',type:'',cont:'',cent:'',sort:'ga'};
var SPECIAL={'01':['Codex Sinaiticus digital edition','https://www.codexsinaiticus.org/'],
  '03':['Vatican Library digital copy','https://digi.vatlib.it/view/MSS_Vat.gr.1209'],
  '05':['Cambridge Digital Library','https://cudl.lib.cam.ac.uk/view/MS-NN-00002-00041'],
  '05s':['Cambridge Digital Library','https://cudl.lib.cam.ac.uk/view/MS-NN-00002-00041']};
function docId(m){
  var g=m.ga.replace(/s$/,'');
  if(g.charAt(0)==='\uD835')return 10000+parseInt(g.slice(2),10);
  if(g.charAt(0)==='0')return 20000+parseInt(g,10);
  return 30000+parseInt(g,10);
}
function listeUrl(m){return 'https://ntvmr.uni-muenster.de/liste?docid='+docId(m);}
function imagesUrl(m){return 'https://ntvmr.uni-muenster.de/manuscript-workspace?docID='+docId(m);}
function refText(r){
  var m=r.m,x=r.x,t='GA '+m.ga.replace(/s$/,'')+(x.n?' ('+x.n+')':'');
  if(x.lib||x.city)t+=', '+(x.lib||'')+(x.city?', '+x.city:'')+(x.sh?', '+x.sh:'');
  return t+'. Kurzgefaßte Liste, INTF Münster: '+listeUrl(m);
}

/* ---- summary ---- */
function summary(){
  var host=$('sumstrip');host.textContent='';
  var n=rows.length,p=rows.filter(function(r){return r.kind==='p';}).length,u=rows.filter(function(r){return r.kind==='u';}).length,mi=n-p-u;
  var early=rows.slice().sort(function(a,b){return a.m.mid-b.m.mid;})[0];
  var libs={};rows.forEach(function(r){if(r.x.city)libs[r.x.city.split(/ \(| \/ /)[0]]=1;});
  var named=rows.filter(function(r){return r.x.n;}).length;
  [['s1',n,'manuscripts'],['s2',p,'papyri'],['s3',u,'uncials'],['s4',mi,'minuscules'],['s5',Object.keys(libs).length,'cities hold them']].forEach(function(c){
    var d=el('div','sumcell '+c[0]);d.appendChild(el('b',null,String(c[1])));d.appendChild(el('span',null,c[2]));host.appendChild(d);
  });
}
/* ---- century bar ---- */
function agebar(){
  var host=$('agebar');host.textContent='';
  var cs={};rows.forEach(function(r){cs[r.cent]=(cs[r.cent]||0)+1;});
  var max=Math.max.apply(null,Object.keys(cs).map(function(k){return cs[k];}));
  for(var c=3;c<=11;c++){
    var b=el('button','agecol cc'+c);b.type='button';b.dataset.c=c;
    b.setAttribute('aria-pressed',st.cent===String(c)?'true':'false');
    b.title=(cs[c]||0)+' manuscripts from the '+ordinal(c)+' century';b.setAttribute('aria-label',(cs[c]||0)+' manuscripts from the '+ordinal(c)+' century. Select to filter the list.');
    var n=el('span','n',String(cs[c]||0));var bar=el('span','bar');bar.style.setProperty('--h',Math.round(((cs[c]||0)/max)*86)+'px');
    var r=el('span','r',ROMAN[c]);
    b.appendChild(n);b.appendChild(bar);b.appendChild(r);
    b.addEventListener('click',function(){var v=this.dataset.c;st.cent=(st.cent===v?'':v);$('fcent').value=st.cent;paint();agebar();});
    host.appendChild(b);
  }
}
/* ---- filter ---- */
function list(){
  var q=st.q.trim().toLowerCase();
  var out=rows.filter(function(r){
    if(st.type&&r.kind!==st.type)return false;
    if(st.cont&&r.m.c.indexOf(st.cont)<0)return false;
    if(st.cent&&String(r.cent)!==st.cent)return false;
    if(q&&q.split(/\s+/).some(function(w){return r.s.indexOf(w)<0;}))return false;
    return true;
  });
  var s=st.sort;
  out.sort(function(a,b){
    if(s==='date')return a.m.mid-b.m.mid||a.i-b.i;
    if(s==='cited')return (b.x.u||0)-(a.x.u||0)||a.i-b.i;
    if(s==='agree'||s==='differ'){
      var A=a.pct==null?-1:a.pct,B=b.pct==null?-1:b.pct;
      /* favor larger samples when percentages tie */
      var d=(s==='agree'?B-A:A-B);
      if(a.pct==null||b.pct==null){if(a.pct==null&&b.pct!=null)return 1;if(b.pct==null&&a.pct!=null)return -1;}
      return d||(b.x.own||0)-(a.x.own||0)||a.i-b.i;
    }
    return a.i-b.i;
  });
  return out;
}
function gaNode(ga){var f=document.createDocumentFragment();if(ga.charAt(0)==='\uD835'){f.appendChild(document.createTextNode(ga.slice(0,2)));var s=document.createElement('sup');s.className='mk';s.textContent=ga.slice(2);f.appendChild(s);}else f.appendChild(document.createTextNode(ga));return f;}
/* ---- card ---- */
function bandEl(r){
  var m=r.m;
  var band=el('div','band');band.appendChild(el('span','kind',KIND[r.kind]));band.appendChild(el('span','date',/^\d+$/.test(m.date)?'AD '+m.date:m.date+' century'));
  return band;
}
function topEl(r){
  var m=r.m,x=r.x;
  var top=el('div','top');
  var g=glyphText(m);var gl=el('div','glyph');gl.setAttribute('aria-hidden','true');
  gl.appendChild(document.createTextNode(g[0]));
  if(g[1])gl.appendChild(el('sup',null,g[1]));
  if((g[0]+g[1]).length>3)gl.classList.add('long');
  top.appendChild(gl);
  var h=el('h3');
  if(x.n)h.appendChild(document.createTextNode(x.n));
  else if(m.w&&!m.supp)h.appendChild(document.createTextNode('Manuscript '+m.w));
  else{h.appendChild(document.createTextNode('GA '));h.appendChild(gaNode(m.ga));}
  var sm=el('small',null,'GA ');sm.appendChild(gaNode(m.ga));if(m.w&&r.kind!=='p')sm.appendChild(document.createTextNode(' · letter '+m.w));
  h.appendChild(sm);
  top.appendChild(h);
  return top;
}
function tagsEl(r){
  var m=r.m,x=r.x;
  var tags=el('div','tags');
  m.c.split('').forEach(function(k){var t=el('span','tag ct');t.title=CONTENT[k];var b=el('b',null,LETTER[k]);t.appendChild(b);t.appendChild(document.createTextNode(' '+CONTENT[k].replace(' and Catholic Epistles','/Catholic').replace(' and Hebrews','/Hebrews')));tags.appendChild(t);});
  (x.tags||[]).forEach(function(t){tags.appendChild(el('span','tag',t));});
  if(m.supp)tags.appendChild(el('span','tag','later supplement'));
  return tags;
}
function card(r){
  var m=r.m,x=r.x;
  var c=el('article','mscard '+ccls(m));c.id='ms-'+m.ga;
  var flip=el('div','flip');
  var front=el('div','face front');
  front.appendChild(bandEl(r));
  front.appendChild(topEl(r));
  var body=el('div','body');
  body.appendChild(tagsEl(r));
  var w=el('div','where'+(x.lib||x.city?'':' unk'));
  if(x.lib||x.city){
    w.appendChild(document.createTextNode((x.lib||'')+(x.city?', '+x.city:'')+(x.ctry&&x.ctry!==x.city?' ('+x.ctry+')':'')));
    if(x.sh){w.appendChild(document.createTextNode(' '));w.appendChild(el('span','sh','· '+x.sh));}
  } else w.textContent='Present location not recorded here.';
  body.appendChild(w);
  var me=el('div','meter'+(x.own?'':' na'));
  var lbl=el('div','lbl');
  if(x.own){
    var pc=Math.round(100*x.ag/x.own);
    lbl.appendChild(el('span',null,'Follows the main text'));
    var bb=el('b',null,pc+'% ('+x.ag+' of '+x.own+')');lbl.appendChild(bb);
    me.appendChild(lbl);
    var tr=el('div','track');var f=el('span','fill');f.style.setProperty('--w',pc+'%');tr.appendChild(f);me.appendChild(tr);
  } else {lbl.appendChild(el('span',null,x.u?'Cited only through a corrector':'Not cited'));me.appendChild(lbl);}
  body.appendChild(me);
  var ci=el('div','cited');
  ci.appendChild(document.createTextNode('Cited in '+(x.u||0)+' of the 50 variants. '));
  if(x.u){var a=el('button','seewhere','See where');a.type='button';a.setAttribute('aria-expanded','false');a.title='Turn the card over to list the variants where this manuscript is cited';a.setAttribute('aria-label','See where '+(x.n||('GA '+m.ga.replace(/s$/,'')))+' is cited');a.addEventListener('click',function(){flipTo(c,r,true);});ci.appendChild(a);}
  body.appendChild(ci);
  var lk=el('div','mlinks');
  var who=x.n||('GA '+m.ga.replace(/s$/,''));
  function link(txt,href,title,more){var a=el('a',null,txt);a.href=href;a.target='_blank';a.rel='noopener';if(title)a.title=title;a.setAttribute('aria-label',txt+' for '+who+(more||'')+' (opens in a new tab)');lk.appendChild(a);}
  link('Liste entry',listeUrl(m),'Official record in the INTF Kurzgefaßte Liste (opens in a new tab)');
  link('Images (INTF)',imagesUrl(m),'Images and transcriptions in the INTF Virtual Manuscript Room, where available (opens in a new tab)');
  var sp=SPECIAL[m.ga];if(sp)link(sp[0],sp[1]);
  var cb=el('button','linkbtn','Copy reference');cb.type='button';cb.title='Copy a citation for this manuscript';cb.setAttribute('aria-label','Copy reference for '+who);
  cb.addEventListener('click',function(){window.GNT_copy(refText(r),cb,'Copied');});
  lk.appendChild(cb);
  body.appendChild(lk);
  front.appendChild(body);
  var back=el('div','face back');back.inert=true;
  flip.appendChild(front);flip.appendChild(back);c.appendChild(flip);
  return c;
}
/* ---- the back of a card: where the manuscript is cited ---- */
function citesFor(ga){
  var out=[];
  D.variants.forEach(function(v){
    var items=[];
    v.readings.forEach(function(rd,i){
      rd.wits.forEach(function(w){if(w.ga===ga&&!items.some(function(t){return t.i===i;}))items.push({i:i,r:rd,f:w.f||[]});});
    });
    if(items.length)out.push({v:v,items:items});
  });
  return out;
}
function buildBack(back,c,r){
  var cites=citesFor(r.m.ga);
  back.appendChild(bandEl(r));
  back.appendChild(topEl(r));
  var mid=el('div','bmid');
  var kinds=r.m.c.split('').map(function(k){return SHORT[k];}).concat(r.x.tags||[]);
  if(r.m.supp)kinds.push('later supplement');
  mid.appendChild(el('div','bkinds',kinds.join(' \u00b7 ')));
  var hr=el('div','bhrow');
  var h=el('h4','bhead','Cited in '+cites.length+' of the 50 variants');h.tabIndex=-1;hr.appendChild(h);
  if(cites.length>12)hr.appendChild(el('span','bhint','scroll for more'));
  mid.appendChild(hr);
  back.appendChild(mid);
  var wrap=el('div','blist-wrap');
  var ul=el('ul','blist');ul.tabIndex=0;ul.setAttribute('role','region');ul.setAttribute('aria-label','Variants where this manuscript is cited');
  var ids=cites.map(function(ct){return ct.v.id;});
  cites.forEach(function(ct){
    var li=el('li');
    var a=el('a',null,ct.v.ref);a.href='variants.html#v='+ct.v.id;a.title='Open this variant';
    a.addEventListener('click',function(e){
      if(e.ctrlKey||e.metaKey||e.shiftKey||e.button||!window.GNTOpenVariant)return;
      e.preventDefault();window.GNTOpenVariant(ct.v.id,ids);
    });
    li.appendChild(a);ul.appendChild(li);
  });
  wrap.appendChild(ul);back.appendChild(wrap);
  var foot=el('div','bfoot');
  var bk=el('button','linkbtn','\u2039 Back to front');bk.type='button';bk.addEventListener('click',function(){flipTo(c,r,false);});foot.appendChild(bk);
  var tl=el('a',null,'Show on the timeline');tl.href='variants.html#ms='+encodeURIComponent(r.m.ga);tl.title='Open the Fifty variants page and pick this manuscript on the timeline';foot.appendChild(tl);
  back.appendChild(foot);
  back.addEventListener('keydown',function(e){if(e.key==='Escape'){e.stopPropagation();flipTo(c,r,false);}});
}
function flipTo(c,r,on){
  var front=c.querySelector('.front'),back=c.querySelector('.back'),btn=c.querySelector('.cited .seewhere');
  if(on&&!back.firstChild)buildBack(back,c,r);
  c.classList.toggle('flipped',on);
  try{history.replaceState(on?{flip:r.m.ga}:null,'',location.href);}catch(e){}
  front.inert=on;back.inert=!on;
  if(btn)btn.setAttribute('aria-expanded',on?'true':'false');
  var t=on?back.querySelector('.bhead'):btn;
  if(t)t.focus({preventScroll:true});
}
var PM={q:'q',type:'ftype',cont:'fcont',cent:'fcent',sort:'fsort'};
function writeUrl(){
  if(!window.history||!history.replaceState)return;
  var p=new URLSearchParams();
  Object.keys(PM).forEach(function(k){if(st[k]&&!(k==='sort'&&st[k]==='ga'))p.set(k,st[k]);});
  var qs=p.toString();
  try{history.replaceState(null,'',location.pathname+(qs?'?'+qs:'')+location.hash);}catch(e){}
}
function readUrl(){
  var p=new URLSearchParams(location.search);
  Object.keys(PM).forEach(function(k){if(p.has(k)){st[k]=p.get(k);var f=$(PM[k]==='q'?'q':PM[k]);if(f)f.value=st[k];}});
}
function paint(){
  var out=list(),host=$('msgrid');host.textContent='';
  out.forEach(function(r){host.appendChild(card(r));});
  if(!out.length)host.appendChild(el('p','empty','No manuscript matches those choices.'));
  $('mscount').firstChild.nodeValue='Showing '+out.length+' of '+rows.length+' manuscripts. ';writeUrl();
}
function bind(){
  for(var c=3;c<=11;c++){var o=el('option',null,ROMAN[c]+' century');o.value=c;$('fcent').appendChild(o);}
  $('msfilters').addEventListener('submit',function(e){e.preventDefault();});
  $('q').addEventListener('input',function(){st.q=this.value;paint();});
  $('ftype').addEventListener('change',function(){st.type=this.value;paint();});
  $('fcont').addEventListener('change',function(){st.cont=this.value;paint();});
  $('fcent').addEventListener('change',function(){st.cent=this.value;paint();agebar();});
  $('fsort').addEventListener('change',function(){st.sort=this.value;paint();});
}
window.addEventListener('popstate',function(e){
  var st=e.state;
  if(st&&st.flip){var c=document.getElementById('ms-'+st.flip),r0=rows.filter(function(r){return r.m.ga===st.flip;})[0];
    if(c&&r0&&!c.classList.contains('flipped')){if(!c.querySelector('.back').firstChild)buildBack(c.querySelector('.back'),c,r0);c.classList.add('flipped');c.querySelector('.front').inert=true;c.querySelector('.back').inert=false;}}
});
var saved=null;try{saved=history.state;}catch(e){}
summary();bind();readUrl();agebar();paint();
if(saved&&saved.flip){
  var fr=rows.filter(function(r){return r.m.ga===saved.flip;})[0],fc=fr&&document.getElementById('ms-'+fr.m.ga);
  if(fc){buildBack(fc.querySelector('.back'),fc,fr);fc.classList.add('flipped');fc.querySelector('.front').inert=true;fc.querySelector('.back').inert=false;var fb=fc.querySelector('.seewhere');if(fb)fb.setAttribute('aria-expanded','true');try{history.replaceState(saved,'',location.href);}catch(e){}}
}
(function(){var b=$('mshare');if(b)b.addEventListener('click',function(){writeUrl();window.GNT_copy(location.href,b,'Link copied');});})();
if(location.hash&&location.hash.indexOf('#ms-')===0){var t=document.getElementById(decodeURIComponent(location.hash.slice(1)));if(t){t.classList.add('hit');t.scrollIntoView({block:'center'});}}
})();
