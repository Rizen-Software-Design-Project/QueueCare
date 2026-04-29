import dotenv from 'dotenv';
dotenv.config();

const { default: app } = await import('./src/appointment-booking/servers/app.js');

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`${new Date().toLocaleDateString()} Server is running on port ${port}`);
});
