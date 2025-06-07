use log::info;
use std::{env, sync::Arc};
use tokio::net::TcpListener;

use crate::channel::ChannelManager;
use crate::websocket::handle_connection;
pub async fn start_server() {
    dotenv::dotenv().ok();
    env_logger::init();

    let host = env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let port = env::var("PORT").unwrap_or_else(|_| "8080".to_string());

    let address = format!("{}:{}", host, port);

    let listener = TcpListener::bind(&address)
        .await
        .expect("Failed to connect");

    println!("Server is running on address: {}", address);

    let channel_manager = Arc::new(ChannelManager::new());

    while let Ok((stream, addr)) = listener.accept().await {
        let channel_manager = channel_manager.clone();
        info!("New connection from {}", addr);

        tokio::spawn(async move {
            let _ = handle_connection(stream, addr, channel_manager).await;
        });
    }
}
