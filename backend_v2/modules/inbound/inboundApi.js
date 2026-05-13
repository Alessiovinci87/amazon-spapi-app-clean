// Facade che sceglie tra il client SP-API reale e quello mock,
// in base alla env INBOUND_TEST_MODE.
const realClient = require("./inboundApiClient");
const mockClient = require("./inboundApiMock");

function isMockEnabled() {
  return String(process.env.INBOUND_TEST_MODE || "").trim() === "1";
}

function pickClient() {
  return isMockEnabled() ? mockClient : realClient;
}

// Lista dei metodi che vogliamo esporre: tutti quelli di realClient
const METHODS = Object.keys(realClient);

const facade = { isMockEnabled };
for (const m of METHODS) {
  facade[m] = (...args) => pickClient()[m](...args);
}

module.exports = facade;
