import "mocha";
import { expect, request, use } from "chai";
import chaiHttp from "chai-http";

import pkg from "../package.json";

import app from "../src";

use(chaiHttp);

describe("Server", () => {
  let agent: ChaiHttp.Agent;
  beforeEach(() => {
    agent = request(app.server);
    console.log("AGENTTTTT");
  });
  describe("GET /hello", () => {
    it("should return a message text", () => {
      agent.get("/hello").end((err, res) => {
        // eslint-disable-next-line no-unused-expressions
        expect(err).to.be.null;
        expect(res).to.have.status(200);
        expect(res.text).to.equal(`Hello World, this is Connext client`);
      });
    });
  });
  describe("GET /version", () => {
    it("should match package.json version", () => {
      agent.get("/version").end((err, res) => {
        // eslint-disable-next-line no-unused-expressions
        expect(err).to.be.null;
        expect(res).to.have.status(200);
        expect(res.body).to.deep.equal({ version: pkg.version });
      });
    });
  });
});
