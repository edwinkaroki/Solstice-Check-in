const express = require("express");
const fs = require("fs");

const app = express();

app.use(express.json());
app.use(express.static("public"));

const PORT = 3000;

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

// Synchronous check-in
app.post("/check-in", (req, res) => {
  const { attendeeId } = req.body;

  const data = getAttendees();

  const attendee = data.attendees.find(
    person => person.id === attendeeId
  );

  if (!attendee) {
    return res.status(404).json({
      success: false,
      message: "Attendee not found"
    });
  }

  if (attendee.checkedIn) {
    return res.status(409).json({
      success: false,
      message: "Attendee has already checked in"
    });
  }

  // Simulate synchronous printer
  console.log(`Printing badge for ${attendee.name}...`);

  attendee.checkedIn = true;

  saveAttendees(data);

  res.json({
    success: true,
    message: "Badge printed successfully",
    attendee: attendee
  });
});

app.listen(PORT, () => {
  console.log(`Solstice Check-in running on http://localhost:${PORT}`);
});