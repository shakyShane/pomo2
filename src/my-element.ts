import { html, css, LitElement } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { listShortcuts } from "./services/macos-shortcuts";
import {listen, emit} from "@tauri-apps/api/event";
import { invoke } from '@tauri-apps/api/tauri';
import {Status} from "./types";

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
  elapsed: number = 0;

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


  unlisten: (()=>void) | null = null;

  async _playpause(event) {
    const shortcuts = await listShortcuts();
    this.shortcuts = shortcuts
  }

  async invoke() {
    // const lines = await invokeShortcut()
    let invokedTime = new Date().getTime();
    console.log('starting at ', invokedTime);

    if (this.unlisten) {
      this.unlisten.call(null)
    }
    this.unlisten = await listen<{kind:string, payload?: any}>('status', incoming => {
      console.log(incoming.payload);
      const event = Status.parse(incoming.payload);
      switch (event.kind) {
        case "Start": {
          this.remaining = event.rem;
          this.elapsed = event.elapsed;
          this.state = 'running';
          break;
        }
        case "Tick": {
          this.remaining = event.rem;
          this.elapsed = event.elapsed;
          break;
        }
        case "End": {
          if (event.result.kind === "Ended") {
            console.log('ended correctly at ', new Date().getTime())
            this.remaining = 0;
            this.state = "ended"
          }
          if (event.result.kind === "EndedPrematurely") {
              this.state = "ended-prematurely";
          }
          console.log('ran for %dms', new Date().getTime() - invokedTime)
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

  get runner() {
    return html`<button @click=${() => this.stop()}>STOP</button>`
  }

  get status() {
    return html`<pre><code>${JSON.stringify({remaining: this.remaining, elapsed: this.elapsed, state: this.state}, null, 2)}</code></pre>`
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
                  ${this.state === "running" ? [this.status, this.runner] : null}
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
