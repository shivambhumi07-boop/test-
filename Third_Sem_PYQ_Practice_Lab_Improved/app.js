const data = window.PYQ_DATA || [];
const $ = id => document.getElementById(id);
const storeKey = 'pyqPracticeProgressV1';
const schemaVersion = 2;

function defaultProgress(){
  return { version:schemaVersion, attempts:[], resumes:{}, review:{}, timerPrefs:{}, timerEnds:{}, theme:null };
}
function loadProgress(){
  try{
    const raw = JSON.parse(localStorage.getItem(storeKey) || 'null');
    if(!raw) return defaultProgress();
    const p = {...defaultProgress(), ...raw};
    p.attempts = Array.isArray(raw.attempts) ? raw.attempts : [];
    p.resumes = raw.resumes && typeof raw.resumes === 'object' ? raw.resumes : {};
    p.review = raw.review && typeof raw.review === 'object' ? raw.review : {};
    p.timerPrefs = raw.timerPrefs && typeof raw.timerPrefs === 'object' ? raw.timerPrefs : {};
    p.timerEnds = raw.timerEnds && typeof raw.timerEnds === 'object' ? raw.timerEnds : {};
    p.version = schemaVersion;
    return p;
  }catch{return defaultProgress();}
}
let progress = loadProgress();
let selectedPaper = null, currentIndex = 0, currentFile = null, timerInterval = null;
let paperFilter = {phase:'',year:'',search:''};
let topicPractice = '';
let route = location.pathname.includes('dashboard') ? 'dashboard' : 'practice';

const subject = $('subjectSelect');
const startBtn = null;
const topicKeywords = {
 'DFA/NFA/ε-NFA / Automata':['dfa','nfa','epsilon','transition','state','accepting','automata'],'Regular Expressions':['regular expression','regex','kleene','state elimination'],'Regular Grammars':['regular grammar','right linear','left linear'],'Context-Free Grammar':['context free grammar','cfg','parse tree','derivation','ambigu'],'Pushdown Automata':['pda','pushdown','stack'],'Pumping Lemma':['pumping lemma'],'Turing Machines':['turing machine','tape','head'],'Closure Properties':['closed under','closure','union','intersection'],'DFA Minimization / Myhill-Nerode':['minimize','minimal','myhill','partition'],'Chomsky Hierarchy':['chomsky','type 0','type 1','type 2','type 3'],'Recurrences & Asymptotic Complexity':['recurrence','asymptotic','big o','big omega','big theta','time complexity','running time'],'Divide and Conquer':['quick sort','quicksort','merge sort','divide','conquer','binary search'],'Greedy Algorithms':['greedy','knapsack','huffman','job sequencing','deadline'],'Graph Algorithms / MST':['kruskal','prim','minimum spanning tree','mst','graph'],'Dynamic Programming / LCS':['longest common subsequence','lcs','dynamic programming'],'Heaps':['heap','heapify','max heap','delete root'],'Sliding Window':['sliding window'],'Dijkstra':['dijkstra','shortest path'],'ER Modeling':['er diagram','entity relationship','entity','relationship'],'Relational Algebra':['relational algebra','division','projection','selection','join'],'SQL':['select','insert','update','delete','mysql','sql'],'Functional Dependencies & Normalization':['functional dependency','normalization','1nf','2nf','3nf','bcnf','candidate key','superkey'],'Transactions & Schedules':['transaction','schedule','serializability','serializable','conflict','recover'],'Indexing / B+ Trees':['b+ tree','index','indexing'],'Views / Constraints':['view','constraint','foreign key','primary key','check constraint'],'Decomposition':['decomposition','lossless','dependency preservation'],'Cache Memory':['cache','mapping','hit','miss','lru','coherence','set-associative'],'Pipelining & Hazards':['pipeline','stall','forwarding','hazard','stage'],'Instruction Set / Addressing':['one-address','two-address','three-address','mips','assembly','instruction'],'Memory Organization':['memory','ram','address space','page','block'],'Control Unit':['control unit','hardwired','microprogram'],'I/O & DMA':['dma','direct memory access','interrupt','i/o'],'Performance & Speedup':['efficiency','speedup','clock','cpi','execution time'],'Fourier Transform / Spectrum':['fourier','spectrum','transform'],'Sampling & Aliasing':['sampling theorem','aliasing','sampling','nyquist'],'AM / DSB-SC / SSB':['am','dsb','ssb','sideband','modulation index'],'FM / PM':['fm','frequency modulation','phase modulation','narrowband'],'PCM / Pulse Modulation':['pcm','quantization','pulse width','pdm','pwm'],'Digital Modulation / BPSK':['bpsk','fsk','psk'],'Noise / SNR':['noise','snr','signal-to-noise'],'Convolution / LTI Systems':['convolution','impulse response','lti'],'Hilbert Transform':['hilbert'],'Probability Distributions':['probability','binomial','poisson','distribution','bayes'],'Numerical Methods / Newton-Raphson':['newton','root','numerical','iteration'],'Linear Systems / Gauss-Seidel':['gauss-seidel','linear equations','system of equations'],'Interpolation / Curve Fitting':['interpolation','regression','curve fitting']
};

function unique(arr){return [...new Set(arr)];}
function phaseLabel(p){return p==='mid'?'Mid-Term':p==='end'?'End-Term':'Other';}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function save(){try{localStorage.setItem(storeKey,JSON.stringify(progress));}catch{toast('Could not save locally. Your browser storage may be full.','error');}}
function toast(message,type='info'){const el=document.createElement('div');el.className=`toast ${type}`;el.textContent=message;$('toastRegion').appendChild(el);setTimeout(()=>el.remove(),3200);}
function navigate(next){route=next; const path=next==='dashboard'?'/dashboard':'/practice'; try{history.pushState({route:next},'',path);}catch{} renderRoute();}
function renderRoute(){
  $('practiceView').classList.toggle('hidden',route!=='practice'); $('dashboardView').classList.toggle('hidden',route!=='dashboard');
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.view===route));
  if(route==='dashboard') renderDashboard();
  updateStepper(route==='dashboard'?'results':(selectedPaper?'solve':'choose'));
}
window.addEventListener('popstate',()=>{route=location.pathname.includes('dashboard')?'dashboard':'practice';renderRoute();});
function updateStepper(step){
  const order=['choose','solve','results']; const idx=order.indexOf(step);
  document.querySelectorAll('.step').forEach(el=>{const i=order.indexOf(el.dataset.step);el.classList.toggle('active',i===idx);el.classList.toggle('done',i<idx);});
}
document.querySelectorAll('.step').forEach(btn=>btn.addEventListener('click',()=>{if(btn.dataset.step==='results')navigate('dashboard');else if(btn.dataset.step==='solve'&&selectedPaper){navigate('practice');$('quizPanel').scrollIntoView({behavior:'smooth'});}else{navigate('practice');$('choosePanel').scrollIntoView({behavior:'smooth'});}}));

document.querySelectorAll('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.view)));

function renderSubjects(){
  const vals=unique(data.map(p=>p.subject)).sort();
  subject.innerHTML='<option value="">All subjects</option>'+vals.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');
}
function chip(label,value,active,kind){return `<button class="filter-chip ${active?'active':''}" data-filter-kind="${kind}" data-filter-value="${esc(value)}" type="button">${esc(label)}</button>`;}
function renderFilters(){
  const subset=data.filter(p=>!subject.value||p.subject===subject.value);
  const phases=[['','All exam types'],['mid','Mid-Term'],['end','End-Term'],['other','Other']];
  $('phaseChips').innerHTML=phases.filter(([v])=>v===''||subset.some(p=>p.phase===v)).map(([v,l])=>chip(l,v,paperFilter.phase===v,'phase')).join('');
  const years=unique(subset.map(p=>p.year).filter(Boolean)).sort();
  $('yearChips').innerHTML=[['','All years'],...years.map(y=>[y,y])].map(([v,l])=>chip(l,v,paperFilter.year===v,'year')).join('');
}
function getFilteredPapers(){
  const q=paperFilter.search.trim().toLowerCase();
  return data.filter(p=>{
    if(subject.value&&p.subject!==subject.value)return false;
    if(paperFilter.phase&&p.phase!==paperFilter.phase)return false;
    if(paperFilter.year&&p.year!==paperFilter.year)return false;
    if(!q)return true;
    return [p.title,p.subject,p.year,phaseLabel(p.phase)].join(' ').toLowerCase().includes(q);
  });
}
function paperQuestionCount(p){return topicPractice?p.questions.filter(q=>q.topics.includes(topicPractice)).length:p.questions.length;}
function renderPaperCards(){
  const arr=getFilteredPapers();
  const grid=$('paperGrid');
  grid.innerHTML=arr.map(p=>{
    const count=paperQuestionCount(p); if(topicPractice&&!count)return '';
    const active=selectedPaper?.id===p.id;
    return `<article class="paper-card ${active?'selected':''}"><div class="paper-card-top"><span class="phase-pill ${p.phase}">${esc(phaseLabel(p.phase))}</span><span class="paper-year">${esc(p.year||'—')}</span></div><h3>${esc(p.title.replace(/^(April|March|September|May|December|November|August) \d{4} - /,''))}</h3><p>${esc(p.subject)}</p><div class="paper-card-meta"><span>${count} question${count===1?'':'s'}</span><span>${p.pageCount} page${p.pageCount===1?'':'s'}</span></div><button class="primary wide" data-start-paper="${esc(p.id)}" type="button">${getResumeLabel(p)} →</button></article>`;
  }).join('');
  const visible=grid.querySelectorAll('.paper-card').length;
  $('paperEmpty').classList.toggle('hidden',visible>0);
  $('paperEmpty').innerHTML=topicPractice?`<div class="empty-icon">⌁</div><h3>No papers contain “${esc(topicPractice)}”</h3><p>Clear the topic filter and choose another topic or paper.</p><button class="primary" id="emptyClearTopic" type="button">Clear topic filter</button>`:`<div class="empty-icon">⌕</div><h3>No papers found</h3><p>Try another year, exam type, subject, or search term.</p><button class="ghost" id="emptyResetFilters" type="button">Reset filters</button>`;
  grid.querySelectorAll('[data-start-paper]').forEach(b=>b.addEventListener('click',()=>startPaperById(b.dataset.startPaper)));
  $('emptyClearTopic')?.addEventListener('click',()=>{topicPractice='';renderPaperSelection();});
  $('emptyResetFilters')?.addEventListener('click',()=>{paperFilter={phase:'',year:'',search:''};$('paperSearch').value='';renderPaperSelection();});
}
function getResumeLabel(p){const r=progress.resumes[p.id];return r&&r.index>0&&r.index<p.questions.length?'Resume paper':'Start paper';}
function renderPaperSelection(){renderFilters();renderPaperCards();$('clearTopicFilter').classList.toggle('hidden',!topicPractice);$('topicFilterNotice').classList.toggle('hidden',!topicPractice);$('topicFilterNotice').innerHTML=topicPractice?`Practicing only <strong>${esc(topicPractice)}</strong>. Paper cards show only related questions.`:'';}
subject.addEventListener('change',()=>{paperFilter.phase='';paperFilter.year='';renderPaperSelection();});
$('phaseChips').addEventListener('click',e=>{const b=e.target.closest('[data-filter-kind]');if(!b)return;paperFilter[b.dataset.filterKind]=b.dataset.filterValue;renderPaperSelection();});
$('yearChips').addEventListener('click',e=>{const b=e.target.closest('[data-filter-kind]');if(!b)return;paperFilter[b.dataset.filterKind]=b.dataset.filterValue;renderPaperSelection();});
$('paperSearch').addEventListener('input',e=>{paperFilter.search=e.target.value;renderPaperCards();});
$('clearTopicFilter').addEventListener('click',()=>{topicPractice='';renderPaperSelection();});

function startPaperById(id){
  const p=data.find(x=>x.id===id); if(!p)return;
  selectedPaper=p;
  const r=progress.resumes[p.id]||{};
  const qs=getPracticeQuestions();
  currentIndex=Math.min(Number.isInteger(r.index)?r.index:0,Math.max(0,qs.length-1));
  $('quizPanel').classList.remove('hidden'); $('quizTitle').textContent=p.title; renderQuestion(); updateStepper('solve'); navigate('practice'); $('quizPanel').scrollIntoView({behavior:'smooth',block:'start'});
  toast(r.index?'Resumed where you left off.':'Paper ready — good luck!','success');
  if(progress.timerEnds[p.id]) startTimerTick();
}
function getPracticeQuestions(){return selectedPaper?(topicPractice?selectedPaper.questions.filter(q=>q.topics.includes(topicPractice)):selectedPaper.questions):[];}
function saveResume(){if(!selectedPaper)return;const q=getPracticeQuestions()[currentIndex];progress.resumes[selectedPaper.id]={index:currentIndex,questionId:q?.id||null,answer:$('answerText').value||'',updatedAt:new Date().toISOString(),topic:topicPractice||''};save();}
function renderQuestion(){
  const qs=getPracticeQuestions(); if(!selectedPaper||!qs.length)return;
  const q=qs[currentIndex]; const total=qs.length;
  $('qBadge').textContent=`Q${q.number}`; $('qMarks').textContent=`${q.maxMarks} marks`; $('questionText').textContent=q.text;
  $('questionNotice').classList.toggle('hidden',q.machineReadable); $('questionNotice').textContent=q.machineReadable?'':'This paper page is image-only in the supplied PDF. The exact source page is shown beside the question; no text has been invented.';
  $('topicChips').innerHTML=(q.topics||[]).map(t=>`<button class="chip topic-link" data-topic="${esc(t)}" type="button">${esc(t)}</button>`).join('');
  $('progressText').textContent=`Question ${currentIndex+1} of ${total} • ${total-currentIndex-1} remaining`;
  $('progressBar').style.width=`${((currentIndex+1)/total)*100}%`;
  $('sourcePageText').textContent=`Page ${q.page} of ${selectedPaper.pageCount}`; $('paperFrame').src=`${selectedPaper.pdf}#page=${q.page}`; $('sourceBtn').onclick=()=>window.open(`${selectedPaper.pdf}#page=${q.page}`,'_blank');
  const key=`${selectedPaper.id}:${q.id}`; const savedAnswer=progress.resumes[selectedPaper.id]?.questionId===q.id?progress.resumes[selectedPaper.id].answer:'';
  $('answerText').value=savedAnswer||''; $('gradeResult').classList.add('hidden'); $('ocrStatus').textContent=''; clearFilePreview(false); updateReviewButton(q); updateNavButtons(); saveResume();
}
function updateNavButtons(){const qs=getPracticeQuestions();const atStart=currentIndex===0,atEnd=currentIndex===qs.length-1;['prevBtn','mobilePrevBtn'].forEach(id=>$(id).disabled=atStart);['nextBtn','mobileNextBtn'].forEach(id=>$(id).disabled=atEnd);}
function updateReviewButton(q){const key=`${selectedPaper.id}:${q.id}`;const on=!!progress.review[key];$('reviewBtn').setAttribute('aria-pressed',String(on));$('reviewBtn').classList.toggle('on',on);$('reviewBtn').textContent=on?'★ Review later':'☆ Review later';}
function clearFilePreview(resetInput=true){currentFile=null;if(resetInput)$('answerFile').value='';$('fileName').textContent='No file selected';$('previewWrap').classList.add('hidden');$('imagePreview').src='';$('pdfPreview').src='';$('ocrBtn').disabled=true;$('removeFileBtn').classList.add('hidden');}
function previewFile(file){
  $('previewWrap').classList.remove('hidden'); $('imagePreview').style.display='none'; $('pdfPreview').style.display='none'; $('removeFileBtn').classList.remove('hidden');
  const url=URL.createObjectURL(file);
  if(file.type.startsWith('image/')){$('imagePreview').src=url;$('imagePreview').style.display='block';$('ocrBtn').disabled=false;}
  else if(file.type==='application/pdf'||file.name.toLowerCase().endsWith('.pdf')){$('pdfPreview').src=url;$('pdfPreview').style.display='block';$('ocrBtn').disabled=true;}
  else {$('previewWrap').classList.add('hidden');$('ocrBtn').disabled=true;}
}
function readTextFile(file){return new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(String(fr.result||''));fr.onerror=rej;fr.readAsText(file);});}
async function handleFile(file){if(!file)return;currentFile=file;$('fileName').textContent=file.name;previewFile(file);if(file.type.startsWith('text/')||/\.(txt|md)$/i.test(file.name)){try{$('answerText').value=await readTextFile(file);saveResume();}catch{toast('Could not read that text file.','error');}}}
$('answerFile').addEventListener('change',e=>handleFile(e.target.files[0]));
['dragenter','dragover'].forEach(ev=>$('uploadDrop').addEventListener(ev,e=>{e.preventDefault();$('uploadDrop').classList.add('dragging');}));
['dragleave','drop'].forEach(ev=>$('uploadDrop').addEventListener(ev,e=>{e.preventDefault();$('uploadDrop').classList.remove('dragging');}));
$('uploadDrop').addEventListener('drop',e=>handleFile(e.dataTransfer.files[0]));
$('uploadDrop').addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target===$('uploadDrop'))$('answerFile').click();});
$('removeFileBtn').addEventListener('click',()=>{clearFilePreview(true);toast('Answer file removed.','info');});
$('ocrBtn').addEventListener('click',async()=>{
  if(!currentFile||!currentFile.type.startsWith('image/')||!window.Tesseract)return;
  $('ocrStatus').textContent='OCR running…';$('ocrBtn').disabled=true;$('gradeBtn').disabled=true;
  try{const r=await Tesseract.recognize(currentFile,'eng',{logger:m=>{if(m.status==='recognizing text')$('ocrStatus').textContent=`OCR ${Math.round((m.progress||0)*100)}%`;}});$('answerText').value=r.data.text||'';$('ocrStatus').textContent='OCR complete — edit the text before grading.';saveResume();toast('OCR text extracted. Check it before grading.','success');}catch{$('ocrStatus').textContent='OCR failed — enter the answer manually.';toast('OCR failed.','error');}finally{$('ocrBtn').disabled=false;$('gradeBtn').disabled=false;}
});
$('answerText').addEventListener('input',()=>{clearTimeout(window.__resumeTimer);window.__resumeTimer=setTimeout(saveResume,250);});
$('reviewBtn').addEventListener('click',()=>{if(!selectedPaper)return;const q=getPracticeQuestions()[currentIndex];const key=`${selectedPaper.id}:${q.id}`;progress.review[key]=!progress.review[key];save();updateReviewButton(q);toast(progress.review[key]?'Marked for review later.':'Removed from review list.','info');});

document.addEventListener('click',e=>{const topic=e.target.closest('.topic-link');if(topic){topicPractice=topic.dataset.topic;renderPaperSelection();$('choosePanel').scrollIntoView({behavior:'smooth'});}});
function goPrev(){saveResume();if(currentIndex>0){currentIndex--;renderQuestion();}}
function goNext(){saveResume();if(currentIndex<getPracticeQuestions().length-1){currentIndex++;renderQuestion();}}
['prevBtn','mobilePrevBtn'].forEach(id=>$(id).addEventListener('click',goPrev));['nextBtn','mobileNextBtn'].forEach(id=>$(id).addEventListener('click',goNext));['gradeBtn','mobileGradeBtn'].forEach(id=>$(id).addEventListener('click',gradeAnswer));

function rubricFor(q){
  const keys=unique((q.topics||[]).flatMap(t=>topicKeywords[t]||[]));
  return {keys,provided:q.rubric||q.markingScheme||q.modelAnswer||null};
}
function gradeAnswer(){
  if(!selectedPaper)return;
  const q=getPracticeQuestions()[currentIndex]; const text=String($('answerText').value||'').trim();
  if(text.length<10){showGradeResult(q,0,[],rubricFor(q).keys,'Add a fuller answer before grading. The local grader needs enough text to compare against the topic rubric.');return;}
  const {keys,provided}=rubricFor(q); const lower=text.toLowerCase(); const hits=keys.filter(k=>lower.includes(k.toLowerCase())); const misses=keys.filter(k=>!hits.includes(k));
  const coverage=keys.length?hits.length/keys.length:0.15; const words=text.split(/\s+/).filter(Boolean).length; const lengthBonus=Math.min(.12,words/1800); let frac=Math.min(1,.08+coverage*.82+lengthBonus); if(words<35)frac*=.65;
  const score=Math.round(frac*q.maxMarks*10)/10;
  progress.attempts.unshift({time:new Date().toISOString(),paper:selectedPaper.title,subject:selectedPaper.subject,phase:phaseLabel(selectedPaper.phase),paperId:selectedPaper.id,question:`Q${q.number}`,questionId:q.id,topics:q.topics||[],score,max:q.maxMarks,words}); progress.attempts=progress.attempts.slice(0,300); save(); renderDashboard(); saveResume();
  const feedback=hits.length?`Matched ${hits.length} of ${keys.length||1} rubric/topic terms. This is a keyword/rubric estimate and does not verify mathematical derivations, diagrams, calculations, or exact conceptual correctness.`:'No rubric terms matched strongly. Revisit the topic and include the relevant definitions, steps, formulas, diagrams, or examples.';
  showGradeResult(q,score,hits,misses,feedback,provided);toast(`Graded ${score}/${q.maxMarks}.`,'success');
  updateStepper('solve');
}
function showGradeResult(q,score,hits,misses,feedback,provided){
  const hitHtml=hits.length?hits.map(x=>`<span class="rubric-hit">✓ ${esc(x)}</span>`).join(''):'<span class="muted">No rubric terms detected.</span>';
  const missHtml=misses.length?misses.map(x=>`<span class="rubric-miss">× ${esc(x)}</span>`).join(''):'<span class="muted">No keyword gaps detected.</span>';
  const answerHtml=provided?`<details class="marking-details"><summary>Model answer / marking scheme</summary><div>${esc(typeof provided==='string'?provided:JSON.stringify(provided,null,2))}</div></details>`:`<details class="marking-details"><summary>Model answer / marking scheme</summary><div class="muted">Not available in the supplied paper data for this question.</div></details>`;
  $('gradeResult').classList.remove('hidden');$('gradeResult').innerHTML=`<div class="score-summary"><div><span class="eyebrow">Estimated score</span><div class="grade-score">${score} / ${q.maxMarks}</div></div><span class="estimate-badge">Rubric estimate</span></div><div class="why-score"><h3>Why this score?</h3><div class="rubric-grid"><div><strong>Points/signals hit</strong><div class="rubric-list">${hitHtml}</div></div><div><strong>Signals missed</strong><div class="rubric-list">${missHtml}</div></div></div><p class="feedback">${esc(feedback)}</p>${answerHtml}</div>`;
}

function defaultTimerMinutes(p){return p.phase==='mid'?60:p.phase==='end'?180:45;}
function timerEnabled(){return selectedPaper&&progress.timerPrefs[selectedPaper.id]===true;}
function updateTimerUI(){if(!selectedPaper)return;const enabled=timerEnabled();$('timerDisplay').classList.toggle('hidden',!enabled);$('timerToggle').textContent=enabled?'Disable timer':'Enable timer';if(enabled){if(!progress.timerEnds[selectedPaper.id])progress.timerEnds[selectedPaper.id]=Date.now()+defaultTimerMinutes(selectedPaper)*60000;const remain=Math.max(0,progress.timerEnds[selectedPaper.id]-Date.now());const m=Math.floor(remain/60000),s=Math.floor(remain/1000)%60;$('timerDisplay').textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;$('timerDisplay').classList.toggle('urgent',remain<5*60000);if(remain===0){toast('Timer finished. You can still complete the paper.','error');clearInterval(timerInterval);}}}
function startTimerTick(){clearInterval(timerInterval);updateTimerUI();timerInterval=setInterval(()=>{if(!selectedPaper||!timerEnabled()){clearInterval(timerInterval);return;}updateTimerUI();save();},1000);}
$('timerToggle').addEventListener('click',()=>{if(!selectedPaper)return;const on=timerEnabled();progress.timerPrefs[selectedPaper.id]=!on;if(!on){progress.timerEnds[selectedPaper.id]=Date.now()+defaultTimerMinutes(selectedPaper)*60000;toast(`Timer enabled for ${defaultTimerMinutes(selectedPaper)} minutes.`,'info');startTimerTick();}else{delete progress.timerEnds[selectedPaper.id];clearInterval(timerInterval);toast('Timer disabled.','info');}save();updateTimerUI();});

function renderDashboard(){
  const a=progress.attempts; $('statAttempts').textContent=a.length; $('heroAttempted').textContent=a.length; $('statAvg').textContent=a.length?Math.round(a.reduce((s,x)=>s+x.score/x.max,0)/a.length*100)+'%':'0%';
  const map={}; a.forEach(x=>(x.topics||[]).forEach(t=>{map[t]??={sum:0,max:0,count:0};map[t].sum+=x.score;map[t].max+=x.max;map[t].count++;}));
  const rows=Object.entries(map).map(([t,v])=>({t,p:v.max?v.sum/v.max*100:0,n:v.count})).sort((x,y)=>x.p-y.p); $('statTopics').textContent=rows.length;
  renderTopicChart(rows.slice(0,10)); renderScoreChart(a.slice(0,20).reverse());
  $('weakTopics').innerHTML=rows.length?rows.slice(0,15).map(r=>{const cls=r.p<50?'bad':r.p<75?'warn':'good';return `<div class="topic-row"><div><button class="topic-title-btn" data-topic-dashboard="${esc(r.t)}" type="button">${esc(r.t)}</button><span class="muted">${r.n} attempt${r.n>1?'s':''}</span></div><div class="bar"><span class="${cls}" style="width:${Math.max(3,Math.min(100,r.p))}%"></span></div><div class="topic-score ${cls}">${Math.round(r.p)}%</div><button class="ghost topic-practice" data-practice-topic="${esc(r.t)}" type="button">Practice</button></div>`;}).join(''):`<div class="empty-state inline"><div class="empty-icon">✦</div><h3>Your dashboard is waiting for its first attempt.</h3><p>Grade one question from any paper and your weak topics, charts, and history will appear here.</p><button class="primary" id="startFirstBtn" type="button">Start your first paper</button></div>`;
  $('history').innerHTML=a.length?a.slice(0,20).map(x=>`<div class="history-row"><div><div class="history-title">${esc(x.paper)} • ${esc(x.question)}</div><div class="history-meta">${esc(x.subject)} • ${esc(x.phase)} • ${x.words||0} words</div></div><div class="score-pill">${x.score}/${x.max}</div><div class="muted">${new Date(x.time).toLocaleString()}</div></div>`).join(''):`<div class="empty-state inline"><div class="empty-icon">✓</div><h3>No graded answers yet.</h3><p>Start a paper, answer a question, and grade it to build your history.</p><button class="primary" id="startFirstBtn2" type="button">Start your first paper</button></div>`;
  document.querySelectorAll('[data-practice-topic]').forEach(b=>b.addEventListener('click',()=>practiceTopic(b.dataset.practiceTopic)));
  document.querySelectorAll('[data-topic-dashboard]').forEach(b=>b.addEventListener('click',()=>practiceTopic(b.dataset.topicDashboard)));
  $('startFirstBtn')?.addEventListener('click',()=>navigate('practice'));$('startFirstBtn2')?.addEventListener('click',()=>navigate('practice'));
}
function practiceTopic(topic){topicPractice=topic;navigate('practice');renderPaperSelection();$('choosePanel').scrollIntoView({behavior:'smooth'});toast(`Showing papers with ${topic}.`,'info');}
function renderTopicChart(rows){const el=$('topicChart');if(!rows.length){el.innerHTML='<div class="empty-chart">No topic data yet. Grade a few answers to see weak-topic bars.</div>';return;}const max=Math.max(...rows.map(r=>r.p),100);el.innerHTML=`<div class="bar-chart">${rows.map(r=>`<div class="bar-item"><div class="bar-label" title="${esc(r.t)}">${esc(r.t)}</div><div class="bar-track"><span style="width:${Math.max(3,r.p/max*100)}%"></span></div><strong>${Math.round(r.p)}%</strong></div>`).join('')}</div>`;}
function renderScoreChart(items){const el=$('scoreChart');if(!items.length){el.innerHTML='<div class="empty-chart">No score history yet. Your scores will appear here after grading.</div>';return;}const W=640,H=250,pad=36,vals=items.map(x=>x.score/x.max*100),pts=vals.map((v,i)=>{const x=pad+i*(W-pad*2)/Math.max(1,vals.length-1);const y=H-pad-(v/100)*(H-pad*2);return `${x},${y}`;}).join(' ');el.innerHTML=`<svg class="line-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Score over time line chart"><line x1="${pad}" y1="${H-pad}" x2="${W-pad}" y2="${H-pad}"/><line x1="${pad}" y1="${pad}" x2="${pad}" y2="${H-pad}"/><polyline points="${pts}" fill="none"/><g>${vals.map((v,i)=>{const x=pad+i*(W-pad*2)/Math.max(1,vals.length-1);const y=H-pad-(v/100)*(H-pad*2);return `<circle cx="${x}" cy="${y}" r="4"><title>${Math.round(v)}% — ${new Date(items[i].time).toLocaleDateString()}</title></circle>`;}).join('')}</g><text x="4" y="${pad+4}">100%</text><text x="10" y="${H-pad+4}">0%</text></svg>`;}

function exportProgress(){const blob=new Blob([JSON.stringify(progress,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`pyq-practice-progress-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(url);toast('Progress exported.','success');}
$('exportBtn').addEventListener('click',exportProgress);
$('importFile').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{const obj=JSON.parse(await file.text());if(!obj||!Array.isArray(obj.attempts)||typeof obj.resumes!=='object')throw new Error('Invalid backup');progress={...defaultProgress(),...obj,version:schemaVersion};save();renderDashboard();renderPaperSelection();toast('Progress imported successfully.','success');}catch{toast('That file is not a valid PYQ Practice Lab backup.','error');}e.target.value='';});
$('resetBtn').addEventListener('click',()=>{if(confirm('Reset all practice progress, resumes, review flags, and timers on this browser? This cannot be undone unless you have an exported backup.')){progress=defaultProgress();save();selectedPaper=null;currentIndex=0;$('quizPanel').classList.add('hidden');renderDashboard();renderPaperSelection();updateStepper('choose');toast('Progress reset.','success');}});

function applyTheme(theme){const t=theme||(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=t;$('themeToggle').textContent=t==='dark'?'☀':'◐';$('themeToggle').setAttribute('aria-label',t==='dark'?'Switch to light mode':'Switch to dark mode');}
$('themeToggle').addEventListener('click',()=>{const next=document.documentElement.dataset.theme==='dark'?'light':'dark';progress.theme=next;save();applyTheme(next);});
window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change',e=>{if(!progress.theme)applyTheme(e.matches?'dark':'light');});

renderSubjects();renderPaperSelection();renderDashboard();applyTheme(progress.theme);renderRoute();
