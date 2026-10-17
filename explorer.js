(function(){
'use strict';
var D=window.GNT_DATA, V=D.variants, M=D.manuscripts;
var byGa={}; M.forEach(function(m){byGa[m.ga]=m;});
var COLORS=['var(--r0)','var(--r1)','var(--r2)','var(--r3)','var(--r4)'];
var CONTENT={e:'Gospels',a:'Acts and Catholic Epistles',p:'Pauline Epistles and Hebrews',r:'Revelation'};
var CODE_SHORT={e:'Gospels',a:'Acts / Catholic',p:'Paul / Hebrews',r:'Revelation'};
var KIND={passage:'Whole verses or passages',phrase:'Words or phrases',wording:'Different wording'};
var KIND_TAG={passage:'Passage',phrase:'Phrase',wording:'Wording'};
var FAMILY=[['Byzantine editions',['HF','PCK','PT']],['Critical editions',['ECM','NA27','NA28','SBL','TH','WH']],['Textus Receptus editions',['SCR','ST']]];
var EDNAME={HF:'Hodges & Farstad',PCK:'Pickering',PT:'Antoniades (Patriarchal Text)',ECM:'Editio Critica Maior',NA27:'Nestle–Aland 27',NA28:'Nestle–Aland 28',SBL:'SBL',TH:'Tyndale House',WH:'Westcott–Hort',SCR:'Scrivener',ST:'Stephanus'};
var SUP='⁰¹²³⁴⁵⁶⁷⁸⁹';
function $(id){return document.getElementById(id);}
function el(tag,cls,txt){var e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e;}
function roman(n){return ['','I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][n];}
var MI=window.GNT_MSINFO||{};
function msName(m){var x=MI[m.ga];return x&&x.n?x.n+' — ':'';}
function century(m){return Math.ceil(m.mid/100);}
function ord(n){var s=['th','st','nd','rd'],v=n%100;return n+(s[(v-20)%10]||s[v]||s[0]);}
function label(m){return m.ga.charAt(0)==='\uD835'?m.ga:(m.w||m.ga);}
function sub(m){return (m.w&&m.ga.charAt(0)!=='\uD835')?m.ga:'';}
function marks(f){
  var s='',t=[];
  f=f||[];
  f.forEach(function(x){
    if(x==='orig'){s+='∗';t.push('original hand');}
    else if(x==='vid'){s+=' vid';t.push('“vid”: the reading appears to be this, but the manuscript is hard to read');}
    else if(x==='corr'){s+='ᶜ';t.push('a corrector');}
    else if(/^corr\d+$/.test(x)){s+=x.slice(4).split('').map(function(d){return SUP[+d];}).join('');t.push('corrector, hand '+x.slice(4));}
    else if(x==='minor'){t.push('cited in parentheses: it differs slightly from this reading');}
  });
  return {s:s,t:t.join('; ')};
}
function fmtNote(t){return t.replace(/\^\(?([0-9]+)\)?/g,function(m,d){return d.split('').map(function(x){return SUP[+x];}).join('');}).replace(/\^vid/g,' vid').replace(/\^c/g,'ᶜ').replace(/\^s/g,'ˢ').replace(/∗/g,'∗');}
function dateText(d){
  var R={I:1,II:2,III:3,IV:4,V:5,VI:6,VII:7,VIII:8,IX:9,X:10,XI:11,XII:12};
  if(/^\d+$/.test(d))return 'AD '+d;
  if(d.indexOf('/')>0){var p=d.split('/');return 'Turn of the '+ord(R[p[0]])+' and '+ord(R[p[1]])+' centuries ('+d+')';}
  if(d.indexOf('-')>0){var q=d.split('-');return 'Between the '+ord(R[q[0]])+' and '+ord(R[q[1]])+' centuries ('+d+')';}
  return ord(R[d])+' century ('+d+')';
}
function nameInto(parent,m,k,minor){
  if(minor)parent.appendChild(document.createTextNode('('));
  var pap=m.ga.charAt(0)==='\uD835';
  parent.appendChild(document.createTextNode(pap?'\uD835\uDD13':(m.supp&&m.w?m.w.slice(0,-1):label(m))));
  if(pap){
    /* 𝔓 + raised number; any mark such as vid is raised again, relative to the number */
    var num=el('sup','mk',m.ga.slice(2));
    var mk=((m.supp?'s':'')+(k||'')).replace(/^\s+/,'');
    if(mk)num.appendChild(el('sup','mk',mk));
    parent.appendChild(num);
  }else{
    /* a corrector mark (c, a number, or the star) is raised once; any "vid" after it is raised again, relative to that mark */
    var t=(m.supp?'s':'')+(k||'');
    var mv=/^(.+?)\s*vid$/.exec(t);
    if(mv){var base=el('sup','mk',mv[1]);base.appendChild(el('sup','mk','vid'));parent.appendChild(base);}
    else if(t)parent.appendChild(el('sup','mk',t));
  }
  if(minor)parent.appendChild(document.createTextNode(')'));
}
/* English words in a note (for, om., adds, before ...) are set in italic, as in the printed book */
function plainInto(parent,txt,italic){
  if(!italic){parent.appendChild(document.createTextNode(txt));return;}
  txt.split(/((?:Appendix\s+[A-Z]|[a-z]{2,}\.?)(?:\s+(?:Appendix\s+[A-Z]|[a-z]{2,}\.?))*)/).forEach(function(q){
    if(!q)return;
    if(/^(?:Appendix|[a-z]{2,})/.test(q))parent.appendChild(el('i',null,q));
    else parent.appendChild(document.createTextNode(q));
  });
}
function noteInto(parent,text,italic){
  text.split(/(\^(?:\(?[0-9A-Za-zᶜ∗,]+\)?,?)+|∗)/).forEach(function(p){
    if(!p)return;
    if(p.charAt(0)==='^')parent.appendChild(el('sup','mk',p.slice(1)));
    else if(p==='∗')parent.appendChild(el('sup','mk','∗'));
    else plainInto(parent,p,italic);
  });
}
function sortWits(ws){return ws.slice().sort(function(a,b){var A=byGa[a.ga],B=byGa[b.ga];return (A?A.mid:9999)-(B?B.mid:9999)||(a.ga<b.ga?-1:1);});}

/* ---------- Variant list ---------- */
var state={group:'All',kind:'All'};
function seg(host,items,key){
  host.textContent='';
  items.forEach(function(it){
    var b=el('button',null,it[1]);b.type='button';b.setAttribute('aria-pressed',state[key]===it[0]?'true':'false');
    b.addEventListener('click',function(){state[key]=it[0];renderSeg();renderList();});
    host.appendChild(b);
  });
}
function renderSeg(){
  seg($('groupFilter'),[['All','All'],['Gospels','Gospels'],['Acts','Acts'],['Letters','Letters'],['Revelation','Revelation']],'group');
  seg($('kindFilter'),[['All','Any kind'],['passage','Passages'],['phrase','Phrases'],['wording','Wording']],'kind');
}
var visible=[];
function renderList(){
  var host=$('vgrid');host.textContent='';
  visible=V.filter(function(v){return (state.group==='All'||v.group===state.group)&&(state.kind==='All'||v.kind===state.kind);});
  visible.forEach(function(v){
    var li=el('li','vcard');var b=el('button');b.type='button';
    b.appendChild(el('span','ref',v.ref));
    b.appendChild(el('p','what',v.what));
    var meta=el('span','meta');meta.appendChild(el('span','tag',KIND_TAG[v.kind]));meta.appendChild(el('span',null,'Page '+v.page));
    b.appendChild(meta);
    b.addEventListener('click',function(){openVariant(v.id);});
    li.appendChild(b);host.appendChild(li);
  });
  if(!visible.length)host.appendChild(el('li','vempty','No variants match these filters.'));
  $('vcount').textContent='Showing '+visible.length+' of '+V.length;
}

/* ---------- Detail dialog ---------- */
var dlg=$('vdialog'),cur=null;
function earliest(r){
  var ws=sortWits(r.wits).filter(function(w){return byGa[w.ga];});
  if(!ws.length)return null;
  var m=byGa[ws[0].ga],p=el('p','early');
  p.appendChild(document.createTextNode('Earliest manuscript cited: '));
  nameInto(p,m,'');
  p.appendChild(document.createTextNode((sub(m)?' (GA '+sub(m)+')':'')+', '+dateText(m.date)));
  return p;
}
function chip(w,vid,ri){
  var m=byGa[w.ga];
  if(!m){var u=el('span','w unl');u.textContent=w.ga;u.title='Cited in the apparatus but not listed in Appendix D';u.appendChild(el('small',null,'not in App. D'));return u;}
  var mk=marks(w.f),minor=(w.f||[]).indexOf('minor')>=0;
  var b=el('button','w');b.type='button';
  var gl=el('span','gl');nameInto(gl,m,w.k,minor);b.appendChild(gl);
  var s=sub(m);if(s)b.appendChild(el('small',null,s));
  b.appendChild(el('small',null,m.date));
  b.title=(msName(m)+label(m)+(s?' (GA '+s+')':'')+', '+m.date+(mk.t?'. '+mk.t:'')+'. Select to see it on the timeline.');
  b.addEventListener('click',function(){dlg.close();showOnTimeline(m.ga,vid);});
  return b;
}
function bsuffix(x){return x.b===2?', printed in double brackets':x.b===1?', printed in brackets':x.b===3?', printed in chevrons (« »)':'';}
function edText(x){
  if(x.s==='main')return 'Same as the main text';
  if(x.s==='na')return 'Not applicable in this book';
  if(x.s==='bracket')return 'Prints it in brackets';
  if(x.s==='double')return 'Prints it in double brackets';
  if(x.s==='chevron')return 'Prints it in chevrons (« »)';
  if(x.s==='split')return 'Split guiding line';
  if(x.s==='differs'){var t=x.t||'';return t==='om.'?'Omits it':(t.length<70?'Reads: ':'Reads a longer form')+(t.length<70?t:'')+bsuffix(x);}
  return '';
}
function openVariant(id){
  var v=V.filter(function(x){return x.id===id;})[0];if(!v)return;cur=v;
  var b=$('vbody');b.textContent='';
  b.appendChild(el('h3',null,v.ref)).id='vtitle';
  var wh=el('p','where');wh.appendChild(document.createTextNode('Page '));wh.appendChild(window.GNTPages.link(String(v.page),v.page));wh.appendChild(document.createTextNode(' of the edition · footnote “'+v.caller+'” · '+KIND[v.kind]));b.appendChild(wh);
  b.appendChild(el('p','summary',v.what));
  b.appendChild(el('h4',null,'The readings and the manuscripts cited for each'));
  v.readings.forEach(function(r,i){
    var stat=!r.greek&&r.status;
    var box=el('div','rd'+(stat?' stat':''));box.style.setProperty('--c',COLORS[i%COLORS.length]);
    var rl=el('div','rl');
    if(!stat){var bd=el('span','badge',i===0?'Main text':'Reading '+(i+1));rl.appendChild(bd);}
    rl.appendChild(el('b',null,r.label));
    box.appendChild(rl);
    if(r.expl)box.appendChild(el('p','keyline',r.expl));
    if(!stat&&r.greek){var g=el('p','gk',r.greek);g.lang='grc';box.appendChild(g);}
    if(r.eds&&r.eds.length){box.appendChild(el('p','keyline','The printed note adds: '+r.eds.map(function(e){return e.replace('RP^mg','the alternate Byzantine reading (Robinson–Pierpont)').replace('RPmg','the alternate Byzantine reading (Robinson–Pierpont)');}).join(', ')+' ('+(r.eds.indexOf('CT')>=0?'agreement of the critical editions':'edition note')+').'));}
    var e=earliest(r);if(e&&!stat)box.appendChild(e);
    var chips=el('div','chips');
    sortWits(r.wits).forEach(function(w){chips.appendChild(chip(w,v.id,i));});
    box.appendChild(chips);
    if(r.notes&&r.notes.length){var ul=el('ul','notes');r.notes.forEach(function(n){var li=el('li');li.appendChild(document.createTextNode('Note on '));noteInto(li,n.who);li.appendChild(document.createTextNode(': '));noteInto(li,n.note,true);ul.appendChild(li);});box.appendChild(ul);}
    b.appendChild(box);
  });
  b.appendChild(el('p','keyline','Reading ∗ = the original hand; a small number or ᶜ = a corrector; “vid” = the reading appears to be this; a name in parentheses = a minor difference within this reading. Manuscripts that cannot be read at this point are marked as such.'));
  /* editions */
  b.appendChild(el('h4',null,'How the eleven editions compare'));
  if(v.parts)b.appendChild(el('p','keyline','The printed notes on this passage come in two parts: '+v.parts.join('; ')+'. Each edition is shown with its entry for both. A verse number in parentheses is the number that edition gives the verse; see Appendix C and the printed notes for the full picture.'));
  var g=el('div','edgrid');
  FAMILY.forEach(function(f){
    var col=el('div');col.appendChild(el('h5',null,f[0]));var ul=el('ul');
    f[1].forEach(function(e){var x=v.editions[e]||{s:'main'};var li=el('li',x.s);li.appendChild(el('b',null,e));
      var sp=el('span');var t=edText(x);
      if(v.parts&&x.s==='main'){sp.textContent='Same as the main text in both notes';}
      else if(v.parts&&x.s==='differs'){
        [['a',x.t],['b',x.t2]].forEach(function(p){var ln=el('span','part');ln.appendChild(el('b',null,'Note '+p[0]+': '));if(p[1])noteInto(ln,p[1],true);else ln.appendChild(document.createTextNode('same as the main text'));sp.appendChild(ln);});
      }
      else if(x.s==='differs'&&x.t&&x.t!=='om.'&&x.t.length<70){sp.appendChild(document.createTextNode('Reads: '));var gk=el('span','gk',x.t);gk.lang='grc';sp.appendChild(gk);if(x.b)sp.appendChild(document.createTextNode(bsuffix(x)));}else sp.textContent=t;
      li.appendChild(sp);li.title=EDNAME[e];ul.appendChild(li);});
    col.appendChild(ul);g.appendChild(col);
  });
  b.appendChild(g);
  if(v.editions.RPmg){
    var g2=el('div','edgrid rpm'),c2=el('div');var h2=el('h5',null,'Alternate Byzantine reading (RP');h2.appendChild(el('sup',null,'mg'));h2.appendChild(document.createTextNode(')'));c2.appendChild(h2);
    var u2=el('ul'),x2=v.editions.RPmg,l2=el('li',x2.s);var b2=el('b',null,'RP');b2.appendChild(el('sup',null,'mg'));l2.appendChild(b2);
    var s2=el('span');
    if(x2.s==='differs'&&x2.t&&x2.t!=='om.'){s2.appendChild(document.createTextNode('Reads: '));var k2=el('span','gk',x2.t);k2.lang='grc';s2.appendChild(k2);}else s2.textContent=edText(x2);
    l2.appendChild(s2);l2.title='Robinson–Pierpont, alternate Byzantine reading';u2.appendChild(l2);c2.appendChild(u2);g2.appendChild(c2);b.appendChild(g2);
  }
  var ef=el('p','edfoot');if(v.complex){ef.appendChild(document.createTextNode('This note uses special conventions; read the printed note on page '));ef.appendChild(window.GNTPages.link(String(v.page),v.page));ef.appendChild(document.createTextNode(' for the full detail. '));}ef.appendChild(document.createTextNode('An edition shown as “same as the main text” is not named in the printed note, which lists only editions that differ.'));b.appendChild(ef);
  var tl=el('p','tl-link');var a=el('button','btn btn-quiet','Show these witnesses on the timeline');a.type='button';
  a.addEventListener('click',function(){dlg.close();pickVariant(v.id);});tl.appendChild(a);b.appendChild(tl);
  var i=visible.indexOf(v);$('vprev').disabled=i<=0;$('vnext').disabled=i<0||i>=visible.length-1;
  if(!dlg.open)dlg.showModal();
  $('vbody').scrollTop=0;
}
function step(d){var i=visible.indexOf(cur)+d;if(i>=0&&i<visible.length)openVariant(visible[i].id);}
$('vprev').addEventListener('click',function(){step(-1);});
$('vnext').addEventListener('click',function(){step(1);});
$('vclose').addEventListener('click',function(){dlg.close();});
dlg.addEventListener('click',function(e){if(e.target===dlg)dlg.close();});
dlg.addEventListener('keydown',function(e){if(e.key==='ArrowLeft'){step(-1);}else if(e.key==='ArrowRight'){step(1);}});

/* ---------- Timeline ---------- */
var tlState={content:{e:true,a:true,p:true,r:true},sel:null,variant:''};
/* Which group of manuscripts a variant belongs to, from its book */
function codeOf(v){
  var b=v.ref.replace(/\s+\d.*$/,'');
  if(/^(Matthew|Mark|Luke|John)$/.test(b))return 'e';
  if(/^(Acts|James|1 Peter|2 Peter|1 John|2 John|3 John|Jude)$/.test(b))return 'a';
  if(b==='Revelation')return 'r';
  return 'p';
}
function chosenVariant(){return V.filter(function(x){return x.id===tlState.variant;})[0]||null;}
/* the contents actually shown: the passage's own group when a variant is chosen, otherwise the visitor's choice */
function activeContent(){
  var v=chosenVariant();
  if(!v)return tlState.content;
  var o={e:false,a:false,p:false,r:false};o[codeOf(v)]=true;return o;
}
function renderContentFilter(){
  var host=$('contentFilter');host.textContent='';
  var v=chosenVariant(),act=activeContent();
  ['e','a','p','r'].forEach(function(k){
    var b=el('button',null,CODE_SHORT[k]);b.type='button';b.setAttribute('aria-pressed',act[k]?'true':'false');
    if(v){b.disabled=true;b.title='Showing the manuscripts that contain '+CONTENT[codeOf(v)]+', where '+v.ref+' stands. Choose “(choose a variant)” to change this.';host.appendChild(b);return;}
    b.title='Manuscripts containing '+CONTENT[k];
    b.addEventListener('click',function(){tlState.content[k]=!tlState.content[k];if(!Object.keys(tlState.content).some(function(x){return tlState.content[x];}))tlState.content[k]=true;renderContentFilter();renderTimeline();});
    host.appendChild(b);
  });
}
function renderPick(){
  var s=$('variantPick');s.textContent='';
  var o=el('option',null,'(choose a variant)');o.value='';s.appendChild(o);
  V.forEach(function(v){var o=el('option',null,v.ref);o.value=v.id;s.appendChild(o);});
  s.addEventListener('change',function(){tlState.variant=s.value;renderContentFilter();renderTimeline();});
}
function pickVariant(id){tlState.variant=id;$('variantPick').value=id;renderContentFilter();renderTimeline();document.getElementById('timeline').scrollIntoView({behavior:'smooth',block:'start'});}
function isCorr(f){f=f||[];if(f.indexOf('orig')>=0)return false;return f.some(function(x){return x==='corr'||/^corr\d+$/.test(x);});}
function witnessMap(v){
  /* per manuscript: the reading of the manuscript itself (original hand or unmarked), and separately any corrector readings */
  var map={};
  v.readings.forEach(function(r,i){r.wits.forEach(function(w){
    if(!byGa[w.ga])return;
    var e=map[w.ga]||(map[w.ga]={prim:[],corr:[]});
    if(!r.greek&&r.status){e.status=r.status;return;}
    var list=isCorr(w.f)?e.corr:e.prim;
    if(list.indexOf(i)<0)list.push(i);
  });});
  return map;
}
function renderTimeline(){
  var host=$('tl');host.textContent='';
  var v=V.filter(function(x){return x.id===tlState.variant;})[0];
  var map=v?witnessMap(v):null;
  var lg=$('legend');lg.textContent='';
  if(v){lg.hidden=false;lg.appendChild(el('span',null,v.ref+':'));
    v.readings.forEach(function(r,i){if(!r.wits.length||(!r.greek&&r.status))return;var s=el('span');s.style.setProperty('--c',COLORS[i%COLORS.length]);s.appendChild(el('i'));s.appendChild(document.createTextNode((i===0?'Main text: ':'Reading '+(i+1)+': ')+r.label));lg.appendChild(s);});
    var op=el('span');op.appendChild(document.createTextNode('Faded: not cited for this variant'));lg.appendChild(op);
    var o2=el('span');var d2=el('i','cdot');d2.style.setProperty('--c','var(--ink-soft)');o2.appendChild(d2);o2.appendChild(document.createTextNode(' Small square: a corrector’s reading, when it differs from the manuscript’s own'));lg.appendChild(o2);
    var o4=el('span');var d4=el('i','unavi');o4.appendChild(d4);o4.appendChild(document.createTextNode(' Grey with dots: inaccessible or unreadable here'));lg.appendChild(o4);
    var o3=el('span');var d3=el('i','dashed');o3.appendChild(d3);o3.appendChild(document.createTextNode(' Dashed outline: only a corrector is cited'));lg.appendChild(o3);
  }else lg.hidden=true;
  var groups={};
  var AC=activeContent();M.forEach(function(m){var show=m.c.split('').some(function(c){return AC[c];});if(!show)return;(groups[century(m)]=groups[century(m)]||[]).push(m);});
  Object.keys(groups).map(Number).sort(function(a,b){return a-b;}).forEach(function(c){
    var era=el('div','era');var h=el('h3',null,roman(c));h.appendChild(el('small',null,ord(c)+' century'));era.appendChild(h);
    var chips=el('div','chips');
    groups[c].sort(function(a,b){return a.mid-b.mid||(a.ga<b.ga?-1:1);}).forEach(function(m){
      var b=el('button','m');b.type='button';b.dataset.ga=m.ga;
      var gl0=el('span','gl');nameInto(gl0,m,'',false);b.appendChild(gl0);var s=sub(m);if(s)b.appendChild(el('small',null,s));
      if(!/^[IVX]+$/.test(m.date)){b.appendChild(el('small',null,m.date));}
      b.setAttribute('aria-pressed',tlState.sel===m.ga?'true':'false');
      b.title=(CONTENT[m.c[0]]&&m.c.split('').map(function(x){return CONTENT[x];}).join(', '))+' · '+m.date;
      if(map){
        var e=map[m.ga];
        if(!e){b.classList.add('dim');}
        else if(!e.prim.length&&!e.corr.length){b.classList.add('unav');b.title+='. '+e.status.charAt(0).toUpperCase()+e.status.slice(1)+' at this point, so its reading is not known';b.setAttribute('aria-label',label(m)+'. '+e.status+' at this point');}
        else{
          var rn=function(i){return (i===0?'the main text reading':'reading '+(i+1))+' ('+v.readings[i].label+')';};
          var tip=[];
          if(e.prim.length){b.classList.add('hl');b.style.setProperty('--c',COLORS[e.prim[0]%COLORS.length]);tip.push('Manuscript itself: '+rn(e.prim[0]));}
          else{b.classList.add('conly');b.style.setProperty('--c',COLORS[e.corr[0]%COLORS.length]);tip.push('Only a corrector is cited');}
          var extra=e.prim.slice(1).concat(e.corr.filter(function(i){return e.prim.indexOf(i)<0||true;}));
          var seenx={};
          e.corr.forEach(function(i){
            if(e.prim.length&&e.prim[0]===i)return;
            var d=el('span','cdot');d.style.setProperty('--c',COLORS[i%COLORS.length]);d.setAttribute('aria-hidden','true');b.appendChild(d);
            tip.push('A corrector: '+rn(i));
          });
          e.prim.slice(1).forEach(function(i){var d=el('span','cdot');d.style.setProperty('--c',COLORS[i%COLORS.length]);d.setAttribute('aria-hidden','true');b.appendChild(d);tip.push('Also cited for '+rn(i));});
          b.title+='. '+tip.join('; ');
          b.setAttribute('aria-label',(label(m))+'. '+tip.join('; '));
        }
      }
      b.addEventListener('click',function(){selectMs(m.ga);});
      chips.appendChild(b);
    });
    era.appendChild(chips);host.appendChild(era);
  });
}
function selectMs(ga){
  tlState.sel=ga;
  Array.prototype.forEach.call(document.querySelectorAll('.tl .m'),function(b){b.setAttribute('aria-pressed',b.dataset.ga===ga?'true':'false');});
  var m=byGa[ga],host=$('msinfo');host.classList.remove('is-empty');host.textContent='';
  var h=el('h3');var hg=el('span','greek');nameInto(hg,m,'',false);h.appendChild(hg);host.appendChild(h);
  var dl=el('dl');
  function row(k,v){dl.appendChild(el('dt',null,k));var dd=el('dd');if(typeof v==='string')dd.textContent=v;else dd.appendChild(v);dl.appendChild(dd);}
  function gaNode(ga){var f=document.createDocumentFragment();if(ga.charAt(0)==='\uD835'){f.appendChild(document.createTextNode(ga.slice(0,2)));f.appendChild(el('sup','mk',ga.slice(2)));}else f.appendChild(document.createTextNode(ga));return f;}
  var xi=MI[m.ga]||{};
  if(xi.n)row('Name',xi.n);
  row('GA number',gaNode(m.ga));row('Letter',m.w||'—');
  row('Contains',m.c.split('').map(function(x){return CONTENT[x];}).join('; '));
  row('Date',dateText(m.date));
  if(xi.lib||xi.city)row('Kept at',(xi.lib||'')+(xi.city?', '+xi.city:'')+(xi.ctry&&xi.ctry!==xi.city?' ('+xi.ctry+')':'')+(xi.sh?' · '+xi.sh:''));
  host.appendChild(dl);
  var more=el('p','more');var ma=el('a',null,'Open full entry →');ma.href='manuscripts.html#ms-'+m.ga;more.appendChild(ma);host.appendChild(more);
  var cites=[];
  V.forEach(function(v){v.readings.forEach(function(r,i){r.wits.forEach(function(w){if(w.ga===ga){cites.push({v:v,i:i,f:w.f,k:w.k});}});});});
  var seen={};cites=cites.filter(function(c){var k=c.v.id+'|'+c.i;if(seen[k])return false;seen[k]=1;return true;});
  var ids=new Set(cites.map(function(c){return c.v.id;}));
  var gc={};cites.forEach(function(c){gc[c.v.group]=(gc[c.v.group]||0)+1;});
  var parts=Object.keys(gc).map(function(k){return k;});
  host.appendChild(el('h4',null,'Cited in '+ids.size+' of the 50 variants'));
  host.appendChild(el('p','where',ids.size?('Found in: '+parts.join(', ')+'.'):'Not cited.'));
  var ul=el('ul','citelist');
  cites.forEach(function(c){
    var li=el('li');var b=el('button',null,c.v.ref);b.type='button';b.addEventListener('click',function(){openVariant(c.v.id);});
    li.appendChild(b);var r=c.v.readings[c.i];
    var mk=marks(c.f);
    var sp=el('span',null,' — '+(c.i===0?'main text':'reading '+(c.i+1))+': '+r.label);
    if(c.k){sp.appendChild(document.createTextNode(' ('));nameInto(sp,m,c.k,false);sp.appendChild(document.createTextNode(')'));}
    li.appendChild(sp);
    ul.appendChild(li);
  });
  host.appendChild(ul);
  if(window.matchMedia('(max-width:980px)').matches)host.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function showOnTimeline(ga,vid){tlState.variant=vid;$('variantPick').value=vid;renderContentFilter();
  /* make sure the manuscript's content type is visible */
  var m=byGa[ga];if(!m.c.split('').some(function(c){return tlState.content[c];})){m.c.split('').forEach(function(c){tlState.content[c]=true;});renderContentFilter();}
  renderTimeline();document.getElementById('timeline').scrollIntoView({behavior:'smooth',block:'start'});selectMs(ga);}


/* ---------- Edition agreement grid ---------- */
var gs={ref:'main',group:'All'};
var ALLEDS=['HF','PCK','PT','ECM','NA27','NA28','SBL','TH','WH','SCR','ST'];
function cellFor(v,e,ref){
  var x=v.editions[e]||{s:'main'};
  {
    if(x.s==='main')return ['same','=','Same as the main text'];
    if(x.s==='differs')return ['differs','≠','Reads differently'+(x.t?': '+(x.t==='om.'?'omits it':x.t):'')+bsuffix(x)];
    if(x.s==='bracket')return ['bracket','[ ]','Prints it in brackets'];
    if(x.s==='double')return ['bracket','[[ ]]','Prints it in double brackets'];
    if(x.s==='chevron')return ['bracket','« »','Prints it in chevrons (« »)'];
    if(x.s==='split')return ['bracket','split','Split guiding line'];
    return ['na','–','Not applicable in this book'];
  }
}
function renderGrid(){
  var t=$('agree');t.textContent='';
  var ref=gs.ref;
  var rows=V.filter(function(v){return gs.group==='All'||v.group===gs.group;});
  var thead=el('thead');
  var r1=el('tr');r1.appendChild(el('th','corner'));r1.firstChild.rowSpan=2;r1.firstChild.scope='col';r1.firstChild.textContent='Passage';
  FAMILY.forEach(function(f){var th=el('th','fam',f[0].replace(' editions',''));th.colSpan=f[1].length;th.scope='colgroup';r1.appendChild(th);});
  thead.appendChild(r1);
  var r2=el('tr');
  FAMILY.forEach(function(f){f[1].forEach(function(e){var th=el('th','ed',e);th.scope='col';th.title=EDNAME[e];if(e===ref)th.classList.add('refcol');r2.appendChild(th);});});
  thead.appendChild(r2);t.appendChild(thead);
  var tb=el('tbody');
  var totals={},counted={};ALLEDS.forEach(function(e){totals[e]=0;counted[e]=0;});
  var lastBook='';
  rows.forEach(function(v){
    var book=v.ref.replace(/\s[\d:–\-]+$/,'');
    if(book!==lastBook){var br=el('tr','book');var bh=el('th',null,book);bh.colSpan=12;bh.scope='rowgroup';br.appendChild(bh);tb.appendChild(br);lastBook=book;}
    var tr=el('tr');var th=el('th','pass');th.scope='row';
    var b=el('button',null,v.ref.slice(book.length+1));b.type='button';b.title=v.ref+': '+v.what;b.addEventListener('click',function(){openVariant(v.id);});th.appendChild(b);tr.appendChild(th);
    ALLEDS.forEach(function(e){
      var c=cellFor(v,e,ref);var td=el('td','c '+c[0],c[1]);td.title=v.ref+' · '+e+': '+c[2];td.setAttribute('aria-label',e+': '+c[2]);
      if(e===ref)td.classList.add('refcol');
      if(c[0]!=='na'){counted[e]++;if(c[0]==='differs')totals[e]++;}
      tr.appendChild(td);
    });
    tb.appendChild(tr);
  });
  t.appendChild(tb);
  var tf=el('tfoot');var tr=el('tr');var th=el('th','pass',ref==='main'?'Differs from the main text':'Differs from '+ref);th.scope='row';tr.appendChild(th);
  ALLEDS.forEach(function(e){var td=el('td','tot');td.textContent=counted[e]?totals[e]+' of '+counted[e]:'–';if(e===ref)td.classList.add('refcol');tr.appendChild(td);});
  tf.appendChild(tr);t.appendChild(tf);
  $('gkey').innerHTML='';
  [['same','=',ref==='main'?'Same as the main text':'Printed the same way'],['differs','≠',ref==='main'?'Reads differently':'Printed differently'],['bracket','[ ]','In brackets, double brackets, chevrons, or split (doubtful or divided)'],['na','–','Not applicable here']].forEach(function(k){var s=el('span');var i=el('i','c '+k[0],k[1]);s.appendChild(i);s.appendChild(document.createTextNode(' '+k[2]));$('gkey').appendChild(s);});
  $('gridnote').textContent='These counts cover only the fifty passages the editors chose as significant, and ECM is counted only where it applies (Mark, Acts, the Catholic Epistles, and Revelation). They are not a measure of how close any two editions are overall. An edition shown as “same” is simply not named in the printed note.';
}
function initGrid(){
  var g=$('gridGroup');
  function sg(){g.textContent='';['All','Gospels','Acts','Letters','Revelation'].forEach(function(k){var b=el('button',null,k);b.type='button';b.setAttribute('aria-pressed',gs.group===k?'true':'false');b.addEventListener('click',function(){gs.group=k;sg();renderGrid();});g.appendChild(b);});}
  sg();renderGrid();
}

initGrid();
renderSeg();renderList();renderContentFilter();renderPick();renderTimeline();
if(location.hash&&location.hash.indexOf('#v=')===0){openVariant(location.hash.slice(3));}
if(location.hash&&location.hash.indexOf('#ms=')===0){var g0=decodeURIComponent(location.hash.slice(4));if(byGa[g0]){selectMs(g0);document.getElementById('timeline').scrollIntoView({block:'start'});}}
})();
