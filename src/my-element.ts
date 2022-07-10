import {html, css, LitElement, PropertyValues} from 'lit'
import { Command } from '@tauri-apps/api/shell'
import { customElement, property, state } from 'lit/decorators.js'
import {invokeShortcut, listShortcuts} from "./services/macos-shortcuts";
import {listen, emit} from "@tauri-apps/api/event";
import { invoke } from '@tauri-apps/api/tauri';
import { appWindow } from "@tauri-apps/api/window";

/**
 * An example element.
 *
 * @slot - This element has a slot
 * @csspart button - The button
 */
@customElement('my-element')
export class MyElement extends LitElement {
  static styles = css`
    :host {
      display: block;
      border: solid 1px gray;
      padding: 16px;
      max-width: 800px;
    }
  `

  @state()
  shortcuts: string[] = []

  @state()
  remaining: number = 0;

  @state()
  state: "running" | "ended" | "ended-prematurely" | "idle" = "idle";

  /**
   * The name to say "Hello" to.
   */
  @property()
  name = 'World'

  /**
   * The number of times the button has been clicked.
   */
  @property({ type: Number })
  count = 0

  async _playpause(event) {
    const shortcuts = await listShortcuts();
    this.shortcuts = shortcuts
  }

  async invoke() {
    // const lines = await invokeShortcut()
    console.log('starting...');

    if (this.unlisten) {
      this.unlisten.call(null)
    }
    this.unlisten = await listen<{kind:string}>('status', event => {
      console.log(event.payload);
      switch (event.payload.kind) {
        case "Start": {
          this.state = 'running';
          break;
        }
        case "Tick": {
          this.remaining = event.payload.time;
          break;
        }
        case "End": {
          if (event.payload.result === "Ended") {
            this.remaining = 0;
            this.state = "ended"
            console.log('ended correctly!')
          }
          if (event.payload.result === "EndedPrematurely") {
              this.state = "ended-prematurely";
          }
          break
        }
        default: {
          console.warn("unknown message", event)
        }
      }
    });

    invoke("timer2", {arg: 5}).catch(e => {
      console.log('could not invoke', e);
    })
  }

  async resume() {
    console.log('RESUME');
  }

  async stop() {
    await emit("plz-pause").catch(e => console.error(e));
  }

  render() {
    return html`
      <button @click=${this._playpause}>
          Start
      </button>
      <div>
          <ul>${this.shortcuts.map(sc => html`
              <li>
                  ${sc} <button @click=${()=>this.invoke(sc)}>Invoke</button>
                  <span><em>${this.state} ${this.remaining}</em></span>
                  ${this.state === "running" ? html`<button @click=${() => this.stop()}>STOP</button>` : null}
                  ${this.state === "ended-prematurely" ? html`<button @click=${() => this.resume()}>Resume</button>` : null}
              </li>
          `)}</ul>
      </div>
    `
  }

  private _onClick() {
    this.count++
  }

  foo(): string {
    return 'foo'
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'my-element': MyElement
  }
}
