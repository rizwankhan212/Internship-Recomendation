import express from 'express';

const app = express();

app.listen(8080,()=>{
    console.log('app is listening on 8080')
});

app.get('/',(req,res)=>{
    res.send('HI');
});
