import { setup, and, or, assign } from "xstate";
import * as constants from "../constants/ludo-consts.js";
import { getAllPermutations } from "../utilities/ludo-util.js";

// https://excalidraw.com/#room=416529e81323031ee329,06M_ZtCnwEXZpGCI7B7B9g

class Player {
  playerId: string = "";
  playerColor: typeof constants.turnOrder[number] = "red";
  playerPositionIndexes = [0, 0, 0, 0]; // these are indices in [color]MoveMap eg redMoveMap
  constructor(args?: Partial<Player>) {
    this.playerColor = args?.playerColor ?? this.playerColor;
    this.playerId = args?.playerId ?? this.playerId;
    this.playerPositionIndexes = args?.playerPositionIndexes ?? this.playerPositionIndexes;
  }
}

export const ludoMachine = setup({
  types: {
    input: {} as {roomId?: string},
    context: {} as {
      constants: typeof constants;
      roomId: string;
      openingValues: number[];
      currDiceValues: number[];
      currTurnIndex: number;
      players: Player[];
      possibleCurrPlayerMoves:Record<string, number[]>
    },
    events: {} as { type: "start" } | { type: "nextTurn" } | { type: "done" } | {type: "joinGame"}
    | {type:'done', chosenColor:typeof constants.turnOrder[number], playerId: string}
    | {type:'rollDice' } | {type: 'pieceMoved', pieceIndex: number, newPosition: number}
  },
  guards: {
    isColorAvailable: ({ context, event }) => {
      // check if the chosen color is available
      const chosenColor = (event as any).chosenColor;
      const takenColors = context.players.map((p => p.playerColor));
      return !takenColors.includes(chosenColor);
    },
    isNoOfPlayers2orMore: ({ context }) => context.players.length > 1,
    isPlayersLessThan4: ({ context }) => context.players.length < 4,
    isNotOpeningValue: ({ context }) => !context.openingValues.includes(context.currDiceValues[context.currDiceValues.length - 1]),
    isCurrPlayer:({event})=>event.diceId || true,
    cantMove: ({ context }) => {
      return !Object.values(context.possibleCurrPlayerMoves).some(pm=>pm.some(p=>p!=-1))
    },
    isInvalidMove: ({context, event})=>{
      const {currTurnIndex,players} = context;
      const currPlayer = players[currTurnIndex];
      if(event.type === 'pieceMoved'){
        return !Object.values(context.possibleCurrPlayerMoves).some(pm=>pm[event.pieceIndex]===constants.colorMoveMap[currPlayer.playerColor].indexOf(event.newPosition))
      }
      return false;      
    },
    
    isOppCapturable: function ({ context, event }) {
      // Add your guard condition here
      return false;
    },
    isGoingHome: function ({ context, event }) {
      // Add your guard condition here
      return false;
    },
    hasMoreValues: function ({ context, event }) {
      // Add your guard condition here
      return false;
    },
    hasCaptured: function ({ context, event }) {
      // Add your guard condition here
      return false;
    },
    hasGoneHome: function ({ context, event }) {
      // Add your guard condition here
      return false;
    },
    hasCapturedOrHasGoneHome: or(["hasCaptured", "hasGoneHome"]),
    areAllPiecesHome: function ({ context, event }) {
      // Add your guard condition here
      return false;
    },
  },
  actions: {
    clearValuesWhen3: assign(({ context }) => context.currDiceValues.length > 3 ? ({currDiceValues: []} ):({})),
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
      return {players: orderedPlayers};
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
    resetDiceValues: assign(()=>({currDiceValues:[]})),
    rollDiceAndAppendValue: assign(({ context }) => {
      const rollResult = Math.floor(Math.random() * 6) + 1; // Random dice roll
      const newValues = context.currDiceValues.concat([rollResult]);
      return { currDiceValues: newValues };
    }),
    setPossibleMoves: assign(({context})=>{
      // calculate possible moves for each current player's piece
      const {players,currDiceValues} = context;
      const {openingValues} = constants;
      const currPlayer = players[context.currTurnIndex];
      
      const newPossibleMoves: Record<string, number[]> = {};

      const allPermutations = getAllPermutations(currDiceValues);

      for(let v of allPermutations){
        const newKey = JSON.stringify(v);
        const possibleExistingKey = v.toSpliced(v.length-1);
        const strPossibleExistingKey = JSON.stringify(possibleExistingKey);

        let playerPositionIndexes = newPossibleMoves[strPossibleExistingKey] || currPlayer.playerPositionIndexes;
        const lastDiceValue = v[v.length - 1]
        newPossibleMoves[newKey] = [];

        for(let pp of playerPositionIndexes){
          let newPP = -1;
          if(pp === 0 && !openingValues.includes(lastDiceValue)){
          } else if(pp === 0){
            newPP = 1;
          } else if(pp + lastDiceValue > 57){ 
          } else {
            newPP = pp + lastDiceValue;
          }
          newPossibleMoves[newKey].push(newPP);
        }
      }
      
      
      return {possibleCurrPlayerMoves:newPossibleMoves}
    }),
    updateDiceValues: assign(()=>{

      return {currDiceValues: []}
    })
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QBkCuED2A6AlhANmAMSwAuAhgE6kDaADALqKgAOGsOpOGAdsyAA9EAJmFYAHHQCsATgDMARgBsk8VIV0ZAGhABPEQBYxUuuLnrxSqeeEB2cQF8HOtJlwFiAKww4eAcXIAWzB6JiQQNg4uXn4hBABaBSlbLDlxe3EFYQU0uTkZJR19BANzCRNpOmElRTSZJxd0bAB3ck5fKAAxDEoAFVRKHiJKDHx8ABEcAGMQxn5I9pjwuJNjWwMFe2EDGU2pcSLEA2OsWX3NWwyjJQMGkFdsEbGOyZnh0Ynp2bDWdkW+ZZHJQKLDCcxKMEmGQyIzaPSITYyUEwlS2BQaOS2Ux3B5YJ74F5fIiheZ-aIA0BxXZKLA7YF0DFSbZyQ4IYRqLBJYHpApSAw1cw4ppYQIYABuHQACjgwG8AFQsGUzACy4sgJPCC3JsQRcmBtLMfKkSiUtjkRmErJuYjMWXWCksciqwiFblFEp4UGlsuIip9qrF6rmmrJ3ApggR2SRdD1tjswhhyXZrLsBlSDohsmk6I2ruw7qlSt9RYD6oUPwioaWlN18gkShkokkqdsxtZeSkBusfPyMey0jzIvFhZ9RD9KrVEBowgrWrDOoQOXWWDoJtXVQMxpuhXhCHyadTMlswKU0j1g4Lnu9b3HYFLU7ks6r4biCg2adM+zNZvZ6ikrOOTsFGpAxxATGoG3qZx7mFS8vSLMcS0nGgDCfKJ50BRcmTkLBUXsY4ZDoTdkgAswsCPVdxEyXZjWyKQL2HK8ENve8aCkND-gXZRMlBVsE3kE12VbVkmRSdl0TA3ZsiyKDGjdRj4NHDVfnQ6sI0XTQbVNN8wUhCEDl3A9txuMxFGsTF6Og3EpnIFhSAGDoAHkWDYHgwB4UgiEwNzlMrVSX11LJcMUS50gMM1NNZN8UjoVdNiMIjWxkaxBxsuyHM9ZzXPczzvJCctSX8rjhFizkIVNEqkg2PlWWS5F+UybJ1nEcLBygHxPQACQwYIvN4b5Cs4zCkmXAo7HEAock3BQrRyTkLOSGMmXUBQ2o6qBut6vKaAKkMiuGiEQWSoik1KDY5EtXcrE7I8djfc1WzApQ1o6TbiG2mdBu1A6ymPOxT3CqMmVZLE0woyQ0UbM1lFSgALDA-k9ABhUYej6nzgxUoaawQKxQXG6pkjjUpbAA5d+W2Sw1F2GE5EHUgwECFhiUxvzsfUtcsCxMFYrSLJlqiwjTji-kzSopljicaCeAwCA4H4B4vownH4hKzs0gyLIclMgpWXiMilrSFq1AZN9HCs4U8EIJW1LieIanTRsjAMTRwtA9Z203ZFEwTcX1CsQdWnaT1uj6AZwznW2RATUEcidDZsgTt9PZpRR0ikDOG2BbJnottx8UJGYbYC3G7BXCEdiovUGwmlNlyqbCNmuk1LLk-MFOvMBi64rI6FBfJbBhN83wFADNHrdJlA2bmj1ztusDS+zKCclz+o87vhr5G0zEsGQJvWBMWV3aoxAZKjpH2GoHVkmC3Ha16eq7vb2dfOwcJKhlkkyN9jhm3dzlSIoVMGYnSiEDr4DeONgJJFpOVdI-FjgtREqaWk6xoTok2NsAocMEYcGRqjSgkD1LxGhBIYQ3YVAV3NDGES6gVyyDyDUPkNwb64gZkzIhKwChcxrgmB0sViZRToCkIwWRDSDxdvsF0UsgA */
  context: ({input})=>({
    constants: constants,
    roomId: input.roomId||"",
    openingValues: input.openingValues || constants.openingValues,
    currDiceValues:[],
    currTurnIndex: -1,
    players: [],
    possibleCurrPlayerMoves:{}
  }),
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
      entry: ["setNextAsCurrPlayer"],

      on: {
        rollDice: {
          target: "rollingDice",
          actions: ["resetDiceValues"],
          guard: "isCurrPlayer"
        }
      }
    },

    rollingDice: {
      entry: ["clearValuesWhen3", "rollDiceAndAppendValue"],
      exit: "setPossibleMoves",

      on: {
        rollDice: {
          target: "temp",
          reenter: true,
          guard: "isCurrPlayer"
        }
      },

      always: {
        target: "movingPiece",
        guard: "isNotOpeningValue"
      }
    },

    movingPiece: {
      on: {
        "*pieceMoved":{actions:"updateDiceValues"},
        pieceMoved: [{
          target: "movingPiece",
          guard: {
            type: "isInvalidMove",
          },
        }, {
          target: "capturingOpponent",
          guard: "isOppCapturable"
        }, {
          target: "goingHome",
          guard: {
            type: "isGoingHome",
          },
        }, {
          target: "movingPiece",
          guard: {
            type: "hasMoreValues",
          },
        }, {
          target: "rollingDice",
          guard: {
            type: "hasCapturedOrHasGoneHome",
          },
        }, {
          target: "waitingForTurn",
        }]
      },

      always: {
        target: "waitingForTurn",
        guard: "cantMove",
        reenter: true
      }
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
    },

    temp: {
      always: "rollingDice"
    }
  },
});
