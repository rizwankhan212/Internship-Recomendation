import express from 'express';
import cors from "cors"

const app = express();
app.use(express.json());

app.use(cors({
    origin: "http://localhost:5173"
}));

app.listen(8080,()=>{
    console.log('app is listening on 8080')
});

app.get('/',(req,res)=>{
    res.send('HI');
});

app.post('/candidate/register',(req,res)=>{
    console.log(req.body);
});
