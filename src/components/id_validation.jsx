import { useState } from "react"


export default function Validate(){
    const[id,set_id]=useState("");
    const[foreign,set_foreign]=useState(false);
    const[citizen,set_citizen]=useState(false);
    const[sex,set_sex]=useState("");
    const[dob,set_dob]=useState("");


   async function validate(e){
    e.preventDefault();
    console.log("hi");
        try{
      const res = await fetch(
 `http://localhost:3000/validate_citizen?id=${id}&sex=${sex}&date=${dob}`
);
const data= await res.json();
console.log(data);

    }catch(error){
        console.log(error);
    }

    }
   

    return(
        <section style={{display:"flex", flexDirection:"column"}}>
{/**/}
            <p>Are you South African or foreign. (Change this. I just want to make sure this functions)</p>
            <label><input type="checkbox" checked={citizen} onChange={() => { set_citizen(true); set_foreign(false); }}/> South African</label>
<label><input type="checkbox" checked={foreign} onChange={() => { set_foreign(true); set_citizen(false); }}/> Foreign national</label>
<p>Just going to assume user is citizen for now</p>
                <form onSubmit={validate}>
                    <label>id:</label>
                    <input type="text" value={id} onChange={(e)=>set_id(e.target.value)} required/>
                    <label>sex:</label>
                    <input type="text" value={sex} onChange={(e)=>set_sex(e.target.value)} required/>
                    <label>Date of birth:</label>
                      <input type="text" value={dob} onChange={(e)=>set_dob(e.target.value)} required/>

                <button type="submit">continue</button>
                </form>


        </section>
    )
}