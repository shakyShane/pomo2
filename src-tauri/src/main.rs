#![cfg_attr(
all(not(debug_assertions), target_os = "windows"),
windows_subsystem = "windows"
)]

use std::process::Command;
use std::task::Poll;
use std::{thread};
use tauri::{Manager, Window};
use std::time::{Duration, Instant};
use crossbeam::channel::RecvError;
use futures::SinkExt;

mod channeltimer;

use futures::future;
use futures::stream::{self, StreamExt};
use crate::channeltimer::{Control, Status};

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let w = app.get_window("pomo22");
            dbg!(&w);
            if let Some(v) = w.as_ref() {
                v.open_devtools();
                // v.listen("plz-pause", |event| {
                //   println!("got event-name with payload {:?}", event.payload());
                // });
            }
            // listen to the `event-name` (emitted on any window)
            // unlisten to the event using the `id` returned on the `listen_global` function
            // an `once_global` API is also exposed on the `App` struct
            // app.unlisten(id);
            Ok(())
        })
        // .invoke_handler(tauri::generate_handler![my_custom_command])
        .invoke_handler(tauri::generate_handler![timer2])
        // .invoke_handler(tauri::generate_handler![timer])
        // .menu(tauri::Menu::os_default(&context.package_info().name))
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}


#[tauri::command]
fn my_custom_command() {
    Command::new("shortcuts")
        .arg("run")
        .arg("playpause")
        .spawn()
        .expect("yupyup");
}

// the payload type must implement `Serialize` and `Clone`.
#[derive(Default, Clone, serde::Serialize)]
struct Payload {
    message: String,
}

#[tauri::command]
async fn timer2(arg: u64, window: tauri::Window) {
    let (emitter_sender, mut emitter_receiver) = tokio::sync::mpsc::channel::<Status>(20);
    let (ctrl_sender, mut ctrl_recv) = tokio::sync::mpsc::channel::<Control>(1);
    let wc = window.clone();
    let handle = tokio::spawn(async move {
        while let Some(i) = emitter_receiver.recv().await {
            wc.emit("status", i).expect("emitter");
        }
    });

    let wc = window.clone();
    let id = wc.listen("plz-pause", move |evt| {
        let c2 = ctrl_sender.clone();
        tokio::spawn(async move {
            c2.send(Control::Stop).await.expect("stop command issue")
        });
    });

    let time_result = channeltimer::timer(emitter_sender, ctrl_recv).await;
    dbg!(&time_result);
    wc.unlisten(id);
    tokio::join!(handle);
    wc.emit("status", Status::End { result: time_result }).expect("emitter");
}
