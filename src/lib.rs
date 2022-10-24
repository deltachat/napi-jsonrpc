#![deny(clippy::all)]

use async_channel::Receiver;
use deltachat::accounts::Accounts;
use deltachat_jsonrpc::events::event_to_json_rpc_notification;
use deltachat_jsonrpc::yerpc::{RpcClient, RpcSession};
use deltachat_jsonrpc::{api::CommandApi, yerpc::Message};
use napi::bindgen_prelude::*;

use std::sync::Arc;
use tokio::sync::RwLock;

#[macro_use]
extern crate napi_derive;

#[napi]
pub struct AccountManager {
  accounts: Arc<RwLock<Accounts>>,
  jsonrpc: RpcSession<CommandApi>,
  jsonrpc_recv: Receiver<Message>,
}

#[napi]
impl AccountManager {
  /// Loads or creates an accounts folder at the given `dir`.
  #[napi]
  pub async fn new(dir: String) -> napi::Result<AccountManager> {
    match Accounts::new(dir.into()).await {
      Ok(manager) => {
        let accounts = Arc::new(RwLock::new(manager));
        let accounts2 = accounts.clone();
        let cmd_api = CommandApi::from_arc(accounts);
        let (request_handle, receiver) = RpcClient::new();
        let request_handle2 = request_handle.clone();
        let jsonrpc = RpcSession::new(request_handle, cmd_api);

        let events = { accounts2.read().await.get_event_emitter() };
        spawn({
          async move {
            while let Some(event) = events.recv().await {
              let event = event_to_json_rpc_notification(event);
              if let Err(err) = request_handle2
                .send_notification("event", Some(event))
                .await
              {
                eprintln!("Failed to process event {}", err);
              }
            }
          }
        });

        Ok(AccountManager {
          accounts: accounts2,
          jsonrpc,
          jsonrpc_recv: receiver,
        })
      }
      Err(err) => Err(napi::Error::new(napi::Status::Unknown, err.to_string())),
    }
  }

  #[napi]
  pub async fn stop_io(&self) -> () {
    self.accounts.write().await.stop_io().await;
  }

  #[napi]
  pub async fn start_io(&self) -> () {
    self.accounts.write().await.start_io().await;
  }

  #[napi]
  pub async fn jsonrpc_request(&self, request: String) -> () {
    self.jsonrpc.handle_incoming(&request).await
  }

  #[napi]
  pub async fn jsonrpc_next_response(&self) -> napi::Result<String> {
    match self.jsonrpc_recv.recv().await {
      Ok(message) => {
        let response = serde_json::to_string(&message)?;
        Ok(response)
      }
      Err(err) => Err(napi::Error::new(napi::Status::Unknown, err.to_string())),
    }
  }

  #[napi]
  pub async fn get_account_ids(&self) -> napi::Result<Vec<u32>> {
    Ok(self.accounts.read().await.get_all())
  }
}
