(() => {
  'use strict';
  const all = window.ZHEN_STORES?.stores;
  const byId = id => document.getElementById(id);
  const form = byId('store-filters');
  const province = byId('province'), city = byId('city'), status = byId('status'), keyword = byId('keyword');
  const results = byId('store-results'), counter = byId('result-count');
  const prev = byId('prev-page'), next = byId('next-page');
  const dialog = byId('store-dialog');
  const pageSize = 12;
  let page = 1, filtered = [], lastTrigger;
  const text = (tag, value, className) => {
    const node = document.createElement(tag);
    node.textContent = value;
    if (className) node.className = className;
    return node;
  };
  const icon = name => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class','icon'); svg.setAttribute('aria-hidden','true');
    svg.setAttribute('fill','none'); svg.setAttribute('stroke','currentColor');
    svg.setAttribute('stroke-width','1.6'); svg.setAttribute('stroke-linecap','round'); svg.setAttribute('stroke-linejoin','round');
    const use = document.createElementNS('http://www.w3.org/2000/svg','use');
    use.setAttribute('href', '#icon-' + name); svg.append(use); return svg;
  };
  const unique = values => [...new Set(values)].sort((a,b) => a.localeCompare(b,'zh-CN'));
  const options = (select, values, label) => {
    select.replaceChildren(new Option(label,''), ...values.map(value => new Option(value,value)));
  };
  const closeDialog = () => { dialog.close(); };
  function openDetails(store, trigger) {
    lastTrigger = trigger;
    byId('detail-name').textContent = store.name;
    byId('detail-status').textContent = store.status;
    byId('detail-status').dataset.status = store.status;
    const fields = byId('detail-fields'); fields.replaceChildren();
    [['所在地区',[store.province,store.city,store.district].filter(Boolean).join(' · ')],['详细地址',store.address || '地址未注明'],['门店类型',store.category]].forEach(([label,value]) => fields.append(text('dt',label),text('dd',value)));
    dialog.showModal();
  }
  function render() {
    const pages = Math.max(1, Math.ceil(filtered.length/pageSize));
    page = Math.max(1,Math.min(page,pages));
    const visible = filtered.slice((page-1)*pageSize,page*pageSize);
    const fragment = document.createDocumentFragment();
    visible.forEach(store => {
      const card = text('article','','store-card');
      const top = text('div','','store-card-top');
      const symbol = text('span','','hotel-symbol'); symbol.append(icon('hotel'));
      const badge = text('span',store.status,'status-badge'); badge.dataset.status = store.status;
      top.append(symbol,badge);
      const bottom = text('div','','store-card-bottom');
      const button = text('button','查看详情','detail-button'); button.type='button';
      button.setAttribute('aria-label','查看'+store.name+'详情'); button.append(icon('arrow'));
      button.addEventListener('click',() => openDetails(store,button));
      bottom.append(text('span',store.category,'store-category'),button);
      card.append(top,text('h3',store.name),text('p',[store.province,store.city,store.district].filter(Boolean).join(' · '),'store-region'),text('p',store.address || '地址未注明','store-address'),bottom);
      fragment.append(card);
    });
    results.replaceChildren(fragment);
    counter.textContent = `找到 ${filtered.length.toLocaleString('zh-CN')} 家门店${filtered.length ? ` · 显示 ${(page-1)*pageSize+1}–${Math.min(page*pageSize,filtered.length)} 家` : ''}`;
    byId('page-info').textContent = filtered.length ? `${page} / ${pages} 页` : '0 / 0 页';
    byId('empty-state').hidden = filtered.length !== 0;
    prev.disabled = page <= 1; next.disabled = page >= pages;
  }
  function applyFilters() {
    const q = keyword.value.normalize('NFKC').trim().toLocaleLowerCase();
    filtered = all.filter(store => (!province.value || store.province === province.value) && (!city.value || store.city === city.value) && (!status.value || store.status === status.value) && (!q || [store.name,store.province,store.city,store.district,store.address].join(' ').normalize('NFKC').toLocaleLowerCase().includes(q)));
    page=1; render();
  }
  function updateCities() { options(city,unique(all.filter(s => !province.value || s.province===province.value).map(s=>s.city)),'全部城市'); }
  function reset() { province.value=''; updateCities(); status.value='正常营业'; keyword.value=''; applyFilters(); }
  if (!Array.isArray(all)) {
    counter.textContent = '门店名单暂未载入，请刷新页面重试，或拨打18942914027咨询。';
    form.querySelectorAll('input,select,button').forEach(el => el.disabled=true);
    prev.disabled=next.disabled=true;
  } else {
    options(province,unique(all.map(s=>s.province)),'全部省份'); updateCities();
    form.addEventListener('submit',event => {event.preventDefault();applyFilters();});
    form.addEventListener('reset',event=>{event.preventDefault();reset();});
    province.addEventListener('change',()=>{updateCities();applyFilters();});
    city.addEventListener('change',applyFilters); status.addEventListener('change',applyFilters);
    keyword.addEventListener('input',applyFilters);
    byId('empty-reset').addEventListener('click',reset);
    const changePage = delta => {page+=delta;render();counter.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});};
    prev.addEventListener('click',()=>changePage(-1)); next.addEventListener('click',()=>changePage(1));
    applyFilters();
    // Optional agent interface uses exactly the same filters as the visible controls.
    if(document.modelContext?.registerTool) {
      const life = new AbortController();
      const schema={type:'object',properties:{province:{type:'string'},city:{type:'string'},status:{type:'string',enum:['','正常营业','暂停营业','永久停业','状态未注明']},keyword:{type:'string',maxLength:120}},additionalProperties:false};
      try { Promise.resolve(document.modelContext.registerTool({name:'filter_partner_stores',title:'筛选合作门店',description:'按省份、城市、营业状态和关键词更新可见门店列表，返回匹配数量和第一页结果。缺省状态为正常营业。',inputSchema:schema,annotations:{readOnlyHint:false,untrustedContentHint:true},execute(input){
        if(!input || typeof input!=='object' || Array.isArray(input))throw new Error('筛选条件必须是对象');
        for(const [k,v] of Object.entries(input))if(!Object.hasOwn(schema.properties,k) || typeof v!=='string')throw new Error('无效筛选字段');
        const p=input.province||'',c=input.city||'',s=input.status??'正常营业',q=input.keyword||'';
        if(p&&!all.some(x=>x.province===p))throw new Error('省份不存在');
        if(c&&!all.some(x=>(!p||x.province===p)&&x.city===c))throw new Error('城市与省份不匹配');
        if(!schema.properties.status.enum.includes(s)||q.length>120)throw new Error('状态或关键词无效');
        province.value=p;updateCities();city.value=c;status.value=s;keyword.value=q;applyFilters();
        return {total:filtered.length,stores:filtered.slice(0,pageSize)};
      }},{signal:life.signal})).catch(()=>{}); window.addEventListener('pagehide',()=>life.abort(),{once:true}); }catch{}
    }
  }
  dialog.querySelectorAll('.dialog-close,.dialog-done').forEach(button=>button.addEventListener('click',closeDialog));
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeDialog();}});
  dialog.addEventListener('close',()=>lastTrigger?.focus());
  byId('copy-phone').addEventListener('click',async()=>{
    try {await navigator.clipboard.writeText('18942914027');byId('copy-feedback').textContent='已复制招商电话：18942914027';}
    catch {byId('copy-feedback').textContent='请长按或选中号码手动复制：18942914027';}
  });
})();
