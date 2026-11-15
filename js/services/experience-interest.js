// Each device holds a private response token. Names and party sizes are director-only.
const interestState={items:[],summary:[],loaded:false,busy:false,error:'',editing:'',name:'',people:1};
function interestToken() {
  const key='wwhi22l26a-interest-token'; let token=localStorage.getItem(key);
  if(!/^[a-f0-9]{64}$/.test(token||'')) { token=announcementRandom(32); localStorage.setItem(key,token); }
  return token;
}
function interestButton(experience) {
  const id=experience.experienceId; if(!id)return '';
  const saved=interestState.items.find(item=>item.experience===id);
  return `<div class="interest-action"><button class="interest-button ${saved?'selected':''}" type="button" onclick="openInterest('${jsString(id)}')">${saved?`✓ Interested · ${Number(saved.people)} ${Number(saved.people)===1?'person':'people'}`:'I’m interested'}</button><small>Show expression of interest</small></div>`;
}
function interestPanel() {
  const s=interestState;
  return `<section class="${ADMIN_MODE?'interest-panel':'interest-feedback'}"><p id="interest-status" role="status">${escapeHtml(s.error)}</p>
  ${ADMIN_MODE?`<details><summary>Guest interest · director view</summary><button class="tools-admin-btn secondary" onclick="refreshInterest()">Refresh responses</button><div id="interest-summary">${interestSummary()}</div></details>`:''}
  ${s.editing?interestForm():''}</section>`;
}
function interestForm() {
  const s=interestState, experience=traditionalEuropeExperiences().find(item=>item.experienceId===s.editing);
  return `<dialog open class="interest-dialog" aria-labelledby="interest-title"><form onsubmit="event.preventDefault();saveInterest(false)"><h2 id="interest-title">${escapeHtml(experience?.displayTitle||'Your interest')}</h2><p>Who would like to join? Include yourself in the number.</p><label>Your name(s)<input id="interest-name" maxlength="80" required value="${escapeHtml(s.name)}" oninput="interestState.name=this.value" autocomplete="name" placeholder="e.g. Sam and Alex Taylor"></label><label>Number of people<select id="interest-people" onchange="interestState.people=Number(this.value)">${Array.from({length:12},(_,i)=>`<option value="${i+1}" ${s.people===i+1?'selected':''}>${i+1}${i===0?' — just me':i===1?' — two of us':''}</option>`).join('')}</select></label><p>We’ll remember this on this device. Please don’t submit again on another phone. You can change or remove your interest here.</p><p role="status">${escapeHtml(s.error)}</p><div class="interest-actions"><button class="interest-button" ${s.busy?'disabled':''}>${s.busy?'Saving…':'Save interest'}</button><button type="button" onclick="closeInterest()" ${s.busy?'disabled':''}>Cancel</button>${s.items.some(item=>item.experience===s.editing)?`<button type="button" onclick="saveInterest(true)" ${s.busy?'disabled':''}>Remove interest</button>`:''}</div></form></dialog>`;
}
function interestSummary() {
  if(!interestState.summary.length)return '<p>No responses received yet.</p>';
  return traditionalEuropeExperiences().map(exp=>{
    const rows=interestState.summary.filter(item=>item.experience===exp.experienceId); if(!rows.length)return '';
    return `<div class="interest-result"><strong>${escapeHtml(exp.displayTitle)}</strong><p>${rows.reduce((sum,item)=>sum+Number(item.people),0)} people · ${rows.length} ${rows.length===1?'response':'responses'}</p>${rows.map(item=>`<p>${escapeHtml(item.name)} — ${Number(item.people)} ${Number(item.people)===1?'person':'people'}</p>`).join('')}</div>`;
  }).join('');
}
async function refreshInterest() {
  if(!USE_REMOTE_STORAGE)return;
  try { const result=await authRequest('interestMine',{token:interestToken()}); interestState.items=result.items||[]; interestState.loaded=true; interestState.error='';
    if(ADMIN_MODE)interestState.summary=(await authRequest('interestSummary')).items||[];
    else interestState.summary=[];
  } catch {interestState.error='Could not load your interest responses. Check your connection and reopen Experiences.';}
  if(activeTab==='experiences'&&!interestState.editing)renderApp({preserveScroll:true});
}
async function openInterest(id) {
  if(!USE_REMOTE_STORAGE){interestState.error='Interest responses can be sent from the hosted app.';renderApp({preserveScroll:true});return;}
  if(!interestState.loaded) {await refreshInterest();if(!interestState.loaded)return;}
  const saved=interestState.items.find(item=>item.experience===id)||interestState.items[0];
  interestState.editing=id; interestState.name=saved?.name||interestState.name; interestState.people=Number(saved?.people||interestState.people);interestState.error='';renderApp({preserveScroll:true});
  document.getElementById('interest-name')?.focus();
}
function closeInterest(){if(interestState.busy)return;interestState.editing='';interestState.error='';renderApp({preserveScroll:true});}
async function saveInterest(remove) {
  const s=interestState;if(s.busy)return;s.busy=true;s.error='';renderApp({preserveScroll:true});
  try {await authRequest('interestSave',{token:interestToken(),experience:s.editing,name:s.name.trim(),people:remove?0:s.people});s.editing='';await refreshInterest();s.error=remove?'Your interest has been removed.':'Thank you — Brendon has your expression of interest.';}
  catch(error){s.error=error.message||'Could not save. Please try again.';}
  finally{s.busy=false;renderApp({preserveScroll:true});}
}
