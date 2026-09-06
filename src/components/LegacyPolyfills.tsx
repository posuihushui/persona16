/**
 * 老内核补丁。
 *
 * 兼容基线是 Chrome 70 / iOS 12（见 .browserslistrc），我们自己的代码会被
 * 编译到那个水位，但 Next.js 运行时和 React 里仍有少量更新的内置方法。
 * 目前实际会踩到的是 Array.prototype.at，Next 的客户端路由用它解析
 * redirect 的 digest，缺了会在跳转时抛 TypeError。
 *
 * 内联在 head 里同步执行，不额外发请求。全部是特性检测后再补，
 * 新内核上什么都不做。
 */
const POLYFILL = `(function(){
try{
var A=Array.prototype,S=String.prototype;
function at(n){
  var o=Object(this),l=o.length>>>0;
  n=Math.trunc(n)||0; if(n<0)n+=l;
  if(n<0||n>=l)return undefined;
  return o[n];
}
if(!A.at)Object.defineProperty(A,'at',{value:at,writable:true,configurable:true});
if(!S.at)Object.defineProperty(S,'at',{value:at,writable:true,configurable:true});
if(!Object.hasOwn)Object.defineProperty(Object,'hasOwn',{value:function(o,k){
  return Object.prototype.hasOwnProperty.call(Object(o),k);
},writable:true,configurable:true});
if(!S.replaceAll)Object.defineProperty(S,'replaceAll',{value:function(s,r){
  if(Object.prototype.toString.call(s)==='[object RegExp]')return this.replace(s,r);
  return this.split(s).join(r);
},writable:true,configurable:true});
if(typeof Promise!=='undefined'&&!Promise.allSettled)Promise.allSettled=function(ps){
  return Promise.all(Array.prototype.map.call(ps,function(p){
    return Promise.resolve(p).then(function(v){return{status:'fulfilled',value:v}},
      function(e){return{status:'rejected',reason:e}});
  }));
};
}catch(e){}
})();`;

export function LegacyPolyfills() {
  return (
    <script
      // 固定的字符串常量，不含任何用户输入
      dangerouslySetInnerHTML={{ __html: POLYFILL }}
    />
  );
}
