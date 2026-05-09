const BASE_URL =
  import.meta.env.VITE_API_BASE ||
  "https://api-treupobaqq-uc.a.run.app";


export async function getSchedule(staff_id) {
  try {
    const res = await fetch(
      `${BASE_URL}/schedule?staff_id=${staff_id}`
    );

    const r= await res.json();
    console.log(r);
    return r;
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function checkStaff(staff_id) {
  try {
    const res = await fetch(
      `/get_staff?staff_id=${staff_id}`
    );

    

    

    return res; 

  } catch (err) {
    console.error("Network error:", err.message);
    return false;
  }
}


export async function createSchedule(body) {
 await deleteSchedule(body[0].staff_id);
  
  
  console.log("Hi", body);
  try {

    

    
    const res = await fetch(`${BASE_URL}/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const r= await res.json();
    console.log(r);
    return r;
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/* 
   
   staff_id + day_of_week + body
*/
export async function updateDaySchedule(body) {
  const exists = await checkStaff(body.staff_id);
  if(!exists){
    return ;
  }
  try {
    const res = await fetch(`${BASE_URL}/schedule`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const r= await res.json();
    console.log(r);
    return r;
  } catch (err) {
    return { success: false, error: err.message };
  }
}


export async function deleteSchedule(staff_id) {
  try {
    const res = await fetch(
      `${BASE_URL}/schedule?staff_id=${staff_id}`,
      {
        method: "DELETE",
      }
    );

    const r= await res.json();
    console.log(r);
    return r;
  } catch (err) {
    return { success: false, error: err.message };
  }
}