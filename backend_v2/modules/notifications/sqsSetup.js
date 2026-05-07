// Setup AWS SQS per ricevere SP-API Notifications.
// Crea la coda e applica la resource policy che consente al servizio
// Amazon SP-API di scrivere eventi (Principal: 437568002678, l'account
// AWS interno di Amazon che pubblica le notifications).

const {
  SQSClient,
  CreateQueueCommand,
  GetQueueAttributesCommand,
  GetQueueUrlCommand,
  SetQueueAttributesCommand,
} = require("@aws-sdk/client-sqs");

const logger = require("../../utils/logger");

const AMAZON_SPAPI_PRINCIPAL = "arn:aws:iam::437568002678:root";

function getClient() {
  return new SQSClient({
    region: process.env.AWS_REGION || "eu-west-1",
  });
}

async function ensureQueue() {
  const client = getClient();
  const queueName = process.env.SQS_QUEUE_NAME || "picsnails-amazon-events";
  const region = process.env.AWS_REGION || "eu-west-1";
  const accountId = process.env.AWS_ACCOUNT_ID;
  if (!accountId) throw new Error("AWS_ACCOUNT_ID non impostato in .env");

  const queueArn = `arn:aws:sqs:${region}:${accountId}:${queueName}`;
  let queueUrl;

  try {
    const r = await client.send(new GetQueueUrlCommand({ QueueName: queueName }));
    queueUrl = r.QueueUrl;
    logger.info({ queueUrl }, "[SQS] coda esistente trovata");
  } catch (e) {
    if (e.name === "QueueDoesNotExist" || e.name === "AWS.SimpleQueueService.NonExistentQueue") {
      const r = await client.send(new CreateQueueCommand({
        QueueName: queueName,
        Attributes: {
          // Long polling default per ridurre chiamate vuote
          ReceiveMessageWaitTimeSeconds: "20",
          // Visibility 5 min: dà tempo al worker di processare prima di
          // rivedere il messaggio (evita doppi processing)
          VisibilityTimeout: "300",
          // Tieni messaggi 7 giorni se nessun worker li consuma
          MessageRetentionPeriod: String(7 * 24 * 60 * 60),
        },
      }));
      queueUrl = r.QueueUrl;
      logger.info({ queueUrl }, "[SQS] coda creata");
    } else {
      throw e;
    }
  }

  // Resource policy: consenti ad Amazon SP-API di scrivere
  const policy = {
    Version: "2012-10-17",
    Statement: [{
      Sid: "AllowAmazonSpapi",
      Effect: "Allow",
      Principal: { AWS: AMAZON_SPAPI_PRINCIPAL },
      Action: "SQS:SendMessage",
      Resource: queueArn,
    }],
  };

  await client.send(new SetQueueAttributesCommand({
    QueueUrl: queueUrl,
    Attributes: { Policy: JSON.stringify(policy) },
  }));
  logger.info("[SQS] resource policy aggiornata (consenti Amazon SP-API)");

  return { queueUrl, queueArn };
}

async function getQueueInfo() {
  const client = getClient();
  const queueName = process.env.SQS_QUEUE_NAME || "picsnails-amazon-events";
  const r = await client.send(new GetQueueUrlCommand({ QueueName: queueName }));
  const queueUrl = r.QueueUrl;
  const attr = await client.send(new GetQueueAttributesCommand({
    QueueUrl: queueUrl,
    AttributeNames: ["All"],
  }));
  return { queueUrl, attributes: attr.Attributes };
}

module.exports = { ensureQueue, getQueueInfo };
