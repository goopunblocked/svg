"""Build the portable Goop HTML and SVG from the same sources, using Python 3."""
from pathlib import Path
from xml.sax.saxutils import unescape
from html import escape
import base64
import json
import re
from xml.etree import ElementTree

root = Path(__file__).resolve().parents[1]
app = root / 'app'

def read(name):
    return (app / name).read_text(encoding='utf-8')

def insert(source, marker, replacement):
    if source.count(marker) != 1:
        raise ValueError('Missing or duplicate build marker: ' + marker)
    return source.replace(marker, replacement)

tabs = insert(read('tabs.js'), '/* WEB PANE */', read('web-pane.js'))
youtube = read('youtube.js')
home = insert(read('home.js'), '/* WEB TABS */', tabs)
home = insert(home, '/* YOUTUBE GUARD */', youtube)
fallback = insert(read('nosw.html'), '/* YOUTUBE GUARD */', youtube)
(root / 'site' / 'nosw.html').write_text(fallback, encoding='utf-8')
home = insert(home, '/* PLAYER FEATURES */', read('features.js'))
ai = read('ai.js')
for marker, file, mime in [('GOOP_RUNTIME_JS','wllama.js','text/javascript'),('GOOP_RUNTIME_WASM','wllama.wasm','application/wasm')]:
    data = (root / 'site' / 'ai' / 'runtime' / file).read_bytes()
    ai = insert(ai, marker, 'data:' + mime + ';base64,' + base64.b64encode(data).decode('ascii'))
script = '\n;\n'.join(['window.goopPrograms=Object.create(null);', (root / 'site' / 'goop-config.js').read_text(), read('account.js'), home, ai,
                     *(read(name + '.js') for name in ['chat','2048','snake','tic-tac-toe','router'])])
shell = insert(read('shell.html'), '/* PLAYER CSS */', read('player.css'))
license_text = unescape(read('svg-license.xml').split('<metadata>', 1)[1].split('</metadata>', 1)[0])
shell = shell.replace('</body>', '<template id="assetLicenses"><pre>' + escape(license_text) + '</pre></template></body>')
html = insert(shell, '<!-- APP -->', '<script>\n' + re.sub('</script', r'<\\/script', script, flags=re.I) + '\n</script>')
(root / 'index.html').write_text(html, encoding='utf-8')
# Package the native UI in the SVG. The isolated web runtime is used only in a browsing frame.
bootstrap = """
if(location.hash==='#web-runtime-v1'){
  window.addEventListener('DOMContentLoaded',startGoopBrowser,{once:true});
}else{
  window.addEventListener('DOMContentLoaded',()=>{
    const tree=new DOMParser().parseFromString(SHELL,'text/html');
    document.replaceChild(document.importNode(tree.documentElement,true),document.documentElement);
    document.createElement=(name,options)=>document.createElementNS('http://www.w3.org/1999/xhtml',name,options);
    const program=document.createElement('script');program.textContent=PROGRAM;
    document.body.append(program);program.remove();
  },{once:true});
}
"""
bootstrap = bootstrap.replace('SHELL,', json.dumps(shell, ensure_ascii=True) + ',', 1).replace('=PROGRAM;', '=' + json.dumps(script, ensure_ascii=True) + ';', 1)
source = insert(read('runtime.js'), '/* YOUTUBE GUARD */', youtube) + '\n' + bootstrap
svg = read('svg-license.xml') + '<script><![CDATA[' + source.replace(']]>', ']]]]><![CDATA[>') + ']]></script></svg>\n'
ElementTree.fromstring(svg)
(root / 'index.svg').write_text(svg, encoding='utf-8')

for filename in ('index.html','index.svg'):
    (root / 'site' / filename).write_bytes((root / filename).read_bytes())
