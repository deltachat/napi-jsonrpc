import { BaseDeltaChat, RPC, yerpc } from "@deltachat/jsonrpc-client";
import * as bindings from "./bindings.cjs";

/** it's not recommended to use these functions directly yet */
export * as low_level from "./bindings.cjs";
export * from "@deltachat/jsonrpc-client";

class NapiTransport extends yerpc.BaseTransport {
  constructor(private accountManager: bindings.AccountManager) {
    super();
    (async () => {
      while (true) {
        let response = await accountManager.jsonrpcNextResponse();
        const message: RPC.Message = JSON.parse(response);
        this._onmessage(message);
      }
    })();
  }
  _send(message: RPC.Message): void {
    this.accountManager.jsonrpcRequest(JSON.stringify(message));
  }
}

export class JsonRpcClient extends BaseDeltaChat<NapiTransport> {
  protected close() {
    /** noop */
    /** todo: shutdown? */
  }
  constructor(accountManager: bindings.AccountManager) {
    super(new NapiTransport(accountManager), true);
  }
}

export async function openDeltaChatInstance(dir: string) {
  return new JsonRpcClient(await bindings.AccountManager.new(dir))
}