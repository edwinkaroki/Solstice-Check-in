const express = require("express");
const fs = require("fs");
const crypto = require("crypto");

const { publishPrintJob } = require("./queue");
const { createJob, getJob } = require("./jobStore");

const app = express();

app.use(express.json());
app.use(express.static("public"));

const PORT = 3000;

// ============================================================
// DEPRECATED SYNCHRONOUS IMPLEMENTATION
// ============================================================
// Retained as the Day 4 synchronous baseline.
// Replaced by RabbitMQ asynchronous print-job processing.
//
// const PRINTER_URL = process.env.PRINTER_URL || "http://localhost:4000/print";
// let checkInQueue = Promise.resolve();
//
// async function printBadge(attendee) {
//   ...
// }
// ============================================================

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

// ============================================================
// ASYNCHRONOUS CHECK-IN
// ============================================================

app.post("/check-in", async (req, res) => {
  const { attendeeId } = req.body;

  if (!attendeeId) {
    return res.status(400).json({
      success: false,
      message: "attendeeId is required"
    });
  }

  try {
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

    // Prevent duplicate scans, including scans while
    // the first print job is still being processed.
    if (attendee.checkedIn || attendee.printPending) {
      return res.status(409).json({
        success: false,
        message: attendee.checkedIn
          ? "Attendee has already checked in"
          : "Badge printing is already in progress"
      });
    }

    const jobId = crypto.randomUUID();

    const job = {
      id: jobId,
      attendeeId: attendee.id,
      name: attendee.name,
      status: "queued",
      createdAt: new Date().toISOString()
    };

    // Create the job before publishing it.
    createJob(job);

    // Mark the attendee as pending BEFORE returning.
    attendee.printPending = true;
    saveAttendees(data);

    // Send the job to RabbitMQ.
    await publishPrintJob(job);

    return res.status(202).json({
      success: true,
      status: "queued",
      message: "Badge print job queued",
      jobId,
      attendeeId: attendee.id
    });

  } catch (error) {
    console.error("Failed to queue print job:", error.message);

    return res.status(500).json({
      success: false,
      message: "Could not queue badge print job"
    });
  }
});

// ============================================================
// PRINT JOB STATUS
// ============================================================

app.get("/check-in/status/:jobId", (req, res) => {
  const job = getJob(req.params.jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      message: "Print job not found"
    });
  }

  return res.json({
    success: true,
    job
  });
});

app.listen(PORT, () => {
  console.log(
    `Solstice Check-in running on http://localhost:${PORT}`
  );
});