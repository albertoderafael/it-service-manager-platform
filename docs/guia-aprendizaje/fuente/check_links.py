from pypdf import PdfReader
import sys,re,collections
r=PdfReader(sys.argv[1])
# named destinations
names=set(r.named_destinations.keys())
links=[]; 
for pi,p in enumerate(r.pages):
    for a in p.get('/Annots') or []:
        a=a.get_object()
        if a.get('/Subtype')!='/Link': continue
        d=None
        if '/Dest' in a: d=a['/Dest']
        elif '/A' in a:
            A=a['/A']; d=A.get('/D') or A.get('/URI')
        links.append((pi+1,str(d)))
missing=[l for l in links if l[1] not in names and not l[1].startswith('http')]
print('pages',len(r.pages),'links',len(links),'named',len(names),'missing',len(missing))
for m in missing[:20]: print(m)
targets=collections.Counter(d for _,d in links)
toc=[n for n in names if n.startswith('toc-')]
# each toc entry should be linked to (back link) and its target linked from toc
noback=[n for n in toc if targets[n]==0]
print('toc entries',len(toc),'without back link',noback[:10])
ej=[n for n in names if n.startswith(('ej-','sol-','auto-','resp-'))]
print('ex/sol anchors',len(ej),'unlinked',[n for n in ej if targets[n]==0])
