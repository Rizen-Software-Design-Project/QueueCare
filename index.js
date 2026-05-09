require("dotenv").config(); 
const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");


const app = express();

app.use(cors());
app.use(express.json());
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SB_URL,
  process.env.SB_KEY
);


//get staff id

//insert function

async function insert(body){
    console.log("Hi there",body);
    if(body.length!=7){
         return {success:false, error:"I need 7 rows."};
    }

   
    try{
        let{data,error}=await supabase.from("schedule").insert(body).select();
        if(error) throw error;
        return{success:true, data:data};
    }catch(error){
       return {error:error.message, success:false};
    }
}

// must have staff id, day of week and body to update  
async function update(body){
    if(!body.staff_id||!body.day_of_week||!body.body) return {success:false,error:"Missing some fields."}
    
    try{
        let {data,error}= await supabase.from("schedule").update(body.body)
        .eq("staff_id",body.staff_id).eq("day_of_week",body.day_of_week).select();
if(error) throw error;
return {success:true, data};

    }catch(error){
        return {success:false, error:error.message}
    }
}

// delete the all seven rows

async function eliminate(staff_id){
    if(!staff_id) return {success:false, error:"Missing some fields."}
    try{
        let {data,error}= await supabase.from("schedule").delete().eq("staff_id",staff_id);
        if(error)throw error;
        return {success:true};

    }catch(error){
        return {success: false,error:error.message};

    }


}

//now we read but should i put it in like order.. but how though

async function read(staff_id){
    try{
        let {data,error}=await supabase.from("schedule").select("*").eq("staff_id",staff_id);
        if (error) throw error;
        //now i want to at least sort them or create another object and just take in frontend
        const object ={};
        for(let row of data){
            object[row.day_of_week]=row;
        }
        return {success:true, data:object};

    }catch(error){
        return {success:false, error:error.message};
        
    }
    
}


//now for my endpoint

app.get("/get_staff",async(req,res)=>{
     const { staff_id } = req.query;

    if (!staff_id) {
      return res.json({
        success: false,
        error: "staff_id is required"
      });
    }
    try{
        let {data,error}=await supabase.from("schedule").select("*").eq("staff_id",staff_id);
if(error) throw error;
if(data.length==0){
    return res.json({success:true,status:false});
}
return res.json({success:true,status:true});
    }catch(e){
        return res.json({success:false,error:e.message});

    }
});

app.all("/schedule",async(req,res)=>{

    switch(req.method){
        case "GET":{
           const result1=await read(req.query.staff_id);
           return res.json(result1);}
        case "POST":{
            const result2= await insert(req.body);
            return res.json(result2);}
        case "DELETE":{
            const result3=await eliminate(req.query.staff_id);
            return res.json(result3);}
        case "PUT":{
            const result4=await update(req.body);
            return res.json(result4);} 
        default:
        return res.status(405).json({ success: false, error: "Method not allowed" });
    }

});


exports.api = functions.https.onRequest(app);