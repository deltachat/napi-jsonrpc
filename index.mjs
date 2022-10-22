var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { BaseDeltaChat, yerpc } from "@deltachat/jsonrpc-client";
import * as bindings from "./bindings.js";
import * as low_level_1 from "./bindings.js";
export { low_level_1 as low_level };
export * from "@deltachat/jsonrpc-client";
class NapiTransport extends yerpc.BaseTransport {
    constructor(accountManager) {
        super();
        this.accountManager = accountManager;
        (() => __awaiter(this, void 0, void 0, function* () {
            while (true) {
                let response = yield accountManager.jsonrpcNextResponse();
                const message = JSON.parse(response);
                this._onmessage(message);
            }
        }))();
    }
    _send(message) {
        this.accountManager.jsonrpcRequest(JSON.stringify(message));
    }
}
export class JsonRpcClient extends BaseDeltaChat {
    close() {
        /** noop */
        /** todo: shutdown? */
    }
    constructor(accountManager) {
        super(new NapiTransport(accountManager));
    }
}
export function openDeltaChatInstance(dir) {
    return __awaiter(this, void 0, void 0, function* () {
        return new JsonRpcClient(yield bindings.AccountManager.new(dir));
    });
}
