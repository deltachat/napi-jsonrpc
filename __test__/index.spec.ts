import test from "ava";
import { tmpdir } from "os";
import { join } from "path";
import { openDeltaChatInstance } from "../index.js";

function testDir(prefix = "") {
  return join(tmpdir(), prefix + `dc-test${Math.random()}-${Date.now()}`);
}

test("jsonrpc wrapper smoketest", async (t) => {
  const dc = await openDeltaChatInstance(testDir("real"));

  dc.on("ALL", console.debug.bind("[core]"));

  const accountId = await dc.rpc.addAccount();
  t.is(accountId, 1);
  t.deepEqual(await dc.rpc.getAllAccountIds(), [1]);
});
