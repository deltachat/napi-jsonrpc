//@ts-check
import test from "ava";
import { tmpdir } from "os";
import { join } from "path";

import low_level from "../bindings.cjs";

function testDir(prefix = "") {
  return join(tmpdir(), prefix + `dc-test${Math.random()}-${Date.now()}`);
}

test("create account manager", async (t) => {
  const am = await low_level.AccountManager.new(testDir("1"));

  t.deepEqual(await am.getAccountIds(), []);
});

test("jsonrpc low_level smoketest 1", async (t) => {
  const am = await low_level.AccountManager.new(testDir("2"));

  await am.jsonrpcRequest(
    JSON.stringify({
      jsonrpc: "2.0",
      method: "get_all_account_ids",
      params: [],
      id: 1,
    })
  );

  t.deepEqual(
    {
      jsonrpc: "2.0",
      id: 1,
      result: [],
    },
    JSON.parse(await am.jsonrpcNextResponse())
  );
});

test("jsonrpc low_level smoketest 2", async (t) => {
  const am = await low_level.AccountManager.new(testDir("3"));
  const promises: Record<number, (value: unknown) => void> = {};
  (async () => {
    let msg;
    while ((msg = await am.jsonrpcNextResponse())) {
      const response = JSON.parse(msg);
      promises[response.id]?.(response);
      delete promises[response.id];
    }
  })();
  const call = (request: any) => {
    am.jsonrpcRequest(JSON.stringify(request));
    return new Promise((res, _rej) => {
      promises[request.id] = res;
    });
  };

  t.deepEqual(
    {
      jsonrpc: "2.0",
      id: 2,
      result: [],
    },
    await call({
      jsonrpc: "2.0",
      method: "get_all_account_ids",
      params: [],
      id: 2,
    })
  );

  t.deepEqual(
    {
      jsonrpc: "2.0",
      id: 3,
      result: 1,
    },
    await call({
      jsonrpc: "2.0",
      method: "add_account",
      params: [],
      id: 3,
    })
  );

  t.deepEqual(
    {
      jsonrpc: "2.0",
      id: 4,
      result: [1],
    },
    await call({
      jsonrpc: "2.0",
      method: "get_all_account_ids",
      params: [],
      id: 4,
    })
  );
});
