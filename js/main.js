import GameScene from './GameScene.js';

const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 720,
    height: 1280,
    backgroundColor: '#08072b',
    scene: [
        GameScene
    ],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter:
            Phaser.Scale.CENTER_BOTH,
        width: 720,
        height: 1280
    },

    render: {
        antialias: true,
        pixelArt: false
    },

    input: {
        activePointers: 2
    }
};

const game = new Phaser.Game(config);