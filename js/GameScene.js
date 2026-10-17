import { makeLevel } from '../assets/levels.js';

const COLORS = {
    pink: '#f34bd2', yellow: '#ffcf08', blue: '#27b7ed',
    green: '#91ca20', purple: '#943de0', orange: '#ff9508', red: '#ed485c', teal: '#32d5bd'
};
const CAPACITY = 4;

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    create() {
        if (!this.level) {
            try { this.level = Math.max(1, Math.min(9999, Number(localStorage.getItem('sand-sort-level')) || 1)); }
            catch { this.level = 1; }
        }
        this.bottles = [];
        this.selectedBottle = null;
        this.busy = false;
        this.finished = false;
        this.moves = 0;
        this.elapsed = 0;
        this.history = [];
        this.createBackground();
        this.createLevel();
        this.createBottomControls();
        this.createButton(107, 49, '\u21bb', () => this.restartLevel());
        this.movesText = this.add.text(151, 49, 'MOVES: 0', {
            fontFamily: 'Arial', fontSize: '15px', color: '#aaa9c0'
        }).setOrigin(0, 0.5);
        this.add.rectangle(665, 49, 68, 46, 0x242436).setStrokeStyle(1, 0x39394c);
        this.timerText = this.add.text(665, 49, '0s', {
            fontFamily: 'Arial', fontSize: '25px', color: '#ffffff'
        }).setOrigin(0.5);
        this.time.addEvent({ delay: 1000, loop: true, callback: () => {
            if (!this.finished) this.timerText.setText(`${++this.elapsed}s`);
        }});
        this.add.text(360, 1260, 'Select a bottle, then a matching color or an empty bottle', {
            fontFamily: 'Arial', fontSize: '13px', color: '#9d8cac'
        }).setOrigin(0.5);
    }

    createBackground() {
        const g = this.add.graphics();
        const { width, height } = this.scale;
        for (let y = 0; y < height; y += 4) {
            const t = y / height;
            const color = Phaser.Display.Color.GetColor(
                Math.round(18 + 22 * t), Math.round(14 - 3 * t), Math.round(57 + 5 * t));
            g.fillStyle(color).fillRect(0, y, width, 4);
        }
    }

    createLevel() {
        const data = makeLevel(this.level);
        this.colorCount = data.colorCount;
        this.add.text(360, 130, `LEVEL ${this.level}`, {
            fontFamily: 'Arial', fontSize: '42px', fontStyle: 'bold', color: '#ffe4a1'
        }).setOrigin(0.5);
        this.add.text(360, 187, this.level > 10 ? 'CURTAIN CHALLENGE' : this.level < 3 ? 'A little everyday magic' : 'MYSTERY POTIONS', {
            fontFamily: 'Arial', fontSize: '18px', color: '#c5b1e8', letterSpacing: 3
        }).setOrigin(0.5);
        this.progressText = this.add.text(360, 237, '', {
            fontFamily: 'Arial', fontSize: '18px', color: '#e1d6f3'
        }).setOrigin(0.5);
        data.bottles.forEach((colors, index) => {
            const height = index === data.tallBottleIndex ? 726 : 306;
            const bottle = this.createBottle(360, 690, colors, index, CAPACITY, height);
            bottle.curtain = data.curtains[index];
            bottle.hidden = colors.map((_, i) => i < colors.length - 1 && i < data.mysteryDepth);
            bottle.sealed = this.isBottleComplete(bottle);
            if (bottle.sealed) bottle.hidden.fill(false);
            this.drawBottle(bottle);
            this.bottles.push(bottle);
        });
        this.layoutBottles();
        this.drawShelf(641, data.tallBottleIndex < 0);
        this.drawShelf(1061, true);
        this.statusText = this.add.text(360, 1120, this.level > 10
            ? 'Fill the curtain color to uncover its bottles.'
            : this.level < 3
            ? 'Match the colors. Complete a bottle to seal it!'
            : 'Pour to uncover the colors behind the ? layers.', {
            fontFamily: 'Arial', fontSize: '20px', color: '#c5b1e8', align: 'center'
        }).setOrigin(0.5);
        this.unlockCurtains();
        this.updateProgress();
    }

    updateProgress() {
        const complete = this.bottles.filter(b => this.isBottleComplete(b)).length;
        this.progressText.setText(`${complete} / ${this.colorCount} potions sealed`);
    }

    sealBottle(bottle) {
        if (!this.isBottleComplete(bottle) || bottle.sealed) return;
        bottle.sealed = true;
        bottle.hidden.fill(false);
        this.unlockCurtains();
        this.drawBottle(bottle);
        this.tweens.add({ targets: bottle.container, y: bottle.homeY - 32,
            duration: 230, yoyo: true, ease: 'Sine.easeOut', onComplete: () => {
                this.tweens.add({ targets: bottle.container, y: bottle.homeY - 10,
                    duration: 140, yoyo: true, ease: 'Sine.easeOut' });
            }});
        const star = this.add.text(bottle.homeX, bottle.homeY - bottle.height / 2 - 22, '\u2726', {
            fontSize: '36px', color: '#ffe4a1'
        });
        this.tweens.add({ targets: star, y: star.y - 65, alpha: 0, duration: 750,
            onComplete: () => star.destroy() });
    }

    unlockCurtains() {
        const completedColors = new Set(this.bottles
            .filter(bottle => !bottle.curtain && this.isBottleComplete(bottle))
            .map(bottle => bottle.colors[0]));
        let unlocked = false;
        this.bottles.forEach(bottle => {
            if (!bottle.curtain || !completedColors.has(bottle.curtain)) return;
            bottle.curtain = null;
            this.drawBottle(bottle);
            unlocked = true;
        });
        if (unlocked) this.statusText.setText('Color complete! Matching curtains are open.');
    }

    drawShelf(y, fullWidth = false) {
        const g = this.add.graphics();
        const spans = fullWidth ? [[0, 720]] : [[0, 308], [412, 308]];
        for (const [x, width] of spans) {
            g.fillStyle(0x030215, 0.55).fillRoundedRect(x, y + 9, width, 34, 4);
            g.fillStyle(0x9b673c).fillRoundedRect(x, y - 10, width, 37, 5);
            for (let i = 0; i < 26; i++) {
                const t = i / 26;
                g.fillStyle(Phaser.Display.Color.GetColor(185 - i, 136 - i, 81 - i));
                g.fillRect(x + 1, y - 8 + i, width - 2, 1);
            }
            g.lineStyle(1, 0xe9bb7c, 0.24);
            for (let i = 0; i < 5; i++) {
                g.lineBetween(x + 5, y - 5 + i * 5, x + width - 5, y - 3 + i * 5);
            }
            g.fillStyle(0xd3a269).fillRect(x + 2, y + 18, width - 4, 3);
            g.fillStyle(0x80522f).fillRect(x + 2, y + 25, width - 4, 3);
        }
    }

    createBottle(x, y, colors, index, capacity = CAPACITY, height = 222) {
        const key = `sort-bottle-${index}`;
        if (this.textures.exists(key)) this.textures.remove(key);
        const texture = this.textures.createCanvas(key, 100 * 2, (height + 16) * 2);
        const sprite = this.add.image(0, 0, key).setDisplaySize(100, height + 16);
        const container = this.add.container(x, y, [sprite]);
        container.setSize(88, height + 12).setInteractive({ useHandCursor: true });
        const bottle = { index, homeX: x, homeY: y, colors: [...colors], capacity,
            height, container, sprite, texture, selected: false };
        container.on('pointerdown', () => this.handleBottleClick(bottle));
        this.drawBottle(bottle);
        return bottle;
    }

    drawBottle(bottle) {
        const { texture, height, colors } = bottle;
        const ctx = texture.getContext();
        ctx.clearRect(0, 0, texture.width, texture.height);
        ctx.save();
        ctx.scale(2, 2);
        const bottom = height + 7;
        // One continuous glass silhouette: open neck, shoulders, rounded base.
        const outline = () => {
            ctx.beginPath();
            ctx.moveTo(30, 11);
            ctx.bezierCurveTo(31, 19, 34, 24, 27, 29);
            ctx.bezierCurveTo(12, 36, 8, 44, 8, 58);
            ctx.lineTo(8, bottom - 15);
            ctx.bezierCurveTo(8, bottom + 2, 92, bottom + 2, 92, bottom - 15);
            ctx.lineTo(92, 58);
            ctx.bezierCurveTo(92, 44, 88, 36, 73, 29);
            ctx.bezierCurveTo(66, 24, 69, 19, 70, 11);
            ctx.closePath();
        };
        ctx.save();
        outline();
        ctx.clip();
        ctx.fillStyle = 'rgba(180,170,215,0.055)';
        ctx.fillRect(0, 0, 100, bottom);
        const segment = (height - 43) / bottle.capacity;
        const layers = colors.map((color, index) => ({ color, hidden: bottle.hidden?.[index],
            units: bottle.flow?.outgoing
                ? Phaser.Math.Clamp(colors.length - bottle.flow.amount - index, 0, 1) : 1 }));
        if (bottle.flow && !bottle.flow.outgoing) {
            layers.push({ color: bottle.flow.color, hidden: false, units: bottle.flow.amount });
        }
        let liquidHeight = 0;
        layers.forEach(({ color, hidden, units }) => {
            if (units <= 0) return;
            liquidHeight += units;
            const y = bottom - 5 - liquidHeight * segment;
            const paint = hidden ? '#51406f' : COLORS[color];
            const gradient = ctx.createLinearGradient(9, 0, 91, 0);
            gradient.addColorStop(0, paint);
            gradient.addColorStop(0.16, paint);
            gradient.addColorStop(0.78, paint);
            gradient.addColorStop(1, this.shade(paint, 0.65));
            ctx.fillStyle = gradient;
            ctx.fillRect(9, y, 82, units * segment + 1);
            ctx.beginPath();
            ctx.ellipse(50, y, 41, 7, 0, 0, Math.PI * 2);
            ctx.fill();
            if (hidden) {
                ctx.fillStyle = '#c7b3e4';
                ctx.font = 'bold 28px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('?', 50, y + segment / 2 + 9);
            }
        });
        if (bottle.flow && !bottle.flow.outgoing) {
            const { phase, color } = bottle.flow;
            const strength = Math.min(1, phase * 12, (1 - phase) * 12);
            const surfaceY = bottom - 5 - liquidHeight * segment;
            // Draw inside the glass clip, beneath reflections and surface ripples.
            ctx.save();
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(50, 11);
            ctx.bezierCurveTo(50, 30,
                50 + Math.sin(phase * 24) * 2, surfaceY - 18, 50, surfaceY);
            ctx.strokeStyle = COLORS[color];
            ctx.globalAlpha = 0.95;
            ctx.lineWidth = 9 * strength;
            if (strength > 0) ctx.stroke();
            ctx.strokeStyle = '#ffffff';
            ctx.globalAlpha = 0.45;
            ctx.lineWidth = 2.5 * strength;
            if (strength > 0) ctx.stroke();
            ctx.globalAlpha = strength * 0.65;
            ctx.fillStyle = COLORS[color];
            ctx.beginPath();
            ctx.ellipse(50, surfaceY, 9 + Math.sin(phase * 30) * 2, 3, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        if (bottle.flow && liquidHeight > 0) {
            const surfaceY = bottom - 5 - liquidHeight * segment;
            const wave = Math.sin(bottle.flow.phase * 18) * 2;
            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.ellipse(50, surfaceY + wave, 31, 4, 0, 0, Math.PI * 2);
            ctx.stroke();
            if (!bottle.flow.outgoing) {
                const ripple = (bottle.flow.phase * 4) % 1;
                ctx.strokeStyle = `rgba(255,255,255,${0.55 * (1 - ripple)})`;
                ctx.beginPath();
                ctx.ellipse(50, surfaceY, 8 + ripple * 30, 2 + ripple * 5, 0, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
        const shine = ctx.createLinearGradient(8, 0, 92, 0);
        shine.addColorStop(0, 'rgba(255,255,255,0.03)');
        shine.addColorStop(0.08, 'rgba(255,255,255,0.30)');
        shine.addColorStop(0.18, 'rgba(255,255,255,0.03)');
        shine.addColorStop(0.57, 'rgba(255,255,255,0.08)');
        shine.addColorStop(0.65, 'rgba(255,255,255,0.20)');
        shine.addColorStop(0.69, 'rgba(255,255,255,0.02)');
        shine.addColorStop(1, 'rgba(0,0,0,0.26)');
        ctx.fillStyle = shine;
        ctx.fillRect(8, 32, 84, bottom);
        ctx.restore();
        const edge = ctx.createLinearGradient(8, 0, 92, 0);
        edge.addColorStop(0, 'rgba(221,214,229,0.85)');
        edge.addColorStop(0.25, 'rgba(214,206,224,0.25)');
        edge.addColorStop(0.7, 'rgba(211,200,224,0.20)');
        edge.addColorStop(1, 'rgba(214,202,224,0.68)');
        outline();
        ctx.strokeStyle = bottle.selected ? '#fff3b7' : edge;
        ctx.lineWidth = bottle.selected ? 3 : 2.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(50, 11, 22, 6, 0, 0, Math.PI * 2);
        ctx.fillStyle = bottle.flow && !bottle.flow.outgoing
            ? 'rgba(6,5,32,0.15)' : 'rgba(6,5,32,0.65)';
        ctx.fill();
        ctx.strokeStyle = edge;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.beginPath();
        ctx.ellipse(39, 52, 5, 1.5, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(48, 56, 2, 3);
        if (this.isBottleComplete(bottle) && bottle.capacity === CAPACITY) {
            ctx.strokeStyle = 'rgba(255,225,129,0.65)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(50, bottom - 6, 39, 6, 0, 0, Math.PI);
            ctx.stroke();
        }
        if (bottle.sealed) {
            ctx.fillStyle = '#b67b42';
            ctx.fillRect(30, 1, 40, 19);
            ctx.fillStyle = '#edbd74';
            ctx.fillRect(28, 1, 44, 7);
            ctx.fillStyle = '#ffdc78';
            ctx.fillRect(28, 20, 44, 6);
            ctx.font = 'bold 26px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('\u2713', 50, height / 2 + 20);
        }
        if (bottle.curtain) {
            // Opaque pleated fabric conceals both liquid and mystery layers.
            ctx.fillStyle = COLORS[bottle.curtain];
            ctx.fillRect(3, 20, 94, height - 10);
            for (let x = 3; x < 97; x += 16) {
                const fold = ctx.createLinearGradient(x, 0, x + 16, 0);
                fold.addColorStop(0, 'rgba(255,255,255,0.24)');
                fold.addColorStop(0.45, 'rgba(0,0,0,0)');
                fold.addColorStop(1, 'rgba(0,0,0,0.38)');
                ctx.fillStyle = fold;
                ctx.fillRect(x, 20, Math.min(16, 97 - x), height - 10);
            }
            ctx.fillStyle = '#f4ce80';
            ctx.fillRect(1, 15, 98, 7);
            ctx.fillRect(3, height + 4, 94, 5);
            ctx.fillStyle = 'rgba(20,12,41,0.85)';
            ctx.fillRect(12, height / 2 - 24, 76, 60);
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.font = 'bold 14px Arial';
            ctx.fillText('FILL', 50, height / 2 - 2);
            ctx.font = 'bold 12px Arial';
            ctx.fillText(bottle.curtain.toUpperCase(), 50, height / 2 + 20);
        }
        ctx.restore();
        texture.refresh();
    }

    shade(hex, factor) {
        const value = parseInt(hex.slice(1), 16);
        return `rgb(${Math.round((value >> 16) * factor)},${Math.round(((value >> 8) & 255) * factor)},${Math.round((value & 255) * factor)})`;
    }

    handleBottleClick(bottle) {
        if (this.busy || this.finished) return;
        if (bottle.curtain) {
            this.statusText.setText(`Complete a ${bottle.curtain} bottle to open this curtain.`);
            return;
        }
        if (this.selectedBottle === bottle) return this.deselectBottle();
        if (this.selectedBottle && this.canPour(this.selectedBottle, bottle)) {
            return this.performPour(this.selectedBottle, bottle);
        }
        this.deselectBottle();
        if (bottle.colors.length && !bottle.sealed) this.selectBottle(bottle);
    }

    selectBottle(bottle) {
        this.selectedBottle = bottle;
        bottle.selected = true;
        this.drawBottle(bottle);
        this.tweens.killTweensOf(bottle.container);
        this.tweens.add({ targets: bottle.container, y: bottle.homeY - 12, duration: 130 });
    }

    deselectBottle() {
        if (!this.selectedBottle) return;
        const bottle = this.selectedBottle;
        this.selectedBottle = null;
        bottle.selected = false;
        this.tweens.killTweensOf(bottle.container);
        bottle.container.setPosition(bottle.homeX, bottle.homeY);
        this.drawBottle(bottle);
    }

    getTopColor(bottle) { return bottle.colors[bottle.colors.length - 1]; }

    getTopColorCount(bottle) {
        let count = 0;
        for (let i = bottle.colors.length - 1; i >= 0; i--) {
            if (bottle.hidden?.[i] || bottle.colors[i] !== this.getTopColor(bottle)) break;
            count++;
        }
        return count;
    }

    canPour(source, destination) {
        return source !== destination && !source.curtain && !destination.curtain && !source.sealed && !destination.sealed && source.colors.length > 0 &&
            destination.colors.length < destination.capacity &&
            (!destination.colors.length || this.getTopColor(source) === this.getTopColor(destination));
    }

    getPourAmount(source, destination) {
        return Math.min(this.getTopColorCount(source), destination.capacity - destination.colors.length);
    }

    performPour(source, destination) {
        if (this.busy || !this.canPour(source, destination)) return;
        const amount = this.getPourAmount(source, destination);
        const color = this.getTopColor(source);
        this.saveHistory();
        this.deselectBottle();
        this.busy = true;
        source.container.setDepth(10);
        const destinationTop = destination.homeY - (destination.height + 16) / 2 + 11;
        const stream = this.add.graphics().setDepth(11);
        const transfer = () => {
            const matrix = source.container.getWorldTransformMatrix();
            const lip = matrix.transformPoint(0, -(source.height + 16) / 2 + 11);
            const tint = Phaser.Display.Color.HexStringToColor(COLORS[color]).color;
            const flow = { progress: 0 };
            const duration = 280 + amount * 210;
            this.tweens.add({ targets: flow, progress: 1, duration, ease: 'Sine.easeInOut',
                onUpdate: () => {
                    const p = flow.progress;
                    source.flow = { outgoing: true, amount: amount * p, phase: p };
                    destination.flow = { outgoing: false, color, amount: amount * p, phase: p };
                    this.drawBottle(source);
                    this.drawBottle(destination);
                    stream.clear();
                    const strength = Math.min(1, p * 12, (1 - p) * 12);
                    const points = [];
                    for (let i = 0; i <= 24; i++) {
                        const t = i / 24;
                        // A narrow arc leaves the lip and accelerates down to the neck.
                        points.push({
                            x: lip.x + (destination.homeX - lip.x) * t + Math.sin(t * Math.PI) * Math.sin(p * 24) * 1.5,
                            y: lip.y + (destinationTop - lip.y) * t * t
                        });
                    }
                    stream.lineStyle(9 * strength, tint, 0.9);
                    stream.strokePoints(points, false);
                    stream.lineStyle(2.5 * strength, 0xffffff, 0.45);
                    stream.strokePoints(points, false);
                    // Small falling beads follow the stream into the receiving neck.
                    stream.fillStyle(tint, strength);
                    for (let i = 0; i < 3; i++) {
                        const t = (p * 3 + i / 3) % 1;
                        stream.fillEllipse(lip.x + (destination.homeX - lip.x) * t,
                            lip.y + (destinationTop - lip.y) * t * t, 4 * strength, 8 * strength);
                    }
                },
                onComplete: () => {
                    for (let i = 0; i < amount; i++) {
                        destination.colors.push(source.colors.pop());
                        source.hidden.pop();
                        destination.hidden.push(false);
                    }
                    delete source.flow;
                    delete destination.flow;
                    this.drawBottle(source);
                    this.drawBottle(destination);
                    stream.destroy();
                this.tweens.add({ targets: source.container, x: source.homeX, y: source.homeY,
                    angle: 0, duration: 280, ease: 'Sine.easeInOut', onComplete: () => {
                        source.container.setDepth(0);
                        this.movesText.setText(`MOVES: ${++this.moves}`);
                        if (source.hidden.length) source.hidden[source.hidden.length - 1] = false;
                        this.drawBottle(source);
                        this.sealBottle(source);
                        this.sealBottle(destination);
                        this.updateProgress();
                        this.busy = false;
                        this.checkLevelComplete();
                    }});
            }});
        };
        if (source.height > 500) {
            // Keep the tall reservoir upright; its stream transfers to the chosen bottle.
            transfer();
        } else {
            const direction = destination.homeX < 360 ? 1 : -1;
            const angle = direction * 65;
            const neck = (source.height + 16) / 2 - 11;
            const radians = Phaser.Math.DegToRad(angle);
            this.tweens.add({ targets: source.container,
                x: destination.homeX - direction * 30 - Math.sin(radians) * neck,
                y: destinationTop - 65 + Math.cos(radians) * neck,
                angle, duration: 300, ease: 'Sine.easeInOut', onComplete: transfer });
        }
    }

    isBottleComplete(bottle) {
        return !bottle.curtain && bottle.colors.length === bottle.capacity &&
            bottle.colors.every(color => color === bottle.colors[0]);
    }

    checkLevelComplete() {
        if (this.bottles.every(bottle => !bottle.colors.length || this.isBottleComplete(bottle))) {
            this.busy = true;
            this.time.delayedCall(750, () => this.levelComplete());
        }
    }

    levelComplete() {
        this.finished = true;
        this.add.rectangle(360, 640, 720, 1280, 0x050318, 0.8).setDepth(30).setInteractive();
        this.add.rectangle(360, 640, 490, 260, 0x241437).setStrokeStyle(2, 0xb99566).setDepth(31);
        this.add.text(360, 576, 'COLORS SORTED!', {
            fontFamily: 'Arial', fontStyle: 'bold', fontSize: '32px', color: '#ffe1a3'
        }).setOrigin(0.5).setDepth(32);
        this.add.text(360, 635, `${this.moves} moves  •  ${this.elapsed}s`, {
            fontFamily: 'Arial', fontSize: '23px', color: '#ffffff'
        }).setOrigin(0.5).setDepth(32);
        this.add.text(360, 706, 'NEXT LEVEL \u2192', {
            fontFamily: 'Arial', fontSize: '24px', color: '#ffffff',
            backgroundColor: '#754295', padding: { x: 24, y: 12 }
        }).setOrigin(0.5).setDepth(32).setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                this.level++;
                try { localStorage.setItem('sand-sort-level', String(this.level)); } catch {}
                this.scene.restart();
            });
    }

    undoMove() {
        if (this.busy || this.finished) return;
        this.deselectBottle();
        const state = this.history.pop();
        if (!state) return;
        while (this.bottles.length > state.bottles.length) {
            const bottle = this.bottles.pop();
            this.tweens.killTweensOf(bottle.container);
            bottle.container.destroy();
            this.textures.remove(bottle.texture.key);
        }
        state.bottles.forEach((saved, index) => {
            this.tweens.killTweensOf(this.bottles[index].container);
            this.bottles[index].container.setPosition(this.bottles[index].homeX, this.bottles[index].homeY);
            Object.assign(this.bottles[index], saved);
            this.drawBottle(this.bottles[index]);
        });
        this.moves = state.moves;
        this.movesText.setText(`MOVES: ${this.moves}`);
        this.layoutBottles();
        this.statusText.setText('Last action undone.');
        this.updateProgress();
    }

    saveHistory() {
        this.history.push({ moves: this.moves, bottles: this.bottles.map(bottle => ({
            colors: [...bottle.colors], hidden: [...bottle.hidden], sealed: !!bottle.sealed, curtain: bottle.curtain || null
        })) });
    }

    layoutBottles() {
        const tall = this.bottles.find(bottle => bottle.height > 500);
        const regular = this.bottles.filter(bottle => bottle !== tall);
        const columns = Math.ceil(regular.length / 2);
        const spacing = Math.min(128, 620 / columns);
        regular.forEach((bottle, index) => {
            const row = Math.floor(index / columns);
            const count = row === 0 ? columns : regular.length - columns;
            if (tall) {
                // Reserve the central column for the bottle spanning both shelves.
                const leftCount = Math.ceil(count / 2);
                const column = index % columns;
                bottle.homeX = column < leftCount
                    ? 260 - (leftCount - 1 - column) * 100
                    : 460 + (column - leftCount) * 100;
            } else {
                bottle.homeX = 360 + (index % columns - (count - 1) / 2) * spacing;
            }
            bottle.homeY = 480 + row * 420;
        });
        if (tall) {
            tall.homeX = 360;
            tall.homeY = 690;
        }
        this.bottles.forEach(bottle => {
            this.tweens.killTweensOf(bottle.container);
            bottle.container.setPosition(bottle.homeX, bottle.homeY);
        });
    }

    addExtraBottle() {
        if (this.busy || this.finished) return;
        if (this.bottles.length >= 12) {
            this.statusText.setText('All 12 bottle spaces are in use.');
            return;
        }
        this.deselectBottle();
        this.saveHistory();
        const bottle = this.createBottle(360, 900, [], this.bottles.length, CAPACITY, 306);
        bottle.hidden = [];
        bottle.sealed = false;
        this.bottles.push(bottle);
        this.layoutBottles();
        this.statusText.setText('An extra bottle for a little breathing room.');
    }

    reshuffle() {
        if (this.busy || this.finished) return;
        this.deselectBottle();
        this.saveHistory();
        this.shuffleCount = (this.shuffleCount || 0) + 1;
        const data = makeLevel(this.level, this.shuffleCount);
        this.bottles.forEach((bottle, index) => {
            bottle.curtain = data.curtains[index] || null;
            bottle.colors = [...(data.bottles[index] || [])];
            bottle.hidden = bottle.colors.map((_, i) => i < bottle.colors.length - 1 && i < data.mysteryDepth);
            bottle.sealed = this.isBottleComplete(bottle);
            if (bottle.sealed) bottle.hidden.fill(false);
            this.drawBottle(bottle);
        });
        this.layoutBottles();
        this.updateProgress();
        this.statusText.setText('Fresh puzzle, same difficulty. Undo to go back.');
        this.unlockCurtains();
    }

    createBottomControls() {
        const controls = [
            [145, '\u21b6', 'UNDO', () => this.undoMove()],
            [360, '\u21c4', 'RESHUFFLE', () => this.reshuffle()],
            [575, '+', 'ADD BOTTLE', () => this.addExtraBottle()]
        ];
        controls.forEach(([x, icon, label, callback]) => {
            const button = this.add.rectangle(x, 1191, 190, 94, 0x533379)
                .setStrokeStyle(2, 0xa987cc).setInteractive({ useHandCursor: true });
            this.add.text(x, 1173, icon, {
                fontFamily: 'Arial', fontSize: '36px', color: '#ffe4a1'
            }).setOrigin(0.5);
            this.add.text(x, 1212, label, {
                fontFamily: 'Arial', fontSize: '17px', fontStyle: 'bold', color: '#ffffff'
            }).setOrigin(0.5);
            button.on('pointerover', () => button.setFillStyle(0x704799));
            button.on('pointerout', () => button.setFillStyle(0x533379));
            button.on('pointerdown', callback);
        });
    }

    restartLevel() {
        if (!this.busy) this.scene.restart();
    }

    createButton(x, y, label, callback) {
        const circle = this.add.circle(x, y, 24, 0x242436).setStrokeStyle(1, 0x414154)
            .setInteractive({ useHandCursor: true });
        this.add.text(x, y - 2, label, {
            fontFamily: 'Arial', fontSize: '33px', color: '#ffffff'
        }).setOrigin(0.5);
        circle.on('pointerover', () => circle.setFillStyle(0x414155));
        circle.on('pointerout', () => circle.setFillStyle(0x242436));
        circle.on('pointerdown', callback);
    }
}
