import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom";

export default function Validate(){
    let navigate = useNavigate(); 
    const [id, set_id] = useState("");
    const [foreign, set_foreign] = useState(false);
    const [citizen, set_citizen] = useState(false);
    const [sex, set_sex] = useState("");
    const [dob, set_dob] = useState("");
    const [name, set_name] = useState("");
    const [surname, set_surname] = useState("");
    const [phonenumber, set_phone_number] = useState("");
    const [email, set_email] = useState("");
   
   
    useEffect(() => {
        const identity = localStorage.getItem('identity');
        if (!identity.includes('@')) {
            set_phone_number(identity);
        } else {
            set_email(identity);
        }
    }, []);

    async function validate(e){
        e.preventDefault();
        const identity = localStorage.getItem('identity');
        if(citizen){
            try {
                const res = await fetch(
                    `https://api-treupobaqq-uc.a.run.app/validate?id=${id}&sex=${sex}&date=${dob}`
                );
                const data = await res.json();
                console.log(data);
                if(!data.valid){
                    return;
                }
                
            } catch(error) {
                console.log(error);
            }
console.log("I'm here.1");
            try {
                const res2 = await fetch(`https://api-treupobaqq-uc.a.run.app/id_exists?id=${id}`);
                const data1 = await res2.json();
                
                    if(data1.exists){
                        alert("User with this ID already exists.");
                        return;
                    }
                
            } catch (error) {
                console.log(error);
            }
console.log("I'm here.2");
            try {
                const res1 = await fetch(`https://api-treupobaqq-uc.a.run.app/create_profile?name=${name}&surname=${surname}&id=${id}&dob=${dob}&phonenumber=${phonenumber}&email=${email}&sex=${sex}`);
                const data2 = await res1.json();
                console.log("Success yay");
                if(identity.includes("@")){
                navigate("/otp");
            } else {
                navigate("/dashboard");
            }
            } catch (error) {
                console.log(error);
            }

            
        }
    }

    return(
        <section style={{display:"flex", flexDirection:"column"}}>
            <p>Are you South African or foreign. (Change this. I just want to make sure this functions)</p>

            <label><input type="checkbox" checked={citizen} onChange={() => { set_citizen(true); set_foreign(false); }}/> South African</label>
            <label><input type="checkbox" checked={foreign} onChange={() => { set_foreign(true); set_citizen(false); }}/> Foreign national</label>
            <p>Just going to assume user is citizen for now</p>
            <form onSubmit={validate}>
                <label>Name:</label>
                <input type="text" value={name} onChange={(e) => set_name(e.target.value)} required/> {/* ✅ was bound to id */}
                <label>Surname:</label>
                <input type="text" value={surname} onChange={(e) => set_surname(e.target.value)} required/> {/* ✅ was bound to id */}
                <label>id:</label>
                <input type="text" value={id} onChange={(e) => set_id(e.target.value)} required/>
                <label>sex:</label>
                <input type="text" value={sex} onChange={(e) => set_sex(e.target.value)} required/>
                <label>Date of birth:</label>
                <input type="text" value={dob} onChange={(e) => set_dob(e.target.value)} required/>
                <label>Email:</label>
                <input type="text" value={email} onChange={(e) => set_email(e.target.value)} required/>
                <button type="submit">continue</button>
            </form>
        </section>
    )
}