import { createActor } from "xstate";
import { ludoMachine } from "./machines/ludo-machine";
import { useEffect, useReducer, useRef, useState } from "preact/hooks";
import { createBrowserInspector } from "@statelyai/inspect";

const { inspect } = createBrowserInspector();
const ludoActor = createActor(ludoMachine, {
  input: { roomId: "room1" },
  inspect,
});

export function App() {
  const drpdwnRefs = useRef({});
  const [, refreshComponent] = useReducer((s) => !s, false);
  const snap = ludoActor.getSnapshot();
  const sCtx = snap.context;

  const { players, constants } = sCtx;
  const availableColors = constants.turnOrder.filter(
    (col) => players.findIndex((p) => p.playerColor === col) === -1,
  );

  useEffect(() => {
    ludoActor.start();
    const sub = ludoActor.subscribe(({ value }) => {
      refreshComponent(0);
      console.log("state", value);
    });

    return () => {
      ludoActor.stop();
      sub.unsubscribe();
    };
  }, []);

  return (
    <div>
      <div>{sCtx.roomId}</div>
      <div>
        <button
          onClick={() => ludoActor.send({ type: "joinGame" })}
          disabled={!snap.can({ type: "joinGame" })}
        >
          Join Game
        </button>
        <button
          onClick={() =>
            ludoActor.send({
              type: "done",
              chosenColor: "red",
              playerId: "123",
            })
          }
        >
          Red
        </button>
        <button
          onClick={() =>
            ludoActor.send({
              type: "done",
              chosenColor: "yellow",
              playerId: "124",
            })
          }
        >
          Yellow
        </button>
        <button
          onClick={() =>
            ludoActor.send({
              type: "done",
              chosenColor: "green",
              playerId: "125",
            })
          }
        >
          Green
        </button>
        <button
          onClick={() =>
            ludoActor.send({
              type: "done",
              chosenColor: "blue",
              playerId: "126",
            })
          }
        >
          Blue
        </button>
      </div>
      <div>
        <button onClick={() => ludoActor.send({ type: "start" })}>
          Start Game
        </button>
        <button onClick={() => ludoActor.send({ type: "rollDice" })}>
          Roll Dice
        </button>
        <div>Dice Value/s:{sCtx.currDiceValues.join(", ")}</div>
        <div>Current Player: {players.at(sCtx.currTurnIndex)?.playerColor}</div>
        <div>
          Possible indexes: {JSON.stringify(sCtx.possibleCurrPlayerMoves)}
        </div>
        {players.map((p) => (
          <div key={p.playerId}>
            <span>{p.playerColor}</span>
            <button
              onClick={() =>
                ludoActor.send({
                  type: "pieceMoved",
                  newPosition: drpdwnRefs.current[p.playerColor],
                  pieceIndex: 0,
                })
              }
            >
              Giti 1 Position:{p.playerPositionIndexes[0]}
            </button>
            <button
              onClick={() =>
                ludoActor.send({
                  type: "pieceMoved",
                  newPosition: drpdwnRefs.current[p.playerColor],
                  pieceIndex: 1,
                })
              }
            >
              Giti 2 Position:{p.playerPositionIndexes[1]}
            </button>
            <button
              onClick={() =>
                ludoActor.send({
                  type: "pieceMoved",
                  newPosition: drpdwnRefs.current[p.playerColor],
                  pieceIndex: 2,
                })
              }
            >
              Giti 3 Position:{p.playerPositionIndexes[2]}
            </button>
            <button
              onClick={() =>
                ludoActor.send({
                  type: "pieceMoved",
                  newPosition: drpdwnRefs.current[p.playerColor],
                  pieceIndex: 3,
                })
              }
            >
              Giti 4 Position:{p.playerPositionIndexes[3]}
            </button>
            <select
              onChange={(e) => {
                drpdwnRefs.current[p.playerColor] = e.currentTarget.value;
              }}
            >
              {sCtx.constants.colorMoveMap[p.playerColor].map((pos) => (
                <option key={p.playerColor + pos + p.playerId} value={pos}>
                  {sCtx.constants.colorMoveMap[p.playerColor].indexOf(pos)}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
