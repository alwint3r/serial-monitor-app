import { assign, createMachine } from "xstate";

const { rendererIpc } = window;

function requestPort() {
  return navigator.serial.requestPort();
}

class LineBreakTransformer {
  constructor() {
    this.chunks = "";
  }

  transform(chunk, controller) {
    // Append new chunks to existing chunks.
    this.chunks += chunk;

    // For each line breaks in chunk, send the parsed line out
    let lines = this.chunks.split("\r");
    lines = lines.map((line) => line.replace("\n", ""));

    this.chunks = lines.pop();
    lines.forEach((line) => controller.enqueue(line));
  }

  flush(controller) {
    controller.enqueue(this.chunks);
  }
}

export const serialPortMachine = createMachine({
  id: "serialPortMachine",
  initial: "idle",
  context: {
    selectedPort: {},
    ports: [],
    reader: {},
  },
  states: {
    idle: {
      on: {
        REQUEST_PORT: {
          target: "requesting",
        },
      },
    },

    requesting: {
      invoke: [
        {
          id: "requestPort",
          src: (context, event) => requestPort(),
          onDone: {
            target: "portSelected",
            actions: assign({
              selectedPort: (context, event) => event.data,
            }),
          },
        },
      ],
      initial: "waitForPortLists",
      states: {
        waitForPortLists: {
          invoke: {
            id: "setIpcHandler",
            src: (context, event) => (callback, onReceive) => {
              function handleSerialPortsAvailable(event, ports) {
                callback({ type: "PORTS_AVAILABLE", ports });
              }

              rendererIpc.on(
                "serial:ports-available",
                handleSerialPortsAvailable
              );

              return () => {
                rendererIpc.removeEventListener(
                  "serial:ports-available",
                  handleSerialPortsAvailable
                );
              };
            },
          },

          on: {
            PORTS_AVAILABLE: {
              actions: assign({
                ports: (context, event) => event.ports,
              }),
              target: "waitingForUserInput",
            },
          },
        },

        waitingForUserInput: {
          on: {
            USER_SELECTED_PORT: {
              actions: (context, event) => {
                rendererIpc.send("serial:selected-port", event.portId);
              },
            },
          },
        },
      },
    },

    portSelected: {
      initial: "closed",
      on: {
        REQUEST_PORT: {
          target: "requesting",
        },
      },

      states: {
        closed: {
          on: {
            OPEN: {
              target: "opened",
            },
          },
        },

        opened: {
          initial: "idle",

          invoke: {
            id: "openSerialPort",
            src: (context, event) => {
              const option = {
                baudRate: parseInt(event.baudRate, 10),
              };

              return context.selectedPort.open(option);
            },
            onDone: {
              target: ".reading",
              actions: assign((context, event) => {
                const { selectedPort } = context;
                const textDecoder = new TextDecoderStream();
                const readableStreamClosed = selectedPort.readable.pipeTo(
                  textDecoder.writable
                );
                const reader = textDecoder.readable
                  .pipeThrough(new TransformStream(new LineBreakTransformer()))
                  .getReader();
                return {
                  ...context,
                  reader,
                  readableStreamClosed,
                };
              }),
            },
          },

          states: {
            idle: {},

            reading: {},
          },

          on: {
            CLOSE: {
              target: "closed",
              actions: async (context, event) => {
                context.reader.cancel();
                await context.readableStreamClosed.catch(() => {});

                return context.selectedPort.close();
              },
            },
          },
        },
      },
    },
  },
});
