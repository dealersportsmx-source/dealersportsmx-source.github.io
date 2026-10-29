/* Precios DEALER SPORTS MX: tipo de cambio, multiplicador por marca, redondeo, anticipo y envíos.
   Se guardan en este aparato. Los usan el Cotizador y el Catálogo, y el Catálogo se los pasa a la
   tienda cuando das "Publicar tienda". Se cambian en Cotizador › Ajustes (sin tocar código). */
(function(){
'use strict';
const KEY='dealer_precios';
const DEF={
  tc:18,          // tipo de cambio (MXN por dólar)
  red:50,         // redondear al múltiplo de $50 más cercano (justo a la mitad, hacia arriba)
  anticipo:30,    // % de las prendas que se paga para apartar (el envío va aparte)
  envioMty:100,   // envío en Monterrey y área metropolitana
  envioNac:150,   // envío nacional
  gratisMas:3000, // envío gratis en compras MAYORES a esta cantidad
  // [marca, multiplicador]; vacío (null) = variable: se pide cada vez
  marcas:[['Gymshark',1.65],['Controlled Insanity',1.65],['YoungLA',1.6],['DFYNE',1.6],['Darc Sport',1.6],['Civil Régime',1.6],['AYBL',1.6],['Breathedivinity',null]]
};
const n=v=>{ const x=parseFloat(String(v==null?'':v).replace(/[^0-9.\-]/g,'')); return isFinite(x)?x:0; };
// "Civil Régime" = "Civil Regime" y "Breathedivinity" = "Breathe Divinity"
const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,'').toLowerCase();

function cargar(){
  let c={}; try{ c=JSON.parse(localStorage.getItem(KEY)||'{}')||{}; }catch(e){}
  const o=Object.assign({},DEF,c);
  if(!Array.isArray(o.marcas)||!o.marcas.length) o.marcas=DEF.marcas.map(x=>x.slice());
  return o;
}
function guardar(c){ try{ localStorage.setItem(KEY,JSON.stringify(c)); return true; }catch(e){ return false; } }
// al múltiplo más cercano; si queda justo a la mitad, hacia arriba
function redondear(x,c){ c=c||cargar(); const r=n(c.red)||1; const v=Math.round(n(x)*100)/100; return Math.floor(v/r+0.5+1e-9)*r; }
function marca(m,c){
  c=c||cargar(); const k=norm(m); if(!k) return null;
  const x=c.marcas.find(e=>norm(e[0])===k); if(!x) return null;
  const variable=x[1]==null||x[1]===''||!(n(x[1])>0);
  return {nombre:x[0],mult:variable?null:n(x[1]),variable};
}
// precio = USD × multiplicador × tipo de cambio, redondeado
function calcular(usd,m,multManual,c){
  c=c||cargar(); const mb=marca(m,c);
  const mult=n(multManual)>0?n(multManual):(mb&&mb.mult)||0;
  const crudo=Math.round(n(usd)*mult*n(c.tc)*100)/100;
  return {mult,crudo,precio:mult&&n(usd)?redondear(crudo,c):0,variable:!!(mb&&mb.variable),conocida:!!mb};
}
function anticipo(prendas,c){ c=c||cargar(); return redondear(n(prendas)*n(c.anticipo)/100,c); }
function envio(prendas,destino,c){ c=c||cargar(); if(n(prendas)>n(c.gratisMas)) return 0; return destino==='nacional'?n(c.envioNac):n(c.envioMty); }
// lo que se manda a la tienda al publicar (sin multiplicadores ni costos)
function paraTienda(c){ c=c||cargar(); return {red:n(c.red),anticipo:n(c.anticipo),envioMty:n(c.envioMty),envioNac:n(c.envioNac),gratisMas:n(c.gratisMas)}; }

window.PRECIOS={KEY,DEF,n,norm,cargar,guardar,redondear,marca,calcular,anticipo,envio,paraTienda};
})();
