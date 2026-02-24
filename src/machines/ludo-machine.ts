import { setup, and, or, assign, not } from "xstate";
import * as constants from "../constants/ludo-consts.js";
import { findKeyByIndexValue, getAllPermutations, without } from "../utilities/ludo-util.js";

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
    input: {} as {roomId?: string , openingValues?: number[]},
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
    cantMove: ({ context, event }) => {
      return !Object.values(context.possibleCurrPlayerMoves).some(pm=>pm.some(p=>p!=-1))
    },
    isInvalidMove: ({context, event})=>{
      const {currTurnIndex,players} = context;
      const currPlayer = players[currTurnIndex];
      if(event.type === 'pieceMoved'){
        const possibleMoveIndexesByThisPiece = Object.values(context.possibleCurrPlayerMoves).map(pm=>pm[event.pieceIndex]);
        const newPositionIndexInMoveMap = constants.colorMoveMap[currPlayer.playerColor].indexOf(Number(event.newPosition));

        return newPositionIndexInMoveMap === -1 || !possibleMoveIndexesByThisPiece.includes(newPositionIndexInMoveMap)
        // return !Object.values(context.possibleCurrPlayerMoves).some(pm=>pm[event.pieceIndex]===constants.colorMoveMap[currPlayer.playerColor].indexOf(event.newPosition))
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
    clearValuesWhen3: assign(({ context }) => context.currDiceValues.length >= 3 ? ({currDiceValues: []} ):({})),
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
          } else if(pp === -1) {
          } else {
            newPP = pp + lastDiceValue;
          }
          newPossibleMoves[newKey].push(newPP);
        }
      }
      
      
      return {possibleCurrPlayerMoves:newPossibleMoves}
    }),
    removeMovedKeyValues: assign(({context, event})=>{
      if(event.type!='pieceMoved') return {};
      const {newPosition:newPositionStr, pieceIndex} = event;
      const newPosition = Number(newPositionStr);
      const currPlayer = {...context.players[context.currTurnIndex]};
      const newPositionIndex = constants.colorMoveMap[currPlayer.playerColor].indexOf(newPosition);
      // const newPossibleMoves = Object.fromEntries(
      //   Object.entries(context.possibleCurrPlayerMoves).filter(([_, arr]) => arr[pieceIndex] !== newPositionIndex)
      // );
      return {possibleCurrPlayerMoves: {}, currDiceValues:without(context.currDiceValues,findKeyByIndexValue(context.possibleCurrPlayerMoves,pieceIndex,newPositionIndex)||[])}
    }),
    setPieceNewPosition: assign(({context, event})=>{
      if(event.type != "pieceMoved") return {};
      const newPosition = Number(event.newPosition);
      const currPlayer = {...context.players[context.currTurnIndex]};
      const updatedCurrPlayerPositionIndex = constants.colorMoveMap[currPlayer.playerColor].indexOf(newPosition);
      currPlayer.playerPositionIndexes[event.pieceIndex] = updatedCurrPlayerPositionIndex;
      return {players: context.players.map((p,i)=>i===context.currTurnIndex?currPlayer:p)}
    })
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QBkCuED2A6AlhANmAMSwAuAhgE6kDaADALqKgAOGsOpOGAdsyAA9EAJmFYAHHQCsATgDMARgBsk8VIV0ZAGhABPEQBYxUuuLnrxSqeeEB2cQF8HOtJlwFiAKww4eAcXIAWzB6JiQQNg4uXn4hBABaBSlbLDlxe3EFYQU0uTkZJR19BANzCRNpOmElRTSZJxd0bAB3ck5fKAAxDEoAFVRKHiJKDHx8ABEcAGMQxn5I9pjwuKlqrGSDBVsZeWE1WykixAMpJXWZKUy6JWFrsykpBpBXbBGxjsmZ4dGJ6dmw1jsRZ8ZaIdQGLB0cxKWxKOhGLZZI4ILYpAo5awqOQGHZKJ4vLBvfAfP5EULzIHREGgOIyZRYHFKDQaGylZF7KRYJJM9IFKQGGrmfFNLCBDAANw6AAUcGAvixZTMALISyDk8ILKmxRAKZRiOS2OiaOiGhTieRydnY9arJLSOTCfng4VuMWSnhQGVy4gK70q8VqhQAiKU7jUwQ67HiLAyKFpc0KAXCAzs2NYGoXa50LL86Eu7Bu6WK4jqwFRMPahAycRiOHwpICqO2ZEpHk1i5muRWXUKfNYKbkFikAYdADyLDYPDAPFIREwU9LIfLSxpOpUnOU6lM1ThBuRWTOJr2O2uySZ2z7A6HI4948n09n85CQYpy-DcSStlrBSNSWxictPREFsCEu0TLN7AMSwZFsPsoB8D0AAkMGCOdeH+V9gUrBQ6VbYQO1MLt5DNZElBOdYDVzKFsnsR5nGeEV4I6ZDUKfGgXw1UMVwjFECghc8tnEAUVBkFMgIQFRowNHEjWxE5e3ogkmKQlDiDY4Rg01CtQV4+wGXwqDlAuGFCnE2wDVSQ1tkUc0rHqRSRSmAALDAgQ9ABhUYejQhc5k4t9KysLBRHsapki-Upm3EgwQIZG4oPXOlRLkPsWBGGZYA4D0ADVyGJCB-RLPyyywnStmkCQBVE6ojEdMTijkCrqkUKDNEyWFhFS9K4CyqBcvywqyQ4kqtTKjqGU2MilB2IT+XqxBKJjGRqh2UpzVscyuowDLev6vBBpoDTMNG1cUTUBQuShJQyMTIT8Ki4pSjOHC9mUc0DE0HItp2jo9oK1UyTkTSuPfHVRM5A1YzqcQhJybRouWiRMjNbMmRMWFvp6368v2gGaAMYGArK6s6C5JMiNjWwcORfkxBAjadzyawuyceieAwCA4H4F5ju0074luCH0hhrIcjMfJTOKeJtnTZHzPp-CjXsxo3DwQhee4uJ4hqVIXqMD7RJA9J5oQbFOXw8H8Jhh5Nz7Vp2g9bo+gGcMtM1kR8OCnJGs2bJfcTZFsTOGyDgeaamWyPEHLcIkSRmDXQYQM9UguGtLCSWRAOKaoLpxM0YQ+0w6QFPtCw9L14-80rTo0ILGrI1YTmzE4s+ORMY3MB1LmuG4fcvQdh0oMcJ3QmcE+w9qJERAoakyDt93SL2YbqflYysOCEKgFiwHHsqrDOa6VBxM22pNuFox2bZRAsGCLjt3xd9O0RsiwL9RMMsiZvEGm0wLn9rCNA8FK0dsDOVcr1Ty+AeiPx4vEHYEhHTQksMmbEUIabqEhJnLs5gBQ4kxplbGA1VQwI-GtV+hpPpYksA8ZEApSYFEsNsRMqwe4GFZg4IAA */
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
          target: "rollingDice",
          guard: "isCurrPlayer",
          reenter: true
        }
      },

      always: {
        target: "movingPiece",
        guard: "isNotOpeningValue"
      }
    },

    movingPiece: {
      on: {
        pieceMoved: [{
          target: "movingPiece",
          guard: "isInvalidMove"
        }, {
          target: "processingValidMove",
          actions: ["removeMovedKeyValues","setPieceNewPosition","setPossibleMoves"],
          
        }]
      },

      always: {
        target: "waitingForTurn",
        
        guard: "cantMove"
      }
    },

    capturingOpponent: {
      on: {
        done: [
          {
            target: "movingPiece",
            guard: not("cantMove"),
          },
          {
            target: "rollingDice",
            
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
            guard: not("cantMove"),
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

    processingValidMove: {
      always: [{
        target: "capturingOpponent",
        guard: "isOppCapturable",
        
      }, {
        target: "goingHome",
        guard: "isGoingHome",
        
      }, {
        target: "rollingDice",
        guard:  "hasCapturedOrHasGoneHome",
        
      }, {
        target: "movingPiece",
        guard: not("cantMove"),
        
      }, {
        target: "waitingForTurn",
        
      }]
    }
  },
});
