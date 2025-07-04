use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;

use tokio::sync::mpsc::UnboundedSender;
use tokio_tungstenite::tungstenite::Message;

pub type Sender = UnboundedSender<Message>;

#[derive(Clone)]
pub struct ChatMessage {
    sender: String,
    content: String,
    timestamp: chrono::DateTime<chrono::Utc>,
}

pub struct Channel {
    senders: Vec<Sender>,
    messages: Vec<ChatMessage>,
}

impl Channel {
    fn new() -> Self {
        Channel {
            senders: Vec::new(),
            messages: Vec::new(),
        }
    }
}

pub struct ChannelManager {
    channels: Arc<Mutex<HashMap<String, Channel>>>,
}

impl ChannelManager {
    pub fn new() -> Self {
        ChannelManager {
            channels: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub async fn get_or_create_channel(&self, channel_name: String) {
        let mut channels = self.channels.lock().await;
        if !channels.contains_key(&channel_name) {
            channels.insert(channel_name.clone(), Channel::new());
        }
    }

    pub async fn add_sender_to_channel(&self, channel_name: String, sender: Sender) {
        let mut channels = self.channels.lock().await;

        if let Some(channel) = channels.get_mut(&channel_name) {
            channel.senders.push(sender.clone());

            for msg in &channel.messages {
                let chat_history = format!(
                    "MSG:{}:{}:{}:{}",
                    channel_name,
                    msg.sender,
                    msg.content,
                    msg.timestamp.format("%H:%M:%S")
                );

                sender
                    .send(Message::Text(chat_history.into()))
                    .expect("Failed to load chat history");
            }
        }
    }

    pub async fn remove_sender_from_channel(&self, channel_name: String, sender: Sender) {
        let mut channels = self.channels.lock().await;
        if let Some(channel) = channels.get_mut(&channel_name) {
            channel
                .senders
                .retain(|s| s as *const _ != &sender as *const _);
        }
    }

    pub async fn broadcast_message(
        &self,
        channel_name: String,
        sender_name: String,
        content: String,
        message: Message,
    ) {
        let mut channels = self.channels.lock().await;

        if let Some(channel) = channels.get_mut(&channel_name) {
            channel.messages.push(ChatMessage {
                sender: sender_name,
                content: content,
                timestamp: chrono::Utc::now(),
            });

            channel
                .senders
                .retain(|sender| match sender.send(message.clone()) {
                    Ok(_) => true,
                    Err(_) => false,
                });
        }
    }

    pub async fn get_active_rooms(&self) -> Vec<String> {
        let channles = self.channels.lock().await;

        channles.keys().cloned().collect()
    }
}
