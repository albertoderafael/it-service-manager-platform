import sys,glob
from PIL import Image
files=sorted(glob.glob(sys.argv[1]))
start=int(sys.argv[3]) if len(sys.argv)>3 else 0
files=files[start:start+12]
ims=[Image.open(f) for f in files]
w,h=ims[0].size; cols=4; rows=(len(ims)+cols-1)//cols
M=Image.new('RGB',(cols*w,rows*h),'white')
for i,im in enumerate(ims): M.paste(im,((i%cols)*w,(i//cols)*h))
M.save(sys.argv[2])
