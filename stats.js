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
var EDNAME={HF:'Hodges-Farstad',PCK:'Pickering',PT:'Antoniades (Patriarchal Text)',ECM:'Editio Critica Maior',NA27:'Nestle-Aland 27',NA28:'Nestle-Aland 28',SBL:'SBL Greek New Testament',TH:'Tyndale House',WH:'Westcott-Hort',SCR:'Scrivener',ST:'Stephanus'};
var OPTNAME={PCK:'Pickering',PT:'Antoniades Patriarchal Text',SBL:'SBL Greek NT'};
function kindOrder(a){return a.slice().sort(function(x,y){return (x==='brk')-(y==='brk');});}
var KINDS={bracket:'only brackets or parentheses differ',omit:'omits words',add:'adds words',order:'changes the word order',diff:'a different word',elide:'elision',brk:'with brackets',krasis:'krasis, two words written as one',form:'same word, different spelling or form',repl:'replaces text',special:'descriptive note'};
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
var maxShare=0,maxEd='',maxG='';
ALLG.forEach(function(g){SHOWN.forEach(function(e){if(edApplies(e,g)){var q=stats[g].ed[e]/stats[g].total;if(q>maxShare){maxShare=q;maxEd=e;maxG=g;}}});});
var maxVal=maxShare;
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
        location.href='search.html?ed='+encodeURIComponent(e)+'&where='+encodeURIComponent('g:'+g)+'#find';
      });
      p.appendChild(row);
    });
    grid.appendChild(p);
  });
  $('chartnote').innerHTML='Scale: every panel uses the same scale, which runs from 0% to '+Math.round(maxShare*100)+'%. The longest bar is '+maxEd+' in '+maxG+', at '+pct(maxVal)+'. The Editio Critica Maior (ECM) is shown only where it exists: Mark, Acts, the Catholic Epistles, and Revelation. Each bar stands alone: the same note can count for several editions, so the bars in a panel are not shares of a single total. A note is counted once for an edition if the edition reads differently from the main text in any of the readings listed. Where ECM prints a split guiding line (ECM†), ECM is counted as differing only if neither of its two branches is the main text’s reading. The bars count <em>printed notes</em>. They do not measure how close two texts are, because a note may concern one letter or a whole verse, and the apparatus does not record accents, punctuation, movable nu, final sigma, or spacing in compound words.';
  $('tablenote').innerHTML='Each figure is the number of notes in which the edition reads differently from the main text, with its share of that part’s notes beneath it. The shares in a row do not add up to 100%, because each edition is compared with the main text separately and the same note can count for several editions at once. When a note says that NA28, SBL, and WH all read differently from the main text, for example, it counts once for each of them. In the “Whole New Testament” row, the ECM share is out of the notes in the books where ECM exists. The “ECM split” column counts every note where ECM prints a split guiding line (ECM†).';
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

/* ---------- kinds of difference ---------- */
/* One label per reading: its one main kind (spelling or form, omits, adds, a different word, word order, or replaces text). A reading that adds or omits words and also rearranges the rest is counted under adds or omits. Elision, krasis and brackets ride along and do not change it. A reading with none of the main kinds is filed under "minor". */
var CATS=[
  {k:'form',  name:'Spelling or form only', short:'Spelling or form'},
  {k:'omit',  name:'Omits words',           short:'Omits words'},
  {k:'add',   name:'Adds words',            short:'Adds words'},
  {k:'diff',  name:'A different word',      short:'Different word'},
  {k:'order', name:'Word order',            short:'Word order'},
  {k:'repl',  name:'Replaces text',         short:'Replaces text'},
  {k:'minor', name:'Elision, krasis, or brackets only', short:'Elision, krasis, brackets'}
];
var CATNAME={};CATS.forEach(function(c){CATNAME[c.k]=c.name;});
var MAIN={form:1,omit:1,add:1,diff:1,order:1,repl:1};
function catOf(r){
  var m=r[3].filter(function(k){return MAIN[k];});
  if(m.length===2&&m.indexOf('order')>=0)return m[0]==='order'?m[1]:m[0];   /* added or omitted words count first; the reordering rides along */
  return m.length===1?m[0]:(m.length?'repl':'minor');
}
/* The kind of difference between edition ed and the main text in note n */
function catFor(n,ed){
  var b=BIT[ed];
  for(var i=0;i<n[5].length;i++){var r=n[5][i];if((r[0]&b)&&r[1]!=='txt')return catOf(r);}
  return 'minor';
}
function searchUrl(o){
  var p=[];Object.keys(o).forEach(function(k){if(o[k])p.push(k+'='+encodeURIComponent(o[k]));});
  return 'search.html?'+p.join('&')+'#find';
}
/* What kind of difference: the four kinds that concern the words themselves, one kind at a time.
   Each edition's figure is that kind's share of its word-level differences (omits, adds, a different word, replaces text). */
var WORDKINDS=['omit','add','diff','repl'];
function buildKinds(){
  var rows=[];
  SHOWN.forEach(function(e){
    var c={omit:0,add:0,diff:0,repl:0},t=0;
    N.forEach(function(n){var g=groupOf(n);if(!edApplies(e,g)||!differs(n,e))return;var k=catFor(n,e);if(c.hasOwnProperty(k)){c[k]++;t++;}});
    rows.push({e:e,c:c,t:t});
  });
  var NAMES={omit:'Omits words',add:'Adds words',diff:'A different word',repl:'Replaces text'};
  var pick='omit',keyEl=$('kindkey'),g=$('kgrid');
  $('kindlede').textContent='Choose a kind of change to rank the eleven editions by how often it makes up their word-level differences from the main text. A word-level difference is a reading that omits words, adds words, uses a different word, or replaces text. Each percentage is that kind’s share of the edition’s word-level differences, so an edition’s four shares add up to 100%. Select a row to list those notes.';
  var btns={};
  WORDKINDS.forEach(function(k){
    var b=el('button','kbtn');b.type='button';b.appendChild(el('i','swatch k-'+k));b.appendChild(document.createTextNode(NAMES[k]));
    b.addEventListener('click',function(){pick=k;draw();});
    keyEl.appendChild(b);btns[k]=b;
  });
  function draw(){
    WORDKINDS.forEach(function(k){btns[k].setAttribute('aria-pressed',k===pick?'true':'false');});
    var list=rows.map(function(r){return {r:r,sh:r.t?r.c[pick]/r.t:0};}).sort(function(a,b){return b.sh-a.sh||b.r.c[pick]-a.r.c[pick];});
    var top=list.length?list[0].sh:0;
    g.textContent='';
    list.forEach(function(x){
      var r=x.r,c=r.c[pick];
      var row=el('a','kr');row.href=searchUrl({ed:r.e,cat:pick});
      row.title=EDNAME[r.e]+': '+fmt(c)+' of '+fmt(r.t)+' word-level differences are of this kind ('+pct(x.sh)+'). List them.';
      row.setAttribute('aria-label',r.e+', '+NAMES[pick]+': '+pct(x.sh)+' ('+fmt(c)+' of '+fmt(r.t)+' word-level differences). List them.');
      var nm=el('span','kname',r.e);nm.insertBefore(el('i','swatch sw-'+FAM[r.e]),nm.firstChild);
      var tr=el('span','ktr'),bar=el('span','kbar k-'+pick);bar.style.width=(top?x.sh/top*100:0)+'%';tr.appendChild(bar);
      row.appendChild(nm);row.appendChild(tr);
      row.appendChild(el('span','kpct',Math.round(x.sh*100)+'%'));
      g.appendChild(row);
    });
  }
  draw();
  $('kindnote').textContent='Bars are scaled to the longest one shown. A reading that adds (or omits) words and also puts the other words in a different order is counted under “Adds words” (or “Omits words”). “Replaces text” gathers readings that both remove and add words, or change words in a way that no single simpler label describes. Differences of spelling or form, word order alone, elision, krasis, and brackets are not charted here; the kind filter in Variant search finds them. ECM is counted only where it exists, in Mark, Acts, the Catholic Epistles, and Revelation.';
  var h='<thead><tr><th class="corner" scope="col">Edition</th><th scope="col">Word-level differences</th>';
  WORDKINDS.forEach(function(k){h+='<th scope="col">'+NAMES[k]+'</th>';});
  h+='</tr></thead><tbody>';
  rows.forEach(function(r){
    h+='<tr><th class="pass" scope="row" title="'+EDNAME[r.e]+'">'+r.e+'</th><td class="c">'+fmt(r.t)+'</td>';
    WORDKINDS.forEach(function(k){h+='<td class="c">'+fmt(r.c[k])+'<br><small>'+pct(r.t?r.c[k]/r.t:0)+'</small></td>';});
    h+='</tr>';
  });
  $('ktable').innerHTML=h+'</tbody>';
}

/* ---------- alternate Byzantine readings (RPmg) ---------- */
function famMask(list){return list.reduce(function(a,e){return a|BIT[e];},0);}
var M_BYZ=famMask(['HF','PCK','PT']),M_CRIT=famMask(['ECM','NA27','NA28','SBL','TH','WH']),M_TR=famMask(['SCR','ST']);
/* All editions that read any of this note's alternate readings, or -1 if the note has none */
function rpShared(n){
  var m=0,any=false;
  n[5].forEach(function(r){if(r[1]!=='txt'&&(r[0]&BIT.RPmg)){any=true;m|=r[0];}});
  return any?m:-1;
}
function shareTest(n,kind){
  var m=rpShared(n);if(m<0)return false;
  if(kind==='byz')return !!(m&M_BYZ);
  if(kind==='crit')return !!(m&M_CRIT);
  if(kind==='tr')return !!(m&M_TR);
  if(kind==='none')return (m&~BIT.RPmg)===0;
  if(kind.indexOf('with:')===0){var eb=BIT[kind.slice(5)];return !!eb&&n[5].some(function(r){return r[1]!=='txt'&&(r[0]&BIT.RPmg)&&(r[0]&eb);});}
  if(kind==='critonly')return !!(m&M_CRIT)&&!(m&M_BYZ)&&!(m&M_TR);
  return false;
}
var SHARENAME={'with:':'',byz:'also read by another Byzantine edition',crit:'also read by a critical edition',tr:'also read by a Textus Receptus edition',none:'read by no other edition',critonly:'read by critical editions and by no other Byzantine or Textus Receptus edition'};
function buildRP(){
  var hit=[];
  N.forEach(function(n,i){if(rpShared(n)>=0)hit.push(i);});
  var tot=hit.length;
  $('rplede').innerHTML='In '+fmt(tot)+' of the '+fmt(N.length)+' notes ('+pct(tot/N.length)+'), the Robinson-Pierpont edition offers an alternate Byzantine reading, marked RP<sup>mg</sup>. These are the places where its editors judged that the Byzantine tradition is divided. Select any bar to list those notes.';
  /* books, ranked by alternate readings per 100 verses, so that long books do not win just by being long */
  var VERSES=[1071,678,1150,879,1004,433,437,257,149,155,104,95,89,47,113,83,46,25,303,108,105,61,105,13,14,25,404];
  $('rpwho').innerHTML='The books are ranked by how many RP<sup>mg</sup> notes they have for every 100 verses, with the highest at the top. Using the number of verses as the measure of size puts long and short books on an equal footing: a book with 5 notes in 50 verses, for example, has 10 notes per 100 verses. The large figure beside each book is that number, the bar is drawn to match it, and the small text gives the notes and verses behind it. Select a bar to list those notes.';
  var per=BOOKS.map(function(){return 0;});
  hit.forEach(function(i){per[N[i][1]]++;});
  var REV=BOOKS.indexOf('Revelation');
  function rate(bi){return per[bi]/VERSES[bi]*100;}
  function drawBooks(){
    var withRev=$('rpRev').checked,g=$('rgrid');g.textContent='';
    var order=BOOKS.map(function(_,i){return i;}).filter(function(i){return withRev||i!==REV;});
    order.sort(function(a,b){return rate(b)-rate(a)||a-b;});
    var mx=rate(order[0])||1;
    order.forEach(function(bi){
      var v=per[bi],r=rate(bi);
      var row=el('div','arow wide');
      row.appendChild(el('span','aname',BOOKS[bi]));
      var cnt=el('a','acount',r.toFixed(1));cnt.href=searchUrl({ed:'RPmg',where:'b:'+bi});
      cnt.title=BOOKS[bi]+': '+fmt(v)+(v===1?' note':' notes')+' with an alternate reading in '+fmt(VERSES[bi])+' verses. List them.';
      cnt.setAttribute('aria-label',BOOKS[bi]+': '+r.toFixed(1)+' notes per 100 verses ('+fmt(v)+(v===1?' note':' notes')+' in '+fmt(VERSES[bi])+' verses). List them.');
      row.appendChild(cnt);
      var tr=el('span','atrack'),a=el('a','seg aseg');a.href=cnt.href;a.style.width=(r/mx*100)+'%';a.style.background='var(--r3)';a.title=cnt.title;a.setAttribute('aria-label',cnt.getAttribute('aria-label'));tr.appendChild(a);row.appendChild(tr);
      row.appendChild(el('span','apct',fmt(v)+(v===1?' note':' notes')+' · '+fmt(VERSES[bi])+' verses'));
      g.appendChild(row);
    });
    $('rnote').textContent=withRev
      ?'Revelation stands far above the rest, with '+rate(REV).toFixed(1)+' notes per 100 verses. Switch it off to compare the other books at a readable scale. Verses are counted as this edition prints them, and only verses that have text are counted (7,953 in all). A verse number printed with no text of its own is not counted: Luke 17:36, Acts 8:37, 15:34 and 24:7, and Romans 16:25-27, whose closing doxology is printed in full at 14:24-26 instead. 3 John has 14 verses. A very short book, such as Jude, can rank high on only a few notes, so read its figure together with the note count at the right.'
      :'With Revelation left out, the bars are scaled to the book with the highest notes-per-100-verses figure among the rest. Only verses that have text are counted (7,953 in all). A verse number printed with no text of its own is not counted: Luke 17:36, Acts 8:37, 15:34 and 24:7, and Romans 16:25-27, whose closing doxology is printed in full at 14:24-26 instead. 3 John has 14 verses. A very short book, such as Jude, can rank high on only a few notes, so read its figure together with the note count at the right.';
  }
  $('rpRev').addEventListener('change',drawBooks);
  drawBooks();
  /* editions: how often each one reads the same reading as RPmg */
  var ER=SHOWN.map(function(e){
    var c=0,t=0;
    hit.forEach(function(i){
      var n=N[i];if(!edApplies(e,groupOf(n)))return;t++;
      for(var k=0;k<n[5].length;k++){var rd=n[5][k];if(rd[1]!=='txt'&&(rd[0]&BIT.RPmg)&&(rd[0]&BIT[e])){c++;break;}}
    });
    return {e:e,c:c,t:t};
  });
  ER.sort(function(a,b){return (b.c/b.t)-(a.c/a.t);});
  $('rpwith').innerHTML='Wherever the Robinson-Pierpont edition gives an alternate Byzantine reading (RP<sup>mg</sup>), each of the other editions either reads that alternate reading or does not. The rows rank the editions by how often they agree with those alternate readings, from the edition that agrees most often to the one that agrees least often. The large figure is the percentage of the RP<sup>mg</sup> notes in which the edition reads the alternate reading, and each bar shows the same percentage. Select a figure or a bar to list those notes.';
  var eg=$('egrid');
  ER.forEach(function(r){
    var sh=r.t?r.c/r.t:0;
    var row=el('div','arow wide');
    var nm=el('span','aname',r.e);nm.title=EDNAME[r.e];row.appendChild(nm);
    var cnt=el('a','acount',Math.round(sh*100)+'%');cnt.href=searchUrl({ed:'RPmg',share:'with:'+r.e});
    cnt.title=EDNAME[r.e]+' reads the alternate reading in '+fmt(r.c)+' of '+fmt(r.t)+' notes ('+pct(sh)+'). List them.';
    cnt.setAttribute('aria-label',r.e+': '+fmt(r.c)+' of '+fmt(r.t)+' notes, '+pct(sh)+'. List them.');
    row.appendChild(cnt);
    var tr=el('span','atrack'),a=el('a','seg aseg');a.href=cnt.href;a.style.width=(sh*100)+'%';a.style.background=FAMCOL[FAM[r.e]];a.title=cnt.title;a.setAttribute('aria-label',cnt.getAttribute('aria-label'));tr.appendChild(a);row.appendChild(tr);
    row.appendChild(el('span','apct',fmt(r.c)+' of '+fmt(r.t)+' notes'));
    eg.appendChild(row);
  });
  $('enote').textContent='Each edition is compared only in the notes where it exists, so ECM is measured against the notes in Mark, Acts, the Catholic Epistles, and Revelation. An edition can agree with the alternate reading in a note and also with the main text elsewhere in the same note, so a high share does not mean the edition prefers the alternate reading.';
  /* the notes where the alternate reading is shared only with critical editions */
  var co=hit.filter(function(i){return shareTest(N[i],'critonly');});
  $('rpcrit').textContent='In '+fmt(co.length)+' notes, a critical edition reads the alternate reading, and no other Byzantine edition and no Textus Receptus edition does. In these places the margin of the Robinson-Pierpont edition points toward the critical text. Select a note to find it in the variant search.';
  var tb=$('clist');
  function clip(t){return t.length>80?t.slice(0,80)+'…':t;}
  co.forEach(function(i){
    var n=N[i],vm=n[2].match(/^\d+:\d+/);
    var rd=[];n[5].forEach(function(r){if(r[1]!=='txt'&&(r[0]&BIT.RPmg))rd.push(r);});
    var tr=el('tr');
    var c1=el('th');c1.scope='row';c1.setAttribute('data-label','Passage');
    var a=el('a',null,BOOKS[n[1]]+' '+n[2]);a.href=searchUrl({ed:'RPmg',ref:vm?BOOKS[n[1]]+' '+vm[0]:BOOKS[n[1]]});
    a.title='Find this note in the variant search';
    c1.appendChild(a);c1.appendChild(el('small',null,'page '+n[0]+', note '+n[3]));
    var c2=el('td');c2.setAttribute('data-label','Main text');c2.appendChild(el('span','gk',clip(n[4])));
    var c3=el('td','calt');c3.setAttribute('data-label','Alternate reading');
    rd.forEach(function(r,k){
      if(k)c3.appendChild(document.createTextNode(' / '));
      var t=r[1].trim();
      if(/^om\.?$/.test(t))c3.appendChild(el('i',null,'omitted'));
      else c3.appendChild(el('span','gk',clip(t.replace(/[.\s]+$/,''))));
    });
    var m=0;rd.forEach(function(r){m|=r[0];});
    var c4=el('td','ctags');c4.setAttribute('data-label','Also read by');
    edsOf(m&M_CRIT).forEach(function(e){c4.appendChild(el('span','etag f-crit',e));});
    tr.appendChild(c1);tr.appendChild(c2);tr.appendChild(c3);tr.appendChild(c4);tb.appendChild(tr);
  });
  $('cnote').textContent='The Greek is shown as it is printed in the apparatus, where most words appear without accents or breathing marks.';
}

/* ---------- standing alone ---------- */
/* Which reading of the note an edition has: its index among the note's readings, -1 for the main text, -2 for ECM's split line */
function ridx(n,e){
  var b=BIT[e];
  for(var i=0;i<n[5].length;i++){var r=n[5][i];if(r[1]!=='txt'&&(r[0]&b))return i;}
  if(e==='ECM'&&ecmBothBranchesDiffer(n))return -2;
  return -1;
}
/* Does entity e (an edition, or 'MT' for the main text) read alone in note n?
   Returns 'agree' when everyone else reads alike, 'div' when the others are divided, or '' when e is not alone. */
function aloneKind(n,e){
  var g=groupOf(n);if(e!=='MT'&&!edApplies(e,g))return '';
  var others=SHOWN.filter(function(x){return x!==e&&edApplies(x,g);});
  if(e==='MT'){
    var seen={},k=0;
    for(var i=0;i<others.length;i++){var v=ridx(n,others[i]);if(v===-1)return '';if(!seen[v]){seen[v]=1;k++;}}
    return k===1?'agree':'div';
  }
  var mine=ridx(n,e);if(mine<0)return '';
  var allMain=true;
  for(var j=0;j<others.length;j++){var o=ridx(n,others[j]);if(o===mine)return '';if(o!==-1)allMain=false;}
  return allMain?'agree':'div';
}
function aloneTest(n,spec){
  var p=spec.split('.'),k=aloneKind(n,p[0]);
  return !!k&&(!p[1]||p[1]===k);
}
function buildAlone(){
  var rows=['MT'].concat(SHOWN);
  var res=rows.map(function(e){
    var c={agree:0,div:0},t=0;
    N.forEach(function(n){
      var g=groupOf(n);if(e!=='MT'&&!edApplies(e,g))return;t++;
      var k=aloneKind(n,e);if(k)c[k]++;
    });
    return {e:e,c:c,t:t};
  });
  res.sort(function(a,b){return (b.c.agree+b.c.div)-(a.c.agree+a.c.div);});
  $('alolede').textContent='In some notes one edition reads differently from every other edition, or the main text itself reads differently from every edition. The rows run from the one that reads alone most often to the one that reads alone least often. The large figure is the number of notes. Each bar divides those notes in two: the darker part is where everything else agrees, and the lighter part is where the others are divided among themselves. Select a figure or a part to list those notes.';
  var key=$('alokey');
  [['Everything else agrees','al-agree'],['The others are divided','al-div']].forEach(function(x){var s=el('span');s.appendChild(el('i','swatch '+x[1]));s.appendChild(document.createTextNode(x[0]));key.appendChild(s);});
  var grid=$('agrid');
  res.forEach(function(r){
    var row=el('div','arow');
    var nm=el('span','aname',r.e==='MT'?'Main text':r.e);
    if(r.e!=='MT'){nm.title=EDNAME[r.e];}
    var colr=r.e==='MT'?'var(--ink)':FAMCOL[FAM[r.e]];
    var tr=el('span','atrack');
    var tot=r.c.agree+r.c.div,label=r.e==='MT'?'the main text':EDNAME[r.e],who=r.e==='MT'?'Main text':r.e;
    [['agree','al-agree','everything else agrees'],['div','al-div','the others are divided']].forEach(function(p){
      var c=r.c[p[0]];if(!c)return;
      var a=el('a','seg aseg '+p[1]);a.href=searchUrl({alone:r.e+'.'+p[0]});
      a.style.width=(c/tot*100)+'%';
      a.style.background=p[0]==='agree'?colr:'color-mix(in srgb, '+colr+' 40%, #ebe8df)';
      a.title=label.charAt(0).toUpperCase()+label.slice(1)+' reads alone in '+fmt(c)+' of '+fmt(tot)+' notes where '+p[2]+'. List them.';
      a.setAttribute('aria-label',who+', '+p[2]+': '+fmt(c)+' of '+fmt(tot)+' notes. List them.');
      a.appendChild(el('span',null,fmt(c)));
      tr.appendChild(a);
    });
    var tl=el('a','acount',fmt(tot));tl.href=searchUrl({alone:r.e});tl.title='All '+fmt(tot)+' notes where '+label+' reads alone. List them.';
    tl.setAttribute('aria-label',who+': '+fmt(tot)+' notes read alone. List them.');
    row.appendChild(nm);row.appendChild(tl);row.appendChild(tr);
    grid.appendChild(row);
  });
  $('alonote').innerHTML='A note counts here when the edition (or the main text) has a reading that no other edition shares. “Everything else agrees” means that every other edition reads the main text, or, for the main text row, that every edition reads alike. Every bar is drawn to the same full width, whatever its total, so that small totals can be seen and selected. The Editio Critica Maior (ECM) is compared only in Mark, Acts, the Catholic Epistles, and Revelation, so its count covers only those books. Alternate readings marked RP<sup>mg</sup> are not counted as an edition.';
}

/* Show a segment's percentage only when it fits inside the segment */
function fitLabels(){
  var segs=document.querySelectorAll('.seg > span');
  for(var i=0;i<segs.length;i++)segs[i].hidden=false;
  for(var j=0;j<segs.length;j++){var sp=segs[j];if(sp.parentNode.clientWidth<sp.offsetWidth+8)sp.hidden=true;}
}
/* ---------- where the notes fall ---------- */
var CHAPS=[28,16,24,21,28,16,16,13,6,6,4,4,5,3,6,4,3,1,13,5,5,3,5,1,1,1,22];
function buildDensity(){
  var cnt=BOOKS.map(function(_,bi){return new Array(CHAPS[bi]+1).fill(0);});
  N.forEach(function(n){var m=n[2].match(/^(\d+)/);if(m&&cnt[n[1]]&&cnt[n[1]][+m[1]]!==undefined)cnt[n[1]][+m[1]]++;});
  var all=[];cnt.forEach(function(a){for(var i=1;i<a.length;i++)all.push(a[i]);});
  var sorted=all.slice().sort(function(a,b){return a-b;});
  var cuts=[1,2,3,4].map(function(q){return sorted[Math.floor(sorted.length*q/5)];});
  function level(v){var l=0;for(var i=0;i<cuts.length;i++)if(v>cuts[i])l=i+1;return l;}
  var lo=[0].concat(cuts.map(function(c){return c+1;}));
  var key=$('dkey');
  key.appendChild(document.createTextNode('Fewer notes '));
  for(var l=0;l<5;l++){var s=el('i','dsw d'+l);s.title=(l===4?lo[l]+' or more':lo[l]+' to '+cuts[l])+' notes';key.appendChild(s);}
  key.appendChild(document.createTextNode(' More notes'));
  var map=$('dmap'),mx=0,mxb=0,mxc=0;
  BOOKS.forEach(function(b,bi){
    var row=el('div','drow');
    row.appendChild(el('span','dname',b));
    var cells=el('span','dcells');
    for(var c=1;c<=CHAPS[bi];c++){
      var v=cnt[bi][c];
      var a=el('a','dc d'+level(v));
      a.href=searchUrl({ref:b+' '+c});
      a.title=b+' '+c+': '+fmt(v)+' note'+(v===1?'':'s');
      a.setAttribute('aria-label',b+' '+c+', '+fmt(v)+' note'+(v===1?'':'s')+'. List them.');
      a.appendChild(el('span',null,String(c)));
      cells.appendChild(a);
      if(v>mx){mx=v;mxb=bi;mxc=c;}
    }
    row.appendChild(cells);map.appendChild(row);
  });
  $('dnote').textContent='The busiest chapter is '+BOOKS[mxb]+' '+mxc+', with '+fmt(mx)+' notes. Chapters differ in length, so a longer chapter naturally has more notes. The shading runs from the lightest fifth of chapters to the darkest fifth.';
}

/* ---------- filters ---------- */
function buildFilters(){
  var ed=$('fEd');
  ed.appendChild(new Option('Any edition',''));
  SHOWN.forEach(function(e){ed.appendChild(new Option(e+' — '+(OPTNAME[e]||EDNAME[e]),e));});
  ed.appendChild(new Option('Robinson-Pierpont alternate Byzantine reading','RPmg'));
  var w=$('fWhere');
  w.appendChild(new Option('The whole New Testament',''));
  var og=document.createElement('optgroup');og.label='Parts';
  ALLG.forEach(function(g){og.appendChild(new Option(g,'g:'+g));});w.appendChild(og);
  var ob=document.createElement('optgroup');ob.label='Books';
  BOOKS.forEach(function(b,i){ob.appendChild(new Option(b,'b:'+i));});w.appendChild(ob);
}
var BOOKKEY=BOOKS.map(function(b){return b.toLowerCase().replace(/[^a-z0-9]/g,'');});
var ALIAS={mt:0,matt:0,mk:1,mar:1,lk:2,luk:2,jn:3,joh:3,ac:4,rom:5,ro:5,rm:5,'1co':6,'1cor':6,'2co':7,'2cor':7,gal:8,eph:9,php:10,phil:10,col:11,'1th':12,'1thess':12,'2th':13,'2thess':13,'1ti':14,'1tim':14,'2ti':15,'2tim':15,tit:16,phm:17,philem:17,heb:18,jas:19,jam:19,'1pe':20,'1pet':20,'2pe':21,'2pet':21,'1jn':22,'1jo':22,'1john':22,'2jn':23,'2jo':23,'2john':23,'3jn':24,'3jo':24,'3john':24,jud:25,rev:26,re:26};
/* A passage such as "Romans 8", "John 1:18", "Romans 8-10", "Matthew 5:3-12", or "John 1:18-2:5".
   Returns {book, from:[chapter,verse], to:[chapter,verse]}; from is null when only a book is named. */
function parseRef(s){
  s=s.trim().toLowerCase().replace(/[\u2012-\u2015\u2212]/g,'-');
  s=s.replace(/\s+(?:to|through|thru)\s+/,'-');
  if(!s)return null;
  var m=s.match(/^([1-3]?\s*[a-z]+\.?)\s*(.*)$/);
  if(!m)return {bad:true};
  var rest=m[2].match(/^(?:(\d+)(?:\s*[:.]\s*(\d+))?(?:\s*-\s*(\d+)(?:\s*[:.]\s*(\d+))?)?)?\s*$/);
  if(!rest)return {bad:true};
  var k=m[1].replace(/[^a-z0-9]/g,''),bi=-1;
  if(ALIAS.hasOwnProperty(k))bi=ALIAS[k];
  else{
    for(var i=0;i<BOOKKEY.length;i++){if(BOOKKEY[i].indexOf(k)===0){bi=i;break;}}
  }
  if(bi<0)return {bad:true};
  var c1=rest[1]?+rest[1]:0,v1=rest[2]?+rest[2]:0,x=rest[3]?+rest[3]:0,y=rest[4]?+rest[4]:0;
  if(!c1)return {book:bi,from:null,to:null};
  var from=[c1,v1],to;
  if(!x)to=v1?[c1,v1]:[c1,9999];                 /* one chapter, or one verse */
  else if(y)to=[x,y];                            /* 1:18-2:5 */
  else if(v1)to=[c1,x];                          /* 5:3-12: verses of one chapter */
  else to=[x,9999];                              /* 8-10: whole chapters */
  if(to[0]<from[0]||(to[0]===from[0]&&to[1]<from[1]))return {bad:true};
  return {book:bi,from:from,to:to};
}
/* The span of a note's own reference: "1:10", "1:7–8", or "7:53–8:11" */
function noteSpan(r){
  var m=r.match(/^(\d+):(\d+)(?:[–-](\d+)(?::(\d+))?)?$/);
  if(!m)return null;
  var c=+m[1],v=+m[2];
  return {a:[c,v],b:m[4]?[+m[3],+m[4]]:m[3]?[c,+m[3]]:[c,v]};
}
function posCmp(p,q){return p[0]!==q[0]?p[0]-q[0]:p[1]-q[1];}
function norm(s){return s.normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/ς/g,'σ').replace(/\s+/g,' ').trim();}
/* Greek pieces (typed as Unicode or beta code) and quoted Latin pieces must each occur in the note */
function greekPieces(v){var p=window.GNTGreek?window.GNTGreek.pieces(v):{greek:[v],latin:[]};return p.greek.concat(p.latin).map(norm).filter(Boolean);}
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
    if(f.ref.from){
      var sp=noteSpan(n[2]);
      if(!sp||posCmp(sp.b,f.ref.from)<0||posCmp(sp.a,f.ref.to)>0)return false;   /* the note's verses must overlap the passage */
    }
  }
  for(var gi=0;gi<f.greek.length;gi++)if(SEARCH[i].indexOf(f.greek[gi])<0)return false;
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
  if(f.share&&!shareTest(n,f.share))return false;
  if(f.alone&&!aloneTest(n,f.alone))return false;
  if(f.cat){
    var b2=f.ed?BIT[f.ed]:0,okc=false,seen=false;
    n[5].forEach(function(r){if(r[1]!=='txt'&&(!b2||(r[0]&b2))){seen=true;if(catOf(r)===f.cat)okc=true;}});
    if(!seen&&f.ed&&f.cat==='minor')okc=true;
    if(!okc)return false;
  }
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
  return {ed:$('fEd').value,rel:$('fRel').value,where:$('fWhere').value,kind:$('fKind').value,pat:$('fPat').value,ref:rf&&!rf.bad?rf:null,refBad:!!(rf&&rf.bad),greek:greekPieces($('fGreek').value),cat:CAT,share:SHARE,alone:ALONE};
}
function tag(e){
  if(e==='RPmg'){var t=el('span','etag f-byz','RP');t.appendChild(el('sup',null,'mg'));t.title='Robinson-Pierpont, alternate Byzantine reading';return t;}
  return el('span','etag f-'+(FAM[e]||'crit'),e==='ECMs'?'ECM†':e);
}
/* A note that is also one of the fifty variants (data.js) gets a pointer to it. Notes match by book, printed page and note letter. */
var SPEC={};
if(window.GNT_DATA&&window.GNT_DATA.variants){window.GNT_DATA.variants.forEach(function(v){
  var bk=BOOKS.indexOf(v.ref.replace(/ \d+:.*$/,''));if(bk>=0)SPEC[bk+'/'+v.page+'/'+v.caller]=v;
});}
/* ----- manuscript evidence for the CSV (raised marks become Unicode superscript characters) ----- */
var SUPMAP={'0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','(':'⁽',')':'⁾','+':'⁺','-':'⁻','=':'⁼',
  a:'ᵃ',b:'ᵇ',c:'ᶜ',d:'ᵈ',e:'ᵉ',f:'ᶠ',g:'ᵍ',h:'ʰ',i:'ⁱ',j:'ʲ',k:'ᵏ',l:'ˡ',m:'ᵐ',n:'ⁿ',o:'ᵒ',p:'ᵖ',r:'ʳ',s:'ˢ',t:'ᵗ',u:'ᵘ',v:'ᵛ',w:'ʷ',x:'ˣ',y:'ʸ',z:'ᶻ',
  A:'ᴬ',B:'ᴮ',D:'ᴰ',E:'ᴱ',G:'ᴳ',H:'ᴴ',I:'ᴵ',J:'ᴶ',K:'ᴷ',L:'ᴸ',M:'ᴹ',N:'ᴺ',O:'ᴼ',P:'ᴾ',R:'ᴿ',T:'ᵀ',U:'ᵁ',V:'ⱽ',W:'ᵂ'};
function toSup(s){return String(s).split('').map(function(ch){return SUPMAP[ch]||ch;}).join('');}
/* printed notes mark raised text with ^, as in D^2 or 05^c */
function noteCsv(t){return t.replace(/\^((?:\(?[0-9A-Za-zᶜ∗,]+\)?,?)+)/g,function(m,x){return toSup(x.replace(/,$/,''))+(/,$/.test(x)?',':'');}).replace(/\^/g,'');}
var MSBY={};
if(window.GNT_DATA&&window.GNT_DATA.manuscripts)window.GNT_DATA.manuscripts.forEach(function(m){MSBY[m.ga]=m;});
function wName(w){
  var m=MSBY[w.ga];if(!m)return w.ga;
  var k=(w.k||'').replace(/\s+/g,''),minor=(w.f||[]).indexOf('minor')>=0,pap=m.ga.charAt(0)==='\uD835';
  var mk=toSup((m.supp?'s':'')+k),t;
  if(pap)t='\uD835\uDD13'+toSup(m.ga.slice(2))+mk;
  else t=(m.supp&&m.w?m.w.slice(0,-1):(m.w||m.ga))+mk;
  return minor?'('+t+')':t;
}
function wSort(ws){return ws.slice().sort(function(a,b){var A=MSBY[a.ga],B=MSBY[b.ga];return (A?A.mid:9999)-(B?B.mid:9999)||(a.ga<b.ga?-1:1);});}
function evidenceCsv(v){
  return v.readings.map(function(r,i){
    var head=(i===0?'Main text':'Reading '+(i+1))+(r.label?' ('+r.label+')':'')+(r.greek?': '+r.greek:'');
    var ws=wSort(r.wits||[]).map(wName).join('; ');
    var nt=(r.notes||[]).map(function(n){return 'Note on '+noteCsv(n.who)+': '+noteCsv(n.note);}).join('; ');
    return head+(ws?' | '+ws:'')+(nt?' | '+nt:'');
  }).join(' ‖ \n');
}
function edsOf(mask){return EDS.filter(function(e){return mask&BIT[e];});}
/* A label such as "(Pericope Adulterae: See Appendix C ...)" is printed in bold in the edition */
function lemmaInto(p,t){
  var m=/^(.*?\()([A-Z][A-Za-z]*(?: [A-Z][A-Za-z]*)*)(: .*)$/.exec(t);
  if(!m){p.appendChild(document.createTextNode(t));return;}
  p.appendChild(document.createTextNode(m[1]));p.appendChild(el('b','en',m[2]));p.appendChild(document.createTextNode(m[3]));
}
function renderItem(n){
  var li=el('li','res');
  var head=el('div','rhd');
  var ref=el('b',null,BOOKS[n[1]]+' '+n[2]);
  head.appendChild(ref);
  head.appendChild(document.createTextNode(' · '));
  var pgs=el('span','pg');pgs.appendChild(document.createTextNode('page '));pgs.appendChild(window.GNTPages.link(String(n[0]),n[0]));head.appendChild(pgs);
  head.appendChild(el('span','caller',' note '+n[3]));
  li.appendChild(head);
  var lem=el('div','lem');lem.appendChild(el('span','lab','Main text: '));var gr=el('span','gk');gr.lang='grc';lemmaInto(gr,n[4]);lem.appendChild(gr);li.appendChild(lem);
  n[5].forEach(function(r){
    var d=el('div','rd');
    var tags=el('span','tags');
    edsOf(r[0]).forEach(function(e){tags.appendChild(tag(e));});
    if(r[0]&BIT.RPmg){}
    d.appendChild(tags);
    var t=el('span','gk',r[1]==='txt'?'reads the main text':r[1]);t.lang='grc';d.appendChild(t);
    var kk=kindOrder(r[3].filter(function(k){return k!=='special';}));if(kk.length&&r[1]!=='txt'){d.appendChild(el('span','kd',' ('+kk.map(function(k){return KINDS[k];}).join('; ')+')'));}
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
  var sv=SPEC[n[1]+'/'+n[0]+'/'+n[3]];
  if(sv){
    var sp=el('div','specnote');
    sp.appendChild(el('b',null,'One of the fifty variants. '));
    sp.appendChild(document.createTextNode(sv.what+' '));
    var la=el('a',null,'See the manuscript evidence');la.href='variants.html#v='+sv.id;
    sp.appendChild(la);
    li.appendChild(sp);
  }
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
  if(f.refBad)c.textContent='I could not read that passage. Try a form like “Romans 8”, “John 1:18”, “Romans 8:1-17”, or “1 Cor 12-14”.';
  else c.textContent=out.length===0?'No notes match these choices.':fmt(out.length)+' note'+(out.length===1?'':'s')+' ('+pct(out.length/N.length)+' of all '+fmt(N.length)+') on '+fmt(new Set(out.map(function(i){return N[i][0];})).size)+(new Set(out.map(function(i){return N[i][0];})).size===1?' page.':' pages.');
  $('catnote').hidden=!((CAT||SHARE||ALONE)&&!f.refBad);
  var cm=[];
  if(CAT)cm.push('readings whose one kind of difference is “'+CATNAME[CAT]+'”');
  if(SHARE)cm.push(SHARE.indexOf('with:')===0?'notes where the alternate Byzantine reading is also the reading of '+SHARE.slice(5):'notes with an alternate Byzantine reading that is '+SHARENAME[SHARE]);
  if(ALONE){var ap=ALONE.split('.');cm.push((ap[0]==='MT'?'notes where the main text reads alone':'notes where '+ap[0]+' reads alone')+(ap[1]==='agree'?', and every other reading is the same':ap[1]==='div'?', and the others are divided':''));}
  if(CAT||SHARE||ALONE)$('catnote').textContent='Showing only '+cm.join(', and ')+', as counted on the Stats page. Change any other choice above to see them all.';
  $('fCsv').disabled=!out.length;
  showMore();drawStrip(out);writeUrl();
}
/* ---------- CSV download ---------- */
/* The Reference column includes the book name (Matthew 6:1) so that Excel keeps it as text; a bare 6:1 would be turned into a time of day. */
function csvCell(v){return '"'+String(v).replace(/"/g,'""')+'"';}
function csvRows(idx){
  var rows=[['Book','Reference','Note','Printed page','Main text','Row type','Reading','Editions','Kind of difference','Manuscript evidence (fifty variants)']];
  idx.forEach(function(i){
    var n=N[i],base=[BOOKS[n[1]],BOOKS[n[1]]+' '+n[2],n[3],n[0],n[4]];
    var sv=SPEC[n[1]+'/'+n[0]+'/'+n[3]],ev=sv?evidenceCsv(sv):'';
    n[5].forEach(function(r){
      var kk=kindOrder(r[3].filter(function(k){return k!=='special';})).map(function(k){return KINDS[k];});
      rows.push(base.concat(['reading',r[1]==='txt'?'(reads the main text)':r[1],edsOf(r[0]).map(function(e){return e==='ECMs'?'ECM†':e;}).join('; '),r[1]==='txt'?'':kk.join('; '),ev]));
    });
    n[6].forEach(function(b){
      rows.push(base.concat(['main text printed in '+(b[0]===2?'double brackets':b[0]===3?'chevrons':'brackets'),'',edsOf(b[1]).join('; '),'',ev]));
    });
    if(n[7])rows.push(base.concat(['ECM split guiding line','','ECM†','',ev]));
  });
  return rows;
}
function downloadCsv(){
  if(!hits.length)return;
  var text='\uFEFF'+csvRows(hits).map(function(r){return r.map(csvCell).join(',');}).join('\r\n')+'\r\n';
  var blob=new Blob([text],{type:'text/csv;charset=utf-8'});
  var url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='greek-nt-notes.csv';document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(function(){URL.revokeObjectURL(url);},1000);
}
var ALONE='';   /* set only by a link from the Stats page: an edition (or the main text) reading alone */
var SHARE='';   /* set only by a link from the Stats page: who else reads an alternate Byzantine reading */
var CAT='';   /* set only by a link from the Stats page: a kind of difference chosen there */
var URLMAP={ed:'fEd',rel:'fRel',where:'fWhere',kind:'fKind',pat:'fPat',ref:'fRef',greek:'fGreek'};
var URLDEF={rel:'differs'};
function writeUrl(){
  if(!window.history||!history.replaceState)return;
  var p=new URLSearchParams();
  Object.keys(URLMAP).forEach(function(k){var v=$(URLMAP[k]).value;if(v&&v!==(URLDEF[k]||''))p.set(k,v);});
  if(CAT)p.set('cat',CAT);
  if(SHARE)p.set('share',SHARE);
  if(ALONE)p.set('alone',ALONE);
  var qs=p.toString();
  try{history.replaceState(null,'',location.pathname+(qs?'?'+qs+'#find':''));}catch(e){}
}
function readUrl(){
  var p=new URLSearchParams(location.search),any=false;
  Object.keys(URLMAP).forEach(function(k){if(p.has(k)){$(URLMAP[k]).value=p.get(k);any=true;}});
  if(p.has('cat')&&/^(form|omit|add|diff|order|repl|minor)$/.test(p.get('cat'))){CAT=p.get('cat');any=true;}
  if(p.has('share')&&/^(byz|crit|tr|none|critonly|with:(HF|PCK|PT|ECM|NA27|NA28|SBL|TH|WH|SCR|ST))$/.test(p.get('share'))){SHARE=p.get('share');any=true;}
  if(p.has('alone')&&/^(MT|HF|PCK|PT|ECM|NA27|NA28|SBL|TH|WH|SCR|ST)(\.(agree|div))?$/.test(p.get('alone'))){ALONE=p.get('alone');any=true;}
  return any;
}
function init(){
  if($('filters'))$('filters').addEventListener('submit',function(ev){ev.preventDefault();});
  if($('cgrid')){buildKey();buildChart();buildDensity();buildKinds();buildRP();buildAlone();fitLabels();window.addEventListener('load',fitLabels);window.addEventListener('resize',fitLabels);}
  if(!$('filters'))return;
  buildFilters();stripHover();
  ['fEd','fRel','fWhere','fKind','fPat'].forEach(function(id){$(id).addEventListener('change',function(){if(id==='fKind'||id==='fRel'||id==='fPat')CAT='';if(id==='fEd'||id==='fRel'||id==='fPat')SHARE='';if(id!=='fWhere')ALONE='';update();});});
  var tm;['fRef','fGreek'].forEach(function(id){$(id).addEventListener('input',function(){clearTimeout(tm);tm=setTimeout(update,200);});});
  $('fReset').addEventListener('click',function(){
    $('fEd').value='';$('fRel').value='differs';$('fWhere').value='';$('fKind').value='';$('fPat').value='';$('fRef').value='';$('fGreek').value='';CAT='';SHARE='';ALONE='';update();
  });
  $('more').addEventListener('click',showMore);
  var rt;window.addEventListener('resize',function(){clearTimeout(rt);rt=setTimeout(function(){drawStrip(hits);},150);});
  $('fCsv').addEventListener('click',downloadCsv);
  var sh=$('fShare');
  if(sh)sh.addEventListener('click',function(){writeUrl();window.GNT_copy(location.href,sh,'Link copied');});
  var had=readUrl();
  update();
  if(had){var fd=$('find');if(fd)fd.scrollIntoView();}
}
/* Old shared links pointed at stats.html?...#find; send them to the search page. */
if(!$('filters')&&(/[?&](ed|rel|where|kind|pat|ref|greek)=/.test(location.search)||location.hash==='#find')){location.replace('search.html'+location.search+(location.hash==='#find'?'#find':''));}else init();
})();
