const express = require("express");
const fs = require("fs");

const app = express();

app.use(express.json());
app.use(express.static("public"));

const PORT = 3000;
const PRINTER_URL = process.env.PRINTER_URL || "http://localhost:4000/print";
let checkInQueue = Promise.resolve();

function getAttendees() {
  const data = fs.readFileSync("attendees.json", "utf8");
  return JSON.parse(data);
}

function saveAttendees(data) {
  fs.writeFileSync(
    "attendees.json",
    JSON.stringify(data, null, 2)
  );
}

async function printBadge(attendee) {
  const response = await fetch(PRINTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      attendeeId: attendee.id,
      name: attendee.name
    })
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Badge printer rejected the request");
  }
}

app.post("/check-in", async (req, res) => {
  const { attendeeId } = req.body;

  const currentCheckIn = checkInQueue.then(async () => {
    const data = getAttendees();
    const attendee = data.attendees.find(person => person.id === attendeeId);

    if (!attendee) {
      return { status: 404, body: { success: false, message: "Attendee not found" } };
    }

    if (attendee.checkedIn) {
      return {
        status: 409,
        body: { success: false, message: "Attendee has already checked in" }
      };
    }

    await printBadge(attendee);

    attendee.checkedIn = true;
    saveAttendees(data);

    return {
      status: 200,
      body: { success: true, message: "Checked In - badge printed successfully", attendee }
    };
  });

  checkInQueue = currentCheckIn.catch(() => {});

  try {
    const result = await currentCheckIn;
    res.status(result.status).json(result.body);
  } catch (error) {
    console.error(`Badge printing failed for ${attendeeId}:`, error.message);
    res.status(502).json({
      success: false,
      message: "Badge could not be printed. Attendee was not checked in."
    });
  }
});

app.listen(PORT, () => {
  console.log(`Solstice Check-in running on http://localhost:${PORT}`);
});