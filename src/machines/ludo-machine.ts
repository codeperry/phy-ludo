import { setup, and, or, assign } from "xstate";
import * as constants from "../ludo-consts.js";

// https://excalidraw.com/#room=416529e81323031ee329,06M_ZtCnwEXZpGCI7B7B9g

class Player {
  playerId: string = "";
  playerColor: typeof constants.turnOrder[number] = "red";
  playerPositions = [0, 0, 0, 0]; // these are indices in [color]MoveMap eg redMoveMap
  constructor(args?: Partial<Player>) {
    this.playerColor = args?.playerColor ?? this.playerColor;
    this.playerId = args?.playerId ?? this.playerId;
    this.playerPositions = args?.playerPositions ?? this.playerPositions;
  }
}

export const machine = setup({
  types: {
    context: {} as {
      constants: typeof constants;
      roomId: string;
      openingValues: number[];
      currDiceValues: number[];
      currTurnIndex: number;
      players: Player[];
    },
    events: {} as { type: "start" } | { type: "nextTurn" } | { type: "done" },
  },
  guards: {
    isColorAvailable: ({ context, event }) => {
      // check if the chosen color is available
      const chosenColor = (event as any).chosenColor;
      const takenColors = context.playersColors.map((colorPair => colorPair[0]));
      return !takenColors.includes(chosenColor);
    },
    isNoOfPlayers2orMore: ({ context }) => context.noOfPlayers > 1,
    isPlayersLessThan4: ({ context }) => context.noOfPlayers < 4,
    isOpeningValue: ({ context }) => context.openingValues.includes(context.currDiceValues[context.currDiceValues.length - 1]),
    cantMove: ({ context }) => {
      // true when no opening dice value and all positions 0 for curr player
      const currPlayer = context.players[context.currTurnIndex];
      const hasOpeningValue = context.currDiceValues.some((val) => context.openingValues.includes(val));
      if(!hasOpeningValue && currPlayer.playerPositions.every((pos) => pos===0)){
        return true;
      }
      // true when for any current player position is either 0 
      return false;
    },
    
    isOppCapturable: function ({ context, event }) {
      // Add your guard condition here
      return true;
    },
    isGoingHome: function ({ context, event }) {
      // Add your guard condition here
      return true;
    },
    hasMoreValues: function ({ context, event }) {
      // Add your guard condition here
      return true;
    },
    hasCaptured: function ({ context, event }) {
      // Add your guard condition here
      return true;
    },
    hasGoneHome: function ({ context, event }) {
      // Add your guard condition here
      return true;
    },
    hasCapturedOrHasGoneHome: or(["hasCaptured", "hasGoneHome"]),
    areAllPiecesHome: function ({ context, event }) {
      // Add your guard condition here
      return true;
    },
  },
  actions: {
    clearValuesWhen3: assign(({ context }) => context.currDiceValues.length === 3 ? ({currDiceValues: []} ):({})),
    setTurnOrder: assign(({ context }) => {
      // select random index out of current players as first.
      // put it at first and arrange other players as in turn order defined in constants based on color
      const firstIndex = Math.floor(Math.random() * context.players.length);
      const firstPlayer = context.players[firstIndex];
      const orderedPlayers: Player[] = [firstPlayer];
      const turnOrderColors = constants.turnOrder;
      for (const color of turnOrderColors) {
        if (color !== firstPlayer.playerColor) {
          const player = context.players.find((p) => p.playerColor === color);
          if (player) {
            orderedPlayers.push(player);
          }
        }
      }
      return {
        players: orderedPlayers,
        currTurnIndex: 0,
        currPlayerId: orderedPlayers[0].playerId,
      };
    }),
    addPlayer: assign(({ context,event }) => {
      const newPlayer = new Player({
        playerColor: (event as any).chosenColor,
        playerId: (event as any).playerId,
      });
      const updatedPlayers = context.players.concat([newPlayer]);
      return { players: updatedPlayers };
    }),
    setNextAsCurrPlayer: assign(({ context }) => ({ currTurnIndex: (context.currTurnIndex + 1) % context.players.length})),
    rollDiceAndAppendValue: assign(({ context }) => {
      const rollResult = Math.floor(Math.random() * 6) + 1; // Random dice roll
      const newValues = context.currDiceValues.concat([rollResult]);
      return { currDiceValues: newValues };
    }),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QBkCuED2A6AlhANmAMSwAuAhgE6kDaADALqKgAOGsOpOGAdsyAA9EAJmFYAHHQCsATgDMARgBsk8VIV0ZAGhABPEQBYxUuuLnrxSqeeEB2cQF8HOtJlwFiAKww4eAcXIAWzB6JiQQNg4uXn4hBABaBSlbLDlxe3EFYQU0uTkZJR19BANzCRNpOmElRTSZJxd0bAB3ck5fKAAxDEoAFVRKHiIeMAFSfsHQ-kj2mPC4-LlU9KkpdJkDOgMZKQMixAMcrGEpGqyq2zpbAyUGkFdsSgx8fA6AERwAY2JMEanwmbRPjzRC2BQyLB0KGmBQKMyba77BDCNISRRJMFKDJ3B5YJ4vd5fH68EIKMKsdizYGgOImMQFarCeQKUrXKRI4R0BTHcQMuyWbZQgw4pp456vHhQD7fIi-ELCckRSlA2KIKziLBWKEaGQKWxguhyJFJMRQpRMrLbKRMlEityBDAANw6AAUcGAZXL-hSotxqYJEPIDJqVLZzZYlAYwwokWkxGCVgVBbZ1MLnPdRQ7nZK3R7iX8ydNlX7VQhYVcQ7ITmsZLXREijBCoyYLLZssI1HbsFnXe7PSSaAqi765jTELC5GJsjI6Gd0gZUw2w1hrSYrJzJMk5Ld07iezm+-mQnJFYCSyCyyc6FgciyrrqN9o9Ih1EosPqrpIuaYmXIu1h9ygXN+z+AxT2LUcAzLQ5gxWZQow0JQkiRU4xAMTITksFFLmsf9PnIFhSAGDoAHkWDYEYeFIWUB0YYcqVLWENGORQbl2FMZFsSdjRkMQlFnOFzCuOxTEcXdRXwwjiMlMiKLAKiaILcCR39OINGEYNlBOewmSqc09mfZEkKwGCtzsGcF3-KAfElAAJDBgkUkI6IBCDVPHORTBXc0rCtfV7HZQzIw1PIw0na4VFKKQrJsqB7Mcr1C1clTGPMKQVxMSdMP1TZxCRJRdRva5ayhWQ9Wi8S3Gsjp4qPQdlIYi8cgK1IfMw5RrTsJFrmvPVRN00oNLwgALDBKUlABhZ4eic70lRSi8rGOflqmSNtWSXYMbg0yw1F1DY-zuHgMAgOB+AeeiVQveJOXStIMiyHIzHyQoguDPIsnEG4km2S5bH-PBCEu88xwSGpUnBDSNM0KN0MRQy5AXY5awXJlxDUV8KsaNxWnaSVuj6AZ-TPSC4hRa9Dg+yMsnDapY0sLAH3QqNVsyf7KsecVCW+YHSZfJIJH0jIO342wn2KDsllEdQNI2MN0bDf9AOAsBefchAdMZ2dEdWGdPJUBt0OOFRxFl6RwXSHdsewSSiMoUjyJJKi1cY7IllWKo4QXAqrFjRRNThSxrnMFlkhimqHNV5LGtBjRZwkaEUSSNa9XygXrBybZeXsDYsYzHHfBdprIwhWdq2qVkw3yqpNRTWcVA7L7hBGsaOEm6bKCL0H4lrCQTnMFR9MRw0UPUSFZDyGpdhLpwnCAA */
  context: {
    constants: constants,
    roomId: "",
    openingValues: [],
    currDiceValues:[],
    currTurnIndex: -1,
    players: []
  },
  id: "Ludo",
  initial: "idle",
  states: {
    idle: {
      on: {
        start: {
          target: "waitingForTurn",

          guard: {
            type: "isNoOfPlayers2orMore",
          },

          actions: "setTurnOrder"
        },

        joinGame: {
          target: "choosingColor",
          reenter: true,
          guard: "isPlayersLessThan4"
        }
      },
    },

    waitingForTurn: {
      on: {
        nextTurn: {
          target: "rollingDice",
          actions: "setNextAsCurrPlayer",
        },
      },
    },

    rollingDice: {
      on: {
        done: [
          {
            target: "rollingDice",
            guard: {
              type: "isOpeningValue",
            },
          },
          {
            target: "waitingForTurn",
            guard: {
              type: "cantMove",
            },
          },
          {
            target: "movingPiece",
          },
        ],
      },

      entry: ["clearValuesWhen3"],
      exit: "rollDiceAndAppendValue"
    },

    movingPiece: {
      on: {
        done: [
          {
            target: "capturingOpponent",
            guard: {
              type: "isOppCapturable",
            },
          },
          {
            target: "goingHome",
            guard: {
              type: "isGoingHome",
            },
          },
          {
            target: "movingPiece",
            guard: {
              type: "hasMoreValues",
            },
          },
          {
            target: "rollingDice",
            guard: {
              type: "hasCapturedOrHasGoneHome",
            },
          },
          {
            target: "waitingForTurn",
          },
        ],
      },
    },

    capturingOpponent: {
      on: {
        done: [
          {
            target: "movingPiece",
            guard: {
              type: "hasMoreValues",
            },
          },
          {
            target: "rollingDice",
            reenter: true,
          },
        ],
      },
    },

    goingHome: {
      on: {
        done: [
          {
            target: "win",
            guard: {
              type: "areAllPiecesHome",
            },
          },
          {
            target: "movingPiece",
            guard: {
              type: "hasMoreValues",
            },
          },
          {
            target: "rollingDice",
          },
        ],
      },
    },

    win: {},

    choosingColor: {
      on: {
        done: {
          target: "idle",
          actions: "addPlayer",
          guard: "isColorAvailable"
        }
      }
    }
  },
});


// hasSingleValue: ({ context }) => {
    //   if (context.values.length === 1) {
    //     return true;
    //   }
    //   return false;
    // },
    // hasNoPieceToMove: ({ context }) => {
    //   // check if curr player has any piece to move
    //   if (
    //     context.playersPositions[context.currPlayer].some((pos) => pos != 0)
    //   ) {
    //     return false;
    //   }
    //   return true;
    // },
    // hasSingleValueAndHasNoPieceToMove: and(["hasSingleValue", "hasNoPieceToMove"]),