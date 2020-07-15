import { expect } from "chai";

import pkg from "../package.json";
import { initApp } from "../src/app";
import { App, safeJsonParse } from "../src/helpers";

import { STAGING_URLS } from "./shared";

describe("Server", () => {
  let app: App;
  beforeEach(async () => {
    app = (await initApp({ ...STAGING_URLS, logLevel: 0 })).app;
  });
  describe("GET /hello", () => {
    it("should return a message text", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/hello",
      });
      expect(res.statusCode).to.equal(200);
      expect(res.body).to.equal(`Hello World, this is Connext client`);
    });
  });
  describe("GET /version", () => {
    it("should match package.json version", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/version",
      });
      const json = safeJsonParse(res.body);
      expect(res.statusCode).to.equal(200);

      expect(json).to.deep.equal({ version: pkg.version });
    });
  });
  describe("POST /create", () => {
    it("should create channel with random mnemonic", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/create",
      });
      const json = safeJsonParse(res.body);
      expect(res.statusCode).to.equal(200);
      expect(json.multisigAddress).to.exist;
      expect(json.signerAddress).to.exist;
      expect(json.userIdentifier).to.exist;
      expect(json.nodeUrl).to.exist;
    });
  });
});
