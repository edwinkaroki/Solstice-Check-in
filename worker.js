const { connectQueue, QUEUE_NAME } = require("./queue");
const { updateJob } = require("./jobStore");
const fs = require("fs");

const PRINTER_URL =
  process.env.PRINTER_URL || "http://localhost:4000/print";

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
function updateAttendee(attendeeId, updates) {
  const data = getAttendees();

  const attendee = data.attendees.find(
    person => person.id === attendeeId
  );

  if (!attendee) {
    return false;
  }

  Object.assign(attendee, updates);

  saveAttendees(data);

  return true;
}
async function printBadge(job) {
  const response = await fetch(PRINTER_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      attendeeId: job.attendeeId,
      name: job.name
    })
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(
      result.message || "Badge printer rejected the request"
    );
  }
}

async function startWorker() {
  const { channel } = await connectQueue();

  console.log("Print worker waiting for jobs...");

  channel.consume(QUEUE_NAME, async (message) => {
    if (!message) {
      return;
    }

    const job = JSON.parse(message.content.toString());

    console.log(
      `Received print job ${job.id} for ${job.name}`
    );

    try {
      // Job has started processing
      updateJob(job.id, {
        status: "printing"
      });

      // Wait for the printer REST API
      await printBadge(job);

      // Printer succeeded
      const data = getAttendees();

      const attendee = data.attendees.find(
        person => person.id === job.attendeeId
      );

      updateAttendee(job.attendeeId, {
  checkedIn: true,
  printPending: false
})

      updateJob(job.id, {
        status: "printed",
        completedAt: new Date().toISOString()
      });

      console.log(
        `✅ Badge printed successfully for ${job.name}`
      );

      channel.ack(message);

   } catch (error) {
  updateAttendee(job.attendeeId, {
    printPending: false
  });

      console.error(
        `❌ Badge printing failed for ${job.name}:`,
        error.message
      );

      channel.ack(message);
    }
  });
}

startWorker().catch((error) => {
  console.error("Worker failed:", error);
});