mod channeltimer;

use std::env::args;
use std::fs;
use crate::channeltimer::{Status, TimerResult};

fn main() {
    let output_path = args().into_iter().nth(1);
    let output = output_path.unwrap_or(String::from("types.ts"));
    let lines = vec![
        Status::print_imports(),
        TimerResult::print_zod(),
        Status::print_zod(),
    ];
    fs::write(output, lines.join("\n\n")).expect("can write");
}
