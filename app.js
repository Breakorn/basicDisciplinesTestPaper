const express = require('express');
const puppeteer = require("puppeteer");
const app = express();
const port = 3000;
console.log(`ss1`);

// 3. 配置中间件，用于解析 JSON 格式的请求体
app.use(express.json());

// 4. 配置中间件，用于解析 URL-encoded 格式的请求体（如传统表单提交）
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.json({ 
    message: 'Hello World with SSL!',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    service: 'Node.js Express API',
    environment: process.env.NODE_ENV || 'development'
  });
});
app.post('/api/math/generate', async (req, res) => {
    const { row, col, pdfPage, school, needReduce, range } = req.body;
    
    if(!school){
        return res.status(400).json({ error: '学校名称不能为空' });
    }
    let browserr = null
    try{
      let [pdfBuffer,browser] = await genereatePdf({ row, col, pdfPage, school, needReduce, range })

      browserr = browser
      // 设置响应头，告诉客户端返回的是PDF文件流
      res.setHeader('Content-Type', 'application/pdf');
      // 可选：指定下载时的文件名
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Content-Disposition', 'inline; filename="document.pdf"');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // 将PDF缓冲区作为响应体发送
      res.write(pdfBuffer);
      res.end();
    }catch(err){
      console.log(`err`,err);
      
      return res.status(400).json({ error: '解析失败' });
    }finally{
      if(browserr){
       await browserr.close()
      }
    }
})
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${port}`);
});




const genereatePdf = async ({ row = 14, col = 9, pdfPage = 1, school, needReduce = false, range = [0,5] })=>{
  // 启动浏览器
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  const mathCollect = []
  const mathReduce = []

  if(!range){
    range = [0,5]
  }
  for(let x = range[0];x < range[1];x++){
    for(let y = range[0];y < range[1];y++){
        mathCollect.push([x,y,1])
        if(x!==y){
            mathCollect.push([y,x,1])
        }
        if(needReduce){
            if(x>y){
                mathReduce.push([x,y,0])
            }
        }
    }
  }



  let str = ""
  const colect = [...mathCollect,...mathReduce]

  for(let index = 0;index < row * col * pdfPage;index++){
    const arr = colect[Math.floor(Math.random() * colect.length)]
    str+= `<div style="width:calc(100% / ${col});height:calc(100% / ${row});text-align: center;"><span style="display:inline-block;width:20px">${arr[0]}</span> ${arr[2]===1?"+":"-"} <span style="display:inline-block;width:20px">${arr[1]}</span> = </div>`
  }


  const htmlContent = `<!DOCTYPE html><html  style="height:100%"><body  style="height:100%"><div style="display: flex;flex-wrap: wrap;height:100%">${str}</div></body></html>`;
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

  
  // 生成PDF
  const pdfBuffer = await page.pdf({
    displayHeaderFooter:true,
    headerTemplate: `
    <div style="width:100%;padding-bottom:4px;font-size: 12px; color: #666;margin:0 40px; text-align: center; width: 100%;display:flex;justify-content:space-around;border-bottom:2px solid gray">
        <div style="margin-rigit:20px"><span style="margin-right:40px">${school}</span><span style="margin-right:40px">班级</span><span style="margin-right:40px">日期</span></div>
        
        <div style="margin-rigit:20px"><span style="margin-right:40px">${school}</span> <span style="margin-right:40px">班级</span><span style="margin-right:40px">日期</span></div>
    </div>`,
    footerTemplate:"<div></div>",
    landscape: true,  
    // path: 'report2.pdf',
    format: 'A4',
    margin: {
      top: '50px',    // 为页眉留出空间
      bottom: '50px', // 为页脚留出空间
      left: '10px',
      right: '10px'
    },
    printBackground: true // 打印背景图像/颜色
  });
  // await browser.close();
  return [pdfBuffer,browser]
}