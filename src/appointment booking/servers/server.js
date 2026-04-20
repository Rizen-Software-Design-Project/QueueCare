import env from 'dotenv';
env.config();

import app from './servers/app.js'; 

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`${new Date().toLocaleDateString()} Server is running on port ${port}`);
});
