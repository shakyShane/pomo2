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

#[serde_zod::my_attribute]
#[derive(Debug, Clone, serde::Serialize)]
#[serde(tag = "kind")]
pub enum Status {
    Start { elapsed: u64, rem: u64 },
    Tick { elapsed: u64, rem: u64 },
    End { result: TimerResult }
}

#[serde_zod::my_attribute]
#[derive(Debug, Clone, serde::Serialize)]
#[serde(tag = "kind")]
pub enum TimerResult {
    Ended,
    EndedPrematurely,
}

pub async fn main(emitter: Sender<Status>) -> Result<TimerResult, Box<dyn std::error::Error>> {
    let now = Instant::now();
    let mut elapsed = 0_u64;
    let duration = Duration::from_secs(10);
    let max = duration.as_secs();
    emitter.send(Status::Start { elapsed, rem: max }).await?;
    loop {
        sleep(Duration::from_millis(50)).await;
        let curr = now.elapsed().as_secs();
        if curr != elapsed {
            let remaining = max - curr;
            emitter.send(Status::Tick { elapsed: curr, rem: remaining }).await?;
            elapsed = curr;
            if elapsed == 10 {
                return Ok(TimerResult::Ended);
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
