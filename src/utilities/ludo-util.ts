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
