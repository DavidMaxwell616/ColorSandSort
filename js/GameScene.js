const COLORS = {
    pink: '#f34bd2', yellow: '#ffcf08', blue: '#27b7ed',
    green: '#91ca20', purple: '#8814e9', orange: '#ff9508'
};
const CAPACITY = 4;

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    create() {
        this.bottles = [];
        this.selectedBottle = null;
        this.busy = false;
        this.finished = false;
        this.moves = 0;
        this.elapsed = 0;
        this.history = [];
        this.createBackground();
        this.createLevel();
        this.createButton(43, 49, '\u21b6', () => this.undoMove());
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
                Math.round(7 + 19 * t), Math.round(8 - 4 * t), Math.round(42 - 8 * t));
            g.fillStyle(color).fillRect(0, y, width, 4);
        }
    }

    createLevel() {
        // Bottom to top. Three copies preserve four units per color per set.
        const pattern = [
            ['blue', 'yellow', 'pink', 'green'],
            ['purple', 'orange', 'blue', 'yellow'],
            ['green', 'pink', 'orange', 'purple'],
            ['yellow', 'blue', 'green', 'pink'],
            ['orange', 'purple', 'yellow', 'blue'],
            ['pink', 'green', 'purple', 'orange'], [], []
        ];
        const positions = this.getBottlePositions();
        positions.forEach((pos, index) => {
            this.bottles.push(this.createBottle(pos.x, pos.y, pattern[index % 8], index));
        });
        // The reference's central column is a usable, larger sorting bottle.
        this.bottles.push(this.createBottle(360, 678, [], 24, 24, 1092));
    }

    getBottlePositions() {
        const positions = [];
        for (const y of [237, 527, 817, 1107]) {
            this.drawShelf(y + 116, y === 1107);
            for (const x of [44, 150, 256, 464, 570, 676]) positions.push({ x, y });
        }
        return positions;
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
        colors.forEach((color, index) => {
            const y = bottom - 5 - (index + 1) * segment;
            const gradient = ctx.createLinearGradient(9, 0, 91, 0);
            gradient.addColorStop(0, COLORS[color]);
            gradient.addColorStop(0.16, COLORS[color]);
            gradient.addColorStop(0.78, COLORS[color]);
            gradient.addColorStop(1, this.shade(COLORS[color], 0.65));
            ctx.fillStyle = gradient;
            ctx.fillRect(9, y, 82, segment + 1);
            ctx.beginPath();
            ctx.ellipse(50, y, 41, 7, 0, 0, Math.PI * 2);
            ctx.fill();
        });
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
        ctx.fillStyle = 'rgba(6,5,32,0.65)';
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
        ctx.restore();
        texture.refresh();
    }

    shade(hex, factor) {
        const value = parseInt(hex.slice(1), 16);
        return `rgb(${Math.round((value >> 16) * factor)},${Math.round(((value >> 8) & 255) * factor)},${Math.round((value & 255) * factor)})`;
    }

    handleBottleClick(bottle) {
        if (this.busy || this.finished) return;
        if (this.selectedBottle === bottle) return this.deselectBottle();
        if (this.selectedBottle && this.canPour(this.selectedBottle, bottle)) {
            return this.performPour(this.selectedBottle, bottle);
        }
        this.deselectBottle();
        if (bottle.colors.length) this.selectBottle(bottle);
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
            if (bottle.colors[i] !== this.getTopColor(bottle)) break;
            count++;
        }
        return count;
    }

    canPour(source, destination) {
        return source !== destination && source.colors.length > 0 &&
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
        this.history.push(this.bottles.map(bottle => [...bottle.colors]));
        this.deselectBottle();
        this.busy = true;
        source.container.setDepth(10);
        const destinationTop = destination.homeY - (destination.height + 16) / 2 + 11;
        const stream = this.add.graphics().setDepth(11);
        const transfer = () => {
            const matrix = source.container.getWorldTransformMatrix();
            const lip = matrix.transformPoint(0, -(source.height + 16) / 2 + 11);
            stream.lineStyle(6, Phaser.Display.Color.HexStringToColor(COLORS[color]).color, 0.9);
            stream.lineBetween(lip.x, lip.y, destination.homeX, destinationTop);
            for (let i = 0; i < amount; i++) {
                this.time.delayedCall(110 * (i + 1), () => {
                    destination.colors.push(source.colors.pop());
                    this.drawBottle(source);
                    this.drawBottle(destination);
                });
            }
            this.time.delayedCall(110 * amount + 100, () => {
                stream.destroy();
                this.tweens.add({ targets: source.container, x: source.homeX, y: source.homeY,
                    angle: 0, duration: 280, ease: 'Sine.easeInOut', onComplete: () => {
                        source.container.setDepth(0);
                        this.movesText.setText(`MOVES: ${++this.moves}`);
                        this.busy = false;
                        this.checkLevelComplete();
                    }});
            });
        };
        if (source.capacity > CAPACITY) {
            // Keep the tall reservoir upright; its stream transfers to the chosen bottle.
            transfer();
        } else {
            const direction = destination.homeX < 360 ? 1 : -1;
            const angle = direction * 65;
            const neck = (source.height + 16) / 2 - 11;
            const radians = Phaser.Math.DegToRad(angle);
            this.tweens.add({ targets: source.container,
                x: destination.homeX - Math.sin(radians) * neck,
                y: destinationTop - 20 + Math.cos(radians) * neck,
                angle, duration: 300, ease: 'Sine.easeInOut', onComplete: transfer });
        }
    }

    isBottleComplete(bottle) {
        return bottle.colors.length > 0 &&
            (bottle.capacity > CAPACITY ? bottle.colors.length % CAPACITY === 0 : bottle.colors.length === CAPACITY) &&
            bottle.colors.every(color => color === bottle.colors[0]);
    }

    checkLevelComplete() {
        if (this.bottles.every(bottle => !bottle.colors.length || this.isBottleComplete(bottle))) {
            this.levelComplete();
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
        this.add.text(360, 706, 'PLAY AGAIN', {
            fontFamily: 'Arial', fontSize: '24px', color: '#ffffff',
            backgroundColor: '#754295', padding: { x: 24, y: 12 }
        }).setOrigin(0.5).setDepth(32).setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.scene.restart());
    }

    undoMove() {
        if (this.busy || this.finished) return;
        this.deselectBottle();
        const state = this.history.pop();
        if (!state) return;
        state.forEach((colors, index) => {
            this.bottles[index].colors = [...colors];
            this.drawBottle(this.bottles[index]);
        });
        this.movesText.setText(`MOVES: ${--this.moves}`);
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
