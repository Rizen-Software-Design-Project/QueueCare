const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const app = express();
app.use(express.json());
app.use(cors({ origin: true }));

const supabase = createClient(
  process.env.SB_URL,
  process.env.SB_KEY
);

app.get("/validate", async(req, res) => {
    const id= req.query.id;
    const sex=req.query.sex;
    const date=req.query.date;
    try{
    if(date.slice(2,4)!=id.slice(0,2)|| date.slice(5,7)!=id.slice(2,4)|| date.slice(8,10)!=id.slice(4,6)){
        return res.status(200).json({valid:false, reason:"date of birth not valid"});
    }
    if(sex=="female"){
        if(Number(id.slice(6,10))<=0 || Number(id.slice(6,10))>=4999){
                return res.status(200).json({valid:false, reason:"sex is not valid."});
        }
    }
    if(sex=="male"){
        if(Number(id.slice(6,10))<=5000 || Number(id.slice(6,10))>=9000){
                return res.status(200).json({valid:false , reason:"male not valid"});
        }
    }
    if(id[10]!=0){
         return res.status(200).json({valid:false, reason:"not a citizen"});
    }

    let sum=0;
    let double=false;
    for(let i=0;i<12;i++){
        if(i%2===0){
            sum+=Number(id[i]);
        }else{
            let product=Number(id[i])*2;
            if(product>9) product-=9;
            sum+=product;
        }
        double=!double;
    }

    if((10-sum%10)%10!=Number(id[12])){
                 return res.status(200).json({valid:false, reason:"luhn checksum says so"});
    }
    return res.status(200).json({valid:true});

    }catch(error){
        console.log(error.message);
        res.status(500).json({error:error.message});
    }
});

app.get('/id_exists',async(req,res)=>{
    const id= req.query.id;
    try{
    const {data, error}= await supabase.from("profiles").select('*').eq('id',id);
    if(data.length==0){
        return res.status(200).json({exists:false});
    }
    if(data.length==1){
        return res.status(200).json({exists:true});
    }
    console.log(error);
    return res.status(200).json({exists:false});
    }catch(error){
        return res.status(500).json({error:error.message});
    }
});

app.get('/create_profile',async(req,res)=>{
    const name= req.query.name;
    const surname=req.query.surname;
    const id= req.query.id;
    const dob=req.query.dob;
    const phonenumber=req.query.phonenumber;
    const email=req.query.email;
    const sex= req.query.sex;
    try{
        const { data, error } = await supabase.from('profiles').insert({ name, surname, id, dob, phonenumber, sex, email, role: "patient" });
        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json({ success: true });
    }catch(error){
        res.status(500).json({error:error.message});
    }
});

app.post("/otp",async(req,res)=>{
    const {phonenumber,email}=req.body;
    try{
        const {error} = await supabase.from("profiles").update({phonenumber:phonenumber}).eq('email',email);
        if (error) return res.status(400).json({ error: error.message });
        return res.status(200).json({success:true});
    }catch(error){
        res.status(500).json({error:error.message});
    }
});

app.get('/isnewuser', async (req, res) => {
    const identity = req.query.identity;
    try {
        let data;
        if (identity.includes('@')) {
            const result = await supabase.from('profiles').select('*').eq('email', identity);
            data = result.data;
        } else {
            const result = await supabase.from('profiles').select('*').eq('phonenumber', identity);
            data = result.data;
        }
        if (data.length == 0) {
            return res.status(200).json({ exists: false });
        } else {
            return res.status(200).json({ exists: true });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

exports.api = functions.https.onRequest(app);