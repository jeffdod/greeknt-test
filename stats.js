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
var KINDS={same:'reads the same as the base text',brw:'has bracketed text',bronly:'only the brackets differ',spell:'different spelling',order:'different word order',omitall:'omits the base reading',omit:'omits words',add:'adds words',repl:'replaces the base text',elide:'elision',krasis:'crasis',br1:'single brackets around reading',br2:'double brackets around reading',br3:'chevrons around reading',other:'Other'};
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
/* One label per reading, stored as r[3][0]: reads the same, different spelling, different word order, omits the base reading, omits words, adds words, replaces the base text, elision, crasis, brackets, or other. */
var CATNAME=Object.assign({omitany:'omits the base reading or omits words',short:'has fewer words than the base reading',long:'has more words than the base reading'},KINDS);
function catOf(r){return r[3][0]||'minor';}
/* The kind of difference between edition ed and the main text in note n */
function catFor(n,ed){
  var b=BIT[ed];
  for(var i=0;i<n[5].length;i++){var r=n[5][i];if((r[0]&b)&&r[1]!=='txt')return catOf(r);}
  return 'minor';
}
/* Whether edition ed's reading in note n has fewer words (short), more words (long), or the same number as the base reading */
function lenFor(n,ed){
  var b=BIT[ed];
  for(var i=0;i<n[5].length;i++){var r=n[5][i];if((r[0]&b)&&r[1]!=='txt')return r[4]===-1?'short':r[4]===1?'long':'same';}
  return 'same';
}
function searchUrl(o){
  var p=[];Object.keys(o).forEach(function(k){if(o[k])p.push(k+'='+encodeURIComponent(o[k]));});
  return 'search.html?'+p.join('&')+'#find';
}
/* What kind of difference: the three kinds that concern the words themselves, one kind at a time.
   Each edition's figure is that kind's share of its word-level differences (shortens the text or lengthens it). */
var WORDKINDS=['short','long'];
function buildKinds(){
  var rows=[];
  SHOWN.forEach(function(e){
    var c={short:0,long:0},t=0;
    N.forEach(function(n){var g=groupOf(n);if(!edApplies(e,g)||!differs(n,e))return;var k=lenFor(n,e);if(c.hasOwnProperty(k)){c[k]++;t++;}});
    rows.push({e:e,c:c,t:t});
  });
  var NAMES={short:'Shortens the text',long:'Lengthens the text'};
  var pick='short',keyEl=$('kindkey'),g=$('kgrid');
  $('kindlede').textContent='Choose shortening or lengthening to rank the eleven editions. A reading shortens the text when it has fewer words than the main text at that point, and lengthens it when it has more; the count is of words only, whatever the label of the reading. Each percentage is that kind’s share of the edition’s differences that change the number of words, so an edition’s two shares add up to 100%. Select a row to list those notes.';
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
      row.title=EDNAME[r.e]+': '+fmt(c)+' of '+fmt(r.t)+' differences that change the word count are of this kind ('+pct(x.sh)+'). List them.';
      row.setAttribute('aria-label',r.e+', '+NAMES[pick]+': '+pct(x.sh)+' ('+fmt(c)+' of '+fmt(r.t)+' differences that change the word count). List them.');
      var nm=el('span','kname',r.e);nm.insertBefore(el('i','swatch sw-'+FAM[r.e]),nm.firstChild);
      var tr=el('span','ktr'),bar=el('span','kbar k-'+pick);bar.style.width=(top?x.sh/top*100:0)+'%';tr.appendChild(bar);
      row.appendChild(nm);row.appendChild(tr);
      row.appendChild(el('span','kpct',Math.round(x.sh*100)+'%'));
      g.appendChild(row);
    });
  }
  draw();
  $('kindnote').textContent='Bars are scaled to the longest one shown. A reading that omits words, or replaces words with fewer, shortens the text. A reading that adds words, or replaces words with more, lengthens it. Differences that leave the number of words the same, such as spelling, word order, elision, and swapping one word for another, are not charted here; the kind filter in Explore variants finds them. A word written as two in one reading and as one in another (crasis) counts as a change of one word. ECM is counted only where it exists, in Mark, Acts, the Catholic Epistles, and Revelation.';
  var h='<thead><tr><th class="corner" scope="col">Edition</th><th scope="col">Differences that change the word count</th>';
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
  $('rplede').innerHTML='In '+fmt(tot)+' of the '+fmt(N.length)+' notes ('+pct(tot/N.length)+'), the Robinson-Pierpont edition offers an alternate Byzantine reading, marked RP<sup>mg</sup>. These are the places where its editors judged that the Byzantine tradition is divided.'+(EFFSET?' Of these, '+fmt(hit.filter(function(i){return EFFSET[i]===1;}).length)+' ('+pct(hit.filter(function(i){return EFFSET[i]===1;}).length/tot)+') change the English.':'')+' Select any bar to list those notes.';
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
  $('enote').textContent='Each edition is compared only in the notes where it exists, so ECM is measured against the notes in Mark, Acts, the Catholic Epistles, and Revelation. ECM’s split readings count as agreeing with the alternate reading even where ECM also supports the main text, so a high ECMs share does not by itself show that ECM prefers the alternate reading.';
  /* the notes where the alternate reading is shared only with critical editions */
  var co=hit.filter(function(i){return shareTest(N[i],'critonly');});
  $('rpcrit').textContent='In '+fmt(co.length)+' notes, a critical edition reads the alternate reading, and no other Byzantine edition and no Textus Receptus edition does. In these places the margin of the Robinson-Pierpont edition points toward the critical text. Select a note to find it in Explore variants.';
  var tb=$('clist');
  function clip(t){return t.length>80?t.slice(0,80)+'…':t;}
  co.forEach(function(i){
    var n=N[i],vm=n[2].match(/^\d+:\d+/);
    var rd=[];n[5].forEach(function(r){if(r[1]!=='txt'&&(r[0]&BIT.RPmg))rd.push(r);});
    var tr=el('tr');
    var c1=el('th');c1.scope='row';c1.setAttribute('data-label','Passage');
    var a=el('a',null,BOOKS[n[1]]+' '+n[2]);a.href=searchUrl({ed:'RPmg',ref:vm?BOOKS[n[1]]+' '+vm[0]:BOOKS[n[1]]});
    a.title='Find this note in Explore variants';
    var pg=el('small',null,'page ');pg.appendChild(window.GNTPages.link(String(n[0]),n[0]));pg.appendChild(document.createTextNode(', note '+n[3]));
    c1.appendChild(a);c1.appendChild(pg);
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
    appendixLinks(c2);appendixLinks(c3);
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
  var mode='all',bar=$('dpick'),btns={};
  var cntAll=BOOKS.map(function(_,bi){return new Array(CHAPS[bi]+1).fill(0);}),cntEn=BOOKS.map(function(_,bi){return new Array(CHAPS[bi]+1).fill(0);});
  N.forEach(function(n,i){var m=n[2].match(/^(\d+)/);if(m&&cntAll[n[1]]&&cntAll[n[1]][+m[1]]!==undefined){cntAll[n[1]][+m[1]]++;if(EFFSET&&EFFSET[i]===1)cntEn[n[1]][+m[1]]++;}});
  /* the range, across the editions, of the share of an edition's differences that change the English */
  var lo2=1,hi2=0;
  if(EFFSET)SHOWN.forEach(function(e){var t=0,c=0;N.forEach(function(n,i){if(!edApplies(e,groupOf(n))||!differs(n,e))return;t++;if(EFFSET[i]===1)c++;});if(t){var q=c/t;if(q<lo2)lo2=q;if(q>hi2)hi2=q;}});
  var LABEL={all:'All notes',en:'Notes that change the English'};
  function draw(){
    var cnt=mode==='en'?cntEn:cntAll,one=mode==='en'?'note that changes the English':'note',many=mode==='en'?'notes that change the English':'notes';
    var all=[];cnt.forEach(function(a){for(var i=1;i<a.length;i++)all.push(a[i]);});
    var sorted=all.slice().sort(function(a,b){return a-b;});
    var cuts=[1,2,3,4].map(function(q){return sorted[Math.floor(sorted.length*q/5)];});
    function level(v){var l=0;for(var i=0;i<cuts.length;i++)if(v>cuts[i])l=i+1;return l;}
    var lo=[0].concat(cuts.map(function(c){return c+1;}));
    var key=$('dkey');key.textContent='';
    key.appendChild(document.createTextNode('Fewer notes '));
    for(var l=0;l<5;l++){var s=el('i','dsw d'+l);s.title=(l===4?lo[l]+' or more':lo[l]+' to '+cuts[l])+' '+many;key.appendChild(s);}
    key.appendChild(document.createTextNode(' More notes'));
    var map=$('dmap'),mx=0,mxb=0,mxc=0;map.textContent='';
    BOOKS.forEach(function(b,bi){
      var row=el('div','drow');
      row.appendChild(el('span','dname',b));
      var cells=el('span','dcells');
      for(var c=1;c<=CHAPS[bi];c++){
        var v=cnt[bi][c];
        var a=el('a','dc d'+level(v));
        a.href=searchUrl(mode==='en'?{ref:b+' '+c,eff:'yes'}:{ref:b+' '+c});
        a.title=b+' '+c+': '+fmt(v)+' '+(v===1?one:many);
        a.setAttribute('aria-label',b+' '+c+', '+fmt(v)+' '+(v===1?one:many)+'. List them.');
        a.appendChild(el('span',null,String(c)));
        cells.appendChild(a);
        if(v>mx){mx=v;mxb=bi;mxc=c;}
      }
      row.appendChild(cells);map.appendChild(row);
    });
    $('dnote').textContent='The busiest chapter is '+BOOKS[mxb]+' '+mxc+', with '+fmt(mx)+' '+(mx===1?one:many)+'. Chapters differ in length, so a longer chapter naturally has more notes. The shading runs from the lightest fifth of chapters to the darkest fifth.';
    if($('den'))$('den').hidden=mode!=='en';
    WH.forEach(function(k){btns[k].setAttribute('aria-pressed',k===mode?'true':'false');});
  }
  var WH=EFFSET?['all','en']:['all'];
  if(EFFSET){
    WH.forEach(function(k){var b=el('button','kbtn',LABEL[k]);b.type='button';b.addEventListener('click',function(){mode=k;draw();});bar.appendChild(b);btns[k]=b;});
    $('den').textContent='Across the eleven editions, between '+Math.round(lo2*100)+' and '+Math.round(hi2*100)+' percent of each edition’s differences from the main text change the English. Across all '+fmt(N.length)+' notes, '+Math.round(EFFSET.reduce(function(a,v){return a+v;},0)/N.length*100)+' percent do. Whether a note changes the English is a judgment, not a measurement; see Explore variants for how the marks were made.';
  }else{bar.hidden=true;}
  draw();
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
var ENHAY=[];   /* each note's English verses, prepared for searching the first time they are needed */
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
/* Notes the English translation treats as significant (english-effect.js); null when that file is missing or does not fit these notes */
var EFFSET=null;
if(window.GNT_EFFECT&&GNT_EFFECT.n===N.length){EFFSET=new Uint8Array(N.length);GNT_EFFECT.ids.forEach(function(i){EFFSET[i]=1;});(GNT_EFFECT.same||[]).forEach(function(i){EFFSET[i]=0;});}
function matches(n,i,f){
  var g=groupOf(n);
  if(f.eff&&EFFSET&&(f.eff==='yes')!==(EFFSET[i]===1))return false;
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
  if(f.eng.length&&GNT_EN.ready){
    var hay=ENHAY[i];if(hay===undefined)hay=ENHAY[i]=GNT_EN.haystack(n[1],n[2]);
    var ok=GNT_EN.matches(hay,f.eng);
    if(!ok&&HINTS&&HINTS[i])ok=GNT_EN.matches(hintHay(i),f.eng);   /* the translation hints of the note count too */
    if(!ok)return false;
  }
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
    n[5].forEach(function(r){if((!b||(r[0]&b))&&r[1]!=='txt'&&(f.kind==='short'?r[4]===-1:f.kind==='long'?r[4]===1:f.kind==='brw'?(r[3].indexOf('brw')>=0||r[3].indexOf('bronly')>=0):r[3].indexOf(f.kind)>=0))ok=true;});
    var bt={br1:1,br2:2,br3:3}[f.kind];
    if(bt&&n[6].some(function(x){return x[0]===bt&&(!b||(x[1]&b));}))ok=true;
    if(!ok)return false;
  }
  if(f.rel==='split'&&f.kind){var ok2=false;n[5].forEach(function(r){if(f.kind==='short'?r[4]===-1:f.kind==='long'?r[4]===1:f.kind==='brw'?(r[3].indexOf('brw')>=0||r[3].indexOf('bronly')>=0):r[3].indexOf(f.kind)>=0)ok2=true;});if(!ok2)return false;}
  if(f.share&&!shareTest(n,f.share))return false;
  if(f.alone&&!aloneTest(n,f.alone))return false;
  if(f.cat){
    var b2=f.ed?BIT[f.ed]:0,okc=false,seen=false;
    n[5].forEach(function(r){if(r[1]!=='txt'&&(!b2||(r[0]&b2))){seen=true;var ck=catOf(r);if(ck===f.cat||(f.cat==='omitany'&&(ck==='omit'||ck==='omitall'))||(f.cat==='brw'&&(r[3].indexOf('brw')>=0||ck==='bronly'))||(f.cat==='short'&&r[4]===-1)||(f.cat==='long'&&r[4]===1))okc=true;}});
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
    } else if(f.pat==='ct'){
      if(!cs.concat(n[7]?['ECMs']:[]).some(function(e){return differs(n,e);}))return false;
    } else if(f.pat==='na'){
      if(!['NA27','NA28'].some(function(e){return differs(n,e);}))return false;
    } else if(f.pat==='nadis'){
      if(readOf(n,'NA27')===readOf(n,'NA28'))return false;
    } else if(f.pat==='trdis'){
      if(readOf(n,'SCR')===readOf(n,'ST'))return false;
    } else if(f.pat==='tr'){
      if(!['SCR','ST'].some(function(e){return differs(n,e);}))return false;
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
  return {ed:ALONE?'':$('fEd').value,rel:$('fRel').value,where:$('fWhere').value,kind:CAT?'':$('fKind').value,pat:$('fPat').value,eff:EFFSET&&$('fEff')?$('fEff').value:'',ref:rf&&!rf.bad?rf:null,refBad:!!(rf&&rf.bad),greek:greekPieces($('fGreek').value),cat:CAT,share:SHARE,alone:ALONE,sort:$('fSort')?$('fSort').value:'',eng:window.GNT_EN?GNT_EN.pieces($('fEng').value):[]};
}
function tag(e){
  if(e==='RPmg'){var t=el('span','etag f-byz','RP');t.appendChild(el('sup',null,'mg'));t.title='Robinson-Pierpont, alternate Byzantine reading';return t;}
  return el('span','etag f-'+(FAM[e]||'crit'),e==='ECMs'?'ECM†':e);
}

/* Tags as the printed edition shows them: CT (all critical editions), CT† (ECM† with them), NA (NA27 and NA28), TR (SCR and ST).
   The data keeps each edition separate; only the tags drawn here are grouped. */
var CT5=['NA27','NA28','SBL','TH','WH'];
/* the key a label sorts by: its letters, without the dagger, so CT† sorts as CT, ECM† as ECM and RPmg as RP */
function labelKey(t){return t.replace('†','').replace(/^RPmg$/,'RP');}
function groupTags(mask,bi){
  var eds=edsOf(mask),has={};eds.forEach(function(e){has[e]=true;});
  var gone={},label={},ecmBook=!!ECMGROUPS[D.groups[bi]]||!!ECMGROUPS[BOOKS[bi]];
  var five=CT5.every(function(e){return has[e];});
  function take(list,name,first){list.forEach(function(e){gone[e]=true;});label[first]=name;}
  if(five&&has.ECMs){take(CT5.concat(['ECMs']),'CT†','ECMs');label.__at='ECMs';}
  else if(five&&(!ecmBook||has.ECM)){take(CT5.concat(has.ECM?['ECM']:[]),'CT',has.ECM?'ECM':'NA27');}
  else if(has.NA27&&has.NA28){take(['NA27','NA28'],'NA','NA27');}
  if(has.SCR&&has.ST){take(['SCR','ST'],'TR','SCR');}
  var out=[];
  eds.forEach(function(e){
    if(label[e])out.push({e:e,t:label[e]});
    else if(!gone[e])out.push({e:e,t:null});
  });
  /* the printed edition lists the labels of a reading alphabetically (CT, ECM, HF, NA, PCK, PT, RP, SBL, SCR, ST, TH, TR, WH) */
  out.forEach(function(g,i){g.k=labelKey(g.t||g.e);g.i=i;});
  out.sort(function(a,b){return a.k<b.k?-1:a.k>b.k?1:a.i-b.i;});
  return out;
}
function tagsFor(mask,bi){
  var box=el('span','tags');
  groupTags(mask,bi).forEach(function(g){
    if(!g.t){box.appendChild(tag(g.e));return;}
    var t=el('span','etag f-'+(g.t==='TR'?'tr':'crit'),g.t);
    t.title=g.t==='TR'?'Textus Receptus editions: SCR and ST':g.t==='NA'?'NA27 and NA28':g.t==='CT†'?'ECM† and the critical editions NA27, NA28, SBL, TH and WH':'All the critical editions';
    box.appendChild(t);
  });
  return box;
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
/* Greek search words, shown highlighted in the results (set by update) */
var HLP=[];
function foldChar(c){return c.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\u03c2/g,'\u03c3');}
/* Character ranges of text that match any search piece, using the same folding as the search itself */
function hlRanges(text){
  if(!HLP.length)return [];
  var ns='',map=[],sp=true;
  for(var i=0;i<text.length;i++){
    var ch=text.charAt(i);
    if(/\s/.test(ch)){if(!sp){ns+=' ';map.push(i);sp=true;}continue;}
    var f=foldChar(ch);
    for(var j=0;j<f.length;j++){ns+=f.charAt(j);map.push(i);}
    sp=false;
  }
  var r=[];
  HLP.forEach(function(pc){
    for(var at=ns.indexOf(pc);at>=0;at=ns.indexOf(pc,at+1))r.push([map[at],map[at+pc.length-1]+1]);
  });
  r.sort(function(a,b){return a[0]-b[0];});
  var out=[];
  r.forEach(function(x){var l=out[out.length-1];if(l&&x[0]<=l[1]){if(x[1]>l[1])l[1]=x[1];}else out.push([x[0],x[1]]);});
  return out;
}
/* Add text[from,to) to parent, wrapping the parts inside ranges in <mark> */
var WK=null;   /* the note and part being drawn ([note position, 0 for the main text or reading number]), so each Greek word can be pointed at */
function greekCount(text,upto){var c=0,re=/\S+/g,m;while((m=re.exec(text))&&m.index<upto){if(GNT_TIP.fold(m[0]))c++;}return c;}
function putMarked(parent,text,ranges,from,to,cls){
  function put(host,a,b,hit){
    if(b<=a)return;
    var t=text.slice(a,b),n=document.createTextNode(t);
    if(hit){var m=el('mark','hit');m.appendChild(n);n=m;}
    if(cls){var w=el(cls[0],cls[1]);w.appendChild(n);n=w;}
    host.appendChild(n);
  }
  function run(host,a0,b0){
    var at=a0;
    ranges.forEach(function(r){
      var a=Math.max(r[0],a0),b=Math.min(r[1],b0);
      if(b<=a)return;
      put(host,at,a,false);put(host,a,b,true);at=b;
    });
    put(host,at,b0,false);
  }
  if(!WK||cls||!window.GNT_TIP){run(parent,from,to);return;}
  /* each Greek word goes in its own span */
  var re=/\S+/g,m,at=from,n=greekCount(text,from);
  re.lastIndex=from;
  while((m=re.exec(text))&&m.index<to){
    var a=m.index,b=Math.min(a+m[0].length,to);
    if(a>at)run(parent,at,a);
    if(GNT_TIP.fold(text.slice(a,b))){var w=el('span','gw');w.dataset.ni=WK[0];w.dataset.j=WK[1];w.dataset.n=n++;parent.appendChild(w);run(w,a,b);}
    else run(parent,a,b);
    at=b;
  }
  if(at<to)run(parent,at,to);
}
function markedText(parent,text){putMarked(parent,text,hlRanges(text),0,text.length);}
function lemmaInto(p,t){
  var rg=hlRanges(t);
  var m=/^(.*?\()([A-Z][A-Za-z]*(?: [A-Z][A-Za-z]*)*)(: .*)$/.exec(t);
  if(!m){putMarked(p,t,rg,0,t.length);return;}
  var a=m[1].length,b=a+m[2].length;
  putMarked(p,t,rg,0,a);putMarked(p,t,rg,a,b,['b','en']);putMarked(p,t,rg,b,t.length);
}
/* "Appendix C" in a note is a link that opens the first page of that appendix in the page viewer. The numbers are printed page numbers. */
var APPENDIX_PAGE={C:714};
function appendixLinks(root){
  if(!window.GNTPages)return;
  var hosts=[].slice.call(root.querySelectorAll('.gk'));
  hosts.forEach(function(host){
    var w=document.createTreeWalker(host,NodeFilter.SHOW_TEXT,null),nodes=[],at=[],s='',n;
    while((n=w.nextNode())){nodes.push(n);at.push(s.length);s+=n.data;}
    var re=/Appendix ([A-Z])\b/g,m,found=[];
    while((m=re.exec(s)))if(APPENDIX_PAGE[m[1]])found.push([m.index,m.index+m[0].length,m[1]]);
    function where(pos,isEnd){
      for(var i=0;i<nodes.length;i++){var lo=at[i],hi=lo+nodes[i].data.length;if(isEnd?(pos>lo&&pos<=hi):(pos>=lo&&pos<hi))return [nodes[i],pos-lo];}
      return null;
    }
    for(var k=found.length-1;k>=0;k--){
      var a=where(found[k][0],false),z=where(found[k][1],true);
      if(!a||!z)continue;
      var rg=document.createRange();rg.setStart(a[0],a[1]);rg.setEnd(z[0],z[1]);
      var text=rg.toString(),lk=GNTPages.link(text,APPENDIX_PAGE[found[k][2]]);
      lk.lang='en';lk.title='Show the first page of Appendix '+found[k][2]+' in the edition';
      rg.deleteContents();rg.insertNode(lk);
    }
  });
}
/* ----- translation hints: approximate English for what a reading changes, kept in hints-data.js and loaded the first time a note's hints are opened ----- */
var HINTSET=null;
if(window.GNT_HINTIDS&&GNT_HINTIDS.n===N.length){HINTSET=new Uint8Array(N.length);GNT_HINTIDS.ids.forEach(function(i){HINTSET[i]=1;});}
var HINTS=null,HINTWAIT=null;
var HINTHAY={},HINTBAD=false;
/* The words of a note's translation hints, ready for matching */
function hintHay(i){
  var h=HINTHAY[i];
  if(h===undefined)h=HINTHAY[i]=' '+GNT_EN.norm(HINTS[i].map(function(x){return x[1];}).join(' | '))+' ';
  return h;
}
function loadHints(cb){
  if(HINTS){cb(false);return;}
  if(HINTWAIT){HINTWAIT.push(cb);return;}
  HINTWAIT=[cb];
  var s=document.createElement('script');s.src='hints-data.js';
  function done(fail){var w=HINTWAIT;HINTWAIT=null;w.forEach(function(f){f(fail);});}
  s.onload=function(){HINTS=(window.GNT_HINTS&&GNT_HINTS.n===N.length&&GNT_HINTS.h)||null;done(!HINTS);};
  s.onerror=function(){done(true);};
  document.head.appendChild(s);
}
function hintBlock(n,idx){
  var box=el('div','hints'),btn=el('button','hbtn','Translation hints');
  btn.type='button';btn.setAttribute('aria-expanded','false');btn.setAttribute('aria-controls','hint'+idx);
  var panel=el('div','hpanel');panel.id='hint'+idx;panel.hidden=true;
  var built=false;
  btn.addEventListener('click',function(){
    if(btn.getAttribute('aria-expanded')==='true'){btn.setAttribute('aria-expanded','false');panel.hidden=true;return;}
    btn.setAttribute('aria-expanded','true');panel.hidden=false;
    if(built)return;
    panel.textContent='';panel.appendChild(el('p','hnote','Loading the hints…'));
    loadHints(function(fail){
      panel.textContent='';
      if(fail||!HINTS[idx]){panel.appendChild(el('p','hnote','The translation hints could not be loaded. Check your connection and try again.'));return;}
      built=true;
      var ul=el('ul','hl');
      HINTS[idx].forEach(function(h){
        var li=el('li'),m=0;h[0].forEach(function(r){m|=r<0?n[6][-r-1][1]:n[5][r][0];});
        li.appendChild(tagsFor(m,n[1]));
        var ht=el('span','ht');
        var rg=(ENPIECES.length&&window.GNT_EN&&GNT_EN.ready)?GNT_EN.ranges(h[1],ENPIECES):[],at=0;
        rg.forEach(function(r){if(r[0]>at)ht.appendChild(document.createTextNode(h[1].slice(at,r[0])));var mk=el('mark','hit',h[1].slice(r[0],r[1]));ht.appendChild(mk);at=r[1];});
        if(at<h[1].length)ht.appendChild(document.createTextNode(h[1].slice(at)));
        li.appendChild(ht);ul.appendChild(li);
      });
      panel.appendChild(ul);
    });
  });
  box.appendChild(btn);box.appendChild(panel);return box;
}
/* A note as plain text, for pasting: the reference, the main text, then each reading with its edition labels (as the rows above it show them) */
function noteText(n,li){
  var out=[BOOKS[n[1]]+' '+n[2]+', page '+n[0]+', note '+n[3],'Main text: '+n[4]];
  Array.prototype.forEach.call(li.querySelectorAll('.rd'),function(d){
    var tg=d.querySelector('.tags'),gk=d.querySelector('.gk'),kd=d.querySelector('.kd');
    var lab=tg?Array.prototype.map.call(tg.children,function(c){return c.textContent;}).join(', '):'';
    var what=(gk?gk.textContent:'')+(kd?(gk?' ':'')+kd.textContent.trim():'');
    out.push((lab?lab+': ':'')+what);
  });
  return out.join('\n');
}
function renderItem(n,idx){
  var li=el('li','res');
  var head=el('div','rhd');
  var ref=el('b',null,BOOKS[n[1]]+' '+n[2]);
  head.appendChild(ref);
  head.appendChild(document.createTextNode(' · '));
  var pgs=el('span','pg');pgs.appendChild(document.createTextNode('page '));pgs.appendChild(window.GNTPages.link(String(n[0]),n[0]));head.appendChild(pgs);
  head.appendChild(el('span','caller',' note '+n[3]));
  li.appendChild(head);
  var lem=el('div','lem');lem.appendChild(el('span','lab','Main text: '));var gr=el('span','gk');gr.lang='grc';WK=[idx,0];lemmaInto(gr,n[4]);WK=null;lem.appendChild(gr);li.appendChild(lem);
  /* the readings are listed in the order the printed edition gives them; a note's main text printed in brackets comes where the print puts it (b[2] counts the readings before it, and is left out when it follows them all) */
  function bracketRow(b){
    var d=el('div','rd br');
    var tags=tagsFor(b[1],n[1]);
    d.appendChild(tags);
    d.appendChild(el('span','kd','print the main-text reading in '+(b[0]===2?'double brackets':b[0]===3?'chevrons (« »)':'brackets')));
    li.appendChild(d);
  }
  function bracketsAt(p){n[6].forEach(function(b){if((b.length>2?b[2]:n[5].length)===p)bracketRow(b);});}
  bracketsAt(0);
  n[5].forEach(function(r,ri){
    var d=el('div','rd');
    var tags=tagsFor(r[0],n[1]);
    if(r[0]&BIT.RPmg){}
    d.appendChild(tags);
    var t=el('span','gk');t.lang='grc';if(r[1]==='txt')t.textContent='reads the main text';else{WK=[idx,ri+1];markedText(t,r[1]);WK=null;}d.appendChild(t);
    var kk=r[3];if(kk.length&&r[1]!=='txt'){d.appendChild(el('span','kd',' ('+kk.map(function(k){return KINDS[k];}).join('; ')+')'));}
    li.appendChild(d);
    if(window.GNT_CMP&&window.GNT_TIP&&r[1]!=='txt'&&r[3][0]!=='other')GNT_CMP.attach(d,n,idx,ri);
    bracketsAt(ri+1);
  });
  if(n[7])li.appendChild(el('div','rd br',null)).appendChild(el('span','kd','ECM prints a split guiding line here (ECM†).'));
  var sv=SPEC[n[1]+'/'+n[0]+'/'+n[3]];
  if(sv){
    var sp=el('div','specnote');
    sp.appendChild(el('b',null,'One of the fifty variants. '));
    sp.appendChild(document.createTextNode(sv.what+' '));
    var la=el('a',null,'See the manuscript evidence');la.href='variants.html#v='+sv.id;
    /* the pop-up opens right here, and closing it returns to these results; the arrows step through the fifty variants among them */
    la.addEventListener('click',function(ev){
      if(ev.ctrlKey||ev.metaKey||ev.shiftKey||ev.button||!window.GNTOpenVariant)return;
      ev.preventDefault();
      var ids=[];hits.forEach(function(i){var x=SPEC[N[i][1]+'/'+N[i][0]+'/'+N[i][3]];if(x&&ids.indexOf(x.id)<0)ids.push(x.id);});
      window.GNTOpenVariant(sv.id,ids);
    });
    sp.appendChild(la);
    li.appendChild(sp);
  }
  /* the verse itself, in Greek and English, goes below the main text and the readings so those stay together */
  var vt=el('div','vtext');li.appendChild(vt);
  var grh=el('div','grhold');grh.dataset.i=idx;grh.dataset.b=n[1];grh.dataset.r=n[2];grh.appendChild(el('span','ldwait','Loading the Greek…'));vt.appendChild(grh);
  var enh=el('div','enhold');enh.dataset.b=n[1];enh.dataset.r=n[2];enh.appendChild(el('span','ldwait','Loading the English…'));vt.appendChild(enh);
  var cph=el('div','copyhold'),cpb=el('button','encopy','Copy verse');cpb.type='button';cpb.title='Copy the reference and the Greek and English that are showing, without the shading';
  cpb.addEventListener('click',function(){
    var t=window.GNT_EN?GNT_EN.copyText(n[1],n[2],{english:GNT_EN.ready&&GNT_EN.shown(),greek:!!(window.GNT_GR&&GNT_GR.ready&&GNT_GR.shown())}):'';
    if(t)window.GNT_copy(t,cpb,'Copied');
  });
  var cnb=el('button','encopy','Copy this note');cnb.type='button';cnb.title='Copy the reference, the main text, and each reading with its editions, as plain text';
  cnb.addEventListener('click',function(){window.GNT_copy(noteText(n,li),cnb,'Copied');});
  cph.appendChild(cpb);cph.appendChild(cnb);vt.appendChild(cph);
  if(HINTSET&&HINTSET[idx]){
    var hb=hintBlock(n,idx);li.appendChild(hb);
    /* a search that matched the hints opens them, with the words highlighted */
    if(ENPIECES.length&&HINTS&&HINTS[idx]&&window.GNT_EN&&GNT_EN.ready&&GNT_EN.matches(hintHay(idx),ENPIECES))hb.querySelector('.hbtn').click();
  }
  appendixLinks(li);
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
  [[0,'Mt','Matthew'],[BOOKSTART[1],'Mk','Mark'],[BOOKSTART[2],'Lk','Luke'],[BOOKSTART[3],'Jn','John'],[BOOKSTART[4],'Ac','Acts'],[BOOKSTART[5],'Rom','Romans'],[BOOKSTART[18],'Heb','Hebrews'],[BOOKSTART[26],'Rev','Revelation']].forEach(function(a){
    var sp=el('span',null,a[1]);sp.title=a[2];sp.style.left=(Math.max(0,a[0]-1)/W*100)+'%';sc.appendChild(sp);
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
    var k=-1;
    for(var q=0;q<hits.length;q++){var pg=N[hits[q]][0];if(pg>=p&&(k<0||pg<N[hits[k]][0]||(pg===N[hits[k]][0]&&hits[q]<hits[k])))k=q;}
    if(k>=0){
      while(shown<=k)showMore();
      var li=$('results').children[k];if(li){li.scrollIntoView({behavior:'smooth',block:'start'});li.classList.add('flash');setTimeout(function(){li.classList.remove('flash');},1600);}
    }
  });
}
/* Put the English under each result once the English text is here */
function fillEnglish(){
  if(!window.GNT_EN||!GNT_EN.ready)return;
  var hs=$('results').querySelectorAll('.enhold[data-b]');
  for(var i=0;i<hs.length;i++){
    var h=hs[i],ln=GNT_EN.line(+h.dataset.b,h.dataset.r,ENPIECES,true,true);
    h.removeAttribute('data-b');h.textContent='';if(ln)h.appendChild(ln);
  }
}
/* Put the Greek of each result's verse, with the note's words shaded, once the Greek text is here */
function fillGreek(){
  if(!window.GNT_GR||!GNT_GR.ready)return;
  var hs=$('results').querySelectorAll('.grhold[data-i]');
  for(var i=0;i<hs.length;i++){
    var h=hs[i],ln=GNT_GR.line(+h.dataset.i,+h.dataset.b,h.dataset.r,true);
    h.removeAttribute('data-i');h.textContent='';if(ln)h.appendChild(ln);
  }
}
var ENPIECES=[];
function showMore(){
  var ul=$('results'),end=Math.min(hits.length,shown+PER);
  for(;shown<end;shown++)ul.appendChild(renderItem(N[hits[shown]],hits[shown]));
  fillEnglish();fillGreek();
  $('more').hidden=shown>=hits.length;
  if(!$('more').hidden)$('more').textContent='Show more ('+fmt(hits.length-shown)+' left)';
}
function update(){
  var f=getFilters();
  $('fEd').disabled=(f.rel==='split');
  var out=[];
  var hintWait=!!(f.eng.length&&HINTSET&&!HINTS&&!HINTBAD);
  var enWait=f.eng.length&&(!GNT_EN.ready||hintWait);
  if(f.eng.length&&!GNT_EN.ready)GNT_EN.load(update);
  if(hintWait)loadHints(function(fail){if(fail)HINTBAD=true;update();});
  if(!f.refBad&&!enWait){for(var i=0;i<N.length;i++)if(matches(N[i],i,f))out.push(i);}
  ENPIECES=f.eng;
  if(f.sort==='most')out=sortByMost(out);
  HLP=f.greek;
  hits=out;shown=0;$('results').textContent='';
  var c=$('rcount');
  if(enWait)c.textContent='Loading the English text…';
  else if(f.refBad)c.textContent='I could not read that passage. Try a form like “Romans 8”, “John 1:18”, “Romans 8:1-17”, or “1 Cor 12-14”.';
  else c.textContent=out.length===0?'No notes match these choices.':fmt(out.length)+' note'+(out.length===1?'':'s')+' ('+pct(out.length/N.length)+' of all '+fmt(N.length)+') on '+fmt(new Set(out.map(function(i){return N[i][0];})).size)+(new Set(out.map(function(i){return N[i][0];})).size===1?' page.':' pages.');
  $('catnote').hidden=!((CAT||SHARE||ALONE)&&!f.refBad);
  var cm=[];
  if(CAT)cm.push('readings whose one kind of difference is “'+CATNAME[CAT]+'”');
  if(SHARE)cm.push(SHARE.indexOf('with:')===0?'notes where the alternate Byzantine reading is also the reading of '+SHARE.slice(5):'notes with an alternate Byzantine reading that is '+SHARENAME[SHARE]);
  if(ALONE){var ap=ALONE.split('.');cm.push((ap[0]==='MT'?'notes where the main text reads alone':'notes where '+ap[0]+' reads alone')+(ap[1]==='agree'?', and every other reading is the same':ap[1]==='div'?', and the others are divided':''));}
  if(CAT||SHARE||ALONE)$('catnote').textContent='Showing only '+cm.join(', and ')+', as counted on the Compare editions page. Change any other choice above to see them all.';
  $('fCsv').disabled=!out.length;$('fCsvWide').disabled=!out.length;
  showMore();drawStrip(out);writeUrl();
  buildChips(f);
  scheduleCounts();
  var rn=$('restored');if(rn){rn.hidden=RESTORED!==1;RESTORED=RESTORED===1?2:0;}
}

/* ---------- sorting ---------- */
var DIFFN=[];
function diffCount(i){
  if(DIFFN[i]!==undefined)return DIFFN[i];
  var n=N[i],g=groupOf(n),c=0;
  SHOWN.forEach(function(e){if(edApplies(e,g)&&differs(n,e))c++;});
  return (DIFFN[i]=c);
}
function sortByMost(idx){return idx.slice().sort(function(a,b){return diffCount(b)-diffCount(a)||a-b;});}

/* ---------- choices in force: chips, and what to remove when nothing matches ---------- */
function dropStats(id){
  if(id==='fKind'||id==='fRel'||id==='fPat')CAT='';
  if(id==='fEd'||id==='fRel'||id==='fPat')SHARE='';
  if(id!=='fWhere')ALONE='';
}
function optText(id){var s=$(id);return s.options[s.selectedIndex].dataset.lab||s.options[s.selectedIndex].text;}
function activeChips(f){
  var L=[];
  function add(label,node,clear,drop){L.push({label:label,node:node,clear:function(){clear();},drop:drop});}
  if(!ALONE&&$('fEd').value){var e=$('fEd').value;
    add('Edition: '+(e==='RPmg'?'RP mg':e),e,function(){$('fEd').value='';dropStats('fEd');},function(g){g.ed='';g.share='';g.alone='';});}
  if($('fRel').value!=='differs')add('What it does: '+optText('fRel'),null,function(){$('fRel').value='differs';dropStats('fRel');},function(g){g.rel='differs';g.cat='';g.share='';g.alone='';});
  if($('fWhere').value)add('Where: '+optText('fWhere'),null,function(){$('fWhere').value='';},function(g){g.where='';});
  if(!CAT&&$('fKind').value)add('Kind: '+optText('fKind'),null,function(){$('fKind').value='';dropStats('fKind');},function(g){g.kind='';g.cat='';});
  if($('fPat').value)add('Pattern: '+optText('fPat'),null,function(){$('fPat').value='';dropStats('fPat');},function(g){g.pat='';g.cat='';g.share='';g.alone='';});
  if(EFFSET&&$('fEff').value)add('Effect on the English: '+optText('fEff'),null,function(){$('fEff').value='';},function(g){g.eff='';});
  if($('fRef').value.trim())add('Passage: '+$('fRef').value.trim(),null,function(){$('fRef').value='';},function(g){g.ref=null;g.refBad=false;});
  if($('fEng').value.trim())add('English: '+$('fEng').value.trim(),null,function(){$('fEng').value='';},function(g){g.eng=[];});
  if($('fGreek').value.trim())add('Greek: '+$('fGreek').value.trim(),null,function(){$('fGreek').value='';},function(g){g.greek=[];});
  if(CAT)add('Kind: '+CATNAME[CAT],null,function(){CAT='';$('fKind').value='';},function(g){g.cat='';g.kind='';});
  if(SHARE)add('Alternate reading: '+(SHARE.indexOf('with:')===0?'also the reading of '+SHARE.slice(5):SHARENAME[SHARE]),null,function(){SHARE='';},function(g){g.share='';});
  if(ALONE){var ap=ALONE.split('.');
    add('Reads alone: '+(ap[0]==='MT'?'the main text':ap[0])+(ap[1]==='agree'?' (others agree)':ap[1]==='div'?' (others divided)':''),null,function(){ALONE='';if(ap[0]!=='MT')$('fEd').value='';},function(g){g.alone='';});}
  return L;
}
function countFor(f){var c=0;for(var i=0;i<N.length;i++)if(matches(N[i],i,f))c++;return c;}
function buildChips(f){
  var box=$('achips'),nr=$('nores');if(!box)return;
  box.textContent='';nr.textContent='';
  var L=activeChips(f);
  box.hidden=!L.length;
  L.forEach(function(c){
    var b=el('button','chip'),lab=el('span','clab');b.type='button';
    if(c.node){lab.appendChild(document.createTextNode('Edition: '));if(c.node==='RPmg'){lab.appendChild(document.createTextNode('RP'));lab.appendChild(el('sup',null,'mg'));}else lab.appendChild(document.createTextNode(c.node));}
    else lab.appendChild(document.createTextNode(c.label));
    b.appendChild(lab);
    b.appendChild(el('span','chx','×')).setAttribute('aria-hidden','true');
    b.setAttribute('aria-label','Remove this choice: '+c.label);
    b.title='Remove this choice';
    b.addEventListener('click',function(){c.clear();update();});
    box.appendChild(b);
  });
  nr.hidden=true;
  if(f.refBad||hits.length||(f.eng.length&&!GNT_EN.ready))return;
  if(L.length){
    var opts=L.map(function(c){var g=getFilters();c.drop(g);return {c:c,n:countFor(g)};}).filter(function(o){return o.n>0;}).sort(function(a,b){return b.n-a.n;}).slice(0,3);
    nr.hidden=false;
    nr.appendChild(el('p',null,opts.length?'Removing one of the choices above would show notes:':'Nothing matches even one choice on its own. Use “Clear all” to start again.'));
    if(opts.length){var ul=el('p','nrbtns');opts.forEach(function(o){
      var b=el('button','btn btn-quiet','Remove “'+o.c.label+'” to see '+fmt(o.n)+' note'+(o.n===1?'':'s'));b.type='button';
      b.addEventListener('click',function(){o.c.clear();update();});ul.appendChild(b);});nr.appendChild(ul);}
  }
}

/* ---------- how many notes each choice would show ---------- */
var CNTSEL={fEd:'ed',fWhere:'where',fKind:'kind',fPat:'pat',fEff:'eff'};
var cntTimer=0;
function scheduleCounts(){clearTimeout(cntTimer);cntTimer=setTimeout(updateCounts,120);}
function updateCounts(){
  Object.keys(CNTSEL).forEach(function(id){
    var sel=$(id);if(sel.disabled)return;
    Array.prototype.forEach.call(sel.options,function(o){
      if(o.dataset.lab===undefined)o.dataset.lab=o.text;
      var f=getFilters();
      if(id==='fEd'){f.ed=o.value;f.share='';f.alone='';}
      else if(id==='fKind'){f.kind=o.value;f.cat='';}
      else if(id==='fPat'){f.pat=o.value;f.cat='';f.share='';f.alone='';}
      else if(id==='fEff')f.eff=o.value;
      else f.where=o.value;
      o.text=o.dataset.lab+' ('+fmt(f.refBad?0:countFor(f))+')';
    });
  });
}
/* ---------- CSV download ---------- */
/* The Reference column includes the book name (Matthew 6:1) so that Excel keeps it as text; a bare 6:1 would be turned into a time of day. */
function csvCell(v){return '"'+String(v).replace(/"/g,'""')+'"';}
/* What the optional columns hold: the verse in Greek and in the ASVBT, and the translation hint(s) of a note */
function csvVerse(n,kind){
  var vs=kind==='gr'?(window.GNT_GR?GNT_GR.verses(n[1],n[2]):[]):(window.GNT_EN?GNT_EN.verses(n[1],n[2]):[]);
  if(!vs.length)return '';
  return vs.length===1?vs[0].text:vs.map(function(v){return v.label+' '+v.text;}).join(' ');
}
function csvEdLabels(mask){return edsOf(mask).map(function(e){return e==='ECMs'?'ECM†':e;}).sort(function(a,b){return labelKey(a)<labelKey(b)?-1:labelKey(a)>labelKey(b)?1:0;});}
/* the hint texts that describe reading k of note idx (a negative k is a bracketed main text) */
function csvHintFor(idx,k){
  if(!HINTS||!HINTS[idx])return '';
  return HINTS[idx].filter(function(h){return h[0].indexOf(k)>=0;}).map(function(h){return h[1];}).join(' / ');
}
function csvHintAll(n,idx){
  if(!HINTS||!HINTS[idx])return '';
  return HINTS[idx].map(function(h){var m=0;h[0].forEach(function(r){m|=r<0?n[6][-r-1][1]:n[5][r][0];});return '['+csvEdLabels(m).join(' ')+'] '+h[1];}).join(' | ');
}
/* Book number, chapter and first verse as numbers, so that a spreadsheet can sort the notes in the order of the edition */
function csvPos(n){var m=/^(\d+):(\d+)/.exec(n[2]);return [n[1]+1,m?+m[1]:'',m?+m[2]:''];}
function csvRows(idx,opt){
  opt=opt||{};
  var rows=[['Book','Book number','Chapter','First verse','Reference','Note','Printed page','Main text','Row type','Reading','Editions','Kind of difference','Manuscript evidence (fifty variants)'].concat(EFFSET?['Changes the English']:[]).concat(opt.verse?['Greek verse','ASVBT English']:[]).concat(opt.hint?['Translation hint']:[])];
  idx.forEach(function(i){
    var n=N[i],ps=csvPos(n),base=[BOOKS[n[1]],ps[0],ps[1],ps[2],BOOKS[n[1]]+' '+n[2],n[3],n[0],n[4]];
    var sv=SPEC[n[1]+'/'+n[0]+'/'+n[3]],ev=sv?evidenceCsv(sv):'';
    var ef=EFFSET?[EFFSET[i]===1?'Yes':'No']:[];
    var vt=opt.verse?[csvVerse(n,'gr'),csvVerse(n,'en')]:[];
    function put(tail,k){rows.push(base.concat(tail).concat(ef).concat(vt).concat(opt.hint?[k===null?'':csvHintFor(i,k)]:[]));}
    function bracketCsv(b,bi){put(['main text printed in '+(b[0]===2?'double brackets':b[0]===3?'chevrons':'brackets'),'',csvEdLabels(b[1]).join('; '),'',ev],-bi-1);}
    function bracketsAtCsv(p){n[6].forEach(function(b,bi){if((b.length>2?b[2]:n[5].length)===p)bracketCsv(b,bi);});}
    bracketsAtCsv(0);
    n[5].forEach(function(r,ri){
      var kk=r[3].map(function(k){return KINDS[k];});
      put(['reading',r[1]==='txt'?'(reads the main text)':r[1],csvEdLabels(r[0]).join('; '),r[1]==='txt'?'':kk.join('; '),ev],ri);
      bracketsAtCsv(ri+1);
    });
    if(n[7])put(['ECM split guiding line','','ECM†','',ev],null);
  });
  return rows;
}
/* One row for each note, with a column for each edition that says what that edition reads there */
var WIDEEDS=SHOWN.concat(['RPmg']);
function csvWideRows(idx,opt){
  opt=opt||{};
  var rows=[['Book','Book number','Chapter','First verse','Reference','Note','Printed page','Main text'].concat(WIDEEDS.map(function(e){return e==='RPmg'?'RP mg (alternate Byzantine reading)':e;})).concat(['Editions that differ','Manuscript evidence (fifty variants)']).concat(EFFSET?['Changes the English']:[]).concat(opt.verse?['Greek verse','ASVBT English']:[]).concat(opt.hint?['Translation hints']:[])];
  idx.forEach(function(i){
    var n=N[i],ps=csvPos(n),g=groupOf(n);
    var sv=SPEC[n[1]+'/'+n[0]+'/'+n[3]],ev=sv?evidenceCsv(sv):'';
    var row=[BOOKS[n[1]],ps[0],ps[1],ps[2],BOOKS[n[1]]+' '+n[2],n[3],n[0],n[4]];
    WIDEEDS.forEach(function(e){
      var bit=BIT[e],cells=[];
      n[5].forEach(function(r){
        if(!(r[0]&bit)&&!(e==='ECM'&&(r[0]&BIT.ECMs)))return;
        cells.push((r[1]==='txt'?'(main text)':r[1])+(e==='ECM'&&!(r[0]&bit)?' †':''));
      });
      var br=n[6].filter(function(b){return b[1]&bit;}).map(function(b){return b[0]===2?'double brackets':b[0]===3?'chevrons':'brackets';});
      var t=cells.join(' / ');
      if(!cells.length){
        if(e==='RPmg')t='';
        else if(e==='ECM'&&!edApplies('ECM',g))t='';
        else t=br.length?'':'(main text)';
      }
      if(br.length)t+=(t?' ':'')+'[main text printed in '+br.join(' and ')+']';
      row.push(t);
    });
    row.push(diffCount(i),ev);
    if(EFFSET)row.push(EFFSET[i]===1?'Yes':'No');
    if(opt.verse)row.push(csvVerse(n,'gr'),csvVerse(n,'en'));
    if(opt.hint)row.push(csvHintAll(n,i));
    rows.push(row);
  });
  return rows;
}
/* The optional columns need the verse texts and the hints; load what is wanted, then build the file */
function csvGet(kind){
  if(!hits.length)return;
  var opt={verse:!!($('fCsvVerse')&&$('fCsvVerse').checked),hint:!!($('fCsvHint')&&$('fCsvHint').checked)};
  var btn=$(kind==='wide'?'fCsvWide':'fCsv'),was=btn.textContent;btn.disabled=true;btn.textContent='Preparing…';
  var todo=(opt.verse?2:0)+(opt.hint?1:0),failed=false;
  function done(){
    if(--todo>0)return;
    btn.disabled=false;btn.textContent=was;
    if(failed){btn.title='A column could not be loaded; check your connection and try again.';return;}
    var rows=kind==='wide'?csvWideRows(hits,opt):csvRows(hits,opt);
    csvSave(rows,kind==='wide'?'greek-nt-notes-one-row-per-note.csv':'greek-nt-notes.csv');
  }
  todo++;                       /* released at the end of this function */
  if(opt.verse){
    if(window.GNT_GR&&!GNT_GR.ready)GNT_GR.load(function(){done();});else done();
    if(window.GNT_EN&&!GNT_EN.ready)GNT_EN.load(function(){done();});else done();
  }
  if(opt.hint)loadHints(function(fail){if(fail)failed=true;done();});
  done();
}
function csvSave(rows,name){
  var text='﻿'+rows.map(function(r){return r.map(csvCell).join(',');}).join('\r\n')+'\r\n';
  var blob=new Blob([text],{type:'text/csv;charset=utf-8'});
  var url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=name;document.body.appendChild(a);a.click();document.body.removeChild(a);
  setTimeout(function(){URL.revokeObjectURL(url);},1000);
}
function downloadCsv(){csvGet('rows');}
var ALONE='';   /* set only by a link from the Stats page: an edition (or the main text) reading alone */
var SHARE='';   /* set only by a link from the Stats page: who else reads an alternate Byzantine reading */
var CAT='';   /* set only by a link from the Stats page: a kind of difference chosen there */
var URLMAP={ed:'fEd',rel:'fRel',where:'fWhere',kind:'fKind',pat:'fPat',eff:'fEff',ref:'fRef',greek:'fGreek',eng:'fEng',sort:'fSort'};
var URLDEF={rel:'differs'};
var LASTKEY='gnt-last-search',RESTORED=0;
function writeUrl(){
  if(!window.history||!history.replaceState)return;
  var p=new URLSearchParams();
  Object.keys(URLMAP).forEach(function(k){var v=$(URLMAP[k]).value;if(v&&v!==(URLDEF[k]||''))p.set(k,v);});
  if(CAT)p.set('cat',CAT);
  if(SHARE)p.set('share',SHARE);
  if(ALONE)p.set('alone',ALONE);
  var qs=p.toString();
  try{if(qs)localStorage.setItem(LASTKEY,qs);else localStorage.removeItem(LASTKEY);}catch(e){}
  try{history.replaceState(null,'',location.pathname+(qs?'?'+qs+'#find':''));}catch(e){}
}
function readUrl(qs){
  var p=new URLSearchParams(qs===undefined?location.search:qs),any=false;
  Object.keys(URLMAP).forEach(function(k){if(p.has(k)){$(URLMAP[k]).value=p.get(k);any=true;}});
  if(p.has('cat')&&/^(short|long|same|brw|bronly|spell|order|omitall|omitany|omit|add|repl|elide|krasis|br1|br2|br3|other|minor)$/.test(p.get('cat'))){CAT=p.get('cat');any=true;if(CAT!=='minor')$('fKind').value=CAT;}
  if(p.has('share')&&/^(byz|crit|tr|none|critonly|with:(HF|PCK|PT|ECM|NA27|NA28|SBL|TH|WH|SCR|ST))$/.test(p.get('share'))){SHARE=p.get('share');any=true;}
  if(p.has('alone')&&/^(MT|HF|PCK|PT|ECM|NA27|NA28|SBL|TH|WH|SCR|ST)(\.(agree|div))?$/.test(p.get('alone'))){ALONE=p.get('alone');any=true;if(ALONE.split('.')[0]!=='MT')$('fEd').value=ALONE.split('.')[0];}
  return any;
}
function init(){
  if($('filters'))$('filters').addEventListener('submit',function(ev){ev.preventDefault();});
  if($('cgrid')){buildKey();buildChart();buildDensity();buildKinds();buildRP();buildAlone();fitLabels();window.addEventListener('load',fitLabels);window.addEventListener('resize',fitLabels);}
  if(!$('filters'))return;
  buildFilters();stripHover();
  if(!EFFSET){var el0=$('fEff');if(el0&&el0.parentNode)el0.parentNode.hidden=true;}
  if(window.GNT_EN){
    GNT_EN.load(fillEnglish);
    var se=$('fShowEn');
    if(se){
      var applyEn=function(){$('results').classList.toggle('no-en',!se.checked);};
      se.checked=GNT_EN.shown();applyEn();
      se.addEventListener('change',function(){GNT_EN.setShown(se.checked);applyEn();});
      document.addEventListener('gntenglish',function(){se.checked=GNT_EN.shown();applyEn();});
    }
  }
  if(window.GNT_GR){
    var sg=$('fShowGr');
    if(sg){
      var applyGr=function(){$('results').classList.toggle('no-gr',!sg.checked);if(sg.checked)GNT_GR.load(fillGreek);};
      sg.checked=GNT_GR.shown();applyGr();
      sg.addEventListener('change',function(){GNT_GR.setShown(sg.checked);applyGr();});
      document.addEventListener('gntgreek',function(){sg.checked=GNT_GR.shown();applyGr();});
    }
  }
  var bl=$('bookList');if(bl)BOOKS.forEach(function(b){bl.appendChild(new Option(b));});
  ['fEd','fRel','fWhere','fKind','fPat','fEff'].forEach(function(id){$(id).addEventListener('change',function(){dropStats(id);update();});});
  $('fSort').addEventListener('change',update);
  var tm;['fRef','fGreek','fEng'].forEach(function(id){$(id).addEventListener('input',function(){clearTimeout(tm);tm=setTimeout(update,200);});});
  $('fReset').addEventListener('click',function(){
    $('fEd').value='';$('fRel').value='differs';$('fWhere').value='';$('fKind').value='';$('fPat').value='';$('fEff').value='';$('fRef').value='';$('fGreek').value='';$('fEng').value='';$('fSort').value='';CAT='';SHARE='';ALONE='';update();
  });
  $('more').addEventListener('click',showMore);
  var rt;window.addEventListener('resize',function(){clearTimeout(rt);rt=setTimeout(function(){drawStrip(hits);},150);});
  $('fCsv').addEventListener('click',downloadCsv);
  $('fCsvWide').addEventListener('click',function(){csvGet('wide');});
  var sh=$('fShare');
  if(sh)sh.addEventListener('click',function(){writeUrl();window.GNT_copy(location.href,sh,'Link copied');});
  var had=readUrl();
  if(!had){try{var sv=localStorage.getItem(LASTKEY);if(sv&&readUrl(sv))RESTORED=1;}catch(e){}}
  update();
  if(had){var fd=$('find');if(fd)fd.scrollIntoView();}
}
/* Old shared links pointed at stats.html?...#find; send them to the search page. */
if(!$('filters')&&(/[?&](ed|rel|where|kind|pat|ref|greek)=/.test(location.search)||location.hash==='#find')){location.replace('search.html'+location.search+(location.hash==='#find'?'#find':''));}else init();
})();
