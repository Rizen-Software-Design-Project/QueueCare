import {useEffect, useRef,useState} from "react"
import {createSchedule,updateDaySchedule,deleteSchedule,getSchedule}from "./api/StaffSchedule.jsx"
import { useLocation, useNavigate } from "react-router-dom";
export default function Availability(){
  const { state } = useLocation();
const Add = useRef();
const clear=useRef();
const update=useRef();
let navigate=useNavigate();
const [schedule,setSchedule]=useState([]);
const days_of_week=["Mon","Tues","Wed","Thurs","Fri","Sat","Sun"];
//in a loop we create the object then we push or append

//or set 7 objects
const [monStart, setMonStart] = useState("");
const [monEnd, setMonEnd] = useState("");
const [monStatus, setMonStatus] = useState("");

const [tueStart, setTueStart] = useState("");
const [tueEnd, setTueEnd] = useState("");
const [tueStatus, setTueStatus] = useState("");

const [wedStart, setWedStart] = useState("");
const [wedEnd, setWedEnd] = useState("");
const [wedStatus, setWedStatus] = useState("");

const [thuStart, setThuStart] = useState("");
const [thuEnd, setThuEnd] = useState("");
const [thuStatus, setThuStatus] = useState("");

const [friStart, setFriStart] = useState("");
const [friEnd, setFriEnd] = useState("");
const [friStatus, setFriStatus] = useState("");

const [satStart, setSatStart] = useState("");
const [satEnd, setSatEnd] = useState("");
const [satStatus, setSatStatus] = useState("");

const [sunStart, setSunStart] = useState("");
const [sunEnd, setSunEnd] = useState("");
const [sunStatus, setSunStatus] = useState("");

const [getTimes, setTimes] = useState({});
const [change, setChange] = useState(0);
 
const staff_id=localStorage.getItem("staff_id");
console.log(staff_id);



  function openadd() {
    Add.current.showModal();
  }

  function closeadd() {
   Add.current.close();
  }

  function openUpdate() {
    update.current.showModal();
  }

  function closeUpdate() {
   update.current.close();
  }

  function openClear() {
    clear.current.showModal();
  }

  function closeClear() {
   clear.current.close();
  }



  async function add_time(e){
    e.preventDefault();

    const my_array=[
  {
    staff_id,
    day_of_week: "Mon",
    start_time: monStart,
    end_time: monEnd,
    appointment_status: monStatus,
    
  },
  {
    staff_id,
    day_of_week: "Tues",
    start_time: tueStart,
    end_time: tueEnd,
    appointment_status: tueStatus,
    
  },
  {
    staff_id,
    day_of_week: "Wed",
    start_time: wedStart,
    end_time: wedEnd,
    appointment_status: wedStatus,
    
    
  },
  {
    staff_id,
    day_of_week: "Thurs",
    start_time: thuStart,
    end_time: thuEnd,
    appointment_status: thuStatus,
    
  },
  {
    staff_id,
    day_of_week: "Fri",
    start_time: friStart,
    end_time: friEnd,
    appointment_status: friStatus,
  },
  {
    staff_id,
    day_of_week: "Sat",
    start_time: satStart,
    end_time: satEnd,
    appointment_status: satStatus,
   
  },
  {
    staff_id,
    day_of_week: "Sun",
    start_time: sunStart,
    end_time: sunEnd,
    appointment_status: sunStatus,
    
  },
 
];
console.log(my_array);
const mapped = my_array.map(item => ({
  ...item,
  start_time: item.start_time || null,
  end_time: item.end_time || null,
  appointment_status: item.appointment_status || null
}));
await createSchedule(mapped);
setTueStart("");
setTueEnd("");
setTueStatus("");

setWedStart("");
setWedEnd("");
setWedStatus("");

setThuStart("");
setThuEnd("");
setThuStatus("");

setFriStart("");
setFriEnd("");
setFriStatus("");

setSatStart("");
setSatEnd("");
setSatStatus("");

setSunStart("");
setSunEnd("");
setSunStatus("");

setMonStart("");
setMonEnd("");
setMonStatus("");
await read();

closeadd();
  }




async function clear_times(){
  
 await deleteSchedule(staff_id);
  await read();
 

  closeClear();



}


async function update_time(day){
  
  let object={};

   let startTime = "";
  let endTime = "";
  let appointment_status = "";

  if (day === "Mon") {
    startTime = monStart;
    endTime = monEnd;
    appointment_status = monStatus;
  }

  else if (day === "Tues") {
    startTime = tueStart;
    endTime = tueEnd;
    appointment_status = tueStatus;
  }

  else if (day === "Wed") {
    startTime = wedStart;
    endTime = wedEnd;
    appointment_status = wedStatus;
  }

  else if (day === "Thurs") {
    startTime = thuStart;
    endTime = thuEnd;
    appointment_status = thuStatus;
  }
  else if (day === "Fri") {
    startTime = friStart;
    endTime = friEnd;
    appointment_status = friStatus;
  }

  else if (day === "Sat") {
    startTime = satStart;
    endTime = satEnd;
    appointment_status = satStatus;
  }

  else if (day === "Sun") {
    startTime = sunStart;
    endTime = sunEnd;
    appointment_status = sunStatus;
  }

  /**
   *  staff_id + day_of_week + body
   */
  if(startTime){
    object.start_time=startTime;
  }
  if(endTime){
    object.end_time=endTime;
  }
  if(appointment_status){
    object.appointment_status=appointment_status;
  }
  let body={};
  body.staff_id=staff_id;
  body.day_of_week=day;
  body.body=object;
  await updateDaySchedule(body);
setTueStart("");
setTueEnd("");
setTueStatus("");

setWedStart("");
setWedEnd("");
setWedStatus("");

setThuStart("");
setThuEnd("");
setThuStatus("");

setFriStart("");
setFriEnd("");
setFriStatus("");

setSatStart("");
setSatEnd("");
setSatStatus("");

setSunStart("");
setSunEnd("");
setSunStatus("");

setMonStart("");
setMonEnd("");
setMonStatus("");
await read();


closeUpdate();

}



async function read(){
 
  let times = await getSchedule(staff_id);
setTimes(times.data);
console.log(times.data);
  
console.log("hiiiii",times,"and->",getTimes);


}

useEffect(()=>{
  read();
},[]);


const statusOptions = ["open", "closed", "on_leave"];
return(<>

<section>
  <button onClick={()=>{navigate("/dashboard")}}>back</button>
<button onClick={openadd}>Add</button>
<button onClick={openUpdate}>update</button>
  <button onClick={openClear}>Clear</button>
<p style={{color:"red"}}> {staff_id}</p>
   <section style={{ display: "flex", justifyContent: "center", marginTop: "20px" ,flexDirection:"column",gap:"5vh"}}>

    <section >
    <h2>Monday</h2>
    <section style={{ display: "flex", flexDirection: "row", gap: "16px" }}>
    <h1>Start time:</h1>
    <h1>{getTimes?.Mon?.start_time}</h1>

    <h1>End time:</h1>
    <h1>{getTimes?.Mon?.end_time}</h1>

    <h1>Availability:</h1>
    <h1>{getTimes?.Mon?.appointment_status}</h1>
  </section>
  </section>

  <section>
    <h2>Tuesday</h2>
     <section style={{ display: "flex", flexDirection: "row", gap: "16px" }}>
    <h1>Start time:</h1>
    <h1>{getTimes?.Tues?.start_time}</h1>

    <h1>End time:</h1>
    <h1>{getTimes?.Tues?.end_time}</h1>

    <h1>Availability:</h1>
    <h1>{getTimes?.Tues?.appointment_status}</h1>
  </section>
  </section>

  <section>
    <h2>Wednesday</h2>
     <section style={{ display: "flex", flexDirection: "row", gap: "16px" }}>
    <h1>Start time:</h1>
    <h1>{getTimes?.Wed?.start_time}</h1>

    <h1>End time:</h1>
    <h1>{getTimes?.Wed?.end_time}</h1>

    <h1>Availability:</h1>
    <h1>{getTimes?.Wed?.appointment_status}</h1>
    </section>
  </section>

  <section>
    <h2>Thursday</h2>
     <section style={{ display: "flex", flexDirection: "row", gap: "16px" }}>
    <h1>Start time:</h1>
    <h1>{getTimes?.Thurs?.start_time }</h1>

    <h1>End time:</h1>
    <h1>{getTimes?.Thurs?.end_time }</h1>

    <h1>Availability:</h1>
    <h1>{getTimes?.Thurs?.appointment_status ?? ""}</h1>
    </section>
  </section>

  <section>
    <h2>Friday</h2>
     <section style={{ display: "flex", flexDirection: "row", gap: "16px" }}>
    <h1>Start time:</h1>
    <h1>{getTimes?.Fri?.start_time}</h1>

    <h1>End time:</h1>
    <h1>{getTimes?.Fri?.end_time}</h1>

    <h1>Availability:</h1>
    <h1>{getTimes?.Fri?.appointment_status}</h1>
    </section>
  </section>

  <section>
    <h2>Saturday</h2>
     <section style={{ display: "flex", flexDirection: "row", gap: "16px" }}>
    <h1>Start time:</h1>
    <h1>{getTimes?.Sat?.start_time}</h1>

    <h1>End time:</h1>
    <h1>{getTimes?.Sat?.end_time}</h1>

    <h1>Availability:</h1>
    <h1>{getTimes?.Sat?.appointment_status}</h1>
  </section>
  </section>

  <section>
    <h2>Sunday</h2>
     <section style={{ display: "flex", flexDirection: "row", gap: "16px" }}>
    <h1>Start time:</h1>
    <h1>{getTimes?.Sun?.start_time}</h1>

    <h1>End time:</h1>
    <h1>{getTimes?.Sun?.end_time}</h1>

    <h1>Availability:</h1>
    <h1>{getTimes?.Sun?.appointment_status}</h1>
    </section>
  </section>
  

</section>

</section>




<dialog style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}ref={Add}>
  <button onClick={closeadd}>Back</button>

  <form onSubmit={add_time}>
      <h3>Monday</h3>
      <label>Start time:</label>
      <input  type="time" value={monStart} onChange={(e) => setMonStart(e.target.value)} />
            <label>End time:</label>

      <input  type="time" value={monEnd} onChange={(e) => setMonEnd(e.target.value)} />
            <label>Availability:</label>

      <select required value={monStatus} onChange={(e) => setMonStatus(e.target.value)}>
       <option value="">Status</option>
        {statusOptions.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

     
      <h3>Tuesday</h3>
      <label>Start time:</label>
      <input  type="time" value={tueStart} onChange={(e) => setTueStart(e.target.value)} />
            <label>End time:</label>

      <input  type="time" value={tueEnd} onChange={(e) => setTueEnd(e.target.value)} />
                  <label>Availability:</label>

      <select required  value={tueStatus} onChange={(e) => setTueStatus(e.target.value)}>
                    
<option value="">Status</option>
        {statusOptions.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      
      <h3>Wednesday</h3>
      <label>Start time:</label>
      <input  type="time" value={wedStart} onChange={(e) => setWedStart(e.target.value)} />
            <label>End time:</label>

      <input   type="time" value={wedEnd} onChange={(e) => setWedEnd(e.target.value)} />
                  <label>Availability:</label>

      <select required value={wedStatus} onChange={(e) => setWedStatus(e.target.value)}>
        <option value="">Status</option>
        {statusOptions.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      
      <h3>Thursday</h3>
      <label>Start time:</label>
      <input   type="time" value={thuStart} onChange={(e) => setThuStart(e.target.value)} />
            <label>End time:</label>

      <input   type="time" value={thuEnd} onChange={(e) => setThuEnd(e.target.value)} />
                  <label>Availability:</label>

      <select required  value={thuStatus} onChange={(e) => setThuStatus(e.target.value)}>
       <option value="">Status</option>
        {statusOptions.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      
      <h3>Friday</h3>
      <label>Start time:</label>
      <input   type="time" value={friStart} onChange={(e) => setFriStart(e.target.value)} />
            <label>End time:</label>

      <input  type="time" value={friEnd} onChange={(e) => setFriEnd(e.target.value)} />
                  <label>Availability:</label>

      <select required  value={friStatus} onChange={(e) => setFriStatus(e.target.value)}>
       <option value="">Status</option>
        {statusOptions.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      
      <h3>Saturday</h3>
      <label>Start time:</label>
      <input  type="time" value={satStart} onChange={(e) => setSatStart(e.target.value)} />
            <label>End time:</label>

      <input  type="time" value={satEnd} onChange={(e) => setSatEnd(e.target.value)} />
                  <label>Availability:</label>

      <select required  value={satStatus} onChange={(e) => setSatStatus(e.target.value)}>
       <option value="">Status</option>
        {statusOptions.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      
      <h3>Sunday</h3>
      <label>Start time:</label>
      <input  type="time" value={sunStart} onChange={(e) => setSunStart(e.target.value)} />
      <label>End time:</label>
      <input  type="time" value={sunEnd} onChange={(e) => setSunEnd(e.target.value)} />
                  <label>Availability:</label>

      <select required value={sunStatus} onChange={(e) => setSunStatus(e.target.value)}>
        <option value="">Status</option>
        {statusOptions.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
<button>Submit</button>
  </form>
  </dialog>














<dialog style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} ref={clear}>

  <button onClick={closeClear}>Back</button>
  <h2>Are you sure you want clear everything?</h2>
  <button onClick={clear_times}>Clear</button>
  
  </dialog>
  















  {/*   _____________________________UPDATE__________________________________________________________________________________________________*/}

<dialog style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} ref={update}>
<button onClick={closeUpdate}>Back</button>
  <h2>Update</h2>
<form onSubmit={(e) => { e.preventDefault(); update_time("Mon"); }}>
  <h3>Monday</h3>
<label>Start time:</label>
  <input  type="time" value={monStart} onChange={(e) => setMonStart(e.target.value)} />
  <label>End time:</label>
  <input  type="time" value={monEnd} onChange={(e) => setMonEnd(e.target.value)} />
<label>Availability:</label>
  <select  value={monStatus} onChange={(e) => setMonStatus(e.target.value)}>
   <option value="">Status</option>
    {statusOptions.map((s) => (
      <option key={s} value={s}>{s}</option>
    ))}
  </select>

  <button type="update">Save Monday</button>
</form>



<form onSubmit={(e) => { e.preventDefault(); update_time("Tues"); }}>
  <h3>Tuesday</h3>
<label>Start time:</label>
  <input  type="time" value={tueStart} onChange={(e) => setTueStart(e.target.value)} />
  <label>End time:</label>
  <input  type="time" value={tueEnd} onChange={(e) => setTueEnd(e.target.value)} />
<label>Availability:</label>
  <select  value={tueStatus} onChange={(e) => setTueStatus(e.target.value)}>
    <option value="">Status</option>
    {statusOptions.map((s) => (
      <option key={s} value={s}>{s}</option>
    ))}
  </select>

  <button type="update">Save Tuesday</button>
</form>


<form onSubmit={(e) => { e.preventDefault(); update_time("Wed"); }}>
  <h3>Wednesday</h3>
<label>Start time:</label>
  <input  type="time" value={wedStart} onChange={(e) => setWedStart(e.target.value)} />
  <label>End time:</label>
  <input  type="time" value={wedEnd} onChange={(e) => setWedEnd(e.target.value)} />
<label>Availability:</label>
  <select  value={wedStatus} onChange={(e) => setWedStatus(e.target.value)}>
    <option value="">Status</option>
    {statusOptions.map((s) => (
      <option key={s} value={s}>{s}</option>
    ))}
  </select>

  <button type="update">Save Wednesday</button>
</form>



<form onSubmit={(e) => { e.preventDefault(); update_time("Thurs"); }}>
  <h3>Thursday</h3>
<label>Start time:</label>
  <input  type="time" value={thuStart} onChange={(e) => setThuStart(e.target.value)} />
  <label>End time:</label>
  <input  type="time" value={thuEnd} onChange={(e) => setThuEnd(e.target.value)} />
<label>Availability:</label>
  <select  value={thuStatus} onChange={(e) => setThuStatus(e.target.value)}>
  <option value="">Status</option>
    {statusOptions.map((s) => (
      <option key={s} value={s}>{s}</option>
    ))}
  </select>

  <button type="update">Save Thursday</button>
</form>



<form onSubmit={(e) => { e.preventDefault(); update_time("Fri"); }}>
  <h3>Friday</h3>
<label>Start time:</label>
  <input  type="time" value={friStart} onChange={(e) => setFriStart(e.target.value)} />
  <label>End time:</label>
  <input  type="time" value={friEnd} onChange={(e) => setFriEnd(e.target.value)} />
<label>Availability:</label>
  <select  value={friStatus} onChange={(e) => setFriStatus(e.target.value)}>
   <option value="">Status</option>
    {statusOptions.map((s) => (
      <option key={s} value={s}>{s}</option>
    ))}
  </select>

  <button type="update">Save Friday</button>
</form>



<form onSubmit={(e) => { e.preventDefault(); update_time("Sat"); }}>
  <h3>Saturday</h3>
<label>Start time:</label>
  <input  type="time" value={satStart} onChange={(e) => setSatStart(e.target.value)} />
  <label>End time:</label>
  <input  type="time" value={satEnd} onChange={(e) => setSatEnd(e.target.value)} />
<label>Availability:</label>
  <select  value={satStatus} onChange={(e) => setSatStatus(e.target.value)}>
    <option value="">Status</option>
    {statusOptions.map((s) => (
      <option key={s} value={s}>{s}</option>
    ))}
  </select>

  <button type="update">Save Saturday</button>
</form>



<form onSubmit={(e) => { e.preventDefault(); update_time("Sun"); }}>
  <h3>Sunday</h3>
<label>Start time:</label>
  <input  type="time" value={sunStart} onChange={(e) => setSunStart(e.target.value)} />
  <label>End time:</label>
  <input  type="time" value={sunEnd} onChange={(e) => setSunEnd(e.target.value)} />
<label>Availability:</label>
  <select  value={sunStatus} onChange={(e) => setSunStatus(e.target.value)}>
    <option value="">Status</option>
    {statusOptions.map((s) => (
      <option key={s} value={s}>{s}</option>
    ))}
  </select>

  <button type="update">Save Sunday</button>
</form>
  
  </dialog>


    

</>);






}