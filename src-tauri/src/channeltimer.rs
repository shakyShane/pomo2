use std::ops::Add;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::mpsc::{Receiver, Sender};
use tokio::sync::Mutex;
use tokio::time::{sleep, Instant};
use tokio::{join, select};

#[derive(Debug)]
pub enum Control {
    Stop,
    Toggle,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(tag = "kind")]
pub enum Status {
    Start,
    Tick { time: u64 },
    End { result: TimerResult }
}

#[derive(Debug, Clone, serde::Serialize)]
pub enum TimerResult {
    Ended,
    EndedPrematurely,
}

pub async fn main(emitter: Sender<Status>) -> Result<TimerResult, Box<dyn std::error::Error>> {
    let now = Instant::now();
    let duration = Duration::from_secs(10);
    let mut rem = duration.as_secs().clone();
    emitter.send(Status::Start).await?;
    loop {
        sleep(Duration::from_millis(50)).await;
        let elapsed = now.elapsed();
        let remaining = duration - elapsed;
        let remaining_secs = remaining.as_secs();
        match remaining_secs {
            0 => {
                return Ok(TimerResult::Ended);
            }
            secs => {
                if secs != rem {
                    rem = remaining.as_secs();
                    emitter.send(Status::Tick { time: rem }).await?;
                }
            }
        }
    }
}

pub async fn timer(emitter_sender: Sender<Status>, mut ctrl_recv: Receiver<Control>) -> TimerResult {
    select! {
        v = main(emitter_sender) => {
            TimerResult::Ended
        }
        _1 = ctrl_recv.recv() => {
            TimerResult::EndedPrematurely
        }
    }
}
