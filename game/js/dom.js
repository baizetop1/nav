// Battle clocks must not replace the button under a finger or reset keyboard focus.
// Only reconcile our own escaped render output; no third-party HTML is accepted.
export function patchElement(current,next){
  if(current.nodeType!==next.nodeType||(current.nodeType===1&&(current.tagName!==next.tagName||current.getAttribute('data-command')!==next.getAttribute('data-command')||current.getAttribute('data-unit')!==next.getAttribute('data-unit')))){
    current.replaceWith(next.cloneNode(true));return;
  }
  if(current.nodeType!==1){if(current.nodeValue!==next.nodeValue)current.nodeValue=next.nodeValue;return;}
  for(const a of [...current.attributes])if(!next.hasAttribute(a.name))current.removeAttribute(a.name);
  for(const a of [...next.attributes])if(current.getAttribute(a.name)!==a.value)current.setAttribute(a.name,a.value);
  let i=0;
  while(i<next.childNodes.length){if(current.childNodes[i])patchElement(current.childNodes[i],next.childNodes[i]);else current.append(next.childNodes[i].cloneNode(true));i++;}
  while(current.childNodes.length>next.childNodes.length)current.lastChild.remove();
}
