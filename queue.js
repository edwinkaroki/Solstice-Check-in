const amqp = require("amqplib");

const QUEUE_NAME = "print_jobs";
const RABBITMQ_URL = "amqp://localhost";

let connection;
let channel;

async function connectQueue() {
  if (channel) {
    return { connection, channel };
  }

  connection = await amqp.connect(RABBITMQ_URL);
  channel = await connection.createChannel();

  await channel.assertQueue(QUEUE_NAME, {
    durable: true
  });

  console.log(`RabbitMQ queue ready: ${QUEUE_NAME}`);

  return { connection, channel };
}

async function publishPrintJob(job) {
  const { channel } = await connectQueue();

  channel.sendToQueue(
    QUEUE_NAME,
    Buffer.from(JSON.stringify(job)),
    {
      persistent: true
    }
  );
}

module.exports = {
  QUEUE_NAME,
  connectQueue,
  publishPrintJob
};