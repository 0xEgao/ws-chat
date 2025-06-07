mod channel;
mod server;
mod websocket;
#[tokio::main]
async fn main() {
    server::start_server().await;
}
