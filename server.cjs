const http=require('http'),fs=require('fs'),path=require('path');
const root=__dirname;
const types={'.html':'text/html;charset=utf-8','.css':'text/css;charset=utf-8','.js':'text/javascript;charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.pdf':'application/pdf'};
http.createServer((req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]);
  if(p==='/')p='/index.html';
  const fp=path.join(root,p);
  if(!fp.startsWith(root)){res.writeHead(403);return res.end('no');}
  fs.readFile(fp,(e,d)=>{
    if(e){res.writeHead(404);return res.end('404');}
    res.writeHead(200,{'Content-Type':types[path.extname(fp).toLowerCase()]||'application/octet-stream'});
    res.end(d);
  });
}).listen(5174,()=>console.log('up'));
