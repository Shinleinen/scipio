const GL = {};


HTMLElement.prototype.setAttributes = function(obj) {
	Object.keys(obj).forEach(a=>this.setAttribute(a,obj[a]));
};

function createElementExtended (o){
	if (typeof o === 'object' && typeof o.element !== 'undefined') {
		const t = document.createElement (o.element);
		if (typeof o.class==='object') o.class.forEach(a => {if (a) t.classList.add(a);});
		if (typeof o.attributes==='object') t.setAttributes(o.attributes);
		if (o.txt!==undefined) t.innerText = o.txt;
		else if (o.HTML!==undefined) t.innerHTML = o.HTML;

		if (typeof o.parent==='object') o.parent.appendChild(t);
		return t
	}
	return false;
}

GL.GCH = new class GLobalClickHandler { // run callback if clicked on element not in tree of specified root element
	constructor () {
		this.objects = [];
		document.addEventListener('click',this,false);
	}
	add (o) { // o = {element:HTMLElement, callback: function (clickedElement, affectedObject)}
		if (typeof o === 'object' && typeof o.element==='object' && typeof o.callback==='function') this.objects.push(o);
		else {
			console.log('wrong input',o);
			o = false;
		}
		return o;
	}
	remove (o) {
		let t;
		if (typeof o==='object' && (t = this.objects.indexOf(o))!==-1) this.objects.splice(t,1);
	}
	force(el) {
		this.handleEvent({target:el});
	}
	handleEvent (e) {
		this.objects.forEach(a=>{
				if (a && !a.element.contains(e.target)) a.callback(e.target, a);
			});
	}
};


const Modal = class {
	constructor (parent, cover_only, onTop) {
		if (typeof parent==='undefined') parent= document.body;
		this.parent = parent;
		if (typeof cover_only==='boolean' && cover_only===true) {
			this.cover_el = createElementExtended({element:'div', class:['modal'],attributes:{show:'1'}});
			return;
		}
		if (typeof onTop==='boolean' && onTop===true) {
			this.bcr = this.parent.getBoundingClientRect();
			this.parent = document.body;
		}
		this.cnt = createElementExtended({element:'div', class:['modal'] });
		this.win = document.createElement('div');
		let t = document.createElement('div');
		this.txt = document.createElement('div');
		t.appendChild(this.txt);
		this.btn = document.createElement('div');
		this.win.appendChild(t);
		this.win.appendChild(this.btn);
		this.cnt.appendChild(this.win);
		this.parent.appendChild(this.cnt);
		this.btn.addEventListener('click',this,false);
	}
	show (o) {
		if (this.cover_el) {
			this.parent.appendChild(this.cover_el);
			setTimeout(()=>{this.cover_el.setAttribute('show',o===1 ? '2':'1');},0);
			return;
		}
		if (typeof o!=='object' || typeof o.txt!=='string' || !(typeof o.btns==='object' || o.btns===false)) return false;
		if (typeof o.fitContent==='undefined') o.fitContent = ''
		this.callBack = o.callBack;
		this.txt.innerHTML = o.txt;
		this.btn.innerHTML ='';
		if (o.btns===false) {
			this.btn.parentNode.removeChild(this.btn);
			this.btn = null;
			setTimeout(()=>{
					GL.GCH.add({element:this.win, callback: (clickedElement, affectedObject)=>{
						GL.GCH.remove(affectedObject);
						this.handleEvent(false);
					}});
				},0);
		} else o.btns.forEach( (a,i)=> {
				let el = createElementExtended({parent: this.btn, element:'div', class:['modal_btn'], HTML: a });
				el.setAttribute('button',i);
			});
		this.cnt.setAttribute('show','1');
		this.cnt.style.width = o.fitContent; 
		this.cnt.style.height = o.fitContent;
		if (this.bcr) {
//			console.log(this.cnt.clientHeight,this.cnt.clientWidth);
			this.cnt.style.left = Math.min(this.bcr.left, document.documentElement.clientWidth - this.cnt.clientWidth - 5) +'px';
			this.cnt.style.top = Math.min(this.bcr.top, document.documentElement.clientHeight - this.cnt.clientHeight - 5)+'px';
		}
	}
	hide () {
		if (this.cover_el && this.cover_el.parentNode===this.parent) {
			this.cover_el.removeAttribute('show');
			this.parent.removeChild(this.cover_el);
		} else if (this.cnt) this.cnt.removeAttribute('show');
	}
	destroy () {
		this.btn?.removeEventListener('click', this);
		this.parent.removeChild(this.cnt);
	}

	handleEvent (e) {
		if (e===false || e.target.classList.contains('modal_btn')) {
			this.hide();
			if (typeof this.callBack==='function') this.callBack(e?.target?.getAttribute('button'));
		}
	}
}

const Presets = class {
	constructor () {
		this.list = [];
		this.select = document.getElementById('psel');
		[...this.select.options].forEach(a=>{ this.list.push({id:a.value*1, name:a.label, element:a}); });
	}
	change () {
		if (this.select.value==='0') clear_all();
		else check_submit(this.select.value);
	}
	rename () {
		const id = this.select.value;
		let name = this.select.selectedOptions[0].label;
		let m = new Modal(document.body);
		m.show ({txt:`<div class="sta"><div>Preset Name</div><textarea maxlength="100">${name}</textarea></div>`, btns:['Proceed','Cancel']
				,callBack: (b)=> {
					if (b==0) {
						GL.cover.show();
						name = document.querySelector('.sta textarea').value.trim();
						if (name) ajax.POST({type:'pren',post:'id='+id+'&name='+encodeURIComponent(name),func:(response, o, r)=>{
											if (!r.ok) (new Modal(document.body)).show({txt:'Unable to rename.',btns:['ok']});
											else {
												this.select.selectedOptions[0].label = r.name;
											}
											GL.cover.hide();
										}
									});
					}
					m.destroy();
					m=null;
				}
			});
		let ta = document.querySelector('.sta textarea');
		ta.focus();
		ta.setSelectionRange(ta.value.length,ta.value.length);
	}
	delete () {
		const id = this.select.value;
		if (id==='0') return;
		let m = new Modal(document.body);
		m.show ({txt:'Are you sure you want to delete this preset?', btns:['Proceed','Cancel']
				,callBack: (b)=> {
					if (b==0) {
						GL.cover.show();
						ajax.POST({type:'pdel',post:'id='+id,func:(response, o, r)=>{
											if (!r.deleted) (new Modal(document.body)).show({txt:'Unable to delete.',btns:['ok']});
											else {
												this.select.remove(this.select.options.selectedIndex);
												this.select.value = 0;
												clear_all();
											}
											GL.cover.hide();
										}
									});
					}
					m.destroy();
					m=null;
				}
			});
	}
	_save (name) {
		name = name?.trim();
		if (!name) return;
		const listed = document.getElementById('listed').checked ? 1:0;
		const sku =  encodeURIComponent(JSON.stringify(GL.sku_list.split("\n")));
		const filter = encodeURIComponent(JSON.stringify(GL.attributes.filter.objects.filter(a=>a?.qty_el!==undefined).map(a=>[a.filters,a.obj.id])));
		const minmaxpn = `&minsku=${document.getElementById('minsku').value}&maxsku=${document.getElementById('maxsku').value}&pnmask=${encodeURIComponent(document.getElementById('pnmask').value)}`;
		GL.cover.show();
		ajax.POST({type:'preset', post:`action=save&sku=${sku}&listed=${listed}&name=${encodeURIComponent(name)}&filter=${filter}${minmaxpn}` ,func:(response,o,r)=>{
					let svd = sqlToObject(r.svd)[0];
					let opt = this.list.find(a=>a.id===svd.id) || (()=>{const b={id: svd.id, element:createElementExtended({parent:this.select, element:'option',attributes:{value: svd.id}})}; this.list.push(b); return b;})();
					opt.name = svd.name;
					opt.element.label = svd.name;
					this.select.value = svd.id;
					document.getElementById('pupd').parentNode.setAttribute('sel',3);
					GL.cover.hide();
				} 
			});
	}
	save () {
		let a = new Modal(document.body);
		let t = `(${GL.category.cat}) ${GL.plm[0].productline} ${GL.plm[0].model}`.substr(0,100);
		a.show ({txt:`<div class="sta"><div>Preset Name</div><textarea maxlength="100">${t}</textarea></div>`,btns:['Save','Cancel'],callBack: (button)=>{
					if (button==0) {
						this._save(document.querySelector('.sta textarea').value);
					}
					a.destroy();
					a=null;
				}
			});
		let ta = document.querySelector('.sta textarea');
		ta.focus();
		ta.setSelectionRange(ta.value.length,ta.value.length);

	}
	update () {
		this._save(this.select.selectedOptions[0].label);
	}
}


const Attributes = class {
	constructor () {
		this.cnt = {};
		this.cnt.attr = document.getElementById('attr');
		this.cnt.attr.addEventListener('click', this, false);
		this.cnt.attr.addEventListener('dblclick', this._dblClickEvent.bind(this), false);
		this.sel_elements = [];
		this.presetBlock = document.getElementsByClassName('preset')[0];
		this.filter = {};
		this.filter.cnt = document.getElementById('flt');
		this.filter.objects = [];
		// get css rule for header line
		let i,j;
		for (i= document.styleSheets.length; i-- ;) {
			for (j = document.styleSheets[i].cssRules.length; j-- ; ) if (document.styleSheets[i].cssRules[j].selectorText==='#attr > div:first-child > div') break;
			if (j!==-1) break;
		}
		if (j>-1) {
			this.topRowStyle = document.styleSheets[i].cssRules[j].style;
		}
	}
	updateTop () {
		this.topRowStyle.top = this.presetBlock.clientHeight+'px';
	}
	select (o) {
		if (typeof o!=='object' || o.ca!=='attr') return false;
		o.sel = 1;
		o.element.setAttribute('chk',1);
		this.sel_elements.push(o);
		this.addFilter(o);
	}
	remove (o) {
		GL.cover.show(1);
		const c = ()=>{
			if (typeof o!=='object' || o.ca!=='attr') return false;
			o.sel = 0;
			o.element.setAttribute('chk',0);
			this.sel_elements = this.sel_elements.filter(a=>a!==o);
			this.removeFilter(o);
			GL.cover.hide();
		};
		setTimeout(c,0);
	}
	clickVFilter(el) {
		const ths = this.filter;
		let o = ths?.currentObj;
		let s = (el.getAttribute('sel')*1 + 1) %3;
		el.setAttribute('sel',s);
		o.filters[el.getAttribute('vuid')] = s;
	}
	_processFilter (o) {
			let pls = false; // filterout "minus" if "plus" exists (for single values attributes)
			if ( o.obj.is_multi===0 && !o.obj.is_repeating===1 && Object.keys(o.filters).find(a=> o.filters[a]===1)) pls=true;
			let html = [];
			let flt={ plus: new Set(), minus: new Set(GL.avus.map(a=>a.sku_id))};
			Object.keys(o.filters).forEach(vuid=>{
					const ids = vuid?.split('.').map(a=> a==='null' ? null: isNaN(a) ? a:a*1);
					if (o.filters[vuid]===0 || (pls && o.filters[vuid]===2)) delete o.filters[vuid];
					else {
						let sku = GL.avu_orig.find(a=>a.attr===o.obj.id && a.val===ids[0] && a.unit===ids[1]).skus;
						sku.forEach(s=> o.filters[vuid]===1 ? flt.plus.add(s) : flt.minus.delete(s));
						const uname = GL.unit.find(b=>b.id===ids[1])?.name || '';
						const name = GL.value.find(b=>b.id===ids[0])?.name;
						html.push(`<span${name ? '' : ' class="empty"'} mode="${o.filters[vuid]}">${name||'empty'} ${uname}</span>`);
					}
				});
			o.element.innerHTML = html.join('');
			let f = 0;
			if (flt.plus.size) {
				for (let s of flt.plus) if (flt.minus.has(s)) f++;
			} else f = flt.minus.size;
			o.qty_el.innerHTML = html.length ? f :''; 
	}
	openFilter(o) { // open values list for filter 
		const ths = this.filter;
		ths.currentObj = o;
		o.filters = o?.filters || {};
		let html = '<div><div class="vflt">';
		let avu = GL.avu_orig.filter(a=>a.attr===o.obj.id)
					.map(a=>{return {id:a.val,uid:a.unit, uname:GL.unit.find(b=>b.id===a.unit)?.name || '', name:GL.value.find(b=>b.id===a.val)?.name};})
					.sort((a,b)=>(a.uname+a.name>b.uname+b.name) ? 1:-1)
					.forEach(v=>{
							let sel = o.filters[v.id+'.'+v.uid] || 0; 
							let flt = GL.avu_orig.find(a=> a.sku_filtered.length && a.attr===o.obj.id && a.val===v.id && a.unit===v.uid);
							html +=`<div class="row" vuid="${v.id+'.'+v.uid}" sel="${sel}" ${flt? '':'title="Already filtered"'}><div act="vaflt"></div><div act="vaflt"${v.id===null ? ' class="empty"':''}>${((v.name||'empty') +' '+v.uname).trim()}</div></div>`;
						});
		html += '</div></div>';
		let modal = new Modal(document.body);
		modal.show({txt: html,btns:['Ok','Clear'],callBack: (button)=>{
					if (button==1){
						o.filters = {};
						document.querySelectorAll('.vflt [sel]').forEach(a=>a.setAttribute('sel',0));
						modal.cnt.setAttribute('show',1);
						return;
					}else{
						modal.destroy();
						modal = null;
						this._processFilter(o);
					}
					this.rebuild();
				}
			});
	}
	removeFilter(o) {
		const ths = this.filter;
		const row = ths.objects.find(a=>a.obj===o);
		row.element.parentNode.removeChild(row.element);
		ths.objects = ths.objects.filter(a=>a.obj!==o);
		this.rebuild();
	}
	addFilter (o) {
		const ths = this.filter;
		const row = newElement.bind(ths)({parent:ths.cnt,element:'div', class:['crow'], properties:{obj: o}});
		row.innerHTML = `<div class="attribute" hl="${o.hl}"><div class="groupf">${o.group}</div>${o.name}</div>`;
		newElement.bind(ths)({parent:row, element:'div', class:['values'], attributes:{act:'aflt'}, properties:{obj:o}});
		ths.objects[ths.objects.length-1].qty_el = createElementExtended({parent:row, class:["vqty"], element:'div', properties:{obj:o}});
	}
	_dblClickEvent(e) {
		if (e.target.tagName==='SPAN' && e.target.getAttribute('ca')==='help') {
			const o = this.objects.find(a=>a.element===e.target.parentNode) || {id: e.target.getAttribute('aid')};
			if (o.id) {
				window.open(`http://vxwiki.cnetcontentsolutions.com/?alias=cc.ds.template.${GL.category.cat}:cc.ds.attr.${o.id}`, '_blank').focus();
			}
		}
	}
	handleEvent (e) {
		const obj = this.objects.find(a=>a.element===e.target);
		if (e.type==='click') {
			if (this.elements.indexOf(e.target)!==-1 && obj && (e.target.parentNode.getAttribute('neq')==='1' || e.target.getAttribute('chk')==='1') ) {
				if (obj.ca==='attr') (obj.sel^1 ? this.select(obj,1) : this.remove(obj,1));
			}
		}
	}
	rebuild() {
		// convert filters to DB style (attr,val,unit, mode)
console.time('rebuild');
		let t = GL.attributes.filter.objects
			.filter(a=>a?.filters && Object.keys(a.filters).length)
			.map(a=>{
				let f = Object.keys(a.filters).map(k=>{
					let t = k.split('.').map(t=> t==='null' ? null : isNaN(t)? t : t*1);
					t.push(a.filters[k]);
					t.push(a.obj.id);
					return t;
					});
				return f;
			});
		if (t.length) {
			GL.filters_current = t.reduce((a,b)=> a.concat(b))
				.map(a=>{return {attr:a[3],val:a[0], unit:a[1], mode:a[2]};});
		} else GL.filters_current = [];
		// get filtered sku list
		let minus = new Set(GL.avus.map(a=>a.sku_id));
		[...new Set(GL.filters_current.filter(a=>a.mode===2).map(a=>a.attr))].forEach(attr=>{
				GL.filters_current.filter(a=>a.mode===2 && a.attr===attr).forEach(v=>{
						GL.avu_orig.find(b=>b.attr===v.attr && b.val===v.val && b.unit===v.unit).skus.forEach(s=>{if(minus.has(s)) minus.delete(s);});
					});
			});
		let fp = {list:new Set()}
		GL.filters_current.filter(a=>a.mode===1 ).forEach(a=>{
			if (fp.list.has(a.attr)) {
				GL.avu_orig.find(b=>b.attr===a.attr && b.val===a.val && b.unit===a.unit).skus.forEach(s=>fp[a.attr].add(s));
			} else {
				fp.list.add(a.attr);
				fp[a.attr] = new Set(GL.avu_orig.find(b=>b.attr===a.attr && b.val===a.val && b.unit===a.unit).skus);
			}
		});
		delete fp.list;
		fp = Object.keys(fp).map(a=>[...fp[a]]);
		if (fp.length) {
			const skus = [];
			fp.reduce((a,b)=> a.filter(c=>b.includes(c)))
				.forEach(s=> {if (minus.has(s)) skus.push(s);});
			GL.filters_sku = skus;
		} else GL.filters_sku = [...minus];


		// build filtered AVU
		let fsku = new Set(GL.filters_sku);
		GL.avu_orig.forEach(a=>{ a.sku_filtered = a.skus.filter(b=>fsku.has(b)) });

		document.querySelectorAll('[plm_m]').forEach(e=>{
				const m = e.getAttribute('plm_m');
				if (m!=='0') e.innerHTML = `<span class="fqty" act="fqty" >${GL.avus.filter(s=>GL.filters_sku.includes(s.sku_id) && s.m===m).length}</span> of ${GL.plm.find(a=>a.m===m).qty}` ;
			});
		if (GL.plm.find(a=>a.m==='2')) { // show total if more than 1 PLM
			t = document.querySelector('#plm >.row') || createElementExtended({parent: document.getElementById('plm'), element:'div', class:['row']});
			t.innerHTML = `<div>Total:</div><div></div><div></div><div plm_m="0"><span class="fqty" act="fqty">${GL.filters_sku.length}</span> of ${GL.avus.length}</div>`;
		}
console.timeEnd('rebuild');
		// rebuild
		[...this.cnt.attr.querySelectorAll('.crow[neq]')].forEach(a=>a.removeAttribute('neq'));
		this.values_place.forEach(vp => {
				this.objects = this.objects.filter(a=>!(a.ca==='qty' && a.attr===vp.attr)); // cleanup
				vp.parent.innerHTML='';
				let empty = 1;

				if (vp.is_repeating) {
					GL.avu_orig.filter(a=>a.attr===vp.attr && a.sku_filtered.length)
						.map(a=>{return {
									attr:a.attr
									,val:a.val
									,name:GL.value.find(b=>b.id===a.val)
									,sku_qty: a.sku_filtered.length
								};
							})
						.sort((a,b)=>( (a.name?.name)< (b.name?.name) ? -1:1))
						.forEach(o=>{
							empty = 0;
							const q_eq = o.sku_qty===GL.filters_sku.length;
							if (!q_eq) vp.row.setAttribute('neq',1);
							const line = (o.name?.rname?.map(a=> '<div'+(a ? '>':' class="empty">')+(a ?? 'empty')+'</div>')?.join('') || ('<div class="empty">empty</div>'.repeat(vp.attr_qty) ) )  + (q_eq ? '<span></span>':'');
							let t = createElementExtended({parent:vp.parent, element:'div', class:['rrow', q_eq ? 'all': (o.name===undefined ? 'empty':'')], HTML: line});
							if (!q_eq) newElement.bind(this)({parent:t, element:'span', class:['qty'], attributes:{act:'qty'}, properties:{ca:'qty', attr:o.attr, val:o.val, name: o.name?.rname},txt:`(${o.sku_qty})` });
						});
				} else {
					GL.avu_orig.filter(a=>a.attr===vp.attr && a.sku_filtered.length)
						.map(a=>{return {attr:a.attr, val:a.val, name:GL.value.find(b=>b.id===a.val)?.name, unit:GL.unit.find(b=>b.id===a.unit)?.name, sku_qty:a.sku_filtered.length};})
						.sort((a,b)=>( (a.unit||'')+a.name)< ( (b.unit||'')+b.name)? -1:1)
						.forEach(o=>{
							empty = 0;
							const q_eq = o.sku_qty===GL.filters_sku.length;
							if (!q_eq) vp.row.setAttribute('neq',1);
							let t = createElementExtended({parent:vp.parent, element:'div', class:[q_eq ? 'all': (o.name===undefined ? 'empty':'')], txt: ((o.name || 'empty')+' '+(o.unit ||'')).trim()});
							if (!q_eq) newElement.bind(this)({parent:t, element:'span', class:['qty'], attributes:{act:'qty'}, properties:{ca:'qty', attr:o.attr, val:o.val, name: o.name||'empty'},txt:`(${o.sku_qty})` });
						});
				}
				vp.row.setAttribute('empty',empty);
			})
		this.updateTop();
	}
	process () {
		this.list = [];
		this.values_place = [];
		this.objects = [];
		this.elements = [];
		const root = this.cnt.attr; //createElementExtended({element:'div', class:['row']}); neq
		this.root =  root;
		const view = localStorage.getItem('scipio_view')||0;
		root.setAttribute('view', view);
		root.innerHTML = '<div class="crow"><div style="line-height: 20px;">Attributes<select id="view"><option value="0">All</option><option value="1">Filled</option><option  value="2">Difference</option></select></div><div style="line-height: 20px;">Values</div></div>';
		document.getElementById('view').value = view;
		GL.attr_list.forEach(group=> {
				if (group.is_repeating) {
					newElement.bind(this)({parent:root,element:'div', class:['group'], txt:group.group_name});
					createElementExtended({parent:root,element:'div', class:['group','groupr'], txt: '(Sets)'});
					let attrs = group.attributes.split(String.fromCharCode(2)).map(a=>a.split(String.fromCharCode(1)));
					const a_id = attrs.map(a=>a[0]).join(' ');
					const row = newElement.bind(this)({parent:root,element:'div', class:['crow']});
					const el = newElement.bind(this)({parent:row,element:'div', class:['attribute','icon-'], attributes:{title:"Check'n'Filter", chk:0, hl:attr[1]}, properties:{ca:'attr', group:group.group_name, is_multi:0, is_repeating:1, sel:0, id:1000000+group.group_id, rid:a_id, hl:0, name:group.group_name}, HTML:group.group_name+'<span class="rgroup">(repeating group)</span>'});
					this.elements.push(el);
					const div = newElement.bind(this)({parent:row,element:'div', class:['attribute'], attributes:{hl:0}, properties:{ca:'val', id:1000000+group.group_id, rid:a_id }});
					const a_set = createElementExtended({parent:div,element:'div', class:['a_set'], attributes:{style:`grid-template-columns: repeat(${attrs.length+1}, auto);`}, HTML: '<div class="set_aname">'+attrs.map(a=>`<span ca="help" title="Help on double-click" aid="${a[0]}">${a[2]}</span>`).join('</div><div class="set_aname"><span ca="help">')+'</div><div></div>'});
					let val = createElementExtended({parent: a_set, element:'div', attributes:{val:'2'}});
					this.values_place.push({attr:1000000+group.group_id, parent:val , is_repeating:1, row: row, attr_qty: attrs.length});
					//this.list.push({id:1000000+group.group_id, is_repeating:1, is_multi: 1});
				} else {
					newElement.bind(this)({parent:root,element:'div', class:['group'], txt:group.group_name});
					createElementExtended({parent:root,element:'div', class:['group']});
					let attrs = group.attributes.split(String.fromCharCode(2)).map(a=>a.split(String.fromCharCode(1)));
					attrs.forEach(attr=>{
							const row = newElement.bind(this)({parent:root,element:'div', class:['crow']});
							const el = newElement.bind(this)({parent:row,element:'div', class:['attribute','icon-'], attributes:{title:"Check'n'Filter", chk:0, hl:attr[1]}, properties:{ca:'attr', group:group.group_name, is_multi:attr[3]*1, sel:0, id:attr[0]*1, hl:attr[1]*1, name:attr[2]}, HTML:`<span ca="help" title="Help on double-click">${attr[2]}</span>`});
							this.elements.push(el);
							const div = newElement.bind(this)({parent:row,element:'div', class:['attribute'], attributes:{hl:attr[1]}, properties:{ca:'val', id:attr[0]*1 }});
							let val = createElementExtended({parent: div, element:'div', attributes:{val:'1'}});
							this.values_place.push({attr:attr[0]*1, parent:val, row: row});
							this.list.push({id:attr[0]*1, is_multi:attr[3]*1});
						});
				}
			});
		this.rebuild();
	}
}


function	clear_all() {
	document.getElementById('sku').value = '';
	document.getElementById('cat').innerHTML = '';
	document.getElementById('plm').innerHTML = '';
	document.getElementById('attr').innerHTML = '';
	document.getElementById('pupd').parentNode.setAttribute('sel','0');
	let cnt_f = document.getElementById('flt');
	let t = cnt_f.removeChild(cnt_f.firstChild);
	cnt_f.innerHTML = '';
	cnt_f.appendChild(t);
	document.getElementById('minsku').value='';
	document.getElementById('maxsku').value='';
	document.getElementById('pnmask').value='';
	document.getElementById('listed').checked = false;
	check_sku_input();
}

const ajax = new (class AJAX {
	constructor () {
		this.pipeline = [];
		this._in_progress = 0;
		this.xhttp = new XMLHttpRequest();
		this.lastRequestTime = Date.now();
		this.xhttp.onreadystatechange = () => {
				if (this.xhttp.readyState == 4) {
					if (this.xhttp.status == 200) this._response();
					else this._error();
				}
			};
		this.xhttp.ontimeout = () => this._timeout;
		if (!this?.setIntervalFlag) {
			this.setIntervalFlag = setInterval(()=>{
					if (Date.now() - this.lastRequestTime > 20000) this.POST({type:'ping', func:()=>{}});
				},20000);
		}
	}
	_timeout () {
		alert('Request timeout.');
	}
	_error () {
		console.log(`XHTTP status: ${this.xhttp.status}`);
		alert("Probably something going wrong. Please reload page!");
	}
	_response () {
		let obj = this._post_obj;
		let response = this.xhttp.responseText;
		if (/^Bridge error/.test(response)) {
			obj.bridge_error_cnt++;
			console.log(response, obj.bridge_error_cnt);
			if (obj.bridge_error_cnt<3) {
				this._in_progress=0;
				this.POST(obj);
				return;
			}
		}
		const error = check_error(response,obj);
		obj = Object.assign(obj,{error:error});
		let r;
		try { r = JSON.parse(response);}
		catch (e){ 
			console.log(e); 
			console.log(response);
			if (obj.type==='tst') {this._in_progress=0; waiting(0);};
			return false;
		}
		this._in_progress=0;
		if (obj.type!=='ping' && r.db_fail && r.db_fail[0]!==0) {
			alert(`Required DB (${r.db_fail[1]}) is not available now, please try again later.`);
			return;
		}
		if (obj.type==='get' && typeof GL.cover!=='undefined') GL.cover.hide();
		const o = this.pipeline.shift();
		if (o) setTimeout(()=>{this.POST(o)},10);
		if (obj.type!=='ping') waiting(0);
		if (typeof r.debug!=='undefined' && r.debug!=='') console.log(decodeURIComponent(r.debug));
		if (typeof obj.func==='function') obj.func(response,obj,r);
		else console.log(obj,response,r);

	}
	POST (obj) {
		if (typeof obj==='undefined' || typeof obj.type==='undefined') return false;
		if (this._in_progress==1) {
			if (obj.type!=='ping') this.pipeline.push(obj);
			return;
		}
		if (obj.type==='save') this.was_save = true;
		if (obj.type==='get') this.was_save = false;
		if (obj.bridge_error_cnt===undefined) obj.bridge_error_cnt = 0;
		this._in_progress=1;
		if (obj.type==='get' && typeof GL.cover!=='undefined') GL.cover.show();
		const post = 'type='+obj.type + (typeof obj.post==='undefined' ? '' : '&'+obj.post) ;
		this._post_obj = obj;
		if (obj.type!=='ping') waiting(1);
		this.xhttp.open("POST", "", true);
		this.xhttp.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
		this.xhttp.timeout = 300000; // wait 300 sec
		this.xhttp.send(post);
		this.lastRequestTime = Date.now();
	}
});


function	waiting(f) {
	const r = document.getElementById('rfsh');
	if (!r)	return;
	r.setAttribute('act',f);
}

function	check_error(r,o) {
	if (o.type==='tst') return true;
	let f = false;
	if (r=='' || r.match(/###!!!--->>>Error:/)) {
		console.log(r); 
		alert("Something going wrong. Try to reload page!(3)");
		f = true;
	}
	return f;
}


const newElement = function (o){
					const t = createElementExtended (o);
					if (t) {
						let obj = {element:t};
						if (typeof o.properties==='object') obj = Object.assign(obj,o.properties);
						this.objects.push(obj);
					}
					return t;
				};




function	copyPropertiesObj2Obj(src, dest) {
	for (key in src) {
		if (dest[key]!==undefined) dest[key]=src[key];
	}
}



function	sqlToObject(o){
	const arr = [];
	o.rows.forEach(v=> {
			const b= {};
			v.forEach((V,i)=> b[o.columns[i][0]] = ['SQL_INTEGER','SQL_BIT','SQL_SMALLINT','SQL_TINYINT'].indexOf(o.columns[i][1])!==-1  ? (V.charCodeAt()===0 ? null : V*1) : decodeURIComponent(V));
			arr.push(b);
		});
	return arr;
}

function	event_input(e) {
	if (['minsku','maxsku'].indexOf(e.target.id)!==-1) {
		let v = e.target.value.replace(/\D/g,'')
		if (v>99999999) v = v.substr(0,v.length-1);
		e.target.value = v;
	}

}
	

function	event_change(e) {
	switch (e.target.id) {
	case 'psel': 
		GL.presets.change();
		e.target.blur();
		break;
	case 'sku':
		check_sku_input();
		break;
	case 'view':
		GL.attributes.cnt.attr.setAttribute('view',e.target.value);
		localStorage.setItem('scipio_view',e.target.value);
		e.target.blur();
		break;
	}
}

//const ajax = new AJAX;


function	check_submit(preset){
	if (preset===undefined) check_sku_input();
	GL.cover.show();
	pnmask = encodeURIComponent(document.getElementById('pnmask').value);
	if (pnmask || GL.sku_list || preset) ajax.POST({type:(preset===undefined ? 'get_info':'get_info_preset')
												,post:'listed='+(document.getElementById('listed').checked ? 1:0)
													+(preset===undefined ? '&sku='+ encodeURIComponent(JSON.stringify(GL.sku_list.split("\n"))) : '&preset='+preset)
													+`&minsku=${document.getElementById('minsku').value}&maxsku=${document.getElementById('maxsku').value}&pnmask=${pnmask}`
												,func:(response,o,r)=>{
				clear_all();
				let cnt_s = document.getElementById('sku');
				let cnt_c = document.getElementById('cat');
				let cnt_p = document.getElementById('plm');

				if (r.skus===null) {
					cnt_s.value='';
					let modal = new Modal(document.body);
					modal.show({txt: 'SKU not found',btns:['Ok'],callBack: ()=>{modal.destroy(); modal=null;} });
					GL.cover.hide();
					return
				}
				GL.skus = r.skus;
				GL.sku_list = r.skus;
				cnt_s.value = r.skus.replace(/\,\s/g,"\n");
				check_sku_input();
				let cat = sqlToObject(r.category)[0];
				if (cat.qty!==1) {
					let modal = new Modal(document.body);
					modal.show({txt: cat.qty===0 ? 'SKU not found':'Specified SKUs are in different categories',btns:['Ok']	,callBack: ()=>{modal.destroy(); modal=null;}});
					GL.cover.hide();
					return
				}
				document.getElementById('minsku').value = r.minmaxpn[0] ? r.minmaxpn[0] : '';
				document.getElementById('maxsku').value = r.minmaxpn[1] ? r.minmaxpn[1] : '';
				document.getElementById('pnmask').value = r.minmaxpn[2] ? r.minmaxpn[2] : '';

				GL.total_qty = r.total_qty;
				GL.category = cat;
				GL.plm = sqlToObject(r.PLMs);
				let plm = GL.plm.map(a=>`<div>${a.manf}</div><div>${a.productline}</div><div>${(a.model ??'')}</div><div plm_m="${a.m}">${a.qty}</div>`).join('');
				cnt_c.innerHTML = `<div>Category</div><div>(${cat.cat}) ${cat.name}</div>`;

				cnt_p.innerHTML = `<div class="header">Manufacturer</div><div class="header">Product Line</div><div class="header">Model</div><div class="header">SKUs</div>${plm}`;

				const attr = sqlToObject(r.attributes);
				GL.attr_list = attr;

				GL.avus = sqlToObject(r.sku_pn);
				GL.avu_orig = sqlToObject(r.avus); 
				GL.avu_orig.forEach(a=>a.skus = a.sku.split('.').map(b=>b*1));

				GL.value = sqlToObject(r.value);
				GL.unit = sqlToObject(r.unit);

console.time('repeating');


				let all_skus = GL.avus.map(a=>a.sku_id);
				// get attributes list per repeating group
				let rg = GL.attr_list.filter(a=>a.is_repeating).map(a=>{return {rattr: 1000000+a.group_id, attrs: a.attributes.split(String.fromCharCode(2)).map(a=>a.split(String.fromCharCode(1))[0]*1) }});
				rg.forEach(grp => {
					let avu = GL.avu_orig.filter(a=>grp.attrs.includes(a.attr));
					let rg_skus = {};
					avu.forEach(av=>{
						const ndx=grp.attrs.indexOf(av.attr);
						av.skus.forEach(sku=> { // build table - array of values per each set per each sku
							rg_skus[sku] ??= []; // initiate array of sets if not set
							rg_skus[sku][av.set-1] ??= []; // initiate array of values  if not set
							rg_skus[sku][av.set-1][ndx] = av.val+'_'+av.unit;
						});
					});
					let rg_attr = {};
					Object.keys(rg_skus).forEach(sku=>{ // revert table from sku based to value based
						rg_skus[sku].forEach((a,i)=>{ 
							a[grp.attrs.length-1] ??=''; // set array length to "set attributes" qty if lower
							const v=a.join('|');
							rg_attr[v] ??= []; // initiate array if not set
							rg_attr[v].push(sku*1); // add sku for set_value_list
						});
					});
					Object.keys(rg_attr)
						.forEach(k=>{
							GL.avu_orig.push({attr:grp.rattr, val:k, unit:0, set:0, skus:rg_attr[k]}); // insert values (value per set)
							let name = k.split('|')
										.map(b=>{ if (b==='') return null; 
											let t = b.split('_'); 
											return ((GL.value.find(b=>b.id===t[0]*1)?.name ?? '')+' '+(GL.unit.find(b=>b.id===t[1]*1)?.name ?? '')).trim();
										});
							GL.value.push({id:k, name:name.filter(a=>a).join('|'), rname:name}); // create values (one value per each set)
						});
				});

console.timeEnd('repeating');

				// add "empty" attributes (means not set in some skus) sku
				t = [...new Set(GL.avu_orig.filter(a=>a.set===0).map(a=>a.attr))].map(a=>{return {attr:a, set:0};}); // get unique attr/set
				t.forEach(attr=> attr.skus = [... new Set( GL.avu_orig.filter(a=>a.attr===attr.attr && a.set===attr.set).map(a=>a.skus).reduce((a,b)=>{a=a.concat(b); return a}) )]);
				t = t.filter(a=>a.skus.length<all_skus.length); // remove attribute contains in every SKU
				t.forEach(a=>{
						a.val = null;
						a.unit = 0;
						a.skus = all_skus.filter(b=> !a.skus.includes(b)); // get "empty" skus
						GL.avu_orig.push(a);
					});

				GL.attributes = new Attributes;
				GL.attributes.process();

				if (r.is_listed!==undefined) document.getElementById('listed').checked = r.is_listed;
				if (r.filters) {
					let rbld = false;
					JSON.parse(r.filters).forEach(a=>{
							const o = GL.attributes.objects.find(b=>b.id===a[1] && b.ca==='attr');
							if (o) {
								GL.attributes.select(o);
								if (a[0]){
									const obj = GL.attributes.filter.objects.find(b=>b?.qty_el!==undefined && b?.obj?.id===a[1]);
									obj.filters = a[0];
									GL.attributes._processFilter(obj);
									rbld = true;
								}
							}
						});
					if (rbld) GL.attributes.rebuild();
				}
				

				// show update/save buttons
				t = document.getElementById('psel').value;
				t = (t==='0') ? 2 : 3;
				document.getElementById('pupd').parentNode.setAttribute('sel',t);

				GL.cover.hide();

				if (GL.total_qty>r.sku_limit+500) {
					let modal = new Modal(document.body);
					modal.show({txt: `The maximum SKUs quantity is limited to ${r.sku_limit} SKUs, please use filters to decrease SKUs quantity.`,btns:['Ok'],callBack: ()=>{modal.destroy(); modal=null;}	});
				}

			}
		});
	else GL.cover.hide();

}




function	event_click(e){
if (e.target.tagName==='SPAN' && e.target.getAttribute('ca')==='help') return;

	if (e.target.tagName==='SELECT') {
		e.preventDefault();
		return;
	}
	switch (e.target.id) {
		case 'submit':
			check_submit();
			break;
		case 'clear':
			clear_all();
			e.target.previousSibling.focus();
			break;
		case 'psave':
			GL.presets.save();
			break;
		case 'pupd':
			GL.presets.update();
			break;
		case 'pdel':
			GL.presets.delete();
			break;
		case 'pren':
			GL.presets.rename();
			break;
		case 'clkmask':
			{
				let modal = new Modal(e.target, false, true);
				modal.txt.classList.add('clkmask');
				modal.show({fitContent:'fit-content', txt:'Use SQL wildcards here.<br>Examples:<br>abcd% = abcd*<br>abcd[0-9] = abcd0,abcd1...abcd9',btns:false ,callBack: ()=>{modal.destroy(); modal = null;} });
			}
			break;
		default:
			//console.log(e);
	}


	let p = e.target;
	if (p.tagName==='path') p = p.parentNode;
	let o;
	let p_el = p.parentNode.parentNode;
	let modal;

	switch (p.getAttribute('act')) {
		case 'fold':
			p_el.setAttribute('fold', (p_el.getAttribute('fold')==='0' ? 1:0) );
			GL.attributes.updateTop();
			break;
		case 'del':
			o = GL.objects.find(a=>a.cnt===p.parentNode.parentNode);
			if (o) o.del_toggle();
			break;
		case 'vaflt':
			GL.attributes.clickVFilter(p.parentNode);
			break;
		case 'fqty':
			o = p.parentNode.getAttribute('plm_m');
			if (o!==null && p.innerText!=='0') {
				let skus = GL.filters_sku.filter(s=>GL.avus.find(b=>b.sku_id===s && (b.m===o || o==='0')));
				let pns = skus.map(a=>GL.avus.find(b=>b.sku_id===a).pn);
				let a = new Modal(p, false, true);
				a.show ({fitContent:'fit-content', txt:'<div class="sku_list"><div class="header">SKU</div><div class="header">PN</div><div selectable="1">'
							+skus.join("\n")+'</div><div selectable="1">'+pns.join("\n")+'</div></div>',btns:false,callBack: ()=>{a.destroy(); a=null;} });
			}
			break;
		case 'qty':
			o = GL.attributes.objects.find(a=>a.element===p);
			let skus = GL.avu_orig.find(a=>a.sku_filtered.length && a.attr===o.attr && a.val===o.val).sku_filtered.sort((a,b)=>a<b?-1:1);
			let pns = skus.map(a=>GL.avus.find(b=>b.sku_id===a).pn);
			let a = new Modal(o.element, false, true);
			a.show ({fitContent:'fit-content', txt:'<div class="value_name"><span>value:</span> '
						+o.name+'</div><div class="sku_list"><div class="header">SKU</div><div class="header">PN</div><div selectable="1">'
						+skus.join("\n")+'</div><div selectable="1">'+pns.join("\n")+'</div></div>',btns:['close'],callBack: ()=>{a.destroy(); a=null;} });
			break;
		case 'aflt':
			o = GL.attributes.filter.objects.find(a=>a.element===p);
			GL.attributes.openFilter(o);
			break;
		default:
			p_el = e.path.find(a=>typeof a==='object' && a?.classList && a.classList.contains('attribute')); // check if clicked on value cell
			if (p_el && p_el.querySelector('[val]') && (o = GL.attributes.objects.find(a=>a.element===p_el)) ) {
				let title = GL.attributes.objects.find(a=>a.id===o.id && a.ca==='attr');
				title = title.group + ' / ' + title.name;
				let avu = GL.avu_orig.filter(a=>a.attr===o.id && a.sku_filtered.length && a.sku_filtered.length<GL.filters_sku.length);
				if (avu.length===0) return;// do not process if no deviations in attribute values 
				let skus =new Set(avu.map(b=>b.sku_filtered).reduce((a,b)=>a.concat(b)));
				let valv = {};
				skus.forEach(s=>{ // build unique list of values with corresponding SKU`s
						let v = JSON.stringify(avu.filter(f=>f.skus.includes(s)).map(f=> [f.val,f.unit,f.set]));
						if(valv[v]) valv[v].push(s);
						else valv[v]=[s];
					});
				let vlist = [];
				Object.keys(valv).forEach(k=>{vlist.push({sku:valv[k].sort((a,b)=>a<b?-1:1), val:JSON.parse(k).map(a=>resolve_value(a[0],a[1],a[2])).sort((a,b)=> a[1]<b[1]?-1:1) }) }); // sorting there for multivalues
				vlist.sort((a,b)=>a.val[0][1]>b.val[0][1] ? 1:-1).forEach(a=> {a.val = a.val.map(b=>b[0]);}); // sorting there for value sets
				let g = [... new Set( vlist.map(a=>a.sku).reduce((a,b)=>{a=a.concat(b); return a}) )];
				if (g.length!==GL.filters_sku.length) {
					g = GL.filters_sku.filter(b=> !g.includes(b)).sort((a,b)=>a<b?-1:1);//GL.avus.map(a=>a.sku_id).filter(b=> !g.includes(b)).sort((a,b)=>a<b?-1:1); // get "rest" skus
					vlist.push({sku:g, val:['<span class="g">"green" values only</span>']});
				}
				const name = GL.plm[0].pl_id+'_'+GL.plm[0].m_id+'_'+o.id;
				newWindowHTML(title, name, vlist);
			}
	}
}

function	newWindowHTML (title,name, dat) {
	let html =	`
	<html><head><title>${title}</title><style>
	#flx { display: flex; font-family: sans-serif; width: fit-content; background: #74d2f3;}
	.c { border: 1px solid #BBC; background: white;}
	.c:not(:last-child) {margin-right: 5px;}
	.h { user-select:none; text-align: center; background: #D0D0E0; font-weight: bold; border-bottom: 1px solid #BBC; font-size: 12px; color: #446; position: sticky; top: 0; }
	.sl { display: grid; grid-template-columns: auto auto; white-space: pre; line-height: 14px; max-height: 90vh; overflow-y: auto; margin: 0px auto; font-size: 12px; text-shadow: 1px 1px 2px #ccc; }
	.sl >div:nth-child(odd) { border-right: 1px solid #BBC}
	.sl >div{ padding: 0 5px; }
	.e { color: #66a; font-size: 12px; font-style: italic;}
	.v{ padding: 5px; font-size: 12px; font-family:monospace; white-space: pre; line-height: 13px; max-height: 200px; overflow-y:auto;}
	.v::-webkit-scrollbar, .sl::-webkit-scrollbar { width: 8px;}
	.v::-webkit-scrollbar-thumb, .sl::-webkit-scrollbar-thumb { background-clip: content-box; background-color: #6a97da; border: 1px solid transparent;}
	.sl::-webkit-scrollbar-thumb { border-top: 16px solid transparent;}
	.v::-webkit-scrollbar-track, .sl::-webkit-scrollbar-track { background-color: transparent; border: solid 1px transparent; border-left: 1px solid #BBC; }
	.g {color: green; font-size: 12px; font-style: italic;}
	</style>
	<script>
	let initial = 0;
	window.addEventListener('resize', (e)=>{
		if(initial===1) return;
		initial = 1;
		let el = window.document.getElementById("flx");
		window.resizeTo(Math.min(el.offsetWidth+50,window.screen.availWidth),Math.min(el.offsetHeight+110,window.screen.availHeight) );
		document.body.addEventListener('dblclick', (e)=>{
				if (e.target.getAttribute('sel')!==null) {
					const s = window.getSelection();
					const r = document.createRange();
					r.selectNodeContents(e.target);
					s.removeAllRanges();
					s.addRange(r);
				}
			}, false);
	});
	</script>
	</head><body><div id="flx">`;
	dat.forEach(o=>{
			html += `<div class="c">
						<div class="h">Value${o.val.length===1 ? '':'s'}</div>
						<div class="v">${o.val.join("\n")}</div>
							<div class="sl">
							<div class="h">SKU</div><div class="h">PN</div>
							<div sel>${o.sku.join("\n")}</div>
							<div sel>${o.sku.map(a=>GL.avus.find(b=>b.sku_id===a).pn).join("\n")}</div>
						</div>
					</div>`;
		});
	html += `</div></body></html>`;
	wnd = window.open('about:blank', title, `width=${window.screen.availWidth}, height=${window.screen.availHeight}`);
	wnd.document.write(html);
	wnd.document.close();
}

let wnd =null;

function	resolve_value(v,u,s) {
			const name = GL.value.find(a=>a.id===v)?.name;
			const unit = GL.unit.find(a=>a.id===u)?.name ||'';
			return [((name || '<span class="e">empty</span>')+' '+unit).trim(), unit+(name||'')]; // second value with unit at start for sorting purpose
}
function	check_sku_input() {
	let ta = document.getElementById('sku');
	let v = ta.value.replace(/[^\d\s]*/g,'').replace(/(\s|\r?\n)+/g,"\n").trim();
	ta.value = v;
	GL.sku_list = v;
	if (ta.value || ta.value.length===1) {
		v = v.split("\n");
		ta.setAttribute('rows',v.length>10 ? 11 : v.length+1);
	} else ta.setAttribute('rows',1);
}

function event_dblclick(e) {
	if (e.target.getAttribute('selectable')==='1') {
		const s = window.getSelection();
		const r = document.createRange();
		r.selectNodeContents(e.target);
		s.removeAllRanges();
		s.addRange(r);
	}
}

window.addEventListener('load', ()=>{
		GL.cover = new Modal(document.body,true);
		GL.objects = [];
		GL.presets = new Presets;
		GL.sku_list = '';
		document.body.addEventListener('input',event_input, false);
		document.body.addEventListener('change',event_change, false);
		document.body.addEventListener('click',event_click, false);
		document.body.addEventListener('dblclick',event_dblclick, false);

		let el = document.getElementById('sku');
		el.addEventListener('paste', (e)=>{
				let a = e.target.selectionStart;
				let b = e.target.selectionEnd;
				e.target.value = e.target.value.substring(0,a)
					+' '+ e.clipboardData.getData('text').replace(/[^\d\s]*/g,'').replace(/(\s|\r?\n)+/g,' ')
					+e.target.value.substring(b);
				e.preventDefault();
				check_sku_input();
			},false);
		el.addEventListener('keydown', (e)=>{
			if (!e.ctrlKey && e.code.substr(0,3)==='Key') e.preventDefault();
				else
					switch (e.key) {
						case 'Backspace':
						case 'Delete':
							setTimeout(check_sku_input,100);
							break;
						case 'Escape':
							e.target.value= GL.sku_list ?? '';
							e.target.blur();
							break
						case 'Enter':
							if (!e.shiftKey) {
								e.preventDefault();
								e.target.blur();
								check_submit();
							} else check_sku_input();
							break;
						case ' ':
							break;
						default:
//							if (!(/\d/.test(e.key))) e.preventDefault();
					}
			},false);
		let s = window.location.hash;
		if (/^#pnmask=.+/.test(s)){
			s = s.substring(8);
			try {
				s = decodeURIComponent(s);
			} catch(e) {
				console.log(e.name);
			}
			document.getElementById('pnmask').value = s;
			window.location.hash = 'pnmask='+s;
		} else {
			s = decodeURIComponent(s).replace(/[^0-9,]/g,'')?.split(',');
			if (s?.length>0) {
				window.location.hash = s.join(',');
				if (s.length>1) document.getElementById('listed').checked = true;
				s = s.join('\n');
				el.value = s;
			} else {
				el.value = '';
				window.location.hash = '';
			}
		}
		//window.location.hash = '';
		if (s) check_submit();
	},false);
