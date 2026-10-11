const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const workPanels=(label,panels)=>'<div data-screen-deck="'+esc(label)+'">'+panels.filter(([,html])=>html).map(([name,html])=>'<section data-screen-choice="'+esc(name)+'" data-screen-label="'+esc(name)+'">'+html+'</section>').join('')+'</div>';
