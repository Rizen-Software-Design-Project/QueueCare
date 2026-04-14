import env from 'dotenv';

import app from './app.js';

env.config();

const port = process.env.PORT;

app.listen(port, () => {
    console.log(`${new Date().toLocaleDateString()} Server is running on port ${port}`);
});
