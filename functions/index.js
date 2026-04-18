const functions = require("firebase-functions");
const express = require("express");
require("dotenv").config();

const app = express();

app.use(express.json());

const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SB_URL,
  process.env.SB_KEY
);


const staffRoutes = require("./staff_server");
const queueRoutes = require("./queue_server");

app.use("/staff", staffRoutes);
app.use("/queue", queueRoutes);


exports.api = functions.https.onRequest(app);