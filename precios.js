/* Precios DEALER SPORTS MX: tipo de cambio, margen por marca, redondeo, anticipo y envíos.
   Se guardan en este aparato y los comparten Historias, el Cotizador y el Catálogo.
   El tipo de cambio, los márgenes y el redondeo se eligen en Historias › Ajustes.
   La tienda NO cambia de precios al mover esos ajustes: usa los que estaban cuando diste
   "Recalcular precios de la tienda" (se guardan aparte en c.tienda), y le llegan al dar "Publicar tienda" en el Catálogo. */
(function(){
'use strict';
const KEY='dealer_precios';
const DEF={
  tc:18,          // tipo de cambio (MXN por dólar)
  red:50,         // (viejo) múltiplo del redondeo; ahora manda "redondeo"
  redondeo:'',    // cómo se redondea: ver REDONDEOS ('' = el de siempre de la tienda, a $50 al más cercano)
  margenOtras:60, // margen % para marcas que no están en la lista
  anticipo:30,    // % de las prendas que se paga para apartar (el envío va aparte)
  envioMty:100,   // envío en Monterrey y área metropolitana
  envioNac:150,   // envío nacional
  gratisMas:3000, // envío gratis en compras MAYORES a esta cantidad
  // [marca, multiplicador]; margen 65 % = ×1.65; vacío (null) = variable: se pide cada vez
  marcas:[['Gymshark',1.65],['Controlled Insanity',1.65],['YoungLA',1.6],['DFYNE',1.6],['Darc Sport',1.6],['Civil Régime',1.6],['AYBL',1.6],['Breathedivinity',null]]
};
/* Opciones de redondeo: [código, paso, hacia dónde, texto] */
const REDONDEOS=[
  ['90',10,'noventa','Que termine en 90, hacia abajo ($1,010 → $990 · $1,310 → $1,290)'],
  ['10a',10,'arriba','A la decena, hacia arriba ($1,152 → $1,160)'],
  ['50a',50,'arriba','A $50, hacia arriba ($1,152 → $1,200)'],
  ['50c',50,'cercano','A $50, al más cercano: hacia abajo o hacia arriba, lo que quede más cerca ($1,120 → $1,100 · $1,130 → $1,150)'],
  ['100a',100,'arriba','A $100, hacia arriba ($1,152 → $1,200)'],
  ['1',1,'cercano','Sin redondeo']
];
const n=v=>{ const x=parseFloat(String(v==null?'':v).replace(/[^0-9.\-]/g,'')); return isFinite(x)?x:0; };
const has=v=>v!=null&&String(v).trim()!=='';
// "Civil Régime" = "Civil Regime" y "Breathedivinity" = "Breathe Divinity"
const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,'').toLowerCase();

// el redondeo elegido; si no hay, el que ya tenía la tienda (red: 50 → a $50 al más cercano)
function modo(c){ const r=REDONDEOS.find(x=>x[0]===String(c.redondeo)); if(r) return r;
  const v=n(c.red)||50; return REDONDEOS.find(x=>x[2]==='cercano'&&x[1]===v)||['',v,'cercano','']; }
function cargar(){
  let c={}; try{ c=JSON.parse(localStorage.getItem(KEY)||'{}')||{}; }catch(e){}
  const o=Object.assign({},DEF,c);
  if(!Array.isArray(o.marcas)||!o.marcas.length) o.marcas=DEF.marcas.map(x=>x.slice());
  let cambio=false;
  const viejo=k=>{ try{ return JSON.parse(localStorage.getItem(k)||'null')||{}; }catch(e){ return {}; } };
  // la primera vez: "otras marcas" con el margen que ya usaba el Catálogo
  if(c.margenOtras==null){ const a=viejo('catalogo_db_ajustes'); if(n(a.margen)>0) o.margenOtras=n(a.margen); cambio=true; }
  // la primera vez: los precios de la tienda se quedan con los ajustes de hoy (no cambian hasta que recalcules)
  if(!o.tienda||!(n(o.tienda.tc)>0)){ o.tienda=foto(o,''); cambio=true; }
  // la primera vez: el redondeo que tenías en Historias pasa a ser el de todos (la tienda sigue igual hasta que recalcules)
  if(c.redondeo==null){ const h=viejo('historias_ajustes'); o.redondeo={90:'90',10:'10a',50:'50a',100:'100a',1:'1'}[n(h.red)]||'50c'; cambio=true; }
  // 29 oct 2026: envío Monterrey y área metropolitana $100, resto de México $150 (una sola vez; luego lo cambias en Cotizador › Ajustes)
  if(!c.envio2026){ o.envioMty=100; o.envioNac=150; o.envio2026=1; cambio=true; }
  if(cambio) guardar(o);
  return o;
}
function guardar(c){ try{ localStorage.setItem(KEY,JSON.stringify(c)); return true; }catch(e){ return false; } }
// copia de los ajustes que deciden el precio (la que usa la tienda)
function foto(c,fecha){ const m=modo(c); return {tc:n(c.tc),marcas:c.marcas.map(x=>x.slice()),redondeo:m[0]||'',red:m[1],margenOtras:n(c.margenOtras),fecha:fecha||''}; }
// ajustes con los que están calculados los precios de la tienda
function tiendaCfg(c){ c=c||cargar(); return Object.assign({},c,c.tienda); }
// redondeo: "termina en 90" baja al anterior que termina en 90; "arriba" sube al múltiplo; "cercano" al más cercano (justo a la mitad, hacia arriba)
function redondear(x,c){ c=c||cargar(); const m=modo(c), r=m[1]||1, v=Math.round(n(x)*100)/100; if(!v) return 0;
  if(m[2]==='noventa') return Math.max(90,Math.floor((v+10)/100)*100-10);
  if(m[2]==='arriba') return Math.ceil(v/r-1e-9)*r;
  return Math.floor(v/r+0.5+1e-9)*r; }
// siempre hacia abajo (precios con descuento)
function redondearAbajo(x,c){ c=c||cargar(); const m=modo(c), r=m[1]||1, v=Math.round(n(x)*100)/100; if(!v) return 0;
  if(m[2]==='noventa') return Math.max(90,Math.floor((v+10)/100)*100-10);
  return Math.floor(v/r+1e-9)*r; }
function marca(m,c){
  c=c||cargar(); const k=norm(m); if(!k) return null;
  const x=c.marcas.find(e=>norm(e[0])===k); if(!x) return null;
  const variable=x[1]==null||x[1]===''||!(n(x[1])>0);
  return {nombre:x[0],mult:variable?null:n(x[1]),variable};
}
// multiplicador de una marca; si no está en la lista, el margen de "otras marcas"
function multMarca(m,c){ c=c||cargar(); const mb=marca(m,c); return mb?(mb.mult||0):1+n(c.margenOtras)/100; }
// precio = USD × multiplicador × tipo de cambio, redondeado
function calcular(usd,m,multManual,c){
  c=c||cargar(); const mb=marca(m,c);
  const mult=n(multManual)>0?n(multManual):(mb&&mb.mult)||0;
  const crudo=Math.round(n(usd)*mult*n(c.tc)*100)/100;
  return {mult,crudo,precio:mult&&n(usd)?redondear(crudo,c):0,variable:!!(mb&&mb.variable),conocida:!!mb};
}
// precio de una prenda del Catálogo (sin el precio a mano): su multiplicador, o el de su marca, o su margen viejo / el de otras marcas
function precioProducto(p,c){
  c=c||tiendaCfg(); const usd=n(p.costoUsd); let m=n(p.mult);
  if(!(m>0)){ const mb=marca(p.marca,c); m=mb?(mb.mult||0):1+(has(p.margen)?n(p.margen):n(c.margenOtras))/100; }
  return usd&&m?redondear(usd*m*n(c.tc),c):0;
}
// anticipo: al múltiplo más cercano del paso del redondeo (igual que en la tienda)
function anticipo(prendas,c){ c=c||cargar(); const r=modo(c)[1]||1, v=n(prendas)*n(c.anticipo)/100; return Math.floor(v/r+0.5+1e-9)*r; }
function envio(prendas,destino,c){ c=c||cargar(); if(n(prendas)>n(c.gratisMas)) return 0; return destino==='nacional'?n(c.envioNac):n(c.envioMty); }
// descuentos por sección (Cotizador › Ajustes): solo los activos, con su %, marca ('' = todas) y fecha de fin ('' = sin fin)
function descuentos(c){ const d=(c||cargar()).descuentos||{}, out={};
  ['pedido','preventa','inmediata'].forEach(k=>{ const x=d[k]; if(x&&x.on&&n(x.pct)>0&&n(x.pct)<100) out[k]={on:true,pct:n(x.pct),marca:String(x.marca||''),fin:String(x.fin||'')}; });
  return out; }
// lo que se manda a la tienda al publicar (sin multiplicadores ni costos); el redondeo es el de los precios de la tienda
function paraTienda(c){ c=c||cargar(); const t=tiendaCfg(c), m=modo(t);
  return {red:m[1]||1,redondeo:m[0]||'',anticipo:n(c.anticipo),envioMty:n(c.envioMty),envioNac:n(c.envioNac),gratisMas:n(c.gratisMas),descuentos:descuentos(c)}; }

window.PRECIOS={KEY,DEF,REDONDEOS,n,norm,cargar,guardar,foto,tiendaCfg,redondear,redondearAbajo,marca,multMarca,calcular,precioProducto,anticipo,envio,paraTienda};
})();
