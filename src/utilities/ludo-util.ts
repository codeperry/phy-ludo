export function getAllPermutations(numbers: number[]): number[][] {
  const result: number[][] = [];

  for (let length = 1; length <= numbers.length; length++) {
    result.push(...permute(numbers, length));
  }

  // Remove duplicates
  return Array.from(new Set(result.map((a) => JSON.stringify(a)))).map((a) =>
    JSON.parse(a),
  );
}

function permute(numbers: number[], length: number): number[][] {
  const result: number[][] = [];
  const used: boolean[] = new Array(numbers.length).fill(false);

  function backtrack(current: number[]) {
    if (current.length === length) {
      result.push([...current]);
      return;
    }

    for (let i = 0; i < numbers.length; i++) {
      if (!used[i]) {
        used[i] = true;
        current.push(numbers[i]);
        backtrack(current);
        current.pop();
        used[i] = false;
      }
    }
  }

  backtrack([]);
  return result;
}

export function findKeyByIndexValue(
  obj: Record<string, number[]>,
  atIndex: number,
  value: number,
): number[] | undefined {
  for (const key of Object.keys(obj)) {
    const arr = obj[key];
    // skip non-arrays or too-short arrays
    if (!Array.isArray(arr) || arr.length <= atIndex) continue;
    if (arr[atIndex] === value) return JSON.parse(key);
  }
  return undefined;
}

export function without<T>(arr: T[], removeArr: T[]): T[] {
  const toRemove = new Set(removeArr);
  return arr.filter((x) => !toRemove.has(x));
}
