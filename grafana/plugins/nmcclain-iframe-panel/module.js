/* [create-plugin] version: 5.0.0 */
define(["@emotion/css","@grafana/data","@grafana/runtime","@grafana/ui","module","react"],((e,r,t,a,n,i)=>(()=>{"use strict";var o={89:r=>{r.exports=e},781:e=>{e.exports=r},531:e=>{e.exports=t},7:e=>{e.exports=a},308:e=>{e.exports=n},959:e=>{e.exports=i}},s={};function l(e){var r=s[e];if(void 0!==r)return r.exports;var t=s[e]={exports:{}};return o[e](t,t.exports,l),t.exports}l.n=e=>{var r=e&&e.__esModule?()=>e.default:()=>e;return l.d(r,{a:r}),r},l.d=(e,r)=>{for(var t in r)l.o(r,t)&&!l.o(e,t)&&Object.defineProperty(e,t,{enumerable:!0,get:r[t]})},l.o=(e,r)=>Object.prototype.hasOwnProperty.call(e,r),l.r=e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},l.p="public/plugins/nmcclain-iframe-panel/";var c={};l.r(c),l.d(c,{plugin:()=>x});var p=l(308),u=l.n(p);l.p=u()&&u().uri?u().uri.slice(0,u().uri.lastIndexOf("/")+1):"public/plugins/nmcclain-iframe-panel/";var d=l(781),m=l(959),f=l.n(m),v=l(531),h=l(89),b=l(7);const g=()=>({wrapper:h.css`
      font-family: Open Sans, sans-serif;
      overflow: hidden;
      position: relative;
    `,iframe:h.css`
      position: absolute;
      overflow: hidden;
      top: 0;
      left: 0;
      frameborder: 0;
      display: block;
      transform-origin: 0 0;
      allow: 'accelerometer; encrypted-media;' allowfullscreen;
    `}),x=new d.PanelPlugin((({options:e,width:r,height:t,replaceVariables:a})=>{const n=(0,b.useStyles2)(g),[i,o]=(0,m.useState)(!1),s=(0,m.useRef)(null);if((0,m.useEffect)((()=>(o(!0),s.current&&clearTimeout(s.current),s.current=setTimeout((()=>{o(!1)}),100),()=>{s.current&&clearTimeout(s.current)})),[r,t]),!e||!e.src)return f().createElement("div",{className:n.wrapper},f().createElement("div",null,"Please provide a source URL for the IFrame."));const l=e.scaleFactor||1,c=r*(1/l),p=t*(1/l);let u=a(e.src);const d=(e=>{const r=e.split("/");return r.length>=3?r[2]:""})(v.locationService.getLocation().pathname);return u=(0,v.getTemplateSrv)().replace(u,{iframe_dbid:{value:d}}),f().createElement("div",{className:(0,h.cx)(n.wrapper,h.css`
          width: ${r}px;
          height: ${t}px;
        `)},f().createElement("iframe",{title:"IFrame",src:u,className:(0,h.cx)(n.iframe,h.css`
            pointer-events: ${i||e.disableInteractivity?"none":"auto"};
            width: ${c}px;
            height: ${p}px;
            transform: scale(${l});
          `)}))})).setPanelOptions((e=>e.addTextInput({path:"src",name:"Source URL",description:"IFrame Source URL",defaultValue:""}).addNumberInput({path:"scaleFactor",name:"Scale IFrame",description:"Zooms or shrinks the IFrame by this factor",defaultValue:1}).addBooleanSwitch({path:"disableInteractivity",name:"Disable Interactivity",description:"Disables interactivity for the IFrame",defaultValue:!1})));return c})()));
//# sourceMappingURL=module.js.map