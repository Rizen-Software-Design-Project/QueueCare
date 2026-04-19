const express = require("express");
const router = express.Router();

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SB_URL,
  process.env.SB_KEY
);

const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

async function sendEmail(to, text) {
  await resend.emails.send({
    from: 'hlulanibaloyi@queuecare.co.za',
    to,
    subject: 'Queue Notification',
    text
  });
}


router.get('/notify_patient', async (req, res) => {
    const email = req.query.email;

    try {
        const response = await fetch(`https://api-treupobaqq-uc.a.run.app/staff/estimated_time?contact_details=${email}`);
    const data = await response.json();
        if(data.error) return res.status(400).json({error:data.error});

        const estimated_wait = data.estimated_wait;

             if(estimated_wait=="1h"){
          await sendEmail(email,'Your appointment is in 1 hour.');
            return res.status(200).json({success:true});
        }
         if(estimated_wait=="30m"){
            await sendEmail(email,'Your appointment is in 30 minutes.');
            return res.status(200).json({success:true});
        }
        if(estimated_wait == "10m"){
    await sendEmail(email, 'Your appointment is in 10 minutes.');
    return res.status(200).json({success:true});
}

        return res.status(200).json({success:false, estimated_wait});

    } catch (error) {
        return res.status(500).json({error:error.message});
    }
});


module.exports = router;