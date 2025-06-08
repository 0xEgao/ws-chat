use futures::{SinkExt, StreamExt};
use std::net::SocketAddr;
use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::{accept_async, tungstenite::Message};

#[tokio::main]
async fn main() {
    let address = "127.0.0.1:8080";
    let listener = TcpListener::bind(&address)
        .await
        .expect("Failed to connect");
    println!("Connected to address : {}", address);
    while let Ok((stream, addr)) = listener.accept().await {
        tokio::spawn(async move {
            let _ = handle_connection(stream, addr).await;
        });
    }
}

pub async fn handle_connection(stream: TcpStream, addr: SocketAddr) {
    let ws_stream = accept_async(stream)
        .await
        .expect("error during websocket handshake");

    println!("New connection from {}", addr);

    let (mut write, mut read) = ws_stream.split();

    while let Some(message) = read.next().await {
        match message {
            Ok(Message::Text(text)) => {
                if text.eq_ignore_ascii_case("ping") {
                    println!("Received 'Ping' from {}", addr);
                    write
                        .send(Message::Text("pong".to_string().into()))
                        .await
                        .unwrap();
                } else {
                    println!("Received {} from client", text.to_string());
                }
            }
            Ok(Message::Ping(payload)) => {
                println!("Received websocket ping from {}", addr);
                write.send(Message::Pong(payload)).await.unwrap();
            }
            Ok(_) => {}
            Err(_) => break,
        }
    }
}
