const express = require("express");
const dotenv = require("dotenv");
const ewelink = require("ewelink-api");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
dotenv.config();

const port = process.env.PORT || 3000;

let devices = [];

(async () => {
  const connection = new ewelink({
    email: process.env.EWELINK_MAIL,
    password: process.env.EWELINK_PASSWORD,
    region: process.env.EWELINK_REGION,
  });

  const auth = await connection.getCredentials();

  const socket = await connection.openWebSocket(async (data) => {
    if (data?.action === "update" && data.deviceid && data?.params?.switch) {
      const device = devices.find((d) => d.id === data.deviceid);
      if (device) {
        device.state = data.params.switch === "on" ? true : false;
      }
    }
  });

  const ewelinkDevices = await connection.getDevices();
  devices = ewelinkDevices.map((device) => {
    return {
      id: device.deviceid,
      name: device.name,
      state: device.params.switch === "on" ? true : false,
    };
  });

  if (process.env.AUTH) {
    app.use((req, res, next) => {
      if (req.headers.authorization !== process.env.AUTH) {
        return res.status(401).send("Unauthorized");
      }
      next();
    });
  }

  app.get("/devices", (req, res) => {
    res.json(devices);
  });

  app.post("/devices/:id", async (req, res) => {
    const { id } = req.params;
    const { state, toggle } = req.body;
    const device = devices.find((d) => d.id === id);

    if (!device) {
      return res.status(404).json({ error: "Device not found" });
    }

    try {
      if (state === true || state === false) {
        await connection.setDevicePowerState(id, state ? "on" : "off");
      } else if (!state && toggle && toggle == true) {
        await connection.toggleDevice(id);
      } else {
        return res.status(400).json({ error: "Invalid request" });
      }
    } catch (error) {
      return res.status(500).json({ error: result.error });
    }

    res.json(device);
  });

  app.listen(port, () => {
    console.log("Server started on port " + port);
  });
})();
