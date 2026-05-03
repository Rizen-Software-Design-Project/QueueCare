//Azure version
import env from 'dotenv';
env.config();

import app from './src/appointment-booking/servers/app.js';
 

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`${new Date().toLocaleDateString()} Server is running on port ${port}`);
});



//Use this version if you want it to work on localHost

/*import 'dotenv/config'; // ← must be first, loads .env synchronously

import app from './src/appointment-booking/servers/app.js';

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`${new Date().toLocaleDateString()} Server is running on port ${port}`);
});*/