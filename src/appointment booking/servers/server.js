import env from 'dotenv';

import app from './app.js';

env.config();

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`${new Date().toLocaleDateString()} Server is running on port ${port}`);
});
