import { openDeltaChatInstance, T, C } from "../index";

import type { BaseDeltaChat } from "@deltachat/jsonrpc-client";

async function main() {
  const dc: BaseDeltaChat<any> = await openDeltaChatInstance(
    "./test-deltachat-tmp"
  );

  // log all events to console
  dc.on("ALL", console.debug.bind("[core]"));

  // or only log what you want
  // dc.on("Info", console.info.bind("[core]"))
  // dc.on("Warning", console.warn.bind("[core]"))
  // dc.on("Error", console.error.bind("[core]"))

  let firstAccount: T.Account | undefined = (await dc.rpc.getAllAccounts())[0];
  if (!firstAccount) {
    firstAccount = await dc.rpc.getAccountInfo(await dc.rpc.addAccount());
  }
  if (firstAccount.type === "Unconfigured") {
    console.info("account not configured, trying to login now...");
    try {
      if (!!process.env.ADDR && !!process.env.MAIL_PW) {
        await dc.rpc.batchSetConfig(firstAccount.id, {
          addr: process.env.ADDR,
          mail_pw: process.env.MAIL_PW,
        });
      } else if (!!process.env.DCC_NEW_TMP_EMAIL) {
        const uri = "DCACCOUNT:" + process.env.DCC_NEW_TMP_EMAIL;
        const qr = await dc.rpc.checkQr(firstAccount.id, uri);
        if (qr.type !== "account") {
          throw new Error(
            "DCC_NEW_TMP_EMAIL does not contain an account creation uri"
          );
        }
        await dc.rpc.setConfigFromQr(firstAccount.id, uri);
        console.info(
          "BOT EMAIL:",
          await dc.rpc.getConfig(firstAccount.id, "addr")
        );
      } else {
        throw new Error(
          "Credentials missing, you need to set either ADDR and MAIL_PW, or DCC_NEW_TMP_EMAIL enviroment variables"
        );
      }
      await dc.rpc.batchSetConfig(firstAccount.id, {
        bot: "true",
        e2ee_enabled: "true",
      });
      await dc.rpc.configure(firstAccount.id);
    } catch (error) {
      console.error("Could not log in to account:", error);
      process.exit(1);
    }
  }

  const botAccountId = firstAccount.id;
  const emitter = dc.getContextEvents(botAccountId);
  emitter.on("IncomingMsg", async ({ chatId, msgId }) => {
    const chat = await dc.rpc.getBasicChatInfo(botAccountId, chatId);
    // only echo to DM chat
    if (chat.chatType === C.DC_CHAT_TYPE_SINGLE) {
      const message = await dc.rpc.messageGetMessage(botAccountId, msgId);
      await dc.rpc.miscSendTextMessage(
        botAccountId,
        message.text || "",
        chatId
      );
    }
  });
}

main();

// TODO: there should also be a simpler api that does the setup for you (bot usecase)
// TODO: idea: dc.getContextEvents could be dc.getContext and return a context/account class
//       that containins the methods of .rpc, but with accountId parameter already set
//       should be auto generated,
//       also would be nice to have functions without accountId directly under the client also.
