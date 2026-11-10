export const jewelryColumns=['modelo','colecao','genero','quantidade','custo','total','preco','situacao'] as const;
export type JewelryColumn=typeof jewelryColumns[number];
export type JewelryPreferences={query:string;status:string;sort:string;view:string;density:string;page:number;columns:JewelryColumn[];hidden:JewelryColumn[]};
export const defaultJewelryPreferences:JewelryPreferences={query:'',status:'todas',sort:'recentes',view:'tabela',density:'confortavel',page:1,columns:[...jewelryColumns],hidden:[]};
export function readJewelryPreferences(search:string):JewelryPreferences{
 const p=new URLSearchParams(search);const choices=(key:string,allowed:string[],fallback:string)=>allowed.includes(p.get(key)??'')?p.get(key)!:fallback;
 const ordered=(p.get('colunas')??'').split(',').filter((x):x is JewelryColumn=>jewelryColumns.includes(x as JewelryColumn));
 const page=Number(p.get('pagina')??1);
 return {query:(p.get('q')??'').slice(0,200),status:choices('situacao',['todas','publicadas','sem_colecao','sem_preco','sem_foto'],'todas'),sort:choices('ordem',['recentes','nome','quantidade'],'recentes'),view:choices('visao',['tabela','grade'],'tabela'),density:choices('densidade',['compacta','confortavel'],'confortavel'),page:Number.isSafeInteger(page)&&page>0?page:1,columns:[...new Set([...ordered,...jewelryColumns])],hidden:(p.get('ocultas')??'').split(',').filter((x):x is JewelryColumn=>jewelryColumns.includes(x as JewelryColumn))};
}
export function writeJewelryPreferences(value:JewelryPreferences,search=''){
 const p=new URLSearchParams(search);
 for(const [k,v] of Object.entries({q:value.query,situacao:value.status,ordem:value.sort,visao:value.view,densidade:value.density,pagina:String(value.page),colunas:value.columns.join(','),ocultas:value.hidden.join(',')})){if(v)p.set(k,v);else p.delete(k);}
 return p.toString();
}
