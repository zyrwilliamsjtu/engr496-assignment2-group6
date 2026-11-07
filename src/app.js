// ==== M2 STATE/RENDER ====
const CONCEPTS=[['Moral blameworthiness','A justified target of blame: examine wrongdoing, contribution, foreseeability, and freedom.','van de Poel & Royakkers, pp. 11–12.'],['Legal responsibility','Duties and liability under a specified framework. Record actual sources or label the rules hypothetical.','van de Poel & Royakkers, pp. 258–263.'],['Accountability','An obligation to explain and justify to affected people or an appropriate public forum; not identical to blame.','Johnson, pp. 122–123.'],['Financial obligation','Who should pay for compensation or repair, and on what basis? Insurance payment does not establish blame.','Johnson, pp. 122–123.'],['Many hands','Distributed contributions or information can complicate individual attribution without erasing organizational duties.','van de Poel & Royakkers, pp. 252–258.'],['Responsibility gap','Specify whether the missing responsibility concerns culpability, moral or public accountability, or active duties. Investigate rather than assume.','Matthias (2004), pp. 175–183; Santoni de Sio & Mecacci (2021); Tigard (2021).'],['Meaningful human control','Consider responsiveness to relevant human reasons and responsible humans who understand their role. A nominal override is insufficient.','Santoni de Sio & van den Hoven (2018).']];

const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const msg = (key, ...values) => esc(tr(key, ...values));
const displayed = (value, emptyLabel = '') => value ? esc(caseText(value)) : msg(emptyLabel);
let state,active='causal',recordRelFilter='',claimVerdictFilter='';
const reader = { recordView: 'timeline', timelineItem: null, claimView: 'entries', claimItem: null, collapsedClaims: new Set() };
const expandedActors = new Set();
const looseFacts = '@loose';

function resetReader() {
  Object.assign(reader, { recordView: 'timeline', timelineItem: null, claimView: 'entries', claimItem: null });
  reader.collapsedClaims.clear();
  expandedActors.clear();
  selectedMapActor = null;
}

function syncReaderViews() {
  $('timelinePane').hidden = reader.recordView !== 'timeline';
  $('relationshipPane').hidden = reader.recordView !== 'relationships';
  $('claimPane').hidden = reader.claimView !== 'entries';
  $('claimsModelConclusions').hidden = reader.claimView !== 'models';
  document.querySelectorAll('[data-record-view], [data-claim-view]').forEach(button => {
    const selected = button.dataset.recordView === reader.recordView || button.dataset.claimView === reader.claimView;
    button.setAttribute('aria-pressed', selected);
  });
}

function selectTimeline(item) {
  reader.timelineItem = item;
  $('recordBody').querySelectorAll('[data-time-key]').forEach(panel => {
    panel.hidden = item !== '' && panel.dataset.timeKey !== item;
  });
  $('timelineIndex').querySelectorAll('[data-time-item]').forEach(button => {
    button.setAttribute('aria-pressed', button.dataset.timeItem === item);
  });
}

function selectClaim(item) {
  reader.claimItem = item;
  $('claimsBody').classList.toggle('single-claim', item !== '');
  $('claimsBody').scrollTop = 0;
  const model = state.claims.find(claim => claim.id === item)?.model;
  $('claimsBody').querySelectorAll('[data-claim-key], [data-claim-group]').forEach(panel => {
    const selected = panel.hasAttribute('data-claim-key') ? panel.dataset.claimKey === item : panel.dataset.claimGroup === model;
    panel.hidden = item !== '' && !selected;
  });
  $('claimIndex').querySelectorAll('[data-claim-item]').forEach(button => {
    button.setAttribute('aria-pressed', button.dataset.claimItem === item);
  });
}

function setClaimOpen(card, open) {
  card.open = open;
  if (open) reader.collapsedClaims.delete(card.dataset.claimKey);
  else reader.collapsedClaims.add(card.dataset.claimKey);
}

function evidenceChips(ids, kind, className) {
  const records = kind === 'fact' ? state.facts : state.sources;
  return ids.map(id => {
    if (!records.some(record => record.id === id)) {
      return `<span class="pill ${className}">${esc(id)}</span>`;
    }
    const label = kind === 'fact' ? 'View fact {0}' : 'View source {0}';
    return `<button type="button" class="pill ${className} evidence-chip" data-evidence-id="${esc(id)}" data-evidence-kind="${kind}" aria-label="${msg(label,id)}">${esc(id)}</button>`;
  }).join(' ');
}

function fresh(i=0){const retainedSources=state?.sources||[];state={version:2,preset:i,fields:Object.fromEntries(FIELDS.map(k=>[k,''])),actors:[],links:[],facts:[],timeline:[],claims:[],models:Object.fromEntries(Object.keys(MODELS).map(k=>[k,''])),modelEvidence:{causal:'',hierarchical:'',future:''}};state.sources=retainedSources;state.caseSourceIds=[];state.modelSourceIds={causal:[],hierarchical:[],future:[]};state.fields.title=CASES[i][0];state.fields.description=CASES[i][1];state.fields.gapVerdict='Not yet assessed';state.fields.gapType='Not specified';state.fields.gapStage='Not specified';state.fields.gapMechanism='Not specified';active='causal';recordRelFilter='';claimVerdictFilter='';resetReader();render();$('feedback').replaceChildren()}
function opts(items,value){return items.map(x=>`<option value="${esc(x)}" ${x===value?'selected':''}>${msg(x)}</option>`).join('')}
function textField(a,k,label){return `<label>${msg(label)}<textarea data-actor="${esc(a.id)}" data-key="${k}">${displayed(a[k])}</textarea></label>`}
function selectField(a,k,label,items){return `<label>${msg(label)}<select data-actor="${esc(a.id)}" data-key="${k}">${opts(items,a[k])}</select></label>`}
function disclosureLabel() {
  return `<span class="disclosure-state" aria-hidden="true"><span class="disclosure-expand">${msg('Expand')}</span><span class="disclosure-collapse">${msg('Collapse')}</span></span>`;
}

function renderActors() {
  $('actorBulk').hidden = state.actors.length === 0;
  $('actorlist').innerHTML = state.actors.map((a,i) => `
    <article class="card actor-card">
      <details data-actor-key="${esc(a.id)}"${expandedActors.has(a.id) ? ' open' : ''}>
        <summary class="disclosure-heading actor-heading">
          <span class="actor-identity">
            <span class="pill">${/^A\d+$/.test(a.id) ? esc(a.id) : i+1}</span>
            <span class="actor-name">${displayed(a.name.trim(),'Unnamed stakeholder')}</span>
            <span class="actor-kind">${msg(a.kind)}</span>
          </span>
          ${disclosureLabel()}
        </summary>
        <div class="actor-form">
          <div class="grid">
            <label>${msg('Name')}<input data-actor="${esc(a.id)}" data-key="name" value="${displayed(a.name)}"></label>
            ${selectField(a,'kind','Stakeholder / component type',['Person','Organization','Technical system','Affected stakeholder'])}
          </div>
          <div class="grid">
            ${textField(a,'role','Role / duty / source of duty')}
            <div>
              ${selectField(a,'control','Practical authority / ability to intervene',['Unassessed','Sufficient','Limited','Insufficient','Uncertain'])}
              ${textField(a,'controlReason','Explain practical control, resources, and alternatives')}
            </div>
          </div>
          ${textField(a,'connections','Connections to other stakeholders: who informed, supervised, supplied, or depended on whom?')}
          <div class="grid">
            ${textField(a,'cause','Causal contribution or omission — reasons / evidence')}
            ${textField(a,'knowledge','What was known or reasonably knowable at the time?')}
          </div>
          <button type="button" class="danger" data-remove="${esc(a.id)}">${msg('Remove stakeholder')}</button>
        </div>
      </details>
    </article>`).join('');
}

function setActorOpen(details, open) {
  details.open = open;
  if (open) expandedActors.add(details.dataset.actorKey);
  else expandedActors.delete(details.dataset.actorKey);
}

$('actorlist').addEventListener('click', event => {
  const heading = event.target.closest('.actor-heading');
  if (!heading) return;
  event.preventDefault();
  const details = heading.parentElement;
  setActorOpen(details, !details.open);
});

$('actorBulk').addEventListener('click', event => {
  const button = event.target.closest('[data-actor-bulk]');
  if (!button) return;
  $('actorlist').querySelectorAll('details').forEach(details => setActorOpen(details, button.dataset.actorBulk === 'expand'));
});

$('actorlist').addEventListener('input', event => {
  const { key } = event.target.dataset;
  const card = event.target.closest('.actor-card');
  if (key === 'name') card.querySelector('.actor-name').textContent = event.target.value.trim() || tr('Unnamed stakeholder');
  if (key === 'kind') card.querySelector('.actor-kind').textContent = tr(event.target.value);
});
function renderModel(){ $('tabs').innerHTML=Object.entries(MODELS).map(([k,m])=>`<button role="tab" aria-selected="${k===active}" data-model="${k}">${msg(m.name)}</button>`).join('');const m=MODELS[active];$('modelGuide').innerHTML=`<h3>${msg(m.name)}</h3><p>${displayed(m.question)}</p><p class="muted">${msg('Limitation: {0}',caseText(m.limit))}</p><small>${esc(m.source)}</small>`;$('modelConclusion').value=caseText(state.models[active]);renderModelSources();$('modelEvidence').value=caseText(state.modelEvidence?.[active]||'');$('modelSteps').innerHTML=MODEL_STEPS[active].map((t,i)=>`<p><b>${i+1}.</b> ${displayed(t)}</p>`).join('')}
function render(){renderSixResults();FIELDS.forEach(k=>{const field=$(k),value=state.fields[k]||'';field.value=field.tagName==='SELECT'?value:caseText(value)});$('preset').value=state.preset;renderActors();renderRecord();renderModel();renderClaims();completion();renderVisual();updateSixSummaries();renderSources();renderCaseSources();showPage(currentPage,false);renderGapPath();syncReaderViews()}
function completion(){const used=Object.keys(MODELS).filter(k=>state.models[k]?.trim()).length;const reasons=state.actors.reduce((n,a)=>n+Number(!!a.cause.trim())+Number(!!a.legalReason.trim())+Number(!!a.next.trim()),0);$('completion').textContent=tr('{0} stakeholders / components · {1}/3 models · {2}/{3} reasons filled',state.actors.length,used,reasons,state.actors.length*3)}

function rubricHTML(r) {
  const priority = r.criteria.filter(c=>c.score<3).slice(0,2).map(c=>tr(c.name)).join(' · ');
  return `<div class="note"><h3>${msg('Provisional rubric indicators: {0}/21',r.total)}</h3><p>${msg('0–3 indicators per criterion. This is not a grade.')}</p><p>${msg('Priority:')} ${esc(priority||tr('All criteria have indicators; test the evidence and interpretation with your instructor.'))}</p></div><div class="rubric-grid">${r.criteria.map(c=>`<article class="rubric-result"><h3>${msg(c.name)} <span class="score-badge">${c.score}/3</span></h3><p>${msg(c.score===3?'Several support indicators detected.':c.score===0?'Not yet supported by the checked indicators.':'Developing: some support indicators detected.')}</p><p>${msg(c.next)}</p><details><summary>${msg('Why this assessment?')}</summary><p>${msg(c.rule)}</p><p><b>${msg('Detected text / data:')}</b> ${esc(c.evidence)}</p><p>${msg('Checks:')} ${c.checks.map(v=>msg(v?'detected':'not detected')).join(' / ')}.</p></details></article>`).join('')}</div>`;
}

function renderGapPath(){if(!$('gapPath'))return;$('gapPath').innerHTML=`<div class="gap-chain"><article><b>${msg('Task / responsibility')}</b><p>${displayed(state.fields.gapTask,'Name the missing or uncertain task.')}</p></article><article><b>${msg('Why it is difficult')}</b><p>${msg(state.fields.gapMechanism||'Choose a mechanism.')}</p><small>${msg(state.fields.gapStage||'Stage not specified')}</small></article><article><b>${msg('Ownership and verification')}</b><p>${displayed(state.fields.gapPeople,'Name who could take ownership.')}</p><small>${displayed(state.fields.gapCheck,'Define a completion check.')}</small></article></div>`}
let statusMessage = [''];
function message(key,...values){statusMessage=[key,...values];$('status').textContent=tr(key,...values.map(value=>tr(value)))}
function markFeedbackStale(){const fb=$('feedback');if(!fb||!fb.querySelector('article.card'))return;if(fb.dataset.stale==='true')return;fb.dataset.stale='true';const p=document.createElement('p');p.className='feedback-stale-notice muted';p.textContent=tr('Your answer has changed since this feedback was generated. Press “Reflect on my answer” again to refresh it.');fb.prepend(p)}
function download(name,text,type){const u=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)}

document.addEventListener('input',e=>{const t=e.target;if(FIELDS.includes(t.id))state.fields[t.id]=t.value;if(t.id==='modelConclusion')state.models[active]=t.value;if(t.id==='modelEvidence')state.modelEvidence[active]=t.value;if(t.dataset.actor){const a=state.actors.find(a=>a.id===t.dataset.actor);a[t.dataset.key]=t.value;}completion();renderVisual(!!t.closest('#mapDetail'));updateSixSummaries();renderGapPath();markFeedbackStale()});
document.addEventListener('click',e=>{
  const b=e.target.closest('button');
  if(!b)return;
  if(b.dataset.model){active=b.dataset.model;renderModel()}
  const id=b.dataset.remove;
  if(!id||!confirm(tr('Remove this stakeholder, its judgments, and related links?')))return;
  const index=state.actors.findIndex(actor=>actor.id===id);
  state.actors=state.actors.filter(a=>a.id!==id);
  state.links=state.links.filter(l=>l.from!==id&&l.to!==id);
  expandedActors.delete(id);
  renderActors();
  const headings=$('actorlist').querySelectorAll('.actor-heading');
  (headings[index]||headings[index-1]||$('addActor')).focus();
  completion();renderVisual();updateSixSummaries();renderGapPath();$('feedback').replaceChildren();
});
$('addActor').onclick=()=>{
  const actor=emptyActor();
  state.actors.push(actor);
  expandedActors.add(actor.id);
  renderActors();
  $('actorlist').querySelector('.actor-card:last-child input[data-key="name"]').focus();
  completion();renderVisual();updateSixSummaries();renderGapPath();$('feedback').replaceChildren();
};
function renderPresets(){$('preset').innerHTML=CASES.map((c,i)=>`<option value="${i}">${i+1}. ${displayed(c[0])}</option>`).join('')}
$('preset').onchange=()=>{const i=Number($('preset').value);if(confirm(tr('Load this case and clear the case analysis? Your source records will be kept. Save first if needed.'))){fresh(i);message('New case loaded.')}else $('preset').value=state.preset};$('reset').onclick=()=>{if(confirm(tr('Clear the case analysis? Source records will be kept. Save first to keep your analysis.'))){fresh(state.preset);message('Analysis reset.')}};$('save').onclick=()=>{download('Responsibility_Lab_Project.json',JSON.stringify(state,null,2),'application/json');message('Project download requested.')};$('export').onclick=()=>{download('Responsibility_Lab_Analysis.txt',report(state),'text/plain');message('Analysis export requested.')};$('reflectAnswer').onclick=reflectOnAnswer;

function validate(s){return migrateProject(s)}
function applyLoadedProject(raw,upgradedLabel){const {state:loaded,upgraded}=migrateProject(JSON.parse(JSON.stringify(raw)));state=loaded;active='causal';recordRelFilter='';claimVerdictFilter='';resetReader();render();$('feedback').replaceChildren();message(upgradedLabel??(upgraded?'Project upgraded from an earlier version.':'Project loaded.'))}
function tryReplaceProjectFromRaw(raw){if(!confirm(tr('Replace the current analysis with this saved project?')))return false;try{applyLoadedProject(raw);return true}catch(err){message('Could not load project: {0}',err.message);return false}}
$('load').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>3000000)throw Error('Project exceeds 3 MB.');const raw=JSON.parse(await f.text());tryReplaceProjectFromRaw(raw)}catch(err){message('Could not load project: {0}',err.message)}e.target.value=''};
if($('loadGroup6Case'))$('loadGroup6Case').onclick=()=>{if(typeof BUILTIN_CASE==='undefined'||BUILTIN_CASE===null){message('Group 6 case is not embedded in this copy. Run node tools/build.js to produce the offline bundle, or use Load project with tools/fixtures/project-group6.json.');return}tryReplaceProjectFromRaw(BUILTIN_CASE)};

const QUESTIONS=[{title:'Who contributed to the harm?',short:'Causal responsibility',key:'causeVerdict',reason:'cause',answer:'answer1',subtitle:'Explain each contribution and its connection to harm.'},{title:'Who may be legally liable?',short:'Legal responsibility',key:'legal',reason:'legalReason',answer:'answer4',subtitle:'State the legal basis, or explain why liability is unresolved.'},{title:'Who must act now—including repair or compensation?',short:'Forward-looking responsibility',key:'nextVerdict',reason:'next',answer:'answer5',subtitle:'Name duties, owners, resources, and next steps.'}];
let mapQuestion=0;
let selectedMapActor = null;
const compactMap = matchMedia('(max-width: 650px)');
const stackedMap = matchMedia('(max-width: 1049px)');
const statusColor=v=>({'Supported':'#5e7e37','Contested':'#b78230','Not established':'#899382','Unassessed':'#c5c9c1'}[v]||'#c5c9c1');

function renderVisual(keepDetail = false) {
  const q = QUESTIONS[mapQuestion];
  const actors = state.actors;
  if (!keepDetail) {
    $('visualTabs').innerHTML = QUESTIONS.map((question, i) => `<button type="button" role="tab" aria-selected="${i === mapQuestion}" data-vquestion="${i}">${msg(question.short)}</button>`).join('');
    const selected = actors.find(a => a.id === selectedMapActor) ||
      actors.find(a => a[q.key] && a[q.key] !== 'Unassessed') || actors[0];
    if (selected) showActorReason(selected.id);
    else $('mapDetail').replaceChildren();
  }
  const svg = $('responsibilityMap');
  const width = compactMap.matches ? 352 : 604;
  const center = width / 2;
  const rows = Math.ceil(actors.length / 2);
  const pitch = 48;
  const boxWidth = center - 34;
  const height = 68 + Math.max(1, rows) * pitch;
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  let out = `<title>${msg('{0} — student selections', tr(q.title))}</title>
    <rect class="map-root" x="10" y="10" width="${width - 20}" height="42" rx="6"/>
    <foreignObject x="20" y="10" width="${width - 40}" height="42">
      <div class="map-question">${msg(q.title)}</div>
    </foreignObject>`;
  if (rows) out += `<path class="map-spine" d="M${center} 52 V${83 + (rows - 1) * pitch}"/>`;
  else out += `<foreignObject x="14" y="62" width="${width - 28}" height="46"><div class="map-question">${msg('Add stakeholders on page 3 to build the map.')}</div></foreignObject>`;
  actors.forEach((actor, index) => {
    const left = index < rows;
    const y = 63 + (index % rows) * pitch;
    const x = left ? 10 : width - 10 - boxWidth;
    const edge = left ? x + boxWidth : x;
    const verdict = actor[q.key] || 'Unassessed';
    const name = caseText(actor.name) || tr('Unnamed stakeholder');
    out += `<path class="map-branch" d="M${center} ${y + 20} H${edge}" stroke="${statusColor(verdict)}"/>
      <g class="actor-node" role="button" tabindex="0" data-mapactor="${esc(actor.id)}" aria-pressed="${actor.id === selectedMapActor}"
        aria-label="${msg('{0}: {1}. Show recorded reasons.', name, tr(verdict))}">
        <title>${esc(name)}</title>
        <rect x="${x}" y="${y}" width="${boxWidth}" height="40" rx="6"/>
        <foreignObject x="${x + 8}" y="${y + 3}" width="${boxWidth - 16}" height="34">
          <div class="map-node-name">${/^A\d+$/.test(actor.id) ? `<span>${esc(actor.id)}</span> ` : ''}${esc(name)}</div>
          <div class="map-node-verdict">${msg(verdict)}</div>
        </foreignObject>
      </g>`;
  });
  svg.innerHTML = out;
}

function showActorReason(id, reveal = false) {
  const a = state.actors.find(actor => actor.id === id);
  if (!a) return;
  selectedMapActor = id;
  const q = QUESTIONS[mapQuestion];
  const panel = $('mapDetail');
  panel.innerHTML = `<div class="map-detail-heading">
      <h3>${displayed(a.name,'Unnamed stakeholder')}</h3>
      <button type="button" class="map-back">${msg('Back to map')}</button>
    </div>
    ${selectField(a,q.key,'Your assessment',['Unassessed','Supported','Contested','Not established'])}
    ${textField(a,q.reason,mapQuestion===1?'Legal basis and application (name a jurisdiction/rule or label rules hypothetical)':'Your reasons / evidence / uncertainty')}
    ${mapQuestion===2 ? textField(a,'payment','Who should pay, for what, and on what basis?') : ''}
    <details class="analysis-support">
      <summary>${msg('Stakeholder background')}</summary>
      <p><b>${msg('Role / duty:')}</b> ${displayed(a.role,'Not recorded')}</p>
      <p><b>${msg('Knowledge:')}</b> ${displayed(a.knowledge,'Not recorded')}</p>
      <p><b>${msg('Control:')}</b> ${msg(a.control)} — ${displayed(a.controlReason,'No explanation recorded')}</p>
    </details>`;
  $('responsibilityMap').querySelectorAll('[data-mapactor]').forEach(node => {
    node.setAttribute('aria-pressed', node.dataset.mapactor === id);
  });
  panel.scrollTop = 0;
  if (reveal && stackedMap.matches) {
    panel.focus({preventScroll: true});
    panel.scrollIntoView({block: 'start'});
  }
}
compactMap.addEventListener('change', () => renderVisual(true));
function summaryFor(i){const q=QUESTIONS[i];if(!state.actors.length)return tr('No stakeholders entered.');return state.actors.map(a=>`${(caseText(a.name)||tr('Unnamed stakeholder'))}${locale.chinese?'：':': '}${tr(a[q.key]||'Unassessed')}`).join(locale.chinese?'；':'; ')+(locale.chinese?'。':'.')}
function renderSixResults() {
  const expanded = [...$('sixResults').querySelectorAll('details')].map(item => item.open);
  $('sixResults').innerHTML = QUESTIONS.map((question, index) => `<article class="result-card">
    <h3>${index + 1}. ${msg(question.title)}</h3>
    <small>${msg(question.subtitle)}</small>
    <label for="${question.answer}">${msg('Your answer and reasons')}</label>
    <textarea id="${question.answer}" placeholder="${msg('Name stakeholders, explain the basis, and cite evidence. A justified uncertain answer is acceptable.')}">${displayed(state.fields[question.answer] || '')}</textarea>
    <details class="analysis-support"${expanded[index] ? ' open' : ''}>
      <summary>${msg('Recorded selections')}</summary>
      <p class="muted" id="resultSummary${index}"></p>
    </details>
  </article>`).join('');
  updateSixSummaries();
}
function updateSixSummaries(){QUESTIONS.forEach((q,i)=>{if($('resultSummary'+i))$('resultSummary'+i).textContent=summaryFor(i)})}
document.addEventListener('click', event => {
  if (event.target.closest('.map-back')) {
    const selected = $('responsibilityMap').querySelector('[aria-pressed="true"]');
    selected?.focus();
    $('responsibilityMap').parentElement.scrollIntoView({block: 'start'});
  }
  const tab = event.target.closest('[data-vquestion]');
  if (tab) {
    mapQuestion = Number(tab.dataset.vquestion);
    renderVisual();
    $('visualTabs').querySelector('[aria-selected="true"]').focus({preventScroll: true});
  }
  const node = event.target.closest('[data-mapactor]');
  if (node) showActorReason(node.dataset.mapactor, true);
});
document.addEventListener('keydown', event => {
  const node = event.target.closest('[data-mapactor]');
  if (node && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault();
    showActorReason(node.dataset.mapactor, true);
  }
});

const PAGES=[{name:'Start / sources',ids:['start'],heading:'Start / sources'},{name:'Define case',ids:['case'],heading:'Define the case'},{name:'Stakeholders and duties',ids:['actors'],heading:'Identify stakeholders and duties'},{name:'Case record',ids:['record'],heading:'Case record'},{name:'Three models',ids:['models'],heading:'Compare responsibility models'},{name:'Claims',ids:['claims'],heading:'Claims'},{name:'Gaps',ids:['gaps'],heading:'Investigate a possible gap'},{name:'Visualization',ids:['visual'],heading:'Visualize your analysis'},{name:'Results',ids:['reflect'],heading:'Reflect and conclude'},{name:'Readings',ids:['library'],heading:'Concepts and recommended readings'}];
function renderSectionHeadings(){PAGES.forEach((p,i)=>{if(!p.heading)return;const h2=$(p.ids[0])?.querySelector('h2');if(h2)h2.textContent=`${String(i+1).padStart(2,'0')} / ${tr(p.heading)}`})}
const CLAIM_MODEL_GROUPS=[{key:'causal',name:'Causal'},{key:'hierarchical',name:'Hierarchy and organization'},{key:'future',name:'Forward-looking'}];
function claimActorLabel(s,id){const a=s.actors.find(x=>x.id===id);return a?`${id} ${caseText(a.name)}`:`${id} ${tr('[MISSING]')}`;}
function claimVerdictCounts(claims){const c={Supported:0,Contested:0,'Not established':0};for(const cl of claims){if(c[cl.verdict]!=null)c[cl.verdict]++}return c}
function renderClaims() {
  const claims = state.claims || [];
  const counts = claimVerdictCounts(claims);
  const filter = claimVerdictFilter;
  const visible = filter ? claims.filter(claim => claim.verdict === filter) : claims;
  const actorCount = new Set(claims.map(claim => claim.actor)).size;
  $('claimSummary').textContent = filter
    ? tr('{0} claims shown · filtered by verdict: {1}',visible.length,tr(filter))
    : tr('{0} claims recorded · {1} supported · {2} contested · {3} not established · across {4} actors',
      claims.length,counts.Supported,counts.Contested,counts['Not established'],actorCount);
  const verdicts = [...new Set(claims.map(claim => claim.verdict))].sort();
  $('claimFilter').innerHTML = `<option value="">${msg('All claims')}</option>` +
    verdicts.map(verdict => `<option value="${esc(verdict)}">${msg(verdict)}</option>`).join('');
  $('claimFilter').value = filter;

  $('claimsModelConclusions').innerHTML = `<h3>${msg('Model conclusions')}</h3>` +
    CLAIM_MODEL_GROUPS.map(group => `<article class="card claims-model-block">
      <h4>${msg(group.name)}</h4>
      <p>${displayed(state.models[group.key],'(none recorded)')}</p>
      <p class="muted">${displayed(state.modelEvidence?.[group.key],'(no evidence recorded)')}</p>
    </article>`).join('');

  let entries = '';
  let index = '';
  for (const group of CLAIM_MODEL_GROUPS) {
    const groupClaims = claims.filter(claim => claim.model === group.key);
    const shown = visible.filter(claim => claim.model === group.key);
    const tally = claimVerdictCounts(groupClaims);
    const suffix = filter ? tr(' (filtered: {0} shown)',shown.length) : '';
    entries += `<h3 class="claim-group-heading" data-claim-group="${group.key}">${msg(
      '{0} — {1} claims (supported {2}, contested {3}, not established {4})',
      tr(group.name),groupClaims.length,tally.Supported,tally.Contested,tally['Not established']
    )}${esc(suffix)}</h3>`;
    if (shown.length) index += `<p class="reader-index-label">${msg(group.name)}</p>`;
    for (const claim of shown) {
      const facts = evidenceChips(claim.facts || [], 'fact', 'claim-chip');
      const sources = evidenceChips(claim.sources || [], 'source', 'claim-chip');
      const actor = claimActorLabel(state,claim.actor);
      index += `<button type="button" data-claim-item="${esc(claim.id)}" aria-label="${esc(`${claim.id} · ${actor} · ${tr(claim.verdict)}`)}">
        <b>${esc(claim.id)}</b> <span>${esc(actor)}<small>${msg(claim.verdict)}</small></span>
      </button>`;
      entries += `<details class="card claim-card" data-claim-key="${esc(claim.id)}"${reader.collapsedClaims.has(claim.id) ? '' : ' open'}>
        <summary class="disclosure-heading claim-heading">
          <span class="claim-identity"><span class="pill">${esc(claim.id)}</span> ${esc(actor)} <span class="pill claim-verdict">${msg(claim.verdict)}</span></span>
          ${disclosureLabel()}
        </summary>
        <div class="claim-content">
          <div class="claim-statement">
            <h4>${msg('What is claimed?')}</h4>
            <p>${displayed(claim.claim)}</p>
            <p class="muted"><b>${msg('Task:')}</b> ${displayed(claim.task)}</p>
          </div>
          <div class="claim-evidence">
            <h4>${msg('Evidence to check')}</h4>
            <p><b>${msg('Facts:')}</b> ${facts || msg('(none)')}</p>
            <p><b>${msg('Sources:')}</b> ${sources || msg('(none)')}</p>
          </div>
          <div class="claim-counter"><h4>${msg('Strongest counter-argument:')}</h4><p>${displayed(claim.counter)}</p></div>
          <div class="claim-reason"><h4>${msg('Reason for this verdict:')}</h4><p>${displayed(claim.reason)}</p></div>
        </div>
      </details>`;
    }
  }
  $('claimIndex').innerHTML = index;
  $('claimIndex').hidden = !visible.length;
  $('claimBulk').hidden = !visible.length;
  $('claimsBody').innerHTML = visible.length ? entries : `<p class="muted">${msg('No claims recorded yet.')}</p>`;
  const selection = reader.claimItem;
  selectClaim(selection === '' || visible.some(claim => claim.id === selection) ? selection : visible[0]?.id ?? '');
}
$('claimsBody').addEventListener('click', event => {
  const heading = event.target.closest('.claim-heading');
  if (!heading) return;
  event.preventDefault();
  const card = heading.parentElement;
  setClaimOpen(card, !card.open);
});
document.addEventListener('change',e=>{if(e.target.id==='claimFilter'){claimVerdictFilter=e.target.value;renderClaims();}});
function recordKnownByLabel(s,ids){if(!ids?.length)return tr('none recorded');return ids.map(id=>caseText(s.actors.find(a=>a.id===id)?.name)||tr('MISSING {0}',id)).join(locale.chinese?'、':', ');}
function recordActorName(s,id){const a=s.actors.find(x=>x.id===id);return a?.name?caseText(a.name):`${id} ${tr('[MISSING]')}`;}
function factRow(fact, missingTime = '') {
  return `<div class="record-fact-row" data-fact-key="${esc(fact.id)}" tabindex="-1">
    <span class="pill">${esc(fact.id)}</span> <span class="pill">${msg(fact.kind)}</span>${missingTime}
    <p>${displayed(fact.text)}</p>
    <p class="muted">${msg('Known by:')} ${esc(recordKnownByLabel(state,fact.knownBy || []))}</p>
  </div>`;
}

function renderRecord() {
  const facts = state.facts || [];
  const timeline = sortTimeline(state.timeline || []);
  const given = facts.filter(fact => fact.kind === 'given').length;
  const assumed = facts.filter(fact => fact.kind === 'assumed').length;
  $('recordSummary').textContent = tr('{0} facts recorded · {1} given · {2} assumed · {3} timeline entries',
    facts.length,given,assumed,timeline.length);

  const timeIds = new Set(timeline.map(event => event.id));
  const loose = facts.filter(fact => !timeIds.has(fact.timeId));
  const index = timeline.map(event => {
    const date = /^\d{4}-\d{2}(?:-\d{2})?/.exec(event.date)?.[0] || event.date;
    return `<button type="button" data-time-item="${esc(event.id)}"><b>${esc(event.id)}</b><small>${esc(date)}</small></button>`;
  });
  const panels = timeline.map(event => `<article class="card record-timeline" data-time-key="${esc(event.id)}">
    <p><span class="pill">${esc(event.id)}</span> <b>${msg(event.date)}</b></p>
    <p>${displayed(event.event)}</p>
    <p class="muted">${msg('Known by:')} ${esc(recordKnownByLabel(state,event.knownBy || []))}</p>
    ${facts.filter(fact => fact.timeId === event.id).map(fact => factRow(fact)).join('')}
  </article>`);
  if (loose.length) {
    index.push(`<button type="button" data-time-item="${looseFacts}">${msg('Unlinked facts')}</button>`);
    panels.push(`<article data-time-key="${looseFacts}">
      <h3>${msg('Facts with no time link')}</h3>
      ${loose.map(fact => factRow(fact,` <span class="muted">${fact.timeId ? msg('[time: MISSING {0}]',fact.timeId) : msg('(no time link)')}</span>`)).join('')}
    </article>`);
  }
  if (index.length) index.push(`<button type="button" class="reader-all" data-time-item="">${msg('Full timeline')}</button>`);
  $('timelineIndex').innerHTML = index.join('');
  $('timelineIndex').hidden = !index.length;
  $('recordBody').innerHTML = panels.join('') || `<p class="muted">${msg('No timeline or facts recorded yet.')}</p>`;
  const selection = reader.timelineItem;
  selectTimeline(selection === '' || timeIds.has(selection) || (selection === looseFacts && loose.length)
    ? selection : timeline[0]?.id ?? (loose.length ? looseFacts : ''));
  renderRecordRelationships();
}
function renderRecordRelationships(){if(!$('relBody'))return;const links=state.links||[],actors=state.actors||[];const filter=recordRelFilter;const visible=filter?links.filter(l=>l.from===filter||l.to===filter):links;const involved=new Set();for(const l of links){involved.add(l.from);involved.add(l.to);}if(filter){const name=recordActorName(state,filter);$('relSummary').textContent=tr('{0} relationships involving {1} {2}',visible.length,filter,name);}else $('relSummary').textContent=tr('{0} relationships recorded across {1} actors',links.length,involved.size);const sel=$('relFilter');if(sel){const opts=[`<option value="">${msg('All actors')}</option>`,...actors.slice().sort((a,b)=>String(a.id).localeCompare(String(b.id))).map(a=>`<option value="${esc(a.id)}">${esc(a.id)} ${displayed(a.name,'Unnamed stakeholder')}</option>`)];sel.innerHTML=opts.join('');sel.value=filter;}const byFrom={};for(const l of visible){byFrom[l.from]??=[];byFrom[l.from].push(l);}let html='';for(const from of Object.keys(byFrom).sort()){const rows=byFrom[from];const headingSuffix=filter?tr(' (within current filter)'):'';html+=`<h4>${msg('{0} {1} — {2} outgoing{3}',from,recordActorName(state,from),rows.length,headingSuffix)}</h4>`;for(const l of rows){const chips=evidenceChips(l.factIds || [], 'fact', 'record-rel-chip');html+=`<article class="card record-rel-row"><p><b>${esc(recordActorName(state,l.from))} → ${esc(recordActorName(state,l.to))}</b></p><p>${displayed(l.action)}</p><p class="muted">${msg('Basis:')} ${displayed(l.reason)}</p><p>${chips||`<span class="muted">${msg('(no fact ids)')}</span>`}</p></article>`;}} $('relBody').innerHTML=html||`<p class="muted">${msg('No relationships recorded yet.')}</p>`;}
document.addEventListener('change',e=>{if(e.target.id==='relFilter'){recordRelFilter=e.target.value;renderRecordRelationships();}});
let currentPage=0;
function initializePages() {
  $('nav').innerHTML = PAGES.map((page, i) => `<button type="button" data-pagejump="${i}"><span class="nav-number">${String(i + 1).padStart(2, '0')}</span> <span>${msg(page.name)}</span></button>`).join('');
  renderSectionHeadings();
  $('prevPage').onclick = () => showPage(currentPage - 1);
  $('nextPage').onclick = () => showPage(currentPage + 1);
}
function showPage(index, scroll = true) {
  const nextPage = Math.max(0, Math.min(PAGES.length - 1, index));
  if (nextPage !== currentPage) message('');
  currentPage = nextPage;
  PAGES.forEach((page, i) => page.ids.forEach(id => { $(id).hidden = i !== currentPage; }));
  document.querySelectorAll('#nav button').forEach((button, i) => {
    if (i === currentPage) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  $('pagePosition').textContent = tr('Page {0} of {1} · {2}', currentPage + 1, PAGES.length, tr(PAGES[currentPage].name));
  $('prevPage').disabled = currentPage === 0;
  $('nextPage').disabled = currentPage === PAGES.length - 1;
  if (scroll) window.scrollTo({ top: 0, behavior: 'smooth' });
  if (currentPage === 0) $('startCaseTitle').textContent = caseText(state.fields.title.trim()) || tr('Untitled case');
  if (currentPage === 1) renderCaseSources();
  if (currentPage === 4) renderModelSources();
}
function safeURL(v){try{const u=new URL(v);return ['https:','http:'].includes(u.protocol)?u.href:''}catch{return ''}}
function sourceRecord(source) {
  const url = safeURL(source.url);
  const link = url ? ` <a href="${esc(url)}" target="_blank" rel="noopener">${msg('Open source')}</a>` : '';
  const pages = source.pages ? `${msg('Pages:')} ${msg(source.pages)} · ` : '';
  const note = source.note ? `<p>${displayed(source.note)}</p>` : '';
  return `<strong>${esc(source.id)}</strong> · ${displayed(source.reference,'Reference not entered')}${link}<br><small>${pages}${msg('Topic:')} ${msg(source.topic)}</small>${note}`;
}
function renderSources(){$('sourceList').innerHTML=(state.sources||[]).map(src=>`<article class="source-entry"><div class="row"><b>${esc(src.id)}</b><button data-remove-source="${esc(src.id)}" class="danger">${msg('Remove source')}</button></div><label>${msg('Full reference (APA 7)')}<textarea data-source="${esc(src.id)}" data-skey="reference">${esc(src.reference)}</textarea></label><div class="grid"><label>${msg('Direct link')}<input data-source="${esc(src.id)}" data-skey="url" type="url" value="${esc(src.url)}" placeholder="https://doi.org/..."></label><label>${msg('Relevant pages / section')}<input data-source="${esc(src.id)}" data-skey="pages" value="${msg(src.pages)}"></label></div><label>${msg('Relevant topic')}<select data-source="${esc(src.id)}" data-skey="topic">${opts(['General','Causal','Hierarchy and organization','Forward-looking','Responsibility gaps','Legal responsibility'],src.topic)}</select></label><label>${msg('Your reading note: idea, usefulness, and limitations')}<textarea data-source="${esc(src.id)}" data-skey="note">${displayed(src.note)}</textarea></label></article>`).join('')||`<p class="muted">${msg('No sources yet.')}</p>`}
function renderCaseSources() {
  $('caseSourceCount').textContent = state.sources.length;
  $('caseSources').innerHTML = state.sources.map(source => `
    <li class="case-source-row">
      <span class="pill">${esc(source.id)}</span>
      <div>
        <button type="button" class="case-source-open" data-evidence-kind="source" data-evidence-id="${esc(source.id)}">
          <span>${displayed(source.reference,'Reference not entered')}</span>
        </button>
        ${source.pages ? `<small>${msg('Pages:')} ${msg(source.pages)}</small>` : ''}
      </div>
      <label class="case-source-link">
        <input type="checkbox" data-case-source="${esc(source.id)}" aria-label="${msg('Link {0} to this case',source.id)}"${state.caseSourceIds.includes(source.id) ? ' checked' : ''}>
        ${msg('Link')}
      </label>
    </li>`).join('') || `<li class="case-source-empty muted">${msg('Add sources on page 1.')}</li>`;
}
$('manageCaseSources').onclick = () => {
  const sources = $('start').querySelector('.start-sources');
  sources.open = true;
  showPage(0, false);
  sources.querySelector('summary').focus();
};
function renderModelSources(){if(!state?.sources)return;const topic={causal:'Causal',hierarchical:'Hierarchy and organization',future:'Forward-looking'}[active];const chosen=state.modelSourceIds[active]||[];$('modelSources').innerHTML=(state.sources.length?state.sources.map(src=>`<article class="source-reminder"><label><input type="checkbox" data-model-source="${esc(src.id)}" ${chosen.includes(src.id)?'checked':''}> ${msg('Use {0} for this model',src.id)} ${src.topic===topic?msg('· matching topic'):''}</label>${sourceRecord(src)}</article>`).join(''):`<p class="muted">${msg('No source records yet.')}</p>`)}
$('addSource').onclick=()=>{let n=1;while(state.sources.some(src=>src.id==='S'+n))n++;state.sources.push({id:'S'+n,reference:'',url:'',pages:'',topic:'General',note:''});renderSources();renderCaseSources();renderModelSources()};
document.addEventListener('input',e=>{if(e.target.dataset.source){const src=state.sources.find(v=>v.id===e.target.dataset.source);if(src)src[e.target.dataset.skey]=e.target.value;renderCaseSources();renderModelSources()}});
document.addEventListener('change',e=>{const t=e.target;if(t.dataset.caseSource){state.caseSourceIds=state.caseSourceIds.filter(v=>v!==t.dataset.caseSource);if(t.checked)state.caseSourceIds.push(t.dataset.caseSource)}if(t.dataset.modelSource){state.modelSourceIds[active]=(state.modelSourceIds[active]||[]).filter(v=>v!==t.dataset.modelSource);if(t.checked)state.modelSourceIds[active].push(t.dataset.modelSource)}});
document.addEventListener('click',e=>{const page=e.target.closest('[data-pagejump]');if(page)showPage(Number(page.dataset.pagejump));const b=e.target.closest('[data-remove-source]');if(b&&confirm(tr('Remove this source and its case/model links?'))){const id=b.dataset.removeSource;state.sources=state.sources.filter(v=>v.id!==id);state.caseSourceIds=state.caseSourceIds.filter(v=>v!==id);for(const k of Object.keys(MODELS))state.modelSourceIds[k]=state.modelSourceIds[k].filter(v=>v!==id);renderSources();renderCaseSources();renderModelSources()}});

let feedbackSnapshot;
function reflectionObservation(item) {
  const prefix = 'Unknown source identifiers: ';
  if (item.observation.startsWith(prefix)) {
    return msg('Unknown source identifiers: {0}.', item.observation.slice(prefix.length, -1));
  }
  if (item.title === 'Stakeholders recognized in your answer') {
    return esc(item.observation.split('; ').map(caseText).join(locale.chinese ? '、' : '; '));
  }
  return msg(item.observation);
}
function renderFeedback() {
  const {text, items, rubric} = feedbackSnapshot;
  const feedback = $('feedback');
  const expanded = [...feedback.querySelectorAll('details')].map(detail => detail.open);
  feedback.removeAttribute('data-stale');
  feedback.innerHTML = `<div class="note"><h3>${msg('Reflection on your answer')}</h3></div>${text?`<details open><summary>${msg('The answer being reviewed')}</summary><p class="feedback-evidence">${displayed(text)}</p></details>`:''}${items.map(item=>`<article class="card"><h3>${msg(item.title)}</h3><p class="feedback-observation">${reflectionObservation(item)}</p><p><b>${msg('Reflect:')}</b> ${msg(item.prompt)}</p><details><summary>${msg('Why this appeared')}</summary><p>${msg(item.rule)}</p><small>${msg(item.concept)}</small></details></article>`).join('')}<details><summary>${msg('Optional: structured checks across the whole project')}</summary>${rubricHTML(rubric)}</details>`;
  feedback.querySelectorAll('details').forEach((detail, index) => {
    if (expanded[index] !== undefined) detail.open = expanded[index];
  });
}
function reflectOnAnswer() {
  feedbackSnapshot = {
    text: clean(state.fields.conclusion),
    items: buildReflection(state),
    rubric: evaluateAnalysis(state),
  };
  renderFeedback();
  completion();
  message('Reflection generated below your answer.');
  $('feedback').scrollIntoView?.({behavior:'smooth',block:'start'});
}
$('goAnswer').onclick=()=>showPage(8);

let openFactId;
function openEvidence(kind, id) {
  const isFact = kind === 'fact';
  const evidence = (isFact ? state.facts : state.sources).find(item => item.id === id);
  if (!evidence) return;

  $('evidenceTitle').textContent = tr(isFact ? 'Fact {0}' : 'Source {0}',id);
  $('openEvidenceTimeline').hidden = !isFact;
  openFactId = isFact ? id : undefined;
  if (isFact) {
    const time = state.timeline.find(event => event.id === evidence.timeId);
    $('evidenceBody').innerHTML = `<p class="evidence-meta"><span class="pill">${msg(evidence.kind)}</span>
      ${time ? esc(time.id) + ' · ' + msg(time.date) : ''}</p>
      <p class="evidence-statement">${displayed(evidence.text)}</p>
      <p class="muted">${msg('Known by:')} ${esc(recordKnownByLabel(state,evidence.knownBy || []))}</p>`;
  } else {
    $('evidenceBody').innerHTML = sourceRecord(evidence);
  }
  const drawer = $('evidenceDrawer');
  drawer.showModal();
  drawer.scrollTop = 0;
}

document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  const { casePanel, recordView, timeItem, claimView, claimItem, claimBulk, evidenceKind, evidenceId } = button.dataset;
  if (casePanel !== undefined) {
    $('case').querySelector('.case-workspace').dataset.panel = casePanel;
    $('case').querySelectorAll('[data-case-panel]').forEach(tab => {
      tab.setAttribute('aria-pressed', tab.dataset.casePanel === casePanel);
    });
  }
  if (recordView !== undefined) {
    reader.recordView = recordView;
    syncReaderViews();
  }
  if (claimView !== undefined) {
    reader.claimView = claimView;
    syncReaderViews();
  }
  if (timeItem !== undefined) selectTimeline(timeItem);
  if (claimItem !== undefined) {
    selectClaim(claimItem);
    const selected = $('claimsBody').querySelector('.claim-card:not([hidden])');
    if (selected) setClaimOpen(selected, true);
  }
  if (claimBulk !== undefined) {
    selectClaim('');
    $('claimsBody').querySelectorAll('.claim-card').forEach(card => setClaimOpen(card, claimBulk === 'expand'));
  }
  if (evidenceId !== undefined) openEvidence(evidenceKind,evidenceId);
});

$('openEvidenceTimeline').onclick = () => {
  const fact = state.facts.find(item => item.id === openFactId);
  if (!fact) return;
  $('evidenceDrawer').close();
  reader.recordView = 'timeline';
  syncReaderViews();
  selectTimeline(state.timeline.some(event => event.id === fact.timeId) ? fact.timeId : looseFacts);
  showPage(PAGES.findIndex(page => page.ids.includes('record')),false);
  const row = [...$('recordBody').querySelectorAll('[data-fact-key]')].find(item => item.dataset.factKey === fact.id);
  row?.focus({preventScroll:true});
  row?.scrollIntoView({block:'nearest'});
};

let printFilters;
let closedForPrint;
window.addEventListener('beforeprint', () => {
  if (closedForPrint) return;
  if (recordRelFilter || claimVerdictFilter) {
    printFilters = { recordRelFilter, claimVerdictFilter, claimItem: reader.claimItem };
    recordRelFilter = '';
    claimVerdictFilter = '';
    renderRecordRelationships();
    renderClaims();
  }
  closedForPrint = [...document.querySelectorAll('details:is(.analysis-support, .claim-card, .start-sources, [data-actor-key]):not([open])')];
  closedForPrint.forEach(details => { details.open = true; });
});
window.addEventListener('afterprint', () => {
  closedForPrint?.forEach(details => { details.open = false; });
  closedForPrint = undefined;
  if (!printFilters) return;
  ({ recordRelFilter, claimVerdictFilter } = printFilters);
  reader.claimItem = printFilters.claimItem;
  printFilters = undefined;
  renderRecordRelationships();
  renderClaims();
});

function renderReference() {
  const expanded = [...$('concepts').querySelectorAll('details')].map(detail => detail.open);
  $('concepts').innerHTML=CONCEPTS.map((c,i)=>`<details${expanded[i]?' open':''}><summary>${msg(c[0])}</summary><p>${msg(c[1])}</p><small>${esc(c[2])}</small></details>`).join('');
}

$('languageToggle').onclick = () => {
  const feedbackVisible = !!$('feedback').querySelector('article.card');
  const stale = $('feedback').dataset.stale === 'true';
  locale.toggle();
  renderPresets();
  initializePages();
  renderReference();
  render();
  if (feedbackVisible && feedbackSnapshot) {
    renderFeedback();
    if (stale) markFeedbackStale();
  }
  message(...statusMessage);
  $('nav').querySelector('[aria-current="page"]')?.scrollIntoView({block:'nearest',inline:'nearest'});
};

locale.apply();
renderPresets();
renderReference();
initializePages();
fresh();
