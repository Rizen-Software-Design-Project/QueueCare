const express = require("express");
const cors = require("cors");
const app = express();
const fetch = require("node-fetch");
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

app.use(cors());
app.get("/validate", async(req, res) => {
    const id= req.query.id;
    const sex=req.query.sex;
    const date=req.query.date;
    //check if birth is valid
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
        console.log("male not valid");
                return res.status(200).json({valid:false , reason:"male not valid"});



    }
    }

    if(id[10]!=0){
        console.log("not a citizen");
         return res.status(200).json({valid:false, reason:"not a citizen"});

    }


    //now for checksum luhn checksum
    let sum=0;
    let product=1;
    let double=false;
    for(let i=0;i<12;i++){
        if(i%2===0){
            sum+=Number(id[i]);
        }else{
            product=id[i]*2;
            let str=String(product);
            if(str.length==2){
                sum+=Number(str[0])+Number(str[1]);
            }else{
                sum+=product;
            }

        }
        double=!double;
    }

    if((10-sum%10)%10!=Number(id[12])){
        console.log("checksum here.")
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
    //query 
    const {data, error}= await supabase.from("profiles").select('*').eq('id',id);
    //data is an array of objects and check if 
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

//This is to insert the users details

app.get('/create_profile',async(req,res)=>{
    const name= req.query.name;
    const surname=req.query.surname;
    const id= req.query.id;
    const dob=req.query.dob;
    const phonenumber=req.query.phonenumber;
    const email=req.query.email;
    const sex= req.query.sex;
try{
  const { data, error } = await supabase.from('profiles').insert({ name, surname, id, dob, phonenumber, sex, email,role: "patient" });
if (error) return res.status(500).json({ error: error.message });
if (error) console.log(error);
return res.status(200).json({ success: true });
 
}catch(error){
    res.status(500).json({error:error.message});


}
});


app.post("/otp",async(req,res)=>{
    const {phonenumber,email}=req.body;
    try{
    const {data,error} =await supabase.from("profiles").update({phonenumber:phonenumber}).eq('email',email);

if (error) return res.status(400).json({ error: error.message });
return res.status(200).json({Success:true});

}catch(error){
    res.status(500).json({error:error.message});
}
    
});


const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
