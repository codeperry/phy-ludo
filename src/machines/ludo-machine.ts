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
  /** @xstate-layout N4IgpgJg5mDOIC5QBkCuED2A6AlhANmAMSwAuAhgE6kDaADALqKgAOGsOpOGAdsyAA9EAJmFYAHHQCsATgDMARgBsk8VIV0ZAGhABPEQBYxUuuLnrxSqeeEB2cQF8HOtJlwFiAKww4eAcXIAWzB6JiQQNg4uXn4hBABaBSlbLDlxe3EFYQU0uTkZJR19BANzCRNpOmElRTSZJxd0bAB3ck5fKAAxDEoAFVRKHiJKDHx8ABEcAGMQxn5I9pjwuKlqrGSDBVsZeWE1WykixAMpJXWZKUy6JWFrsykpBpBXbBGxjsmZ4dGJ6dmw1jsRZ8ZaIdQGLB0cxKWxKOhGLZZI4ILYpAo5awqOQGHZKJ4vLBvfAfP5EULzIHREGgOIyZRYHFKDQaGylZF7KRYJJM9IFKQGGrmfFNLCBDAANw6AAUcGAvixZTMALISyA0BQAiKU7jUwSIHJlKEwzR3HIKAzs8RiGTXBTicSbOx5AzCtxiyU8KAyuXEcnhBZU2L621YeRpDT2ulMwp6RApBQybY7OqrOx0Wyu7BTcgsUgDDoAeRYbB4YB4pCImFLfsBUR1QZRKk5ynUpmqcLktmRWTO6b2O2uySZ20zWGzufznqLJbLFarIQ1FLrSxp+uSYiUBTodCS2PNcmRtghciZBmu6YdlkTo6gPk9AAkMMFK7x-kvgQ2E1ssDcLhGT-IdrIkoJzrJ2-JyFC2T2I8zjPCKt4dI+z7zuqmoBvWoIogUELDlsDpKCoMgWrGCAqOIqRHjaUIGCcCg3neUDIcQqHCOh2ornq2H2AywjEZkm6nLCh6dpR6aAeIfL1HBBJTAAFhgQKegAwqMPQvtWcz+hxupxFYWCiPY1TJLYwilF2pEGEeDI3AYlhqHSxFyKOpBgIELBklptYflhtg5OsVQ2HS2KqN2klcqZmR5AoCaZMIzkySKLAjDMsAcJ6ABq5DEhAKrir6Xlasuun6iBZzxUytx8VZVnsiBXI4fyOQgfYR6jslGCpelUBZTleW+ou2nFZ+pkyKGpiKBctyZA6yKdsY1RVKUdImm1iVuB1XUdL1eD9WSbHvoGWF2qJpx2jFpk3CeB6WXxBmyPymQwXIhntSlcDdTtuWqmScjscNx10hRWzUScexJA8yJ2XIBmZMoL0xTs2RvZ1H3bdlu0-TQBj-T5q7YVUDI7jCkFWDI9zIpiXKbEe2xVeoCWNG6ErSoqxAKj6-UQDWRV41xMU3GJq07pJeTsti6yrEk0gvfy4JOHBPAYBAcD8C8h2Yfj8S3JyaQZFkORmPkMbFPEkhclU26LSchFWKOeCEBrnFxPENSpAmZlmZoNXpCRxTYpyfHEas5NqOodvrS0bRcJ63R9AMuoYc7Ih3dkeTwgbjrmnNAru+kDynOi2R4pHhI-CSMxOyVCBDqkFxWpYEPyHVCgMkDMJnqYdICqO7qsz6VefoOqTXGDJw7icN3FJsELyNYwiXNcV3wqO455pQhbFq+5aD8dT0SIiBQ1Jkf5hSk2T2imOKDgxSFPmAu-4y2Zy2w68jj+TfuIHCFE7HTC92kTBcUczRfCPy4qIbIWBRq0QEjiUOlMbQ-ionCaw24HiM3gm4eSiluqqXwD0cBLsdgSAXtCSwZlsRQkpuoSEsg8g1H5CBaSTNsCuXckQ7+OJ1ibntIieK24LLFA0L2XkJgkhkIFMIFGW1MoY2+vlThKJzLQJolnB0MUv4lDsgycwih4qSGsFsBWDggA */
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
        pieceMoved: [{
          target: "waitingForTurn",
          reenter: true
        }, {
          target: "movingPiece",
          actions: "setPossibleMoves"
        }]
      },

      always: {
        target: "capturingOpponent",
        guard: "isOppCapturable",
        reenter: true
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

    temp: {
      always: "rollingDice"
    },

    processingValidMove: {
      always: [{
        target: "rollingDice",
        guard:  "hasCapturedOrHasGoneHome",
        reenter: true
      }, {
        target: "goingHome",
        guard: "isGoingHome",
        reenter: true
      }, {
        target: "waitingForTurn",
        guard: "cantMove",
        reenter: true
      }, {
        target: "movingPiece",

        guard: {
          type: "isInvalidMove",
        },

        reenter: true
      }, {
        target: "processingValidMove",
        actions: ["removeMovedKeyValues", "setPieceNewPosition", "setPossibleMoves"]
      }]
    }
  },
});
