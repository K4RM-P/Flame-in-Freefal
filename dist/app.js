'use strict';
const psi = 'https://psi.nasa.gov/physci/repo/data/investigations/';
const paper = 'https://ntrs.nasa.gov/citations/20210011521';
const records = [
  {id:'BASS-II', title:'Ventilation can change a solid flame quickly', priority:'Prevention', platform:'ISS science glovebox', fuel:'Thin and thick solids, acrylic slabs, spheres and cylinders', conditions:'Opposed and concurrent flow. Wind tunnel tested speeds up to 53 cm/s.', measure:'Flame imaging, spread rate and extinction behavior', result:'Some flames persisted below 1 cm/s, appearing dim blue, and flared when airflow increased suddenly.', implication:'Include changes in ventilation when testing the behavior of spacecraft materials.', limit:'The observation applies to tested fuels and geometries. It gives no universal airflow threshold.', topics:['airflow','spread','material','oxygen','extinction'], fit:[20,14,14,18], numeric:5, sources:[['NASA technical report','https://ntrs.nasa.gov/citations/20160000593']]},
  {id:'SAFFIRE-I', title:'Large fabric burns reveal how flames spread', priority:'Prevention', platform:'Uncrewed Cygnus spacecraft', fuel:'Cotton–fiberglass fabric, 94 × 41 cm (Table 2)', conditions:'20 cm/s airflow, 21% oxygen, 100 kPa and 46 cm duct height.', measure:'Cameras, thermocouples, radiometers, gas sensors and anemometers', result:'Sample I-1 reached a maximum reported flame size of 6.2 cm and a steady-state size of 4 cm.', implication:'Include fuel dimensions and ventilation geometry in comparisons of material flammability.', limit:'This fabric and duct represent one test configuration. Other shapes and materials can behave differently.', topics:['airflow','spread','material','oxygen'], fit:[20,13,13,16], numeric:5, sources:[['NASA PSI data',psi+'PSI-98'],['NASA Table 2',paper]]},
  {id:'SAFFIRE-IV/V', title:'Duct geometry and atmosphere matter', priority:'Prevention', platform:'Uncrewed Cygnus spacecraft', fuel:'SIBAL fabric and cotton jersey (selected thin samples)', conditions:'Both samples used a 30 cm duct and 20 cm/s flow. Oxygen and pressure differed.', measure:'Flame growth, spread and reported peak and steady-state flame sizes', result:'IV-1 peaked at 11 cm at 22% oxygen and 100 kPa. V-2 peaked at 14 cm at 26.2% oxygen and 70.7 kPa.', implication:'Test materials across the proposed atmosphere and duct geometry together.', limit:'Pressure, oxygen and fuel varied between IV-1 and V-2. Flight evidence does not resolve surface gravity effects.', topics:['airflow','spread','material','oxygen','pressure'], fit:[19,18,18,19], numeric:5, sources:[['NASA Table 2',paper]]},
  {id:'SAME', title:'Smoke particle size matters for detection', priority:'Detection', platform:'International Space Station', fuel:'Heated spacecraft materials below ignition', conditions:'Smoke aged for 10–1,800 seconds in a chamber to represent transport time.', measure:'Aerosol instruments, microscopy and comparative smoke detectors', result:'A substantial portion of smoke particles measured for the tested materials were smaller than 500 nm. Modelling identified mixing as a dominant transport process.', implication:'Evaluate both detector response to small aerosols and how cabin flow carries smoke to the sensor.', limit:'The source mimicked overheating and does not cover all fire types or detector layouts.', topics:['smoke','detector','particle','airflow','material'], fit:[20,15,15,18], numeric:5, sources:[['NIST / NASA study','https://www.nist.gov/publications/smoke-aerosol-measuremen-experiment-same']]},
  {id:'SAME-R', title:'Smoke changes as it ages', priority:'Detection', platform:'International Space Station', fuel:'Overheated spacecraft material samples', conditions:'The reflight examined different smoke-aging conditions.', measure:'Prototype two-moment smoke detector and particle size measurements', result:'Most reported averages were 200–400 nm, and some quiescent cases produced substantially larger particles.', implication:'Test detection across a range of particle sizes and transport times.', limit:'Reported averages describe these tests and cannot specify a universal detector threshold.', topics:['smoke','detector','particle','airflow'], fit:[19,14,14,17], numeric:5, sources:[['NASA PSI data',psi+'PSI-101'],['NASA reflight results','https://ntrs.nasa.gov/citations/20130000422']]},
  {id:'FLEX', title:'Visible flame loss can precede the end of combustion', priority:'Suppression', platform:'International Space Station', fuel:'Liquid fuel droplets, including heptane', conditions:'Varied oxygen, pressure and gaseous diluents in droplet experiments.', measure:'Droplet burning and vaporization, radiation and extinction', result:'Some heptane droplets continued low-temperature combustion after their visible flames disappeared.', implication:'Investigate ways to verify extinction that do not rely solely on seeing a flame.', limit:'Droplet results need separate validation for spacecraft cabin materials and fire scenarios.', topics:['extinction','oxygen','pressure','droplet'], fit:[18,12,12,14], numeric:2, sources:[['NASA PSI data',psi+'PSI-69'],['NASA FLEX results','https://www.nasa.gov/wp-content/uploads/2022/03/iss_technical_publication_030116.pdf']]}
];
const samples = [
  ['I-1','SIBAL',20,21,100,46,41,94,4,6.2],
  ['II-5','SIBAL',20,21,100,46,5,30,4,4],
  ['II-6','SIBAL',25,21,100,46,5,30,5,5],
  ['III-1','SIBAL',25,21,100,46,41,94,5,8.2],
  ['IV-1','SIBAL',20,22,100,30,41,50,8.5,11],
  ['V-2','Cotton jersey',20,26.2,70.7,30,41,50,10,14]
];
const headings = ['Sample','Material','Airflow (cm/s)','Oxygen (%)','Pressure (kPa)','Duct height (cm)','Sample width (cm)','Sample length (cm)','Steady size (cm)','Maximum size (cm)'];
const profiles = {
  orbit:'Use flight microgravity as the reference. Check the materials, atmosphere and geometry against your own spacecraft.',
  moon:'Lunar surface gravity differs from flight microgravity. Use these findings to design tests under lunar conditions.',
  mars:'Martian surface gravity differs from flight microgravity. Test locally proposed atmosphere and ventilation conditions.',
  rover:'Match the proposed rover cabin and duct geometry, atmosphere and gravity to a dedicated test.'
};
const lunarSmokeQuestion = 'How do smoke detectors pick up particles?';
const lunarSmokeTest = 'In a cabin mock-up, vary ventilation and detector position. Measure how long it takes smoke from representative overheated materials to reach each detector and trigger an alarm.';
const patterns = {
  airflow:/airflow|air flow|ventilat|fan|duct|concurrent|opposed|\bflow\b/i,
  spread:/spread|growth|how fast|flame size|flare/i,
  material:/material|fabric|cloth|cotton|jersey|sibal|acrylic|pmma|plastic|solid|flammab/i,
  oxygen:/oxygen|\bo2\b|atmosphere/i,
  pressure:/pressure|kpa|atmosphere/i,
  smoke:/smoke|aerosol|smolder|smoulder/i,
  detector:/detect|sensor|alarm/i,
  particle:/particle|nanomet|\bnm\b|dust/i,
  extinction:/extinguish|extinction|suppress|cool flame|disappear|invisible|quench|goes out|keep burning/i,
  droplet:/droplet|liquid|heptane|diluent|helium|carbon dioxide/i
};
const byId = id => document.getElementById(id);
const source = ([label,url]) => '<a href="'+url+'" target="_blank" rel="noopener">'+label+' →</a>';
const queryField = byId('question');
const modelButton = byId('model');
let activeQuestion = '';
let revision = 0;
let retrieved = [];
function render() {
  revision++;
  const setting = byId('setting').value;
  const priority = byId('priority').value;
  const settingIndex = Object.keys(profiles).indexOf(setting);
  const topics = Object.keys(patterns).filter(topic=>patterns[topic].test(activeQuestion));
  const ranked = records.map(record=>{
    const matched = record.topics.filter(topic=>topics.includes(topic));
    const priorityScore = priority === record.priority ? 35 : 0;
    const topicScore = Math.min(40,matched.length*20);
    return {record, matched, score:priorityScore+topicScore+record.fit[settingIndex]+record.numeric, reason:[priorityScore,topicScore,record.fit[settingIndex],record.numeric].join(' + ')};
  }).sort((a,b)=>b.score-a.score || a.record.id.localeCompare(b.record.id));
  const matches = ranked.filter(entry=>entry.matched.length);
  retrieved = [...matches].sort((a,b)=>b.matched.length-a.matched.length || b.score-a.score).slice(0,3);
  byId('scope').textContent = profiles[setting];
  byId('resultlabel').textContent = ranked.length+' records · Ordered by relevance';
  byId('reset').hidden = !activeQuestion;
  modelButton.hidden = true;
  modelButton.disabled = false;
  const answer = byId('answer');
  answer.hidden = !activeQuestion;
  byId('idle').hidden = Boolean(activeQuestion);
  const lead = retrieved[0]?.record;
  const lunarSmoke = setting === 'moon' && activeQuestion === lunarSmokeQuestion;
  answer.innerHTML = !lead ? '<p>No matching evidence in this collection. Try a suggested question.</p>' :
    '<h3>Mission brief</h3><div class="brief"><div><h4>What the evidence shows</h4><p>'+lead.result+' '+source(lead.sources[0])+'</p></div>'+
    '<div><h4>'+ (lunarSmoke?'Proposed test':'Research implication') +'</h4><p>'+(lunarSmoke?lunarSmokeTest:lead.implication)+'</p></div>'+
    '<div><h4>What still needs validation</h4><p>'+lead.limit+(setting==='orbit'?'':' '+profiles[setting])+'</p></div></div>'+
    (retrieved.length>1?'<details><summary>Related findings</summary><ol>'+retrieved.slice(1).map(({record})=>'<li><p><strong>'+record.id+'</strong> · '+record.result+' '+source(record.sources[0])+'</p></li>').join('')+'</ol></details>':'');
  if(retrieved.length && globalThis.LanguageModel){
    const current = revision;
    LanguageModel.availability().then(availability=>{
      if(current===revision) modelButton.hidden=availability!=='available';
    }).catch(()=>{});
  }
  byId('cards').innerHTML = ranked.map(({record,matched,score,reason},index)=>'<article class="card"><div class="cardtop"><span class="tag">'+record.priority+'</span><span class="score" title="Priority + topics + setting + quantitative evidence = '+reason+'">#'+(index+1)+' · '+score+' pts</span></div><h3>'+record.id+'</h3><p><strong>'+record.title+'</strong></p><p>'+record.result+'</p><details><summary>Conditions and interpretation</summary><p><strong>Conditions</strong> · '+record.conditions+'</p><p><strong>Implication</strong> · '+record.implication+'</p><p><strong>Limit</strong> · '+record.limit+'</p><p class="small"><strong>Score</strong> · '+reason+' (priority, topics, setting, numerical evidence)'+(matched.length?' · '+matched.join(', '):'')+'</p></details><div class="cardfoot">'+record.sources.map(source).join('')+'<a href="#compare" data-compare="'+record.id+'">Compare study →</a></div></article>').join('');
}
byId('cards').addEventListener('click',event=>{
  const link=event.target.closest('[data-compare]');
  if(!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  const index=String(records.findIndex(record=>record.id===link.dataset.compare));
  const first=byId('left');
  const second=byId('right');
  if(index!==first.value && index!==second.value) first.value=index;
  compare();
  first.focus({preventScroll:true});
});
let aiRequest;
async function synthesizeQuestion() {
  aiRequest?.abort();
  if (!activeQuestion) return;
  const controller = new AbortController();
  aiRequest = controller;
  const current = revision;
  const answer = byId('answer');
  const section = document.createElement('section');
  section.className = 'hosted-ai';
  const status = document.createElement('p');
  status.textContent = 'Generating a sourced answer with OpenAI…';
  section.append(status);
  answer.append(section);
  try {
    const response = await fetch(new URL('api/ask', document.baseURI), {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({question:activeQuestion}), signal:controller.signal
    });
    if (!response.ok) throw new Error(String(response.status));
    const result = await response.json();
    if (current !== revision) return;
    status.textContent = result.claims.length ? 'OpenAI synthesis' : 'OpenAI found insufficient evidence in the catalog.';
    for (const claim of result.claims) {
      const paragraph = document.createElement('p');
      paragraph.textContent = claim.text + ' ';
      for (const id of claim.sources) {
        const record = records.find(item=>item.id===id);
        if (!record) continue;
        const link = document.createElement('a');
        link.href = record.sources[0][1];
        link.textContent = '[' + id + ']';
        paragraph.append(link, ' ');
      }
      section.append(paragraph);
    }
    const limits = document.createElement('p');
    limits.textContent = result.limitation;
    section.append(limits);
  } catch (error) {
    if (current !== revision || controller.signal.aborted) return;
    status.textContent = error.message === '503'
      ? 'OpenAI synthesis is awaiting configuration. The local evidence is shown above.'
      : 'OpenAI synthesis is unavailable. The local evidence is shown above.';
  }
}

byId('query').addEventListener('submit',event=>{
  event.preventDefault();
  activeQuestion=queryField.value.trim();
  render();
  void synthesizeQuestion();
});
byId('demo').addEventListener('click',()=>{
  byId('setting').value='moon';
  byId('priority').value='Detection';
  queryField.value=lunarSmokeQuestion;
  byId('query').requestSubmit();
  const answer=byId('answer');
  answer.tabIndex=-1;
  answer.focus({preventScroll:true});
  answer.scrollIntoView({block:'center'});
});
document.querySelectorAll('[data-question]').forEach(button=>button.addEventListener('click',()=>{
  queryField.value=button.dataset.question;
  byId('query').requestSubmit();
}));
byId('reset').addEventListener('click',()=>{
  aiRequest?.abort();
  activeQuestion=queryField.value='';
  render();
  queryField.focus();
});
['setting','priority'].forEach(id=>byId(id).addEventListener('change',render));
modelButton.addEventListener('click',async()=>{
  const current=revision;
  modelButton.disabled=true;
  const out=document.createElement('p');
  out.textContent='Drafting an on-device synthesis…';
  byId('answer').append(out);
  let session;
  try{
    session=await LanguageModel.create({initialPrompts:[{role:'system',content:'Draft a short research synthesis using only supplied evidence. Cite study IDs. State uncertainty, abstain on unsupported claims, and do not issue operational instructions.'}]});
    const evidence=retrieved.map(({record:r})=>[r.id,r.result,r.limit,r.implication]);
    const draft=await session.prompt(JSON.stringify({question:activeQuestion,evidence}));
    if(current===revision) out.textContent='AI draft · '+draft;
  }catch{
    if(current===revision) out.textContent='On-device synthesis is unavailable. The sourced findings above remain available.';
  }finally{
    session?.destroy();
    if(current===revision) modelButton.disabled=false;
  }
});
function table(columns,rows){
  return '<table><thead><tr>'+columns.map(x=>'<th scope="col">'+x+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map((x,i)=>i===0?'<th scope="row">'+x+'</th>':'<td>'+x+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
}
function compare(){
  const a=records[Number(byId('left').value)];
  const b=records[Number(byId('right').value)];
  byId('comparison').innerHTML=table(['Attribute',a.id,b.id],Object.entries({Platform:'platform',Fuel:'fuel',Conditions:'conditions',Measurements:'measure',Finding:'result',Limit:'limit'}).map(([label,key])=>[label,a[key],b[key]]).concat([['Sources',a.sources.map(source).join(' · '),b.sources.map(source).join(' · ')]]));
}
function draw(){
  const metric=byId('metric').value;
  const maximum=metric==='peak'?14:10;
  byId('chart').innerHTML=samples.map(sample=>{
    const value=sample[metric==='peak'?9:8];
    return '<div class="chartrow"><span>'+sample[0]+'</span><div class="track" aria-hidden="true"><div class="bar" style="width:'+value/maximum*100+'%"></div></div><strong>'+value+' cm</strong></div>';
  }).join('');
}
['left','right'].forEach((id,i)=>{
  byId(id).innerHTML=records.map((r,n)=>'<option value="'+n+'">'+r.id+'</option>').join('');
  byId(id).value=i===0?'1':'2';
  byId(id).addEventListener('change',compare);
});
byId('comparison').classList.add('compare-table');
byId('samples').innerHTML=table(headings,samples);
byId('metric').addEventListener('change',draw);
byId('csv').addEventListener('click',()=>{
  const csv=[headings,...samples].map(row=>row.join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const download=document.createElement('a');
  download.href=url;
  download.download='project-max-q-saffire-table-2.csv';
  download.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
});
compare();
draw();
render();

const directedFlow = byId('fan-on');
const weakFlow = byId('fan-off');
function showFlow(directed) {
  document.querySelector('.duct').dataset.fan = directed ? 'on' : 'off';
  directedFlow.setAttribute('aria-pressed', String(directed));
  weakFlow.setAttribute('aria-pressed', String(!directed));
  byId('flow-note').textContent = directed
    ? 'Cabin airflow can carry particles toward a detector along its flow path.'
    : 'With weak airflow, smoke can linger near the source and take longer to reach a distant detector.';
}
directedFlow.addEventListener('click', () => showFlow(true));
weakFlow.addEventListener('click', () => showFlow(false));
