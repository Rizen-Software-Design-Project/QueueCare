import "./Signup.css";

function Signup() {
  return (
    <div className="Signup">
        <div className="signup_content">

            <div className="signup_left">
              <h1>Welcome to QueueCare</h1>
              <p>Join us today and experience the future of healthcare management. Sign up now to streamline your clinic's operations and enhance patient care with QueueCare.</p>  
            </div>

            <div className="signup_right">
                
                <div className="signup form">
                    <h2>Sign Up</h2>
                    
                    <form>
                        <div className="signup_name">
                            <div className="signup_field">
                                <label htmlFor="Names" className="signup_label">Names</label>
                                <input id="Names" type="text" placeholder="Full Name" className="signup_input" />
                            </div>
                            <div className="signup_field">
                                <label htmlFor="Surname" className="signup_label">Surname</label>
                                <input id="Surname" type="text" placeholder="Surname" className="signup_input" />
                            </div>
                        </div>

                        <div className="signup_field">
                            <label htmlfor ="Sex" className="signup_label">Sex</label>
                            <select id="Sex" className="signup_input">
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <div className="signup_field">
                            <label htmlfor="IDNumber" className="signup_label">ID Number</label>
                            <input id="IDNumber" type="text" placeholder="ID Number" className="signup_input" />
                        </div>



                    </form>

                </div>
            </div>

        </div>
      
    </div>
  );
}

export default Signup;




/*<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');

  *{box-sizing:border-box;margin:0;padding:0}

  :root{
    --brand:#0F6E56;--brand-light:#E1F5EE;--brand-mid:#1D9E75;
    --accent:#D85A30;--accent-light:#FAECE7;
    --text:#2C2C2A;--text-muted:#888780;--text-hint:#B4B2A9;
    --surface:#fff;--bg:#F1EFE8;--border:rgba(0,0,0,0.1);
    --r:14px;--r-sm:8px;
    --ff-head:'DM Serif Display',serif;--ff-body:'DM Sans',sans-serif;
  }

  @media(prefers-color-scheme:dark){
    :root{
      --text:#D3D1C7;--text-muted:#888780;--text-hint:#5F5E5A;
      --surface:#1a1a18;--bg:#111110;--border:rgba(255,255,255,0.1);
      --brand-light:#085041;--accent-light:#4A1B0C;
    }
  }

  body{font-family:var(--ff-body);color:var(--text);background:var(--bg);min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:1.5rem}

  .shell{width:100%;max-width:480px}

  .logo{text-align:center;margin-bottom:2rem}
  .logo-mark{width:48px;height:48px;background:var(--brand);border-radius:12px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:.75rem}
  .logo-mark svg{width:26px;height:26px;fill:none;stroke:#fff;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
  .logo h1{font-family:var(--ff-head);font-size:1.5rem;font-weight:400;color:var(--text);letter-spacing:-.01em}
  .logo p{font-size:.8rem;color:var(--text-muted);margin-top:.15rem;font-weight:300}

  .card{background:var(--surface);border:0.5px solid var(--border);border-radius:var(--r);padding:2rem;position:relative;overflow:hidden}

  .card-title{font-family:var(--ff-head);font-size:1.4rem;font-weight:400;margin-bottom:.25rem;color:var(--text)}
  .card-sub{font-size:.82rem;color:var(--text-muted);margin-bottom:1.75rem;font-weight:300}

  .step-dots{display:flex;gap:6px;margin-bottom:1.75rem}
  .dot{height:3px;border-radius:2px;background:var(--border);flex:1;transition:background .3s}
  .dot.active{background:var(--brand)}
  .dot.done{background:var(--brand-mid)}

  label{display:block;font-size:.78rem;font-weight:500;color:var(--text-muted);margin-bottom:.4rem;letter-spacing:.03em;text-transform:uppercase}
  input,select{width:100%;padding:.7rem .9rem;font-family:var(--ff-body);font-size:.9rem;color:var(--text);background:var(--bg);border:0.5px solid var(--border);border-radius:var(--r-sm);outline:none;transition:border-color .2s,box-shadow .2s;-webkit-appearance:none;appearance:none}
  input:focus,select:focus{border-color:var(--brand);box-shadow:0 0 0 3px rgba(15,110,86,.12)}
  input::placeholder{color:var(--text-hint)}
  .field{margin-bottom:1.1rem}
  .field-row{display:grid;grid-template-columns:1fr 1fr;gap:.75rem}

  .role-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:.6rem;margin-bottom:1.5rem}
  .role-btn{border:0.5px solid var(--border);background:var(--bg);border-radius:var(--r-sm);padding:.9rem .5rem;text-align:center;cursor:pointer;transition:border-color .2s,background .2s;font-family:var(--ff-body)}
  .role-btn .role-icon{font-size:1.4rem;display:block;margin-bottom:.4rem}
  .role-btn .role-label{font-size:.78rem;font-weight:500;color:var(--text-muted);text-transform:uppercase;letter-spacing:.04em}
  .role-btn.selected{border-color:var(--brand);background:var(--brand-light)}
  .role-btn.selected .role-label{color:var(--brand)}

  .gender-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:.5rem;margin-bottom:1.1rem}
  .gender-pill{border:0.5px solid var(--border);background:var(--bg);border-radius:20px;padding:.5rem .75rem;text-align:center;cursor:pointer;font-family:var(--ff-body);font-size:.82rem;color:var(--text-muted);font-weight:500;transition:all .2s}
  .gender-pill.selected{border-color:var(--brand);background:var(--brand-light);color:var(--brand)}

  .btn{width:100%;padding:.78rem;font-family:var(--ff-body);font-size:.9rem;font-weight:500;border-radius:var(--r-sm);border:none;cursor:pointer;transition:opacity .2s,transform .1s;margin-top:.25rem}
  .btn:active{transform:scale(.98)}
  .btn-primary{background:var(--brand);color:#fff}
  .btn-primary:hover{opacity:.92}
  .btn-ghost{background:transparent;color:var(--brand);border:0.5px solid var(--brand)}
  .btn-ghost:hover{background:var(--brand-light)}

  .otp-row{display:grid;grid-template-columns:repeat(6,1fr);gap:.5rem;margin-bottom:1.5rem}
  .otp-box{width:100%;aspect-ratio:1;text-align:center;font-size:1.2rem;font-weight:500;border:0.5px solid var(--border);background:var(--bg);border-radius:var(--r-sm);color:var(--text);font-family:var(--ff-body);outline:none}
  .otp-box:focus{border-color:var(--brand);box-shadow:0 0 0 3px rgba(15,110,86,.12)}

  .resend{text-align:center;font-size:.8rem;color:var(--text-muted);margin-bottom:1.25rem}
  .resend a{color:var(--brand);cursor:pointer;text-decoration:none;font-weight:500}

  .hint{font-size:.75rem;color:var(--text-hint);margin-top:-.6rem;margin-bottom:.9rem;font-weight:300}

  .optional-badge{font-size:.68rem;background:var(--bg);border:0.5px solid var(--border);color:var(--text-muted);padding:.15rem .45rem;border-radius:4px;font-weight:400;margin-left:.4rem;vertical-align:middle;text-transform:none;letter-spacing:0}

  .success-icon{text-align:center;margin:1rem 0 1.5rem}
  .success-circle{width:72px;height:72px;background:var(--brand-light);border-radius:50%;display:inline-flex;align-items:center;justify-content:center}
  .success-circle svg{width:36px;height:36px;stroke:var(--brand);fill:none;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}

  .divider{display:flex;align-items:center;gap:.75rem;margin:1.25rem 0}
  .divider-line{flex:1;height:.5px;background:var(--border)}
  .divider-text{font-size:.75rem;color:var(--text-hint);font-weight:400}

  .switch-text{text-align:center;font-size:.82rem;color:var(--text-muted);margin-top:1.25rem;font-weight:300}
  .switch-text a{color:var(--brand);cursor:pointer;text-decoration:none;font-weight:500}

  .page{display:none}
  .page.active{display:block}

  .back-btn{display:inline-flex;align-items:center;gap:.4rem;font-size:.8rem;color:var(--text-muted);cursor:pointer;margin-bottom:1.25rem;font-family:var(--ff-body);background:none;border:none;padding:0;font-weight:400}
  .back-btn:hover{color:var(--brand)}
  .back-btn svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}

  .phone-prefix{display:flex;gap:.5rem}
  .phone-prefix select{width:90px;flex-shrink:0}
  .phone-prefix input{flex:1}

  .pw-wrap{position:relative}
  .pw-wrap input{padding-right:2.5rem}
  .pw-toggle{position:absolute;right:.75rem;top:50%;transform:translateY(-50%);cursor:pointer;color:var(--text-hint);background:none;border:none;padding:0;display:flex;align-items:center}
  .pw-toggle svg{width:16px;height:16px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}

  .strength{display:flex;gap:4px;margin-top:.4rem;margin-bottom:.8rem}
  .s-bar{height:3px;flex:1;border-radius:2px;background:var(--border);transition:background .3s}

  .info-row{display:flex;gap:.5rem;align-items:flex-start;padding:.7rem;background:var(--brand-light);border-radius:var(--r-sm);margin-bottom:1.1rem}
  .info-row svg{width:14px;height:14px;stroke:var(--brand);fill:none;stroke-width:2;stroke-linecap:round;flex-shrink:0;margin-top:1px}
  .info-row span{font-size:.78rem;color:var(--brand);font-weight:300;line-height:1.5}

  .tag-pill{display:inline-flex;align-items:center;gap:.3rem;padding:.25rem .6rem;border-radius:12px;font-size:.72rem;font-weight:500;text-transform:uppercase;letter-spacing:.04em}
  .tag-staff{background:var(--brand-light);color:var(--brand)}
  .tag-admin{background:#EAF3DE;color:#3B6D11}
  .tag-patient{background:#E6F1FB;color:#185FA5}

  @media(prefers-color-scheme:dark){
    .tag-admin{background:#27500A;color:#C0DD97}
    .tag-patient{background:#0C447C;color:#B5D4F4}
  }

  select option{background:var(--surface);color:var(--text)}
</style>

<div class="shell">
  <div class="logo">
    <div class="logo-mark">
      <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
    </div>
    <h1>MediAccess</h1>
    <p>Integrated Healthcare Management</p>
  </div>

  <div class="card">

    <!-- LOGIN -->
    <div id="page-login" class="page active">
      <p class="card-title">Welcome back</p>
      <p class="card-sub">Sign in to your account to continue</p>
      <div class="field">
        <label>ID Number or Email</label>
        <input type="text" placeholder="Enter your ID or email">
      </div>
      <div class="field">
        <label>Password</label>
        <div class="pw-wrap">
          <input type="password" id="login-pw" placeholder="Enter your password">
          <button class="pw-toggle" onclick="togglePw('login-pw',this)"><svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
        </div>
      </div>
      <button class="btn btn-primary" onclick="goTo('page-login-otp')">Sign in</button>
      <div class="divider"><div class="divider-line"></div><span class="divider-text">or</span><div class="divider-line"></div></div>
      <button class="btn btn-ghost" onclick="goTo('page-role')">Create new account</button>
      <p class="switch-text" style="margin-top:.9rem"><a>Forgot password?</a></p>
    </div>

    <!-- LOGIN OTP -->
    <div id="page-login-otp" class="page">
      <button class="back-btn" onclick="goTo('page-login')"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg> Back</button>
      <p class="card-title">Verify it's you</p>
      <p class="card-sub">We sent a 6-digit OTP to your registered phone number ending in •••• 4521</p>
      <div class="otp-row" id="login-otp-boxes"></div>
      <p class="resend">Didn't receive it? <a onclick="flashResend(this)">Resend OTP</a></p>
      <button class="btn btn-primary" onclick="goTo('page-login-success')">Verify & Sign in</button>
    </div>

    <!-- LOGIN SUCCESS -->
    <div id="page-login-success" class="page">
      <div class="success-icon">
        <div class="success-circle"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>
      </div>
      <p class="card-title" style="text-align:center">Signed in!</p>
      <p class="card-sub" style="text-align:center;margin-bottom:1.5rem">You've been successfully authenticated and will be redirected to your dashboard.</p>
      <button class="btn btn-primary">Go to Dashboard</button>
      <p class="switch-text"><a onclick="goTo('page-login')">Sign in with a different account</a></p>
    </div>

    <!-- STEP 1: ROLE -->
    <div id="page-role" class="page">
      <button class="back-btn" onclick="goTo('page-login')"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg> Back to login</button>
      <p class="card-title">Create your account</p>
      <p class="card-sub">Choose how you'll be using MediAccess</p>
      <div class="role-grid">
        <div class="role-btn" onclick="selectRole('patient',this)">
          <span class="role-icon">🧑‍⚕️</span>
          <span class="role-label">Patient</span>
        </div>
        <div class="role-btn" onclick="selectRole('staff',this)">
          <span class="role-icon">👨‍💼</span>
          <span class="role-label">Staff</span>
        </div>
        <div class="role-btn" onclick="selectRole('admin',this)">
          <span class="role-icon">🛡️</span>
          <span class="role-label">Admin</span>
        </div>
      </div>
      <div class="info-row">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span>Your role determines what features and records you can access within the system.</span>
      </div>
      <button class="btn btn-primary" id="role-next" onclick="goTo('page-info')" disabled style="opacity:.5;cursor:not-allowed">Continue</button>
    </div>

    <!-- STEP 2: PERSONAL INFO -->
    <div id="page-info" class="page">
      <div class="step-dots">
        <div class="dot done"></div><div class="dot active"></div><div class="dot"></div><div class="dot"></div>
      </div>
      <button class="back-btn" onclick="goTo('page-role')"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg> Back</button>
      <p class="card-title">Personal details</p>
      <p class="card-sub" id="info-sub">Tell us a bit about yourself</p>

      <div class="field-row">
        <div class="field"><label>First name</label><input type="text" placeholder="Jane"></div>
        <div class="field"><label>Surname</label><input type="text" placeholder="Dlamini"></div>
      </div>

      <div class="field">
        <label>Gender</label>
        <div class="gender-row">
          <div class="gender-pill" onclick="selectGender('male',this)">Male</div>
          <div class="gender-pill" onclick="selectGender('female',this)">Female</div>
          <div class="gender-pill" onclick="selectGender('other',this)">Other</div>
        </div>
      </div>

      <div class="field">
        <label>ID Number</label>
        <input type="text" maxlength="13" placeholder="8001015009087" oninput="this.value=this.value.replace(/\D/g,'')">
        <p class="hint">South African 13-digit ID number</p>
      </div>

      <div class="field">
        <label>Phone Number</label>
        <div class="phone-prefix">
          <select>
            <option value="+27">🇿🇦 +27</option>
            <option value="+1">🇺🇸 +1</option>
            <option value="+44">🇬🇧 +44</option>
            <option value="+263">🇿🇼 +263</option>
            <option value="+267">🇧🇼 +267</option>
          </select>
          <input type="tel" placeholder="071 234 5678" oninput="this.value=this.value.replace(/[^0-9 ]/g,'')">
        </div>
        <p class="hint">Used for OTP verification — no account without verification</p>
      </div>

      <button class="btn btn-primary" onclick="goTo('page-otp')">Send OTP to my phone</button>
    </div>

    <!-- STEP 3: OTP -->
    <div id="page-otp" class="page">
      <div class="step-dots">
        <div class="dot done"></div><div class="dot done"></div><div class="dot active"></div><div class="dot"></div>
      </div>
      <button class="back-btn" onclick="goTo('page-info')"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg> Back</button>
      <p class="card-title">Verify your number</p>
      <p class="card-sub">Enter the 6-digit code sent to your phone</p>
      <div class="otp-row" id="otp-boxes"></div>
      <p class="resend">Didn't receive it? <a onclick="flashResend(this)">Resend OTP</a></p>
      <button class="btn btn-primary" onclick="goTo('page-credentials')">Verify</button>
    </div>

    <!-- STEP 4: CREDENTIALS -->
    <div id="page-credentials" class="page">
      <div class="step-dots">
        <div class="dot done"></div><div class="dot done"></div><div class="dot done"></div><div class="dot active"></div>
      </div>
      <button class="back-btn" onclick="goTo('page-otp')"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg> Back</button>
      <p class="card-title">Secure your account</p>
      <p class="card-sub">Set up login credentials — email is optional</p>

      <div class="field">
        <label>Email address <span class="optional-badge">optional</span></label>
        <input type="email" placeholder="jane@example.com">
        <p class="hint">If skipped, you can always log in with your ID number.</p>
      </div>

      <div class="field">
        <label>Password</label>
        <div class="pw-wrap">
          <input type="password" id="new-pw" placeholder="Create a strong password" oninput="checkStrength(this.value)">
          <button class="pw-toggle" onclick="togglePw('new-pw',this)"><svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
        </div>
        <div class="strength"><div class="s-bar" id="s1"></div><div class="s-bar" id="s2"></div><div class="s-bar" id="s3"></div><div class="s-bar" id="s4"></div></div>
      </div>

      <div class="field">
        <label>Confirm password</label>
        <div class="pw-wrap">
          <input type="password" id="confirm-pw" placeholder="Repeat your password">
          <button class="pw-toggle" onclick="togglePw('confirm-pw',this)"><svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
        </div>
      </div>

      <button class="btn btn-primary" onclick="goTo('page-done')">Create Account</button>
    </div>

    <!-- DONE -->
    <div id="page-done" class="page">
      <div class="success-icon">
        <div class="success-circle"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>
      </div>
      <p class="card-title" style="text-align:center">Account created!</p>
      <p class="card-sub" style="text-align:center;margin-bottom:.5rem">Your <span id="done-role-tag"></span> account is ready.</p>
      <p style="text-align:center;font-size:.8rem;color:var(--text-muted);margin-bottom:1.5rem;font-weight:300">You're now fully verified and can access the platform.</p>
      <button class="btn btn-primary">Go to Dashboard</button>
      <p class="switch-text"><a onclick="goTo('page-login')">Back to login</a></p>
    </div>

  </div>
</div>

<script>
  let selectedRole = null;
  const roleColors = {patient:'tag-patient',staff:'tag-staff',admin:'tag-admin'};

  function goTo(id){
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if(id==='page-otp') buildOtp('otp-boxes');
    if(id==='page-login-otp') buildOtp('login-otp-boxes');
    if(id==='page-info' && selectedRole){
      document.getElementById('info-sub').textContent = 'Registering as ' + selectedRole.charAt(0).toUpperCase()+selectedRole.slice(1);
    }
    if(id==='page-done'){
      const tag = document.getElementById('done-role-tag');
      tag.className = 'tag-pill '+(roleColors[selectedRole]||'tag-patient');
      tag.textContent = selectedRole||'patient';
    }
  }

  function selectRole(role, el){
    selectedRole = role;
    document.querySelectorAll('.role-btn').forEach(b=>b.classList.remove('selected'));
    el.classList.add('selected');
    const btn = document.getElementById('role-next');
    btn.disabled=false;
    btn.style.opacity='1';
    btn.style.cursor='pointer';
  }

  function selectGender(g, el){
    document.querySelectorAll('.gender-pill').forEach(p=>p.classList.remove('selected'));
    el.classList.add('selected');
  }

  function buildOtp(containerId){
    const c = document.getElementById(containerId);
    if(c.children.length) return;
    for(let i=0;i<6;i++){
      const inp = document.createElement('input');
      inp.type='text';inp.maxLength=1;inp.className='otp-box';inp.inputMode='numeric';
      inp.addEventListener('input',e=>{
        e.target.value=e.target.value.replace(/\D/g,'');
        if(e.target.value && inp.nextElementSibling) inp.nextElementSibling.focus();
      });
      inp.addEventListener('keydown',e=>{
        if(e.key==='Backspace'&&!e.target.value&&inp.previousElementSibling) inp.previousElementSibling.focus();
      });
      c.appendChild(inp);
    }
    c.firstElementChild.focus();
  }

  function togglePw(id, btn){
    const inp = document.getElementById(id);
    inp.type = inp.type==='password' ? 'text' : 'password';
  }

  function checkStrength(val){
    const bars = [document.getElementById('s1'),document.getElementById('s2'),document.getElementById('s3'),document.getElementById('s4')];
    const colors = ['#E24B4A','#EF9F27','#1D9E75','#0F6E56'];
    let score = 0;
    if(val.length>=8) score++;
    if(/[A-Z]/.test(val)) score++;
    if(/[0-9]/.test(val)) score++;
    if(/[^A-Za-z0-9]/.test(val)) score++;
    bars.forEach((b,i)=>{ b.style.background = i<score ? colors[score-1] : 'var(--border)'; });
  }

  function flashResend(el){
    const orig = el.textContent;
    el.textContent='Sent!';el.style.opacity='.5';
    setTimeout(()=>{el.textContent=orig;el.style.opacity='1';},2500);
  }
</script> */