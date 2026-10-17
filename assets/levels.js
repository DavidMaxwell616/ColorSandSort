// Deterministic reverse scrambling preserves four units of every color.
// Each reverse step can be undone by a legal matching-color pour.
export function makeLevel(level, variant = 0) {
    const palette = ['pink', 'blue', 'yellow', 'green', 'purple', 'orange', 'red', 'teal'];
    const colorCount = Math.min(8, 3 + Math.floor((level - 1) / 2));
    const mysteryDepth = level < 3 ? 0 : Math.min(3, 1 + Math.floor((level - 3) / 4));
    // Keep every unit of the key color outside the curtains. Two bonus
    // colors wait behind them, so the opening puzzle can always be solved first.
    const curtainCount = level > 10 ? 2 : 0;
    const activeColors = colorCount - curtainCount;
    let seed = (level * 104729 + variant * 7919) >>> 0;
    const random = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 4294967296;
    };
    let best, bestScore = -1;
    for (let attempt = 0; attempt < 24; attempt++) {
        const bottles = palette.slice(0, activeColors).map(c => [c, c, c, c]);
        bottles.push([], []);
        let last = [];
        for (let step = 0; step < 30 + Math.min(level, 100) * 8; step++) {
            const choices = [];
            bottles.forEach((source, from) => {
                if (!source.length) return;
                const color = source.at(-1);
                if (source.length > 1 && source.at(-2) !== color) return;
                bottles.forEach((dest, to) => {
                    if (from === to || dest.length === 4 || (from === last[1] && to === last[0])) return;
                    choices.push([from, to]);
                });
            });
            if (!choices.length) break;
            const [from, to] = choices[Math.floor(random() * choices.length)];
            bottles[to].push(bottles[from].pop());
            last = [from, to];
        }
        const score = bottles.reduce((n, b) => n + b.filter((c, i) => i && c !== b[i - 1]).length, 0);
        if (score > bestScore) { best = bottles; bestScore = score; }
    }
    const curtains = best.map(() => null);
    if (curtainCount) {
        const key = palette[(level + variant) % activeColors];
        const [first, second] = palette.slice(activeColors, colorCount);
        best.push([first, second, first, second], [second, first, second, first]);
        curtains.push(key, key);
    }
    return { bottles: best, curtains, colorCount, mysteryDepth, tallBottleIndex: level >= 5 ? 0 : -1 };
}
