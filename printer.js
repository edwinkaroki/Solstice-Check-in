const express = require("express");

const app = express();

app.use(express.json());

const PORT = 4000;

app.post("/print", (req, res) => {
  const { attendeeId, name } = req.body;

  console.log(`Printer received badge request for ${name} (${attendeeId})`);

  // Simulate the printer processing the badge
  setTimeout(() => {
    console.log(`Badge printed for ${name}`);

    res.json({
      success: true,
      message: "Badge printed successfully"
    });
  }, 1000);
});

app.listen(PORT, () => {
  console.log(`Badge Printer API running on http://localhost:${PORT}`);
});