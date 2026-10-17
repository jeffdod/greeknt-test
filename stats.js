(function(){
'use strict';
var D=window.GNT_NOTES; if(!D) return;
var EDS=D.eds, N=D.notes, BOOKS=D.books;
var BIT={}; EDS.forEach(function(e,i){BIT[e]=1<<i;});
var ALLG=[]; D.groups.forEach(function(g){if(ALLG.indexOf(g)<0)ALLG.push(g);});
var ECMGROUPS={'Mark':1,'Acts':1,'Catholic Epistles':1,'Revelation':1};
var SHOWN=['HF','PCK','PT','ECM','NA27','NA28','SBL','TH','WH','SCR','ST'];
var FAM={HF:'byz',PCK:'byz',PT:'byz',ECM:'crit',NA27:'crit',NA28:'crit',SBL:'crit',TH:'crit',WH:'crit',SCR:'tr',ST:'tr'};
var FAMNAME={byz:'Byzantine editions',crit:'Critical editions',tr:'Textus Receptus editions'};
var FAMCOL={byz:'var(--r3)',crit:'var(--r1)',tr:'var(--r2)'};
var EDNAME={HF:'Hodges–Farstad',PCK:'Pickering',PT:'Antoniades (Patriarchal Text)',ECM:'Editio Critica Maior',NA27:'Nestle-Aland 27',NA28:'Nestle-Aland 28',SBL:'SBL Greek New Testament',TH:'Tyndale House',WH:'Westcott–Hort',SCR:'Scrivener',ST:'Stephanus'};
var OPTNAME={PCK:'Pickering',PT:'Antoniades Patriarchal Text',SBL:'SBL Greek NT'};
var KINDS={bracket:'only brackets or parentheses differ',omit:'omits words',add:'adds words',order:'changes the word order',diff:'a different word',elide:'elision',form:'same word, different spelling or form',other:'no label',special:'descriptive note'};
var $=function(id){return document.getElementById(id);};
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e;}
function fmt(n){return n.toLocaleString('en-US');}
function pct(x){return (x*100).toFixed(1)+'%';}

/* ---------- group of a book ---------- */
function groupOf(n){return D.groups[n[1]];}
function edApplies(ed,grp){return ed!=='ECM'||!!ECMGROUPS[grp];}
function ecmBothBranchesDiffer(n){
  // ECM split note (ECM†): if neither branch is the main text, ECM differs either way
  if(!n[7])return false;
  var bs=BIT.ECMs,has=false,txt=false;
  for(var i=0;i<n[5].length;i++){var r=n[5][i];if(r[0]&bs){if(r[1]==='txt')txt=true;else has=true;}}
  return has&&!txt;
}
function differs(n,ed){
  var b=BIT[ed];
  for(var i=0;i<n[5].length;i++){var r=n[5][i]; if((r[0]&b)&&r[1]!=='txt') return true;}
  if(ed==='ECM'&&ecmBothBranchesDiffer(n))return true;
  return false;
}
function bracketed(n,ed){var b=BIT[ed];for(var i=0;i<n[6].length;i++)if(n[6][i][1]&b)return true;return false;}

/* ---------- chart ---------- */
var stats={}; // group -> {total, ed:{HF:count}, split:count}
ALLG.forEach(function(g){stats[g]={total:0,ed:{},split:0};SHOWN.forEach(function(e){stats[g].ed[e]=0;});});
N.forEach(function(n){
  var g=groupOf(n),s=stats[g];s.total++;
  SHOWN.forEach(function(e){if(edApplies(e,g)&&differs(n,e))s.ed[e]++;});
  if(n[7])s.split++;
});
var maxShare=0;
ALLG.forEach(function(g){SHOWN.forEach(function(e){if(edApplies(e,g))maxShare=Math.max(maxShare,stats[g].ed[e]/stats[g].total);});});
maxShare=Math.ceil(maxShare*20)/20;

function buildKey(){
  var k=$('famkey');
  ['byz','crit','tr'].forEach(function(f){
    var s=el('span');var i=el('i','swatch sw-'+f);
    s.appendChild(i);s.appendChild(document.createTextNode(FAMNAME[f]));k.appendChild(s);
  });
}
function buildChart(){
  var total=N.length;
  $('chartlede').textContent='The Edition Apparatus has '+fmt(total)+' notes. For each part of the New Testament, each bar shows the share of that part’s notes in which the edition reads differently from the main text. A longer bar means the edition is named in more of the notes, so it differs from the main text more often.';
  var grid=$('cgrid');
  ALLG.forEach(function(g){
    var s=stats[g],p=el('div','cpanel');
    var h=el('h3',null,g);p.appendChild(h);
    p.appendChild(el('p','csub',fmt(s.total)+' notes'));
    SHOWN.forEach(function(e){
      if(!edApplies(e,g))return;
      var c=s.ed[e],sh=c/s.total;
      var row=el('button','crow');row.type='button';
      row.title=EDNAME[e]+' reads differently from the main text in '+fmt(c)+' of '+fmt(s.total)+' notes in '+g+' ('+pct(sh)+'). Click to list them.';
      row.setAttribute('aria-label',e+', '+g+': '+fmt(c)+' of '+fmt(s.total)+' notes, '+pct(sh)+'. Show these notes.');
      var nm=el('span','cname',e),tr=el('span','ctrack'),bar=el('span','cbar');
      bar.style.width=(sh/maxShare*100)+'%';bar.style.background=FAMCOL[FAM[e]];
      tr.appendChild(bar);
      var v=el('span','cval',pct(sh));
      row.appendChild(nm);row.appendChild(tr);row.appendChild(v);
      row.addEventListener('click',function(){
        $('fEd').value=e;$('fRel').value='differs';$('fWhere').value='g:'+g;$('fKind').value='';$('fPat').value='';$('fRef').value='';$('fGreek').value='';
        update(true);
        $('find').scrollIntoView({behavior:'smooth'});
      });
      p.appendChild(row);
    });
    grid.appendChild(p);
  });
  $('chartnote').innerHTML='Scale: the longest bar is '+Math.round(maxShare*100)+'%, and every panel uses the same scale. The Editio Critica Maior (ECM) is shown only where it exists: Mark, Acts, the Catholic Epistles, and Revelation. A note is counted once for an edition if the edition reads differently from the main text in any of the readings listed. Where ECM prints a split guiding line (ECM†), ECM is counted as differing only if neither of its two branches is the main text’s reading; the “ECM split” column of the table counts all such notes. This chart counts <em>printed notes</em>. It does not measure how close two texts are, because a note may concern one letter or a whole verse, and the apparatus does not record accents, punctuation, movable nu, final sigma, or spacing in compound words.';
  // table
  var t=$('ctable'),h='<thead><tr><th class="corner" scope="col">Part of the New Testament</th><th scope="col">Notes</th>';
  SHOWN.forEach(function(e){h+='<th scope="col" class="ed" title="'+EDNAME[e]+'">'+e+'</th>';});
  h+='<th scope="col" title="Notes where ECM prints a split guiding line">ECM split</th></tr></thead><tbody>';
  var tot={n:0,ed:{},sp:0};SHOWN.forEach(function(e){tot.ed[e]=0;});
  ALLG.concat(['__all']).forEach(function(g){
    var s;
    if(g==='__all'){s={total:0,ed:{},split:0};SHOWN.forEach(function(e){s.ed[e]=0;});ALLG.forEach(function(x){s.total+=stats[x].total;s.split+=stats[x].split;SHOWN.forEach(function(e){s.ed[e]+=stats[x].ed[e];});});}
    else s=stats[g];
    h+='<tr'+(g==='__all'?' class="book"':'')+'><th class="pass" scope="row">'+(g==='__all'?'Whole New Testament':g)+'</th><td class="c">'+fmt(s.total)+'</td>';
    SHOWN.forEach(function(e){
      if(g!=='__all'&&!edApplies(e,g)){h+='<td class="c na">–</td>';return;}
      var den=s.total;
      if(g==='__all'&&e==='ECM'){den=0;ALLG.forEach(function(x){if(ECMGROUPS[x])den+=stats[x].total;});}
      h+='<td class="c">'+fmt(s.ed[e])+'<br><small>'+pct(s.ed[e]/den)+'</small></td>';
    });
    h+='<td class="c">'+(s.split?fmt(s.split):'–')+'</td></tr>';
  });
  h+='</tbody>';t.innerHTML=h;
}

/* ---------- filters ---------- */
function buildFilters(){
  var ed=$('fEd');
  ed.appendChild(new Option('Any edition',''));
  SHOWN.forEach(function(e){ed.appendChild(new Option(e+' — '+(OPTNAME[e]||EDNAME[e]),e));});
  var w=$('fWhere');
  w.appendChild(new Option('The whole New Testament',''));
  var og=document.createElement('optgroup');og.label='Parts';
  ALLG.forEach(function(g){og.appendChild(new Option(g,'g:'+g));});w.appendChild(og);
  var ob=document.createElement('optgroup');ob.label='Books';
  BOOKS.forEach(function(b,i){ob.appendChild(new Option(b,'b:'+i));});w.appendChild(ob);
}
var BOOKKEY=BOOKS.map(function(b){return b.toLowerCase().replace(/[^a-z0-9]/g,'');});
var ALIAS={mt:0,matt:0,mk:1,mar:1,lk:2,luk:2,jn:3,joh:3,ac:4,rom:5,ro:5,rm:5,'1co':6,'1cor':6,'2co':7,'2cor':7,gal:8,eph:9,php:10,phil:10,col:11,'1th':12,'1thess':12,'2th':13,'2thess':13,'1ti':14,'1tim':14,'2ti':15,'2tim':15,tit:16,phm:17,philem:17,heb:18,jas:19,jam:19,'1pe':20,'1pet':20,'2pe':21,'2pet':21,'1jn':22,'1jo':22,'1john':22,'2jn':23,'2jo':23,'2john':23,'3jn':24,'3jo':24,'3john':24,jud:25,rev:26,re:26};
function parseRef(s){
  s=s.trim().toLowerCase();
  if(!s)return null;
  var m=s.match(/^([1-3]?\s*[a-z]+\.?)\s*(?:(\d+)(?:\s*[:.]\s*(\d+))?)?\s*$/);
  if(!m)return {bad:true};
  var k=m[1].replace(/[^a-z0-9]/g,''),bi=-1;
  if(ALIAS.hasOwnProperty(k))bi=ALIAS[k];
  else{
    for(var i=0;i<BOOKKEY.length;i++){if(BOOKKEY[i].indexOf(k)===0){bi=i;break;}}
  }
  if(bi<0)return {bad:true};
  return {book:bi,ch:m[2]?m[2]:null,vs:m[3]?m[3]:null};
}
function norm(s){return s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/ς/g,'σ').replace(/\s+/g,' ').trim();}
var SEARCH=N.map(function(n){
  var t=[n[4]];n[5].forEach(function(r){t.push(r[1]);});
  return norm(t.join(' | '));
});

var CRITALL=['NA27','NA28','SBL','TH','WH','ECM'];
function criticalSet(n){return CRITALL.filter(function(e){return edApplies(e,groupOf(n));});}
function readOf(n,ed){ // index of the reading containing ed, -1 = main text
  var b=BIT[ed];for(var i=0;i<n[5].length;i++){var r=n[5][i];if((r[0]&b)&&r[1]!=='txt')return i;}
  return -1;
}
function matches(n,i,f){
  var g=groupOf(n);
  if(f.where){
    if(f.where.charAt(0)==='g'){if(g!==f.where.slice(2))return false;}
    else if(n[1]!==+f.where.slice(2))return false;
  }
  if(f.ref){
    if(n[1]!==f.ref.book)return false;
    var r=n[2];
    if(f.ref.ch){
      var cm=r.match(/^(\d+):(\d+)/);if(!cm||cm[1]!==f.ref.ch)return false;
      if(f.ref.vs&&cm[2]!==f.ref.vs)return false;
    }
  }
  if(f.greek&&SEARCH[i].indexOf(f.greek)<0)return false;
  if(f.rel==='split'){ if(!n[7])return false; }
  else if(f.rel==='bracket'){
    if(f.ed){if(!bracketed(n,f.ed))return false;} else if(!n[6].length)return false;
  } else if(f.rel==='either'){
    if(f.ed){if(!edApplies(f.ed,g)||!(differs(n,f.ed)||bracketed(n,f.ed)))return false;}
    else if(!n[5].length&&!n[6].length)return false;
  } else {
    if(f.ed){if(!edApplies(f.ed,g)||!differs(n,f.ed))return false;}
    else if(!n[5].length&&!n[6].length)return false;
  }
  if(f.kind&&(f.rel==='differs'||f.rel==='either')){
    var ok=false,b=f.ed?BIT[f.ed]:0;
    n[5].forEach(function(r){if((!b||(r[0]&b))&&r[1]!=='txt'&&r[3].indexOf(f.kind)>=0)ok=true;});
    if(f.kind==='bracket'&&(f.ed?bracketed(n,f.ed):n[6].length>0))ok=true;
    if(!ok)return false;
  }
  if(f.rel==='split'&&f.kind){var ok2=false;n[5].forEach(function(r){if(r[3].indexOf(f.kind)>=0)ok2=true;});if(!ok2)return false;}
  if(f.pat){
    var cs=criticalSet(n),st;
    if(f.pat==='critall'){
      st=cs.map(function(e){return readOf(n,e);});
      if(st[0]<0||st.some(function(x){return x!==st[0];}))return false;
    } else if(f.pat==='critsplit'){
      st=cs.map(function(e){return readOf(n,e);});
      if(st.every(function(x){return x===st[0];}))return false;
    } else if(f.pat==='byz'){
      if(!['HF','PCK','PT'].some(function(e){return differs(n,e);}))return false;
    } else if(f.pat==='trcrit'){
      var ok3=false;
      n[5].forEach(function(r){if(r[1]!=='txt'&&(r[0]&(BIT.SCR|BIT.ST))&&cs.some(function(e){return r[0]&BIT[e];}))ok3=true;});
      if(!ok3)return false;
    }
  }
  return true;
}

/* ---------- results ---------- */
var shown=0,hits=[],PER=40;
var PAGEMAX=0;N.forEach(function(n){if(n[0]>PAGEMAX)PAGEMAX=n[0];});
var BOOKSTART=[];BOOKS.forEach(function(_,bi){var m=1e9;N.forEach(function(n){if(n[1]===bi&&n[0]<m)m=n[0];});BOOKSTART.push(m);});

function getFilters(){
  var rf=parseRef($('fRef').value);
  return {ed:$('fEd').value,rel:$('fRel').value,where:$('fWhere').value,kind:$('fKind').value,pat:$('fPat').value,ref:rf&&!rf.bad?rf:null,refBad:!!(rf&&rf.bad),greek:norm($('fGreek').value)};
}
function tag(e){
  if(e==='RPmg'){var t=el('span','etag f-byz','RP');t.appendChild(el('sup',null,'mg'));t.title='Robinson–Pierpont, alternate Byzantine reading';return t;}
  return el('span','etag f-'+(FAM[e]||'crit'),e==='ECMs'?'ECM†':e);
}
function edsOf(mask){return EDS.filter(function(e){return mask&BIT[e];});}
function renderItem(n){
  var li=el('li','res');
  var head=el('div','rhd');
  var ref=el('b',null,BOOKS[n[1]]+' '+n[2]);
  head.appendChild(ref);
  head.appendChild(document.createTextNode(' · '));
  var pgs=el('span','pg');pgs.appendChild(document.createTextNode('page '));pgs.appendChild(window.GNTPages.link(String(n[0]),n[0]));head.appendChild(pgs);
  head.appendChild(el('span','caller',' note '+n[3]));
  li.appendChild(head);
  var lem=el('div','lem');lem.appendChild(el('span','lab','Main text: '));var gr=el('span','gk',n[4]);gr.lang='grc';lem.appendChild(gr);li.appendChild(lem);
  n[5].forEach(function(r){
    var d=el('div','rd');
    var tags=el('span','tags');
    edsOf(r[0]).forEach(function(e){tags.appendChild(tag(e));});
    if(r[0]&BIT.RPmg){}
    d.appendChild(tags);
    var t=el('span','gk',r[1]==='txt'?'reads the main text':r[1]);t.lang='grc';d.appendChild(t);
    var kk=r[3].filter(function(k){return k!=='special';});if(kk.length&&r[1]!=='txt'&&!(kk.length===1&&kk[0]==='other')){d.appendChild(el('span','kd',' ('+kk.map(function(k){return KINDS[k];}).join('; ')+')'));}
    li.appendChild(d);
  });
  n[6].forEach(function(b){
    var d=el('div','rd br');
    var tags=el('span','tags');edsOf(b[1]).forEach(function(e){tags.appendChild(tag(e));});
    d.appendChild(tags);
    d.appendChild(el('span','kd','print the main-text reading in '+(b[0]===2?'double brackets':b[0]===3?'chevrons (« »)':'brackets')));
    li.appendChild(d);
  });
  if(n[7])li.appendChild(el('div','rd br',null)).appendChild(el('span','kd','ECM prints a split guiding line here (ECM†).'));
  return li;
}
function drawStrip(hitsArr){
  var s=$('strip'),W=PAGEMAX;
  var counts=new Array(W+1).fill(0),mx=0;
  hitsArr.forEach(function(i){var p=N[i][0];counts[p]++;if(counts[p]>mx)mx=counts[p];});
  var cv=s.firstChild&&s.firstChild.tagName==='CANVAS'?s.firstChild:null;
  if(!cv){s.textContent='';cv=document.createElement('canvas');cv.setAttribute('role','img');cv.setAttribute('aria-label','Strip showing where the matching notes fall in the New Testament, from Matthew on the left to Revelation on the right. The same notes are listed below.');s.appendChild(cv);}
  var cssW=s.clientWidth||700,cssH=64,dpr=window.devicePixelRatio||1;
  cv.width=cssW*dpr;cv.height=cssH*dpr;cv.style.width=cssW+'px';cv.style.height=cssH+'px';
  var c=cv.getContext('2d');c.scale(dpr,dpr);c.clearRect(0,0,cssW,cssH);
  var cs=getComputedStyle(document.documentElement);
  var rub=cs.getPropertyValue('--rubric').trim()||'#8a2a1e',rule=cs.getPropertyValue('--rule').trim()||'#bdb6a6';
  var bw=cssW/W;
  for(var p=1;p<=W;p++){
    if(!counts[p])continue;
    var h=Math.max(3,counts[p]/Math.max(mx,1)*(cssH-6));
    c.fillStyle=rub;c.fillRect((p-1)*bw,cssH-h,Math.max(bw,1),h);
  }
  c.fillStyle=rule;
  BOOKSTART.forEach(function(p){c.fillRect((p-1)*bw,0,1,cssH);});
  c.fillRect(0,cssH-1,cssW,1);
  cv._geom={bw:bw,counts:counts};
  s.setAttribute('role','img');
  s.setAttribute('aria-label',hitsArr.length?('Matching notes fall on '+counts.filter(Boolean).length+' pages of the edition.'):'No matching notes.');
  // scale
  var sc=$('stripscale');sc.textContent='';
  [[0,'Matthew'],[BOOKSTART[1],'Mark'],[BOOKSTART[2],'Luke'],[BOOKSTART[3],'John'],[BOOKSTART[4],'Acts'],[BOOKSTART[5],'Romans'],[BOOKSTART[18],'Hebrews'],[BOOKSTART[26],'Rev.']].forEach(function(a){
    var sp=el('span',null,a[1]);sp.style.left=(Math.max(0,a[0]-1)/W*100)+'%';sc.appendChild(sp);
  });
}
function stripHover(){
  var s=$('strip'),chip=$('pagechip');
  s.addEventListener('mousemove',function(ev){
    var cv=s.firstChild;if(!cv||!cv._geom)return;
    var x=ev.clientX-cv.getBoundingClientRect().left,p=Math.min(PAGEMAX,Math.max(1,Math.floor(x/cv._geom.bw)+1)),n=cv._geom.counts[p]||0;
    chip.textContent='Page '+p+': '+n+' matching note'+(n===1?'':'s');
  });
  s.addEventListener('mouseleave',function(){chip.textContent='';});
  s.addEventListener('click',function(ev){
    var cv=s.firstChild;if(!cv||!cv._geom)return;
    var x=ev.clientX-cv.getBoundingClientRect().left,p=Math.floor(x/cv._geom.bw)+1;
    for(var k=0;k<hits.length;k++){if(N[hits[k]][0]>=p){
      while(shown<=k)showMore();
      var li=$('results').children[k];if(li){li.scrollIntoView({behavior:'smooth',block:'start'});li.classList.add('flash');setTimeout(function(){li.classList.remove('flash');},1600);}
      break;}}
  });
}
function showMore(){
  var ul=$('results'),end=Math.min(hits.length,shown+PER);
  for(;shown<end;shown++)ul.appendChild(renderItem(N[hits[shown]]));
  $('more').hidden=shown>=hits.length;
  if(!$('more').hidden)$('more').textContent='Show more ('+fmt(hits.length-shown)+' left)';
}
function update(){
  var f=getFilters();
  $('fEd').disabled=(f.rel==='split');
  var out=[];
  if(!f.refBad){for(var i=0;i<N.length;i++)if(matches(N[i],i,f))out.push(i);}
  hits=out;shown=0;$('results').textContent='';
  var c=$('rcount');
  if(f.refBad)c.textContent='I could not read that passage. Try a form like “Romans 8”, “John 1:18”, or “1 Cor 13”.';
  else c.textContent=out.length===0?'No notes match these choices.':fmt(out.length)+' note'+(out.length===1?'':'s')+' ('+pct(out.length/N.length)+' of all '+fmt(N.length)+') on '+fmt(new Set(out.map(function(i){return N[i][0];})).size)+(new Set(out.map(function(i){return N[i][0];})).size===1?' page.':' pages.');
  showMore();drawStrip(out);writeUrl();
}
var URLMAP={ed:'fEd',rel:'fRel',where:'fWhere',kind:'fKind',pat:'fPat',ref:'fRef',greek:'fGreek'};
var URLDEF={rel:'differs'};
function writeUrl(){
  if(!window.history||!history.replaceState)return;
  var p=new URLSearchParams();
  Object.keys(URLMAP).forEach(function(k){var v=$(URLMAP[k]).value;if(v&&v!==(URLDEF[k]||''))p.set(k,v);});
  var qs=p.toString();
  try{history.replaceState(null,'',location.pathname+(qs?'?'+qs+'#find':''));}catch(e){}
}
function readUrl(){
  var p=new URLSearchParams(location.search),any=false;
  Object.keys(URLMAP).forEach(function(k){if(p.has(k)){$(URLMAP[k]).value=p.get(k);any=true;}});
  return any;
}
function init(){
  $('filters').addEventListener('submit',function(ev){ev.preventDefault();});
  buildKey();buildChart();buildFilters();stripHover();
  ['fEd','fRel','fWhere','fKind','fPat'].forEach(function(id){$(id).addEventListener('change',function(){update();});});
  var tm;['fRef','fGreek'].forEach(function(id){$(id).addEventListener('input',function(){clearTimeout(tm);tm=setTimeout(update,200);});});
  $('fReset').addEventListener('click',function(){
    $('fEd').value='';$('fRel').value='differs';$('fWhere').value='';$('fKind').value='';$('fPat').value='';$('fRef').value='';$('fGreek').value='';update();
  });
  $('more').addEventListener('click',showMore);
  var rt;window.addEventListener('resize',function(){clearTimeout(rt);rt=setTimeout(function(){drawStrip(hits);},150);});
  var sh=$('fShare');
  if(sh)sh.addEventListener('click',function(){writeUrl();window.GNT_copy(location.href,sh,'Link copied');});
  var had=readUrl();
  update();
  if(had){var fd=$('find');if(fd)fd.scrollIntoView();}
}
init();
})();
