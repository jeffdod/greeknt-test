(function(){
'use strict';
var D=window.GNT_DATA, M=D.manuscripts, I=window.GNT_MSINFO||{};
var CONTENT={e:'Gospels',a:'Acts and Catholic Epistles',p:'Pauline Epistles and Hebrews',r:'Revelation'};
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
    b.title=(cs[c]||0)+' manuscripts from the '+ordinal(c)+' century';
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
      /* favour larger samples when percentages tie */
      var d=(s==='agree'?B-A:A-B);
      if(a.pct==null||b.pct==null){if(a.pct==null&&b.pct!=null)return 1;if(b.pct==null&&a.pct!=null)return -1;}
      return d||(b.x.own||0)-(a.x.own||0)||a.i-b.i;
    }
    return a.i-b.i;
  });
  return out;
}
/* ---- card ---- */
function card(r){
  var m=r.m,x=r.x;
  var c=el('article','mscard '+ccls(m));c.id='ms-'+m.ga;
  var band=el('div','band');band.appendChild(el('span','kind',KIND[r.kind]));band.appendChild(el('span','date',/^\d+$/.test(m.date)?'AD '+m.date:m.date+' century'));
  c.appendChild(band);
  var top=el('div','top');
  var g=glyphText(m);var gl=el('div','glyph');gl.setAttribute('aria-hidden','true');
  gl.appendChild(document.createTextNode(g[0]));
  if(g[1])gl.appendChild(el('sup',null,g[1]));
  if((g[0]+g[1]).length>3)gl.classList.add('long');
  top.appendChild(gl);
  var h=el('h3');
  if(x.n)h.appendChild(document.createTextNode(x.n));
  else h.appendChild(document.createTextNode(m.w&&!m.supp?('Manuscript '+m.w):'GA '+m.ga));
  var sm=el('small',null,'GA '+m.ga+(m.w&&r.kind!=='p'?' · letter '+m.w:''));
  h.appendChild(sm);
  top.appendChild(h);c.appendChild(top);
  var body=el('div','body');
  var tags=el('div','tags');
  m.c.split('').forEach(function(k){var t=el('span','tag ct');t.title=CONTENT[k];var b=el('b',null,LETTER[k]);t.appendChild(b);t.appendChild(document.createTextNode(' '+CONTENT[k].replace(' and Catholic Epistles','/Catholic').replace(' and Hebrews','/Hebrews')));tags.appendChild(t);});
  (x.tags||[]).forEach(function(t){tags.appendChild(el('span','tag',t));});
  if(m.supp)tags.appendChild(el('span','tag','later supplement'));
  body.appendChild(tags);
  var w=el('div','where'+(x.lib||x.city?'':' unk'));
  if(x.lib||x.city){
    w.appendChild(document.createTextNode((x.lib||'')+(x.city?', '+x.city:'')+(x.ctry?' ('+x.ctry+')':'')));
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
  if(x.u){var a=el('a',null,'See where');a.href='variants.html#ms='+encodeURIComponent(m.ga);a.title='Open the Fifty variants page and pick this manuscript on the timeline';ci.appendChild(a);}
  body.appendChild(ci);
  c.appendChild(body);
  return c;
}
function paint(){
  var out=list(),host=$('msgrid');host.textContent='';
  out.forEach(function(r){host.appendChild(card(r));});
  if(!out.length)host.appendChild(el('p','empty','No manuscript matches those choices.'));
  $('mscount').textContent='Showing '+out.length+' of '+rows.length+' manuscripts.';
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
summary();bind();agebar();paint();
if(location.hash&&location.hash.indexOf('#ms-')===0){var t=document.getElementById(decodeURIComponent(location.hash.slice(1)));if(t){t.classList.add('hit');t.scrollIntoView({block:'center'});}}
})();
