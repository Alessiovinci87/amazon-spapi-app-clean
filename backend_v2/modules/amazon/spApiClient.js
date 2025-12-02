// backend_v2/modules/amazon/spApiClient.js
const crypto = require("crypto");
const axios = require("axios");

const REGION = "eu-west-1";
const SERVICE = "execute-api";
const HOST = "sellingpartnerapi-eu.amazon.com";

function signRequest({ method, path, query = "", accessToken, awsAccessKey, awsSecretKey }) {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.substring(0, 8);

  const canonicalUri = path;
  const canonicalQuerystring = query;

  // ✅ includiamo anche x-amz-access-token tra gli headers firmati
  const canonicalHeaders =
    `host:${HOST}\n` +
    `x-amz-access-token:${accessToken}\n` +
    `x-amz-date:${amzDate}\n`;

  const signedHeaders = "host;x-amz-access-token;x-amz-date";

  const payloadHash = crypto.createHash("sha256").update("", "utf8").digest("hex");

  const canonicalRequest =
    method + "\n" +
    canonicalUri + "\n" +
    canonicalQuerystring + "\n" +
    canonicalHeaders + "\n" +
    signedHeaders + "\n" +
    payloadHash;

  const algorithm = "AWS4-HMAC-SHA256";
  const credentialScope = dateStamp + "/" + REGION + "/" + SERVICE + "/aws4_request";
  const stringToSign =
    algorithm + "\n" +
    amzDate + "\n" +
    credentialScope + "\n" +
    crypto.createHash("sha256").update(canonicalRequest, "utf8").digest("hex");

  function sign(key, msg) {
    return crypto.createHmac("sha256", key).update(msg).digest();
  }

  const kDate = sign(("AWS4" + awsSecretKey), dateStamp);
  const kRegion = sign(kDate, REGION);
  const kService = sign(kRegion, SERVICE);
  const kSigning = sign(kService, "aws4_request");
  const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");

  const authorizationHeader =
    algorithm + " " +
    "Credential=" + awsAccessKey + "/" + credentialScope + ", " +
    "SignedHeaders=" + signedHeaders + ", " +
    "Signature=" + signature;

  return { amzDate, authorizationHeader };
}

async function spApiGet({ path, query, accessToken, awsAccessKey, awsSecretKey }) {
  const url = `https://${HOST}${path}${query ? "?" + query : ""}`;

  const { amzDate, authorizationHeader } = signRequest({
    method: "GET",
    path,
    query,
    accessToken,
    awsAccessKey,
    awsSecretKey
  });

  const headers = {
    host: HOST,
    "x-amz-date": amzDate,
    "x-amz-access-token": accessToken,
    Authorization: authorizationHeader
  };

  const response = await axios.get(url, { headers });
  return response.data;
}

module.exports = { spApiGet };
