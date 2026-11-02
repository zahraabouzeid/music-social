use std::sync::Arc;

use serde_json::Value;
use tokio::sync::broadcast;
use uuid::Uuid;

const BUFFER: usize = 1024;

#[derive(Debug)]
pub struct Event {
    pub recipients: Vec<Uuid>,
    pub data: Value,
}

#[derive(Clone)]
pub struct Hub {
    sender: broadcast::Sender<Arc<Event>>,
}

impl Default for Hub {
    fn default() -> Self {
        let (sender, _) = broadcast::channel(BUFFER);
        Self { sender }
    }
}

impl Hub {
    pub fn publish(&self, recipients: Vec<Uuid>, data: Value) {
        let _ = self.sender.send(Arc::new(Event { recipients, data }));
    }

    pub fn subscribe(&self) -> broadcast::Receiver<Arc<Event>> {
        self.sender.subscribe()
    }
}
