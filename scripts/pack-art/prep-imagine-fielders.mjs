// One-off: Imagine fielder JPEGs (lime bg + grid) -> art-src PNGs on pure #00FF00 key.
// Usage: node scripts/pack-art/prep-imagine-fielders.mjs "/tmp/f-{n}.jpg"
import sharp from 'sharp'
for (const n of ['idle','chase','catch']) {
  const { data: d, info: { width: w, height: h } } = await sharp(process.argv[2].replace("{n}", n)).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const lime = (i) => { const r=d[i],g=d[i+1],b=d[i+2]; return g>150 && g>r+25 && g>b+50 }
  // grid lines: rows/cols where >60% of pixels are non-lime AND dark-ish, adjacent to lime
  const isLine = (i) => !lime(i) && (d[i]+d[i+1]+d[i+2] < 300 || Math.min(d[i],d[i+1],d[i+2]) > 190)
  const rows=[], cols=[]
  for (let y=0;y<h;y++){let c=0;for(let x=0;x<w;x++)if(isLine((y*w+x)*3))c++;if(c>0.6*w)rows.push(y)}
  for (let x=0;x<w;x++){let c=0;for(let y=0;y<h;y++)if(isLine((y*w+x)*3))c++;if(c>0.6*h)cols.push(x)}
  const paint=(i)=>{d[i]=0;d[i+1]=255;d[i+2]=0}
  for (let p=0;p<w*h;p++) if (lime(p*3)) paint(p*3)
  const pad=3
  for (const y of rows) for(let yy=Math.max(0,y-pad);yy<=Math.min(h-1,y+pad);yy++) for(let x=0;x<w;x++) paint((yy*w+x)*3)
  for (const x of cols) for(let xx=Math.max(0,x-pad);xx<=Math.min(w-1,x+pad);xx++) for(let y=0;y<h;y++) paint((y*w+xx)*3)
  await sharp(d,{raw:{width:w,height:h,channels:3}}).png().toFile(`art-src/fielders/fielder-${n}.png`)
  console.log(n,w,h,'gridRows',rows.length,'gridCols',cols.length)
}
