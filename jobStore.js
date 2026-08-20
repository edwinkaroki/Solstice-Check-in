const fs = require("fs");

const FILE = "print_jobs.json";

function getJobs() {
  const data = fs.readFileSync(FILE, "utf8");
  return JSON.parse(data);
}

function createJob(job) {
  const data = getJobs();

  data.jobs.push(job);

  fs.writeFileSync(
    FILE,
    JSON.stringify(data, null, 2)
  );
}

function updateJob(jobId, updates) {
  const data = getJobs();

  const job = data.jobs.find(
    item => item.id === jobId
  );

  if (!job) {
    return false;
  }

  Object.assign(job, updates);

  fs.writeFileSync(
    FILE,
    JSON.stringify(data, null, 2)
  );

  return true;
}

function getJob(jobId) {
  const data = getJobs();

  return data.jobs.find(
    item => item.id === jobId
  );
}

module.exports = {
  createJob,
  updateJob,
  getJob
};
