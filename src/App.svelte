<script>
  import { interpret } from "xstate";
  import { serialPortMachine } from "./serialPort";

  let values = "";

  async function loop() {
    const port = $serialPortService.context.selectedPort;
    while (port.readable) {
      const reader = $serialPortService.context.reader;
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          reader.releaseLock();
          return;
        }

        values += value + "\n";
      }
    }
  }

  const serialPortService = interpret(serialPortMachine)
    .onTransition((state) => {
      console.log(state.value, state.context);

      if (state.matches("portSelected.opened.reading")) {
        setTimeout(loop, 10);
      } else if (state.matches("portSelected.closed")) {
      }
    })
    .start();

  let baudRate = 115200;
</script>

<main>
  <h1>Serial Monitor</h1>
  <button
    on:click={() => {
      window.darkMode.toggle();
    }}>Toggle Dark Mode</button
  >

  <div>
    <label for="serialPortSelect">Select Serial Port</label>
    <select
      id="serialPortSelect"
      disabled={$serialPortService.matches("portSelected.opened")}
      on:click={(event) => {
        serialPortService.send({ type: "REQUEST_PORT" });
      }}
      on:change={(event) => {
        serialPortService.send({
          type: "USER_SELECTED_PORT",
          portId: event.target.value,
        });
      }}
    >
      <option value="">None Selected</option>
      {#each $serialPortService.context.ports as port}
        <option value={port.portId}>{port.portName}</option>
      {/each}
    </select>
  </div>
  <div>
    <label for="baudRate"> Baud rate </label>
    <input
      disabled={!$serialPortService.matches("portSelected.closed")}
      type="text"
      id="baudRate"
      bind:value={baudRate}
    />
  </div>
  <div>
    {#if $serialPortService.matches("portSelected.closed")}
      <button
        on:click={() => {
          serialPortService.send({ type: "OPEN", baudRate });
        }}>Open</button
      >
    {:else if $serialPortService.matches("portSelected.opened")}
      <button
        on:click={() => {
          serialPortService.send({ type: "CLOSE" });
        }}
      >
        Close
      </button>
    {:else}
      <button disabled>Select a Port</button>
    {/if}
  </div>

  <div class="serial-log serial-log-box">
    <pre>{values}</pre>
  </div>
</main>

<style>
  .serial-log-box {
    min-height: 500px;
    max-height: 500px;
    padding: 10px;
    overflow-y: auto;
  }

  @media (prefers-color-scheme: dark) {
    :global(body) {
      background: #333;
      color: white;
    }

    .serial-log {
      background: #666;
    }
  }

  @media (prefers-color-scheme: light) {
    :global(body) {
      background: #ddd;
      color: black;
    }

    .serial-log {
      background: #ccc;
    }
  }
</style>
